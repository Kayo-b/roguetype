import { loadCustomContentPackage } from "../utils/storage";
import {
  ALL_QUIZ_THEMES,
  type QuizTheme,
  type RegularDifficulty,
} from "../game/game-state";

interface RegularSourceEntry {
  text: string;
  preformatted: boolean;
}

class WordManager {
  private words: string[] = [];
  private customRegularPool: string[] = [];
  private customWordsPerSet: number | null = null;
  private readonly rogueEarlySequencePool = [
    "quiet rain drifts across the empty road",
    "the lantern swings beside a narrow bridge",
    "dust settles softly on the wooden table",
    "a distant bell echoes through the valley",
    "the old painter waits near the bright window",
    "seven birds circle above the silent field",
    "paper maps fold back into careful hands",
    "the market closes before the evening wind",
    "a silver key rests under the stone step",
    "footprints vanish near the frozen river",
    "small waves tap against the dark harbor",
    "the candle burns until the room turns gold",
    "four shadows cross the courtyard at noon",
    "the orchard path bends toward hidden hills",
    "a soft voice calls from beyond the gate",
    "the mirror keeps a face from yesterday",
    "winter clouds crawl over the northern ridge",
    "the keeper counts stars above the watchtower",
    "two ravens wait on the broken fence",
    "a cold letter sleeps inside a locked drawer",
    "the hallway whispers under careful footsteps",
    "faint chalk marks line the cellar wall",
    "the final train leaves before the storm",
    "dry leaves gather under the iron bench",
    "the traveler hides a map in her coat",
    "an empty chair faces the open fireplace",
    "the last window glows beyond the square",
    "thin fog climbs the stone staircase",
    "the attic door creaks in the morning hush",
    "a red thread trails across the stair",
    "the river bends around a sleeping town",
    "an old compass points toward unknown fields",
    "the tower clock stops at half past nine",
    "new footsteps cross the moonlit courtyard",
    "the diary closes with unfinished names",
    "small sparks drift from the midnight fire",
  ];
  private readonly rogueTechSequencePool = [
    "a hidden process wakes behind the silent daemon",
    "the cache remembers what the logs forgot",
    "cold packets drift across a sleeping subnet",
    "an orphaned thread circles the old scheduler",
    "checksum ghosts return after the reboot",
    "the monitor blinks while the stack unwinds",
    "a stale token opens the sealed gateway",
    "kernel whispers hide inside the trace buffer",
    "clock drift bends the timeline of the node",
    "a phantom session lingers past timeout",
    "the replica falls one commit behind",
    "dark fibers hum under the server floor",
    "a fragile socket waits for one more reply",
    "the parser stares at a broken payload",
    "binary fog settles over the data lane",
    "the daemon writes warnings into cold archives",
    "low voltage shadows cross the control rack",
    "an unseen hook rewires the event loop",
    "backups wake when the primary goes quiet",
    "the watchdog hears every dropped heartbeat",
    "a strange signature appears in rotated logs",
    "dead routes bloom inside a hidden table",
    "the queue fills faster than morning traffic",
    "a narrow tunnel links mirror after mirror",
    "silent workers spin beneath the load balancer",
    "one final prompt appears in green letters",
  ];
  private readonly rogueBashSequencePool = [
    "cat notes.txt | grep 'mirror'",
    "cat records.log | grep 'warning' | tail -n 8",
    "tail -n 50 app.log | grep ERROR",
    "find . -type f -name '*.log' | xargs wc -l",
    "find . -type f -name '*.tmp' -delete",
    "grep -R \"TODO\" src | head -n 20",
    "ps aux | grep node | grep -v grep",
    "awk '{print $2}' metrics.txt | sort -nr | head -n 5",
    "sort access.log | uniq -c | sort -nr | head",
    "cut -d, -f1 users.csv | sort | uniq",
    "sed -n '1,40p' config.env",
    "sed -i 's/debug=false/debug=true/' app.conf",
    "tar -czf backup.tar.gz project/",
    "du -sh * | sort -h",
    "ls -lah /var/log | head -n 15",
    "chmod +x deploy.sh && ./deploy.sh",
    "mkdir -p archive/old_logs && mv *.log archive/old_logs",
    "cat errors.txt | grep -i timeout | wc -l",
    "head -n 5 secrets.txt | nl -ba",
    "find . -name '*.ts' | xargs grep -n \"RogueState\"",
    "curl -s \"$URL\" | jq '.status'",
    "date && uptime",
    "echo \"$TOKEN\" | sed 's/./*/g'",
    "cat text.txt | grep 'something'",
  ];

  private readonly builtInRegularPool = [
    "trace",
    "binary",
    "kernel",
    "matrix",
    "syntax",
    "buffer",
    "cipher",
    "packet",
    "module",
    "thread",
    "socket",
    "schema",
    "branch",
    "script",
    "vector",
    "deploy",
    "memory",
    "commit",
    "fusion",
    "signal",
    "console",
    "compile",
    "adapter",
    "resolve",
    "runtime",
    "gateway",
    "session",
    "payload",
    "factory",
    "pattern",
    "capture",
    "context",
    "network",
    "scanner",
    "terminal",
    "protocol",
    "pipeline",
    "checksum",
    "backtrace",
    "safeguard",
    "allocator",
    "snapshot",
  ];

  private readonly builtInRegularThemePools: Record<QuizTheme, string[]> = {
    standard: [],
    javascript: [
      "function",
      "const",
      "let",
      "return",
      "promise",
      "async",
      "await",
      "import",
      "export",
      "object",
      "array",
      "map",
      "filter",
      "reduce",
      "console",
      "callback",
      "closure",
      "module",
      "runtime",
      "typescript",
      "interface",
      "class",
      "prototype",
      "arrow",
    ],
    python: [
      "python",
      "def",
      "class",
      "lambda",
      "import",
      "return",
      "list",
      "tuple",
      "dict",
      "set",
      "generator",
      "yield",
      "asyncio",
      "await",
      "venv",
      "pip",
      "pytest",
      "decorator",
      "iterator",
      "object",
      "script",
      "dataclass",
      "typing",
      "context",
    ],
    bash: [
      "bash",
      "shell",
      "script",
      "chmod",
      "grep",
      "sed",
      "awk",
      "find",
      "xargs",
      "curl",
      "mkdir",
      "touch",
      "source",
      "export",
      "alias",
      "pipe",
      "stdin",
      "stdout",
      "stderr",
      "command",
      "variable",
      "process",
      "terminal",
      "history",
    ],
    sql: [
      "select",
      "from",
      "where",
      "insert",
      "update",
      "delete",
      "join",
      "group",
      "having",
      "order",
      "limit",
      "index",
      "table",
      "column",
      "schema",
      "database",
      "query",
      "transaction",
      "commit",
      "rollback",
      "primary",
      "foreign",
      "aggregate",
      "subquery",
    ],
    "sql-injection": [
      "payload",
      "tautology",
      "union",
      "comment",
      "bypass",
      "escape",
      "sanitize",
      "parameterized",
      "injection",
      "vector",
      "exploit",
      "filter",
      "quote",
      "boolean",
      "blind",
      "timebased",
      "errorbased",
      "endpoint",
      "input",
      "validation",
      "encoding",
      "extract",
      "defense",
      "monitor",
    ],
    git: [
      "git",
      "commit",
      "branch",
      "merge",
      "rebase",
      "cherry",
      "stash",
      "fetch",
      "pull",
      "push",
      "remote",
      "origin",
      "head",
      "tag",
      "clone",
      "checkout",
      "switch",
      "status",
      "diff",
      "log",
      "reset",
      "revert",
      "amend",
      "squash",
      "conflict",
      "resolve",
      "upstream",
      "history",
    ],
    custom: [],
  };

  private readonly builtInRegularSnippetPools: Partial<
    Record<QuizTheme, Record<Exclude<RegularDifficulty, "easy">, string[]>>
  > = {
    javascript: {
      medium: [
        "nums.map((n) => n * 2);",
        "users.filter((u) => u.active);",
        "const item = data.find((x) => x.id === id);",
        "result = value?.profile?.name ?? 'guest';",
      ],
      hard: [
        "function normalize(input) { return input.trim().toLowerCase(); }",
        "const total = cart.reduce((sum, item) => sum + item.price, 0);",
        "export async function loadUser(id) { return await api.get(`/users/${id}`); }",
        "const grouped = rows.reduce((acc, row) => ({ ...acc, [row.type]: [...(acc[row.type] ?? []), row] }), {});",
      ],
    },
    python: {
      medium: [
        "items = [x for x in values if x > 10]",
        "user = users.get(user_id, {'name': 'guest'})",
        "for i, value in enumerate(records):",
        "result = sorted(rows, key=lambda r: r['score'])",
      ],
      hard: [
        "def normalize(text: str) -> str: return text.strip().lower()",
        "with open(path, 'r') as f: data = [line.strip() for line in f]",
        "mapping = {k: v for k, v in pairs if v is not None}",
        "async def fetch_all(client, ids): return [await client.get(i) for i in ids]",
      ],
    },
    bash: {
      medium: [
        "grep -R 'TODO' .",
        "find . -type f -name '*.log'",
        "curl -H \"Authorization: Bearer $TOKEN\" \"$URL\"",
        "sort file.txt | uniq -c",
      ],
      hard: [
        "find . -type f -name '*.tmp' -delete",
        "awk '{print $2}' data.txt | sort | uniq",
        "sed -i 's/foo/bar/g' app.conf",
        "find . -type f -name '*.js' | xargs wc -l",
      ],
    },
    sql: {
      medium: [
        "SELECT * FROM users WHERE is_active = 1;",
        "UPDATE users SET role = 'admin' WHERE id = 42;",
        "DELETE FROM sessions WHERE created_at < '2024-01-01';",
        "SELECT * FROM users ORDER BY created_at DESC LIMIT 5;",
      ],
      hard: [
        "SELECT role, COUNT(*) FROM users GROUP BY role HAVING COUNT(*) > 10;",
        "SELECT * FROM orders INNER JOIN users ON orders.user_id = users.id;",
        "SELECT u.id, u.name FROM users u WHERE EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id);",
        "WITH ranked AS (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn FROM users) SELECT * FROM ranked WHERE rn <= 10;",
      ],
    },
    "sql-injection": {
      medium: [
        "' OR 1=1 --",
        "'; --",
        "' UNION SELECT username, password FROM users --",
        "' OR '1'='1' --",
      ],
      hard: [
        "' OR SLEEP(5) --",
        "' OR (SELECT COUNT(*) FROM users) > 0 --",
        "' UNION SELECT NULL, version() --",
        "' OR EXISTS(SELECT 1 FROM users WHERE role='admin') --",
      ],
    },
    git: {
      medium: [
        "git log --oneline",
        "git checkout feature/auth",
        "git cherry-pick abc1234",
        "git rebase main",
      ],
      hard: [
        "git reset --soft HEAD~1",
        "git rebase -i HEAD~5",
        "git push origin HEAD --force-with-lease",
        "git reflog && git reset --hard HEAD@{1}",
      ],
    },
  };

  constructor() {
    this.refreshCustomWordsFromStorage();
    this.reset();
  }

  refreshCustomWordsFromStorage(): void {
    const custom = loadCustomContentPackage();
    this.customRegularPool = custom?.words?.regular ?? [];
    this.customWordsPerSet = custom?.words?.wordsPerSet ?? null;
  }

  getRecommendedWordsPerSet(defaultValue: number): number {
    if (this.customWordsPerSet === null) {
      return defaultValue;
    }

    return Math.max(1, Math.floor(this.customWordsPerSet));
  }

  reset(wordCount = 10): void {
    this.words = this.pickRandomWords(wordCount, "easy", [...ALL_QUIZ_THEMES]);
  }

  get(index: number): string {
    return this.words[index] ?? "";
  }

  getCurrent(currentIndex: number): string {
    return this.get(currentIndex);
  }

  getAll(): string[] {
    return this.words;
  }

  getLength(): number {
    return this.words.length;
  }

  createRegularPrompt(
    wordCount = 10,
    difficulty: RegularDifficulty = "easy",
    selectedThemes: QuizTheme[] = [...ALL_QUIZ_THEMES]
  ): string {
    this.words = this.pickRandomWords(wordCount, difficulty, selectedThemes);
    return this.words.join(" ");
  }

  createRoguePrompt(level: number, wordCount = 10): string {
    const safeWordCount = Math.max(1, Math.floor(wordCount));
    const sourcePool = this.getRogueSequencePool(level);
    this.words = this.pickSequenceWords(safeWordCount, sourcePool);
    return this.words.join(" ");
  }

  getCurrentPrompt(): string {
    return this.words.join(" ");
  }

  private normalizeAlphaWord(word: string): string {
    const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
    return normalized.length > 0 ? normalized : "type";
  }

  private toTitleCase(word: string): string {
    if (word.length === 0) return word;
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }

  private randomItem(items: string[]): string {
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  private shuffleItems<T>(items: T[]): T[] {
    const output = [...items];

    for (let i = output.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = output[i];
      output[i] = output[j];
      output[j] = temp;
    }

    return output;
  }

  private getRogueSequencePool(level: number): string[] {
    if (level <= 5) {
      return this.rogueEarlySequencePool;
    }

    if (level <= 7) {
      return [...this.rogueTechSequencePool, ...this.rogueBashSequencePool.slice(0, 12)];
    }

    return [...this.rogueTechSequencePool, ...this.rogueBashSequencePool];
  }

  private tokenizeSequence(sequence: string): string[] {
    return sequence.split(/\s+/).filter((token) => token.length > 0);
  }

  private pickSequenceWords(wordCount: number, sequencePool: string[]): string[] {
    if (sequencePool.length === 0) {
      return this.pickRandomWords(wordCount, "easy", ["standard"]);
    }

    const output: string[] = [];
    let available = this.shuffleItems(sequencePool);
    let previousSequence = "";

    while (output.length < wordCount) {
      const remaining = wordCount - output.length;

      if (available.length === 0) {
        available = this.shuffleItems(sequencePool);
      }

      let chosenIndex = available.findIndex((sequence) => {
        if (sequence === previousSequence) return false;
        return this.tokenizeSequence(sequence).length <= remaining;
      });

      if (chosenIndex < 0) {
        chosenIndex = available.findIndex((sequence) => sequence !== previousSequence);
      }

      if (chosenIndex < 0) {
        chosenIndex = 0;
      }

      const selected = available.splice(chosenIndex, 1)[0];
      const selectedTokens = this.tokenizeSequence(selected);
      const limitedTokens =
        selectedTokens.length > remaining
          ? selectedTokens.slice(0, remaining)
          : selectedTokens;

      output.push(...limitedTokens);
      previousSequence = selected;
    }

    return output;
  }

  private applyRegularDifficulty(
    baseWord: string,
    index: number,
    totalWords: number,
    difficulty: RegularDifficulty
  ): string {
    const alphaWord = this.normalizeAlphaWord(baseWord);

    if (difficulty === "easy") {
      return alphaWord;
    }

    let token = alphaWord;
    const caseRoll = Math.random();
    if (caseRoll < 0.25) {
      token = this.toTitleCase(token);
    } else if (caseRoll < 0.33) {
      token = token.toUpperCase();
    }

    const punctuationRoll = Math.random();
    if (index === totalWords - 1 || punctuationRoll < 0.18) {
      token += ".";
    } else if (punctuationRoll < 0.36) {
      token += ",";
    }

    if (difficulty === "hard") {
      if (Math.random() < 0.45) {
        token += String(Math.floor(Math.random() * 100));
      }

      if (Math.random() < 0.3) {
        token += this.randomItem(["!", "@", "?"]);
      }

      if (Math.random() < 0.2) {
        token = `${this.randomItem(["!", "@", "?"])}${token}`;
      }
    }

    return token;
  }

  private getBuiltInSourcePool(
    selectedThemes: QuizTheme[],
    difficulty: RegularDifficulty
  ): RegularSourceEntry[] {
    const activeThemes =
      selectedThemes.length > 0 ? selectedThemes : [...ALL_QUIZ_THEMES];

    const builtInThemes = activeThemes.filter(
      (theme) => theme !== "custom"
    ) as QuizTheme[];

    if (builtInThemes.length === 0) {
      return [];
    }

    const entries: RegularSourceEntry[] = [];

    for (const theme of builtInThemes) {
      if (theme === "standard") {
        entries.push(
          ...this.builtInRegularPool.map((text) => ({
            text,
            preformatted: false,
          }))
        );
        continue;
      }

      if (difficulty === "easy") {
        entries.push(
          ...(this.builtInRegularThemePools[theme] ?? []).map((text) => ({
            text,
            preformatted: false,
          }))
        );
        continue;
      }

      const snippets = this.builtInRegularSnippetPools[theme]?.[difficulty];

      if (snippets && snippets.length > 0) {
        entries.push(
          ...snippets.map((text) => ({
            text,
            preformatted: true,
          }))
        );
      } else {
        entries.push(
          ...(this.builtInRegularThemePools[theme] ?? []).map((text) => ({
            text,
            preformatted: false,
          }))
        );
      }
    }

    if (entries.length > 0) {
      return entries;
    }

    return this.builtInRegularPool.map((text) => ({
      text,
      preformatted: false,
    }));
  }

  private pickRandomWords(
    wordCount: number,
    difficulty: RegularDifficulty,
    selectedThemes: QuizTheme[]
  ): string[] {
    const activeThemes =
      selectedThemes.length > 0 ? selectedThemes : [...ALL_QUIZ_THEMES];
    const includeCustom = activeThemes.includes("custom");
    const builtInPool = this.getBuiltInSourcePool(activeThemes, difficulty);

    const sourcePool: RegularSourceEntry[] = [];

    if (includeCustom && this.customRegularPool.length > 0) {
      sourcePool.push(
        ...this.customRegularPool.map((text) => ({ text, preformatted: false }))
      );
    }

    if (builtInPool.length > 0) {
      sourcePool.push(...builtInPool);
    }

    if (sourcePool.length === 0) {
      if (this.customRegularPool.length > 0) {
        sourcePool.push(
          ...this.customRegularPool.map((text) => ({ text, preformatted: false }))
        );
      } else {
        sourcePool.push(
          ...this.builtInRegularPool.map((text) => ({
            text,
            preformatted: false,
          }))
        );
      }
    }

    const output: string[] = [];
    let drawBag = this.shuffleItems(sourcePool);
    let previousText = "";

    for (let i = 0; i < wordCount; i++) {
      if (drawBag.length === 0) {
        drawBag = this.shuffleItems(sourcePool);
      }

      let entry = drawBag.pop();
      if (!entry) {
        continue;
      }

      if (entry.text === previousText && drawBag.length > 0) {
        drawBag.unshift(entry);
        const nextEntry = drawBag.pop();
        if (nextEntry) {
          entry = nextEntry;
        }
      }

      if (entry.preformatted) {
        output.push(entry.text);
      } else {
        output.push(
          this.applyRegularDifficulty(entry.text, i, wordCount, difficulty)
        );
      }

      previousText = entry.text;
    }

    return output;
  }
}

export const wordManager = new WordManager();
