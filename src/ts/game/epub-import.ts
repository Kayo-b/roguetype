import { BlobReader, TextWriter, ZipReader, type Entry } from "@zip.js/zip.js";
import type { CustomContentChapter } from "./game-settings";

export interface EpubImportResult {
  entries: string[];
  chapters: CustomContentChapter[];
  sourceName: string;
  warnings: string[];
  truncatedAfterChapterTitle: string;
  discoveredChapterCount: number;
}

const DEFAULT_CHUNK_TARGET = 260;
const DEFAULT_CHUNK_MIN = 120;

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTypableText(value: string): string {
  const punctuationNormalized = value
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\u00AD/g, "")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\uFB00/g, "ff")
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/\uFB03/g, "ffi")
    .replace(/\uFB04/g, "ffl")
    .replace(/\uFB05/g, "ft")
    .replace(/\uFB06/g, "st");

  const withoutDiacritics = punctuationNormalized.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const asciiOnly = withoutDiacritics.replace(/[^\x20-\x7E]/g, " ");
  return normalizeWhitespace(asciiOnly);
}

function normalizeZipPath(path: string): string {
  return path.replace(/^\/+/, "").replaceAll("\\", "/").replace(/\/\.\//g, "/");
}

function resolveRelativePath(basePath: string, relativePath: string): string {
  const normalizedBase = normalizeZipPath(basePath);
  const baseDir = normalizedBase.includes("/")
    ? normalizedBase.slice(0, normalizedBase.lastIndexOf("/") + 1)
    : "";
  const resolved = new URL(relativePath, `https://local.epub/${baseDir}`).pathname;
  return normalizeZipPath(resolved);
}

function getNodeText(node: Element | null): string {
  if (!node) return "";
  return normalizeWhitespace(node.textContent ?? "");
}

function getFirstElementByLocalName(node: Document | Element, localName: string): Element | null {
  const byNamespace = node.getElementsByTagNameNS("*", localName);
  if (byNamespace.length > 0) {
    return byNamespace.item(0);
  }

  const byTag = (node as Document | Element).getElementsByTagName(localName);
  return byTag.length > 0 ? byTag.item(0) : null;
}

function getElementsByLocalName(node: Document | Element, localName: string): Element[] {
  const byNamespace = node.getElementsByTagNameNS("*", localName);
  if (byNamespace.length > 0) {
    return Array.from(byNamespace);
  }

  return Array.from((node as Document | Element).getElementsByTagName(localName));
}

function parseXml(source: string, label: string): Document {
  const doc = new DOMParser().parseFromString(source, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error(`Invalid XML in ${label}`);
  }
  return doc;
}

function splitLongByWords(text: string, maxLength: number): string[] {
  const words = text.split(/\s+/).filter((token) => token.length > 0);
  if (words.length === 0) return [];

  const out: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      out.push(current);
    }

    if (word.length <= maxLength) {
      current = word;
      continue;
    }

    let index = 0;
    while (index < word.length) {
      const slice = word.slice(index, index + maxLength);
      out.push(slice);
      index += maxLength;
    }

    current = "";
  }

  if (current) {
    out.push(current);
  }

  return out;
}

function splitSentenceAware(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const sentenceCandidates = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => normalizeTypableText(part))
    .filter((part) => part.length > 0);

  if (sentenceCandidates.length <= 1) {
    return splitLongByWords(text, maxLength);
  }

  const out: string[] = [];
  let current = "";

  for (const sentence of sentenceCandidates) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      out.push(current);
      current = "";
    }

    if (sentence.length <= maxLength) {
      current = sentence;
      continue;
    }

    const pieces = splitLongByWords(sentence, maxLength);
    out.push(...pieces);
  }

  if (current) {
    out.push(current);
  }

  return out;
}

function chunkTextBlocks(blocks: ReadonlyArray<string>, maxLength: number, minLength: number): string[] {
  const out: string[] = [];
  let current = "";

  for (const rawBlock of blocks) {
    const block = normalizeTypableText(rawBlock);
    if (!block) continue;

    const sentences = splitSentenceAware(block, maxLength);
    for (const sentence of sentences) {
      const next = current ? `${current} ${sentence}` : sentence;
      if (next.length <= maxLength) {
        current = next;
        continue;
      }

      if (current) {
        out.push(current);
      }

      if (sentence.length >= minLength || !current) {
        current = sentence;
      } else {
        current = `${sentence}`;
      }
    }
  }

  if (current) {
    out.push(current);
  }

  return out
    .map((entry) => normalizeTypableText(entry))
    .filter((entry) => entry.length > 0);
}

function extractChapterTitle(doc: Document, fallbackIndex: number): string {
  const titleTag = doc.querySelector("title");
  const titleText = normalizeTypableText(titleTag?.textContent ?? "");
  if (titleText) return titleText;

  const heading = doc.querySelector("h1, h2, h3");
  const headingText = normalizeTypableText(heading?.textContent ?? "");
  if (headingText) return headingText;

  return `Chapter ${fallbackIndex}`;
}

function extractReadableBlocks(doc: Document): string[] {
  for (const selector of ["script", "style", "noscript", "nav", "svg", "math"]) {
    doc.querySelectorAll(selector).forEach((node) => node.remove());
  }

  const preferred = Array.from(
    doc.querySelectorAll("h1, h2, h3, h4, p, li, blockquote, pre")
  )
    .map((node) => normalizeTypableText(node.textContent ?? ""))
    .filter((text) => text.length > 0);

  if (preferred.length > 0) {
    return preferred;
  }

  const bodyText = normalizeTypableText(doc.body?.textContent ?? "");
  if (bodyText.length > 0) {
    return [bodyText];
  }

  return [];
}

function parseHtmlDocument(source: string): Document {
  return new DOMParser().parseFromString(source, "text/html");
}

async function readTextEntry(entry: Entry): Promise<string> {
  if ((entry as { directory?: boolean }).directory) {
    throw new Error("Cannot read directory entry as text");
  }

  const fileEntry = entry as Entry & { getData: (writer: TextWriter) => Promise<string> };
  return fileEntry.getData(new TextWriter());
}

function isSpineTextMediaType(mediaType: string): boolean {
  return (
    mediaType === "application/xhtml+xml" ||
    mediaType === "text/html" ||
    mediaType === "application/xml" ||
    mediaType === "text/xml"
  );
}

export async function importEpubCustomContent(
  file: File,
  maxEntries = 5_000
): Promise<EpubImportResult> {
  const zipReader = new ZipReader(new BlobReader(file));

  try {
    const zipEntries = await zipReader.getEntries();

    const entriesByPath = new Map<string, Entry>();
    const entriesByPathLower = new Map<string, Entry>();

    for (const zipEntry of zipEntries) {
      if (!zipEntry.filename) continue;
      const normalized = normalizeZipPath(zipEntry.filename);
      entriesByPath.set(normalized, zipEntry);
      entriesByPathLower.set(normalized.toLowerCase(), zipEntry);
    }

    const resolveEntry = (path: string): Entry | null => {
      const normalized = normalizeZipPath(path);
      return entriesByPath.get(normalized) ?? entriesByPathLower.get(normalized.toLowerCase()) ?? null;
    };

    const containerEntry = resolveEntry("META-INF/container.xml");
    if (!containerEntry) {
      throw new Error("EPUB container.xml not found");
    }

    const containerText = await readTextEntry(containerEntry);
    const containerDoc = parseXml(containerText, "container.xml");

    const rootfileElement = getFirstElementByLocalName(containerDoc, "rootfile");
    const packagePath = rootfileElement?.getAttribute("full-path")?.trim();

    if (!packagePath) {
      throw new Error("EPUB package path missing in container.xml");
    }

    const packageEntry = resolveEntry(packagePath);
    if (!packageEntry) {
      throw new Error(`EPUB package not found at ${packagePath}`);
    }

    const packageText = await readTextEntry(packageEntry);
    const packageDoc = parseXml(packageText, "package document");

    const bookTitle =
      getNodeText(getFirstElementByLocalName(packageDoc, "title")) || file.name.replace(/\.epub$/i, "");

    const manifestItems = new Map<string, ManifestItem>();
    for (const node of getElementsByLocalName(packageDoc, "item")) {
      const id = node.getAttribute("id")?.trim() ?? "";
      const href = node.getAttribute("href")?.trim() ?? "";
      const mediaType = node.getAttribute("media-type")?.trim() ?? "";
      if (!id || !href || !mediaType) continue;
      manifestItems.set(id, { id, href, mediaType });
    }

    const spineIds = getElementsByLocalName(packageDoc, "itemref")
      .map((node) => ({
        idref: node.getAttribute("idref")?.trim() ?? "",
        linear: (node.getAttribute("linear") ?? "yes").trim().toLowerCase(),
      }))
      .filter((row) => row.idref && row.linear !== "no")
      .map((row) => row.idref);

    if (spineIds.length === 0) {
      throw new Error("No readable spine items found in EPUB");
    }

    const warnings: string[] = [];
    const chapterChunks: Array<{ title: string; entries: string[] }> = [];

    for (let i = 0; i < spineIds.length; i += 1) {
      const spineId = spineIds[i];
      const manifestItem = manifestItems.get(spineId);
      if (!manifestItem) {
        warnings.push(`Skipped spine item "${spineId}" (missing manifest item).`);
        continue;
      }

      if (!isSpineTextMediaType(manifestItem.mediaType)) {
        warnings.push(`Skipped non-text spine item "${spineId}" (${manifestItem.mediaType}).`);
        continue;
      }

      const chapterPath = resolveRelativePath(packagePath, manifestItem.href);
      const chapterEntry = resolveEntry(chapterPath);
      if (!chapterEntry) {
        warnings.push(`Skipped missing chapter resource "${manifestItem.href}".`);
        continue;
      }

      let chapterText = "";
      try {
        chapterText = await readTextEntry(chapterEntry);
      } catch {
        warnings.push(`Skipped unreadable or encrypted chapter "${manifestItem.href}".`);
        continue;
      }

      const chapterDoc = parseHtmlDocument(chapterText);
      const blocks = extractReadableBlocks(chapterDoc);
      if (blocks.length === 0) {
        warnings.push(`Skipped empty chapter "${manifestItem.href}".`);
        continue;
      }

      const title = extractChapterTitle(chapterDoc, chapterChunks.length + 1);
      const chunks = chunkTextBlocks(blocks, DEFAULT_CHUNK_TARGET, DEFAULT_CHUNK_MIN);

      if (chunks.length === 0) {
        warnings.push(`Skipped chapter "${title}" after normalization (no usable text).`);
        continue;
      }

      chapterChunks.push({ title, entries: chunks });
    }

    if (chapterChunks.length === 0) {
      throw new Error("No readable chapter text extracted from EPUB");
    }

    const entries: string[] = [];
    const chapters: CustomContentChapter[] = [];
    let truncatedAfterChapterTitle = "";

    for (const chapter of chapterChunks) {
      if (entries.length >= maxEntries) {
        truncatedAfterChapterTitle = chapter.title;
        break;
      }

      if (entries.length > 0 && entries.length + chapter.entries.length > maxEntries) {
        truncatedAfterChapterTitle = chapter.title;
        break;
      }

      if (entries.length === 0 && chapter.entries.length > maxEntries) {
        const partial = chapter.entries.slice(0, maxEntries);
        const startEntry = entries.length;
        entries.push(...partial);
        chapters.push({
          id: chapters.length + 1,
          title: chapter.title,
          startEntry,
          endEntry: entries.length,
        });
        truncatedAfterChapterTitle = chapter.title;
        break;
      }

      const startEntry = entries.length;
      entries.push(...chapter.entries);
      chapters.push({
        id: chapters.length + 1,
        title: chapter.title,
        startEntry,
        endEntry: entries.length,
      });
    }

    if (entries.length === 0) {
      throw new Error("EPUB import produced no entries after chunking");
    }

    return {
      entries,
      chapters,
      sourceName: bookTitle,
      warnings,
      truncatedAfterChapterTitle,
      discoveredChapterCount: chapterChunks.length,
    };
  } finally {
    await zipReader.close();
  }
}
