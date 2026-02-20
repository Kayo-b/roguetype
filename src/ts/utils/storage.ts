import {
  ALL_QUIZ_THEMES,
  type QuizDifficulty,
  type QuizDifficultyFilter,
  type QuizTheme,
  type QuizQuestion,
  type RegularDifficulty,
} from "../game/game-state";

export const CUSTOM_CONTENT_STORAGE_KEY = "roguetype:custom-content:v1";
export const QUIZ_THEME_FILTERS_STORAGE_KEY = "roguetype:quiz-theme-filters:v1";
export const QUIZ_DIFFICULTY_FILTER_STORAGE_KEY =
  "roguetype:quiz-difficulty-filter:v1";
export const REGULAR_DIFFICULTY_STORAGE_KEY =
  "roguetype:regular-difficulty:v1";

export interface CustomContentMeta {
  name: string;
  author?: string;
  createdAt: string;
}

export interface CustomContentWords {
  regular: string[];
  wordsPerSet?: number;
}

export interface CustomContentPackage {
  version: 1;
  meta: CustomContentMeta;
  words?: CustomContentWords;
  quizzes?: QuizQuestion[];
}

export type CustomContentValidationResult =
  | { ok: true; data: CustomContentPackage }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeWords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed.length > 0) {
      unique.add(trimmed);
    }
  }

  return [...unique];
}

function isQuizTheme(value: string): value is QuizTheme {
  return ALL_QUIZ_THEMES.includes(value as QuizTheme);
}

function isQuizDifficulty(value: string): value is QuizDifficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function normalizeQuizQuestion(value: unknown, index: number): QuizQuestion {
  if (!isRecord(value)) {
    throw new Error(`quizzes[${index}] must be an object`);
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const theme = typeof value.theme === "string" ? value.theme.trim() : "";
  const difficulty =
    typeof value.difficulty === "string" ? value.difficulty.trim() : "";
  const prompt = typeof value.prompt === "string" ? value.prompt.trim() : "";
  const answer = typeof value.answer === "string" ? value.answer.trim() : "";
  const tip = typeof value.tip === "string" ? value.tip.trim() : "";

  if (!id) throw new Error(`quizzes[${index}].id is required`);
  if (!theme || !isQuizTheme(theme)) {
    throw new Error(`quizzes[${index}].theme must be one of: ${ALL_QUIZ_THEMES.join(", ")}`);
  }
  if (!difficulty || !isQuizDifficulty(difficulty)) {
    throw new Error("quizzes[" + index + "].difficulty must be easy, medium, or hard");
  }
  if (!prompt) throw new Error(`quizzes[${index}].prompt is required`);
  if (!answer) throw new Error(`quizzes[${index}].answer is required`);
  if (!tip) throw new Error(`quizzes[${index}].tip is required`);

  const normalized: QuizQuestion = {
    id,
    theme,
    difficulty,
    prompt,
    answer,
    tip,
  };

  if (typeof value.caseSensitive === "boolean") {
    normalized.caseSensitive = value.caseSensitive;
  }

  return normalized;
}

export function validateCustomContentPackage(
  value: unknown
): CustomContentValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "Root JSON value must be an object" };
  }

  const version = value.version;
  if (version !== 1) {
    return { ok: false, error: "Only version=1 custom packages are supported" };
  }

  const metaValue = value.meta;
  if (!isRecord(metaValue)) {
    return { ok: false, error: "meta is required and must be an object" };
  }

  const metaName =
    typeof metaValue.name === "string" ? metaValue.name.trim() : "";
  const metaCreatedAt =
    typeof metaValue.createdAt === "string" ? metaValue.createdAt.trim() : "";

  if (!metaName) {
    return { ok: false, error: "meta.name is required" };
  }

  if (!metaCreatedAt) {
    return { ok: false, error: "meta.createdAt is required" };
  }

  const normalizedMeta: CustomContentMeta = {
    name: metaName,
    createdAt: metaCreatedAt,
  };

  if (typeof metaValue.author === "string" && metaValue.author.trim().length > 0) {
    normalizedMeta.author = metaValue.author.trim();
  }

  let normalizedWords: CustomContentWords | undefined;
  if (value.words !== undefined) {
    if (!isRecord(value.words)) {
      return { ok: false, error: "words must be an object when provided" };
    }

    const regularWords = normalizeWords(value.words.regular);

    if (regularWords.length === 0) {
      return {
        ok: false,
        error: "words.regular must contain at least one non-empty word",
      };
    }

    normalizedWords = { regular: regularWords };

    if (typeof value.words.wordsPerSet === "number") {
      const wordsPerSet = Math.max(1, Math.floor(value.words.wordsPerSet));
      normalizedWords.wordsPerSet = wordsPerSet;
    }
  }

  let normalizedQuizzes: QuizQuestion[] | undefined;
  if (value.quizzes !== undefined) {
    if (!Array.isArray(value.quizzes)) {
      return { ok: false, error: "quizzes must be an array when provided" };
    }

    try {
      normalizedQuizzes = value.quizzes.map((entry, index) =>
        normalizeQuizQuestion(entry, index)
      );
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid quizzes data",
      };
    }

    if (normalizedQuizzes.length === 0) {
      return { ok: false, error: "quizzes must include at least one entry" };
    }

    const ids = new Set<string>();
    for (const question of normalizedQuizzes) {
      if (ids.has(question.id)) {
        return { ok: false, error: `Duplicate quiz id: ${question.id}` };
      }
      ids.add(question.id);
    }
  }

  if (!normalizedWords && !normalizedQuizzes) {
    return {
      ok: false,
      error: "Package must include at least one of: words or quizzes",
    };
  }

  return {
    ok: true,
    data: {
      version: 1,
      meta: normalizedMeta,
      words: normalizedWords,
      quizzes: normalizedQuizzes,
    },
  };
}

export function loadCustomContentPackage(): CustomContentPackage | null {
  try {
    const raw = localStorage.getItem(CUSTOM_CONTENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const result = validateCustomContentPackage(parsed);
    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}

export function saveCustomContentPackage(pkg: CustomContentPackage): void {
  localStorage.setItem(CUSTOM_CONTENT_STORAGE_KEY, JSON.stringify(pkg));
}

export function clearCustomContentPackage(): void {
  localStorage.removeItem(CUSTOM_CONTENT_STORAGE_KEY);
}

export function loadSelectedQuizThemes(): QuizTheme[] {
  try {
    const raw = localStorage.getItem(QUIZ_THEME_FILTERS_STORAGE_KEY);
    if (!raw) {
      return [...ALL_QUIZ_THEMES];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [...ALL_QUIZ_THEMES];
    }

    const next = parsed
      .filter((entry): entry is string => typeof entry === "string")
      .filter((entry): entry is QuizTheme => isQuizTheme(entry));

    return next.length > 0 ? [...new Set(next)] : [...ALL_QUIZ_THEMES];
  } catch {
    return [...ALL_QUIZ_THEMES];
  }
}

export function saveSelectedQuizThemes(themes: QuizTheme[]): void {
  const filtered = themes.filter((theme) => ALL_QUIZ_THEMES.includes(theme));
  const value = filtered.length > 0 ? [...new Set(filtered)] : [...ALL_QUIZ_THEMES];
  localStorage.setItem(QUIZ_THEME_FILTERS_STORAGE_KEY, JSON.stringify(value));
}

export function loadSelectedQuizDifficultyFilter(): QuizDifficultyFilter {
  try {
    const raw = localStorage.getItem(QUIZ_DIFFICULTY_FILTER_STORAGE_KEY);
    if (!raw) {
      return "all";
    }

    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed === "all" ||
      parsed === "easy" ||
      parsed === "medium" ||
      parsed === "hard"
    ) {
      return parsed;
    }

    return "all";
  } catch {
    return "all";
  }
}

export function saveSelectedQuizDifficultyFilter(
  difficulty: QuizDifficultyFilter
): void {
  localStorage.setItem(
    QUIZ_DIFFICULTY_FILTER_STORAGE_KEY,
    JSON.stringify(difficulty)
  );
}

export function loadRegularDifficulty(): RegularDifficulty {
  try {
    const raw = localStorage.getItem(REGULAR_DIFFICULTY_STORAGE_KEY);
    if (!raw) {
      return "easy";
    }

    const parsed = JSON.parse(raw) as unknown;
    if (parsed === "easy" || parsed === "medium" || parsed === "hard") {
      return parsed;
    }

    return "easy";
  } catch {
    return "easy";
  }
}

export function saveRegularDifficulty(difficulty: RegularDifficulty): void {
  localStorage.setItem(REGULAR_DIFFICULTY_STORAGE_KEY, JSON.stringify(difficulty));
}

export function createCustomContentTemplate(): CustomContentPackage {
  return {
    version: 1,
    meta: {
      name: "My RogueType Pack",
      author: "optional",
      createdAt: new Date().toISOString(),
    },
    words: {
      regular: ["daemon", "pipeline", "dispatcher", "latency", "commit"],
      wordsPerSet: 10,
    },
    quizzes: [
      {
        id: "js-map-001",
        theme: "javascript",
        difficulty: "easy",
        prompt: "JavaScript: create doubled array from nums using map.",
        answer: "nums.map((n) => n * 2);",
        tip: "Use map with an arrow function.",
        caseSensitive: true,
      },
      {
        id: "py-list-comp-001",
        theme: "python",
        difficulty: "easy",
        prompt: "Python: create list of squares from nums using list comprehension.",
        answer: "[n * n for n in nums]",
        tip: "Use brackets with an inline for-clause.",
        caseSensitive: true,
      },
      {
        id: "sql-select-001",
        theme: "sql",
        difficulty: "medium",
        prompt: "SQL: select all users with is_active = 1.",
        answer: "SELECT * FROM users WHERE is_active = 1;",
        tip: "SELECT, FROM, WHERE in that order.",
        caseSensitive: false,
      },
      {
        id: "bash-find-001",
        theme: "bash",
        difficulty: "medium",
        prompt: "Bash: list all .ts files recursively from current directory.",
        answer: "find . -type f -name '*.ts'",
        tip: "find + type filter + name pattern.",
        caseSensitive: true,
      },
      {
        id: "sqli-basic-001",
        theme: "sql-injection",
        difficulty: "hard",
        prompt: "SQL injection syntax example: close quote and force true condition.",
        answer: "' OR '1'='1' --",
        tip: "Close quote, OR true, comment trailing query.",
        caseSensitive: false,
      },
      {
        id: "git-status-001",
        theme: "git",
        difficulty: "easy",
        prompt: "Git: show current repository status.",
        answer: "git status",
        tip: "Use git status.",
        caseSensitive: true,
      },
    ],
  };
}
