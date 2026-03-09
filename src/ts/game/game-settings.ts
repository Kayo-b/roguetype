export type GameMode = "game" | "zen";
export type CustomContentSourceType = "plain" | "epub";

export interface CustomContentChapter {
  id: number;
  title: string;
  startEntry: number;
  endEntry: number;
}

export interface CustomTextSettings {
  entries: string[];
  sourceName: string;
  sourceType: CustomContentSourceType;
  chapters: CustomContentChapter[];
  chapterStart: number | null;
  chapterEnd: number | null;
  bookmarkEntryCursor: number | null;
  truncatedAfterChapterTitle: string;
}

export interface GameSettings {
  mode: GameMode;
  hardcoreEnabled: boolean;
  soundEffectsEnabled: boolean;
  custom: CustomTextSettings;
}

export interface EffectiveGameRules {
  mode: GameMode;
  useCustomContent: boolean;
  hardcoreEnabled: boolean;
  soundEffectsEnabled: boolean;
  itemsShopEnabled: boolean;
  scoreEnabled: boolean;
  timeEnabled: boolean;
}

export interface SetCustomContentEntriesOptions {
  sourceType?: CustomContentSourceType;
  chapters?: ReadonlyArray<CustomContentChapter>;
  chapterStart?: number | null;
  chapterEnd?: number | null;
  bookmarkEntryCursor?: number | null;
  dedupe?: boolean;
  truncatedAfterChapterTitle?: string;
}

const GAME_SETTINGS_STORAGE_KEY = "roguetype.gameSettings.v1";
const MAX_CUSTOM_ENTRIES = 5_000;

const DEFAULT_SETTINGS: GameSettings = {
  mode: "game",
  hardcoreEnabled: false,
  soundEffectsEnabled: true,
  custom: {
    entries: [],
    sourceName: "",
    sourceType: "plain",
    chapters: [],
    chapterStart: null,
    chapterEnd: null,
    bookmarkEntryCursor: null,
    truncatedAfterChapterTitle: "",
  },
};

let settings = loadSettings();

function cloneChapter(value: CustomContentChapter): CustomContentChapter {
  return {
    id: value.id,
    title: value.title,
    startEntry: value.startEntry,
    endEntry: value.endEntry,
  };
}

function cloneCustomSettings(value: CustomTextSettings): CustomTextSettings {
  return {
    entries: [...value.entries],
    sourceName: value.sourceName,
    sourceType: value.sourceType,
    chapters: value.chapters.map(cloneChapter),
    chapterStart: value.chapterStart,
    chapterEnd: value.chapterEnd,
    bookmarkEntryCursor: value.bookmarkEntryCursor,
    truncatedAfterChapterTitle: value.truncatedAfterChapterTitle,
  };
}

function cloneSettings(value: GameSettings): GameSettings {
  return {
    mode: value.mode,
    hardcoreEnabled: value.hardcoreEnabled,
    soundEffectsEnabled: value.soundEffectsEnabled,
    custom: cloneCustomSettings(value.custom),
  };
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeGameMode(value: unknown): GameMode {
  if (value === "zen") return "zen";
  // Legacy values ("standard"/"custom") map to "game".
  return "game";
}

function normalizeSourceType(value: unknown): CustomContentSourceType {
  return value === "epub" ? "epub" : "plain";
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
  return withoutDiacritics.replace(/[^\x20-\x7E]/g, " ").trim().replace(/\s+/g, " ");
}

function normalizeCustomEntries(value: unknown, dedupe = true): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const output: string[] = [];
  const unique = dedupe ? new Set<string>() : null;

  for (const rawEntry of value) {
    if (typeof rawEntry !== "string") continue;

    const entry = normalizeTypableText(rawEntry);
    if (!entry) continue;

    if (unique) {
      if (unique.has(entry)) continue;
      unique.add(entry);
    }

    output.push(entry);
    if (output.length >= MAX_CUSTOM_ENTRIES) {
      break;
    }
  }

  return output;
}

function normalizeChapterList(value: unknown, entryCount: number): CustomContentChapter[] {
  if (!Array.isArray(value) || entryCount <= 0) return [];

  const out: CustomContentChapter[] = [];

  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const record = raw as Record<string, unknown>;

    const id = Number(record.id);
    const startEntry = Number(record.startEntry);
    const endEntry = Number(record.endEntry);

    if (!Number.isFinite(id) || !Number.isFinite(startEntry) || !Number.isFinite(endEntry)) {
      continue;
    }

    const safeId = Math.max(1, Math.floor(id));
    const safeStart = Math.max(0, Math.min(entryCount - 1, Math.floor(startEntry)));
    const safeEnd = Math.max(safeStart + 1, Math.min(entryCount, Math.floor(endEntry)));

    const rawTitle = typeof record.title === "string" ? normalizeTypableText(record.title) : "";
    out.push({
      id: safeId,
      title: rawTitle || `Chapter ${safeId}`,
      startEntry: safeStart,
      endEntry: safeEnd,
    });
  }

  out.sort((a, b) => a.id - b.id);

  const dedupedById: CustomContentChapter[] = [];
  for (const chapter of out) {
    if (dedupedById.some((item) => item.id === chapter.id)) continue;
    dedupedById.push(chapter);
  }

  return dedupedById;
}

function createSingleChapter(entryCount: number): CustomContentChapter[] {
  if (entryCount <= 0) return [];
  return [{ id: 1, title: "Chapter 1", startEntry: 0, endEntry: entryCount }];
}

function resolveChapterBoundary(value: unknown, chapters: ReadonlyArray<CustomContentChapter>): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const candidate = Math.floor(numeric);
  return chapters.some((chapter) => chapter.id === candidate) ? candidate : null;
}

function normalizeChapterRange(
  chapters: ReadonlyArray<CustomContentChapter>,
  startValue: unknown,
  endValue: unknown
): { start: number | null; end: number | null } {
  if (chapters.length === 0) {
    return { start: null, end: null };
  }

  const fallbackStart = chapters[0].id;
  const fallbackEnd = chapters[chapters.length - 1].id;

  let start = resolveChapterBoundary(startValue, chapters) ?? fallbackStart;
  let end = resolveChapterBoundary(endValue, chapters) ?? fallbackEnd;

  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  return { start, end };
}

function normalizeBookmarkEntryCursor(value: unknown, entryCount: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (entryCount <= 0) return null;
  const cursor = Math.max(0, Math.floor(numeric));
  return Math.min(cursor, entryCount - 1);
}

function normalizeSettings(value: unknown): GameSettings {
  const base = cloneSettings(DEFAULT_SETTINGS);

  if (typeof value !== "object" || value === null) {
    return base;
  }

  const record = value as Record<string, unknown>;

  base.mode = normalizeGameMode(record.mode);
  base.hardcoreEnabled = normalizeBoolean(record.hardcoreEnabled, base.hardcoreEnabled);
  base.soundEffectsEnabled = normalizeBoolean(
    record.soundEffectsEnabled,
    base.soundEffectsEnabled
  );

  const custom = record.custom;
  if (typeof custom === "object" && custom !== null) {
    const customRecord = custom as Record<string, unknown>;

    const sourceType = normalizeSourceType(customRecord.sourceType);
    const entries = normalizeCustomEntries(customRecord.entries, sourceType !== "epub");

    let chapters = sourceType === "epub" ? normalizeChapterList(customRecord.chapters, entries.length) : [];
    if (sourceType === "epub" && chapters.length === 0) {
      chapters = createSingleChapter(entries.length);
    }

    const range =
      sourceType === "epub"
        ? normalizeChapterRange(chapters, customRecord.chapterStart, customRecord.chapterEnd)
        : { start: null, end: null };

    base.custom.entries = entries;
    base.custom.sourceName =
      typeof customRecord.sourceName === "string" ? customRecord.sourceName.trim() : "";
    base.custom.sourceType = sourceType;
    base.custom.chapters = chapters;
    base.custom.chapterStart = range.start;
    base.custom.chapterEnd = range.end;
    base.custom.bookmarkEntryCursor =
      sourceType === "epub"
        ? normalizeBookmarkEntryCursor(customRecord.bookmarkEntryCursor, entries.length)
        : null;
    base.custom.truncatedAfterChapterTitle =
      typeof customRecord.truncatedAfterChapterTitle === "string"
        ? customRecord.truncatedAfterChapterTitle.trim()
        : "";
  }

  return base;
}

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(GAME_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return cloneSettings(DEFAULT_SETTINGS);
    }

    const parsed = JSON.parse(raw) as unknown;
    return normalizeSettings(parsed);
  } catch {
    return cloneSettings(DEFAULT_SETTINGS);
  }
}

function saveSettings(): void {
  try {
    localStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore blocked storage errors.
  }
}

export function getGameSettings(): GameSettings {
  return cloneSettings(settings);
}

export function getEffectiveGameRules(): EffectiveGameRules {
  const isZenMode = settings.mode === "zen";

  return {
    mode: settings.mode,
    useCustomContent: settings.custom.entries.length > 0,
    hardcoreEnabled: settings.hardcoreEnabled,
    soundEffectsEnabled: settings.soundEffectsEnabled,
    itemsShopEnabled: !isZenMode,
    scoreEnabled: !isZenMode,
    timeEnabled: !isZenMode,
  };
}

export function setGameMode(mode: GameMode): void {
  settings.mode = mode;
  saveSettings();
}

export function setHardcoreEnabled(enabled: boolean): void {
  settings.hardcoreEnabled = enabled;
  saveSettings();
}

export function setSoundEffectsEnabled(enabled: boolean): void {
  settings.soundEffectsEnabled = enabled;
  saveSettings();
}

export function getCustomContentEntries(): string[] {
  return [...settings.custom.entries];
}

export function getFilteredCustomContentEntries(): string[] {
  if (settings.custom.sourceType !== "epub" || settings.custom.chapters.length === 0) {
    return [...settings.custom.entries];
  }

  const chapterIds = settings.custom.chapters.map((chapter) => chapter.id);
  const firstId = chapterIds[0];
  const lastId = chapterIds[chapterIds.length - 1];

  const startId =
    settings.custom.chapterStart !== null && chapterIds.includes(settings.custom.chapterStart)
      ? settings.custom.chapterStart
      : firstId;
  const endId =
    settings.custom.chapterEnd !== null && chapterIds.includes(settings.custom.chapterEnd)
      ? settings.custom.chapterEnd
      : lastId;

  const startIndex = settings.custom.chapters.findIndex((chapter) => chapter.id === startId);
  const endIndex = settings.custom.chapters.findIndex((chapter) => chapter.id === endId);

  if (startIndex < 0 || endIndex < 0) {
    return [...settings.custom.entries];
  }

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);

  const startEntry = settings.custom.chapters[from].startEntry;
  const endEntry = settings.custom.chapters[to].endEntry;
  return settings.custom.entries.slice(startEntry, endEntry);
}

export function getCustomContentSourceType(): CustomContentSourceType {
  return settings.custom.sourceType;
}

export function getCustomContentSourceName(): string {
  return settings.custom.sourceName;
}

export function getCustomContentChapters(): CustomContentChapter[] {
  return settings.custom.chapters.map(cloneChapter);
}

export function getCustomContentChapterRange(): { start: number | null; end: number | null } {
  return {
    start: settings.custom.chapterStart,
    end: settings.custom.chapterEnd,
  };
}

export function getCustomContentBookmarkCursor(): number | null {
  if (settings.custom.sourceType !== "epub") return null;

  const filteredEntries = getFilteredCustomContentEntries();
  if (filteredEntries.length <= 0) return null;

  const bookmark = settings.custom.bookmarkEntryCursor;
  if (bookmark === null) return null;
  return Math.max(0, Math.min(bookmark, filteredEntries.length - 1));
}

export function getCustomContentTruncatedAfterChapterTitle(): string {
  return settings.custom.truncatedAfterChapterTitle;
}

export function setCustomChapterRange(
  start: number | null,
  end: number | null
): { start: number | null; end: number | null } {
  const range = normalizeChapterRange(settings.custom.chapters, start, end);
  settings.custom.chapterStart = range.start;
  settings.custom.chapterEnd = range.end;
  settings.custom.bookmarkEntryCursor =
    settings.custom.sourceType === "epub" && settings.custom.entries.length > 0 ? 0 : null;
  saveSettings();
  return range;
}

export function setCustomContentBookmarkCursor(cursor: number | null): void {
  if (settings.custom.sourceType !== "epub") return;
  const filteredEntries = getFilteredCustomContentEntries();
  if (filteredEntries.length <= 0) {
    settings.custom.bookmarkEntryCursor = null;
    saveSettings();
    return;
  }

  const normalized = normalizeBookmarkEntryCursor(cursor, filteredEntries.length);
  settings.custom.bookmarkEntryCursor = normalized;
  saveSettings();
}

export function setCustomContentEntries(
  entries: ReadonlyArray<string>,
  sourceName = "",
  options: SetCustomContentEntriesOptions = {}
): number {
  const sourceType = options.sourceType ?? "plain";
  const dedupe = options.dedupe ?? sourceType !== "epub";

  const normalizedEntries = normalizeCustomEntries(entries, dedupe);

  let chapters =
    sourceType === "epub"
      ? normalizeChapterList(options.chapters ?? [], normalizedEntries.length)
      : [];

  if (sourceType === "epub" && chapters.length === 0) {
    chapters = createSingleChapter(normalizedEntries.length);
  }

  const range =
    sourceType === "epub"
      ? normalizeChapterRange(chapters, options.chapterStart, options.chapterEnd)
      : { start: null, end: null };

  const bookmark =
    sourceType === "epub"
      ? normalizeBookmarkEntryCursor(options.bookmarkEntryCursor ?? 0, normalizedEntries.length)
      : null;

  settings.custom.entries = normalizedEntries;
  settings.custom.sourceName = sourceName.trim();
  settings.custom.sourceType = sourceType;
  settings.custom.chapters = chapters;
  settings.custom.chapterStart = range.start;
  settings.custom.chapterEnd = range.end;
  settings.custom.bookmarkEntryCursor = bookmark;
  settings.custom.truncatedAfterChapterTitle =
    sourceType === "epub" ? (options.truncatedAfterChapterTitle ?? "").trim() : "";

  saveSettings();
  return settings.custom.entries.length;
}

export function clearCustomContentEntries(): void {
  settings.custom = cloneCustomSettings(DEFAULT_SETTINGS.custom);
  saveSettings();
}

export function parseCustomContentCsv(raw: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (char === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (char === "," || char === "\n" || char === "\r")) {
      fields.push(current);
      current = "";

      if (char === "\r" && raw[i + 1] === "\n") {
        i += 1;
      }
      continue;
    }

    current += char;
  }

  fields.push(current);
  return normalizeCustomEntries(fields, true);
}
