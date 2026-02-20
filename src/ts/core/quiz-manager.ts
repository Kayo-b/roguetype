import {
  ALL_QUIZ_THEMES,
  type QuizDifficulty,
  type QuizDifficultyFilter,
  type QuizQuestion,
  type QuizTheme,
  type ValidationMode,
} from "../game/game-state";
import { loadCustomContentPackage } from "../utils/storage";

export interface QuizValidationResult {
  isCorrect: boolean;
  minorErrors: number;
}

const BUILT_IN_QUESTIONS: QuizQuestion[] = [
  // JavaScript
  {
    id: "js-map-01",
    theme: "javascript",
    difficulty: "easy",
    prompt: "JavaScript: create doubled array from nums using map.",
    answer: "nums.map((n) => n * 2);",
    tip: "Use map and return transformed value.",
    caseSensitive: true,
  },
  {
    id: "js-filter-01",
    theme: "javascript",
    difficulty: "easy",
    prompt: "JavaScript: keep only even values from nums.",
    answer: "nums.filter((n) => n % 2 === 0);",
    tip: "Filter with modulo check.",
    caseSensitive: true,
  },
  {
    id: "js-find-01",
    theme: "javascript",
    difficulty: "easy",
    prompt: "JavaScript: find first user with role 'admin'.",
    answer: "users.find((user) => user.role === 'admin');",
    tip: "Use find, not filter.",
    caseSensitive: true,
  },
  {
    id: "js-split-01",
    theme: "javascript",
    difficulty: "easy",
    prompt: "JavaScript: split csv string by comma.",
    answer: "csv.split(',');",
    tip: "String method that returns an array.",
    caseSensitive: true,
  },
  {
    id: "js-join-01",
    theme: "javascript",
    difficulty: "easy",
    prompt: "JavaScript: join parts array with '-'.",
    answer: "parts.join('-');",
    tip: "Array to string with a separator.",
    caseSensitive: true,
  },
  {
    id: "js-reduce-01",
    theme: "javascript",
    difficulty: "medium",
    prompt: "JavaScript: sum nums array using reduce.",
    answer: "nums.reduce((acc, n) => acc + n, 0);",
    tip: "Reducer gets accumulator and current item.",
    caseSensitive: true,
  },
  {
    id: "js-splice-01",
    theme: "javascript",
    difficulty: "medium",
    prompt: "JavaScript: remove 2 items from arr starting at index 3.",
    answer: "arr.splice(3, 2);",
    tip: "Mutating method with start and delete count.",
    caseSensitive: true,
  },
  {
    id: "js-some-01",
    theme: "javascript",
    difficulty: "medium",
    prompt: "JavaScript: check if any value in nums is > 100.",
    answer: "nums.some((n) => n > 100);",
    tip: "Boolean check across array.",
    caseSensitive: true,
  },
  {
    id: "js-every-01",
    theme: "javascript",
    difficulty: "medium",
    prompt: "JavaScript: verify all strings in names are non-empty.",
    answer: "names.every((name) => name.length > 0);",
    tip: "All items must pass predicate.",
    caseSensitive: true,
  },
  {
    id: "js-object-keys-01",
    theme: "javascript",
    difficulty: "hard",
    prompt: "JavaScript: get array of object keys from config.",
    answer: "Object.keys(config);",
    tip: "Static Object method.",
    caseSensitive: true,
  },
  {
    id: "js-optional-chain-01",
    theme: "javascript",
    difficulty: "hard",
    prompt: "JavaScript: safely read user.profile.email with optional chaining.",
    answer: "user?.profile?.email;",
    tip: "Use ?. at each nullable segment.",
    caseSensitive: true,
  },
  {
    id: "js-nullish-01",
    theme: "javascript",
    difficulty: "hard",
    prompt: "JavaScript: fallback to 'guest' if username is nullish.",
    answer: "username ?? 'guest';",
    tip: "Nullish coalescing, not OR.",
    caseSensitive: true,
  },

  // Python
  {
    id: "py-list-comp-01",
    theme: "python",
    difficulty: "easy",
    prompt: "Python: create list of squares from nums using list comprehension.",
    answer: "[n * n for n in nums]",
    tip: "Bracketed expression with for-clause.",
    caseSensitive: true,
  },
  {
    id: "py-split-01",
    theme: "python",
    difficulty: "easy",
    prompt: "Python: split csv string by comma.",
    answer: "csv.split(',')",
    tip: "String split returns list.",
    caseSensitive: true,
  },
  {
    id: "py-dict-get-01",
    theme: "python",
    difficulty: "easy",
    prompt: "Python: read user['name'] safely with default 'unknown'.",
    answer: "user.get('name', 'unknown')",
    tip: "Use dict.get with default argument.",
    caseSensitive: true,
  },
  {
    id: "py-filter-01",
    theme: "python",
    difficulty: "easy",
    prompt: "Python: keep even numbers from nums using comprehension.",
    answer: "[n for n in nums if n % 2 == 0]",
    tip: "Add if clause at the end.",
    caseSensitive: true,
  },
  {
    id: "py-join-01",
    theme: "python",
    difficulty: "easy",
    prompt: "Python: join items list with '-' separator.",
    answer: "'-'.join(items)",
    tip: "Separator string calls join.",
    caseSensitive: true,
  },
  {
    id: "py-enumerate-01",
    theme: "python",
    difficulty: "medium",
    prompt: "Python: loop with index and value over items.",
    answer: "for i, item in enumerate(items):",
    tip: "Unpack enumerate in for-loop.",
    caseSensitive: true,
  },
  {
    id: "py-lambda-sort-01",
    theme: "python",
    difficulty: "medium",
    prompt: "Python: sort users by age in-place.",
    answer: "users.sort(key=lambda u: u['age'])",
    tip: "Use key lambda on sort.",
    caseSensitive: true,
  },
  {
    id: "py-try-except-01",
    theme: "python",
    difficulty: "medium",
    prompt: "Python: catch ValueError as e.",
    answer: "except ValueError as e:",
    tip: "Exception type then alias.",
    caseSensitive: true,
  },
  {
    id: "py-fstring-01",
    theme: "python",
    difficulty: "medium",
    prompt: "Python: interpolate name variable in greeting string.",
    answer: "f'Hello, {name}'",
    tip: "f-string with braces.",
    caseSensitive: true,
  },
  {
    id: "py-dict-comp-01",
    theme: "python",
    difficulty: "hard",
    prompt: "Python: make dict from nums where key/value are n and n*n.",
    answer: "{n: n * n for n in nums}",
    tip: "Dict comprehension uses key:value.",
    caseSensitive: true,
  },
  {
    id: "py-with-open-01",
    theme: "python",
    difficulty: "hard",
    prompt: "Python: open file path in read mode as f using context manager.",
    answer: "with open(path, 'r') as f:",
    tip: "Use with + open + as alias.",
    caseSensitive: true,
  },
  {
    id: "py-generator-01",
    theme: "python",
    difficulty: "hard",
    prompt: "Python: generator expression for squares from nums.",
    answer: "(n * n for n in nums)",
    tip: "Parentheses instead of list brackets.",
    caseSensitive: true,
  },

  // Bash
  {
    id: "bash-find-logs-01",
    theme: "bash",
    difficulty: "easy",
    prompt: "Bash: find all .log files recursively from current directory.",
    answer: "find . -type f -name '*.log'",
    tip: "Use find with type and name filters.",
    caseSensitive: true,
  },
  {
    id: "bash-grep-recursive-01",
    theme: "bash",
    difficulty: "easy",
    prompt: "Bash: recursively search for 'TODO' in current directory.",
    answer: "grep -R 'TODO' .",
    tip: "Recursive grep flag + root path.",
    caseSensitive: true,
  },
  {
    id: "bash-mkdir-p-01",
    theme: "bash",
    difficulty: "easy",
    prompt: "Bash: create nested dir logs/archive if missing.",
    answer: "mkdir -p logs/archive",
    tip: "Use -p for parent dirs.",
    caseSensitive: true,
  },
  {
    id: "bash-chmod-01",
    theme: "bash",
    difficulty: "easy",
    prompt: "Bash: make deploy.sh executable.",
    answer: "chmod +x deploy.sh",
    tip: "chmod +x on file.",
    caseSensitive: true,
  },
  {
    id: "bash-tail-follow-01",
    theme: "bash",
    difficulty: "easy",
    prompt: "Bash: follow live output of app.log.",
    answer: "tail -f app.log",
    tip: "tail follow flag.",
    caseSensitive: true,
  },
  {
    id: "bash-find-delete-01",
    theme: "bash",
    difficulty: "medium",
    prompt: "Bash: delete all .tmp files recursively.",
    answer: "find . -type f -name '*.tmp' -delete",
    tip: "Find then delete action at end.",
    caseSensitive: true,
  },
  {
    id: "bash-pipe-sort-uniq-01",
    theme: "bash",
    difficulty: "medium",
    prompt: "Bash: count unique lines in file.txt.",
    answer: "sort file.txt | uniq -c",
    tip: "Sort before uniq counting.",
    caseSensitive: true,
  },
  {
    id: "bash-curl-header-01",
    theme: "bash",
    difficulty: "medium",
    prompt: "Bash: send GET to URL with Authorization header token var.",
    answer: "curl -H \"Authorization: Bearer $TOKEN\" \"$URL\"",
    tip: "Use -H header and quoted vars.",
    caseSensitive: true,
  },
  {
    id: "bash-chown-recursive-01",
    theme: "bash",
    difficulty: "medium",
    prompt: "Bash: recursively chown project dir to user:group.",
    answer: "chown -R user:group project",
    tip: "-R for recursive ownership.",
    caseSensitive: true,
  },
  {
    id: "bash-xargs-01",
    theme: "bash",
    difficulty: "hard",
    prompt: "Bash: list .js files then pass to wc -l with xargs.",
    answer: "find . -type f -name '*.js' | xargs wc -l",
    tip: "Pipe paths into xargs command.",
    caseSensitive: true,
  },
  {
    id: "bash-sed-inline-01",
    theme: "bash",
    difficulty: "hard",
    prompt: "Bash: replace foo with bar in-place in app.conf (GNU sed).",
    answer: "sed -i 's/foo/bar/g' app.conf",
    tip: "sed -i with substitution expression.",
    caseSensitive: true,
  },
  {
    id: "bash-awk-print-01",
    theme: "bash",
    difficulty: "hard",
    prompt: "Bash: print second column from data.txt using awk.",
    answer: "awk '{print $2}' data.txt",
    tip: "Awk print expression in single quotes.",
    caseSensitive: true,
  },

  // Git
  {
    id: "git-status-01",
    theme: "git",
    difficulty: "easy",
    prompt: "Git: show current working tree status.",
    answer: "git status",
    tip: "Use the status subcommand.",
    caseSensitive: true,
  },
  {
    id: "git-branch-list-01",
    theme: "git",
    difficulty: "easy",
    prompt: "Git: list local branches.",
    answer: "git branch",
    tip: "Branch command without extra flags.",
    caseSensitive: true,
  },
  {
    id: "git-log-oneline-01",
    theme: "git",
    difficulty: "medium",
    prompt: "Git: show compact commit history in one-line format.",
    answer: "git log --oneline",
    tip: "Use log with --oneline.",
    caseSensitive: true,
  },
  {
    id: "git-checkout-branch-01",
    theme: "git",
    difficulty: "medium",
    prompt: "Git: switch to branch named feature/auth using checkout.",
    answer: "git checkout feature/auth",
    tip: "Use checkout then branch name.",
    caseSensitive: true,
  },
  {
    id: "git-reset-soft-01",
    theme: "git",
    difficulty: "hard",
    prompt: "Git: move HEAD back by one commit, keep changes staged.",
    answer: "git reset --soft HEAD~1",
    tip: "Soft reset preserves index and working tree.",
    caseSensitive: true,
  },
  {
    id: "git-rebase-main-01",
    theme: "git",
    difficulty: "hard",
    prompt: "Git: rebase current branch onto main.",
    answer: "git rebase main",
    tip: "Use rebase with target branch.",
    caseSensitive: true,
  },

  // SQL
  {
    id: "sql-select-basic-01",
    theme: "sql",
    difficulty: "easy",
    prompt: "SQL: select all rows from users.",
    answer: "SELECT * FROM users;",
    tip: "Basic SELECT FROM statement.",
    caseSensitive: false,
  },
  {
    id: "sql-where-basic-01",
    theme: "sql",
    difficulty: "easy",
    prompt: "SQL: select users where id is 42.",
    answer: "SELECT * FROM users WHERE id = 42;",
    tip: "Add WHERE predicate.",
    caseSensitive: false,
  },
  {
    id: "sql-insert-01",
    theme: "sql",
    difficulty: "easy",
    prompt: "SQL: insert name 'Ada' and age 33 into users(name, age).",
    answer: "INSERT INTO users (name, age) VALUES ('Ada', 33);",
    tip: "INSERT INTO columns then VALUES.",
    caseSensitive: false,
  },
  {
    id: "sql-update-01",
    theme: "sql",
    difficulty: "medium",
    prompt: "SQL: set is_active=0 for users with last_login before 2024-01-01.",
    answer: "UPDATE users SET is_active = 0 WHERE last_login < '2024-01-01';",
    tip: "UPDATE + SET + WHERE.",
    caseSensitive: false,
  },
  {
    id: "sql-delete-01",
    theme: "sql",
    difficulty: "medium",
    prompt: "SQL: delete sessions older than 2024-01-01.",
    answer: "DELETE FROM sessions WHERE created_at < '2024-01-01';",
    tip: "DELETE FROM with WHERE filter.",
    caseSensitive: false,
  },
  {
    id: "sql-order-limit-01",
    theme: "sql",
    difficulty: "medium",
    prompt: "SQL: get latest 5 users by created_at descending.",
    answer: "SELECT * FROM users ORDER BY created_at DESC LIMIT 5;",
    tip: "ORDER BY then LIMIT.",
    caseSensitive: false,
  },
  {
    id: "sql-group-count-01",
    theme: "sql",
    difficulty: "hard",
    prompt: "SQL: count users per role.",
    answer: "SELECT role, COUNT(*) FROM users GROUP BY role;",
    tip: "Select grouped column and aggregate.",
    caseSensitive: false,
  },
  {
    id: "sql-join-01",
    theme: "sql",
    difficulty: "hard",
    prompt: "SQL: join orders with users on user_id.",
    answer: "SELECT * FROM orders INNER JOIN users ON orders.user_id = users.id;",
    tip: "INNER JOIN and ON condition.",
    caseSensitive: false,
  },
  {
    id: "sql-having-01",
    theme: "sql",
    difficulty: "hard",
    prompt: "SQL: return roles with more than 10 users.",
    answer: "SELECT role, COUNT(*) FROM users GROUP BY role HAVING COUNT(*) > 10;",
    tip: "HAVING filters grouped results.",
    caseSensitive: false,
  },

  // SQL Injection syntax (security awareness)
  {
    id: "sqli-basic-01",
    theme: "sql-injection",
    difficulty: "easy",
    prompt: "SQL injection syntax: close quote then OR true then comment tail.",
    answer: "' OR '1'='1' --",
    tip: "Quote break + true clause + comment.",
    caseSensitive: false,
  },
  {
    id: "sqli-union-01",
    theme: "sql-injection",
    difficulty: "easy",
    prompt: "SQLi syntax: UNION SELECT with 2 columns example.",
    answer: "' UNION SELECT username, password FROM users --",
    tip: "Close quote then UNION SELECT payload.",
    caseSensitive: false,
  },
  {
    id: "sqli-comment-01",
    theme: "sql-injection",
    difficulty: "medium",
    prompt: "SQLi syntax: terminate statement then comment rest.",
    answer: "'; --",
    tip: "End quote, semicolon, then comment.",
    caseSensitive: false,
  },
  {
    id: "sqli-tautology-02",
    theme: "sql-injection",
    difficulty: "medium",
    prompt: "SQLi tautology variant using numeric expression.",
    answer: "' OR 1=1 --",
    tip: "No quotes around numbers needed.",
    caseSensitive: false,
  },
  {
    id: "sqli-time-01",
    theme: "sql-injection",
    difficulty: "hard",
    prompt: "SQLi time-based syntax example using SLEEP(5).",
    answer: "' OR SLEEP(5) --",
    tip: "Inject OR with time delay function.",
    caseSensitive: false,
  },
  {
    id: "sqli-subquery-01",
    theme: "sql-injection",
    difficulty: "hard",
    prompt: "SQLi syntax with scalar subquery example.",
    answer: "' OR (SELECT COUNT(*) FROM users) > 0 --",
    tip: "Use subquery inside boolean expression.",
    caseSensitive: false,
  },
];

let customQuestions: QuizQuestion[] = [];
let lastQuestionId = "";

export function refreshQuizContentFromStorage(): void {
  const custom = loadCustomContentPackage();
  customQuestions = (custom?.quizzes ?? []).map((question) => ({
    ...question,
    theme: "custom",
  }));
}

function getQuestionPool(
  selectedThemes: QuizTheme[],
  difficultyFilter: QuizDifficultyFilter
): QuizQuestion[] {
  const activeThemes =
    selectedThemes.length > 0 ? selectedThemes : [...ALL_QUIZ_THEMES];
  const includeCustom = activeThemes.includes("custom");
  const includeStandard = activeThemes.includes("standard");
  const builtInThemes = activeThemes.filter(
    (theme) => theme !== "custom" && theme !== "standard"
  ) as QuizTheme[];

  const effectiveBuiltInThemes = includeStandard
    ? (ALL_QUIZ_THEMES.filter(
        (theme) => theme !== "custom" && theme !== "standard"
      ) as QuizTheme[])
    : builtInThemes;

  const builtInFiltered = BUILT_IN_QUESTIONS.filter((question) =>
    effectiveBuiltInThemes.includes(question.theme)
  );
  const customFiltered = includeCustom ? [...customQuestions] : [];

  return [...builtInFiltered, ...customFiltered].filter((question) => {
    if (difficultyFilter === "all") {
      return true;
    }

    return question.difficulty === difficultyFilter;
  });
}

export function getNextQuizQuestion(
  selectedThemes: QuizTheme[],
  difficultyFilter: QuizDifficultyFilter
): QuizQuestion {
  const pool = getQuestionPool(selectedThemes, difficultyFilter);

  if (pool.length === 0) {
    throw new Error(
      "No quiz questions are available for the selected themes/difficulty"
    );
  }

  if (pool.length === 1) {
    lastQuestionId = pool[0].id;
    return pool[0];
  }

  let index = Math.floor(Math.random() * pool.length);
  while (pool[index].id === lastQuestionId) {
    index = Math.floor(Math.random() * pool.length);
  }

  lastQuestionId = pool[index].id;
  return pool[index];
}

function normalizeForCompare(input: string, caseSensitive: boolean): string {
  const spaced = input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*([(){}\[\],;=<>*+\-])\s*/g, "$1");

  return caseSensitive ? spaced : spaced.toLowerCase();
}

function autoCloseDelimiters(input: string): string {
  let result = input;

  const pairs: Array<[string, string]> = [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ];

  for (const [open, close] of pairs) {
    const opens = [...result].filter((char) => char === open).length;
    const closes = [...result].filter((char) => char === close).length;
    const missing = opens - closes;

    if (missing > 0 && missing <= 2) {
      result += close.repeat(missing);
    }
  }

  return result;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }

    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

function evaluateStrict(
  typed: string,
  expected: string,
  caseSensitive: boolean
): QuizValidationResult {
  const normalizedTyped = normalizeForCompare(typed, caseSensitive);
  const normalizedExpected = normalizeForCompare(expected, caseSensitive);

  return {
    isCorrect: normalizedTyped === normalizedExpected,
    minorErrors: 0,
  };
}

function evaluateLoose(
  typed: string,
  expected: string,
  caseSensitive: boolean
): QuizValidationResult {
  const normalizedExpected = normalizeForCompare(expected, caseSensitive);
  const normalizedTyped = normalizeForCompare(typed, caseSensitive);

  if (normalizedTyped === normalizedExpected) {
    return { isCorrect: true, minorErrors: 0 };
  }

  let candidate = normalizedTyped;
  let fixes = 0;

  if (normalizedExpected.endsWith(";") && !candidate.endsWith(";")) {
    candidate += ";";
    fixes++;
  }

  const autoClosed = autoCloseDelimiters(candidate);
  if (autoClosed !== candidate) {
    fixes += autoClosed.length - candidate.length;
    candidate = autoClosed;
  }

  if (candidate === normalizedExpected) {
    return { isCorrect: true, minorErrors: fixes };
  }

  const distance = levenshteinDistance(candidate, normalizedExpected);
  const threshold = Math.max(
    1,
    Math.min(3, Math.floor(normalizedExpected.length * 0.08))
  );

  const isCorrect = distance <= threshold && normalizedTyped.length > 0;

  return {
    isCorrect,
    minorErrors: isCorrect ? fixes + distance : 0,
  };
}

export function validateQuizAnswer(
  question: QuizQuestion,
  typedAnswer: string,
  validationMode: ValidationMode
): QuizValidationResult {
  if (validationMode === "strict") {
    return evaluateStrict(
      typedAnswer,
      question.answer,
      question.caseSensitive ?? false
    );
  }

  return evaluateLoose(
    typedAnswer,
    question.answer,
    question.caseSensitive ?? false
  );
}

export function getQuizDifficultyWeight(difficulty: QuizDifficulty): number {
  switch (difficulty) {
    case "easy":
      return 1;
    case "medium":
      return 1.45;
    case "hard":
      return 2;
    default:
      return 1;
  }
}
