export type RoguePhase = "idle" | "operation" | "shop" | "game-over" | "victory";
export type OperationType = "probe" | "intrude" | "firewall";

export type ScriptTier = "utility" | "advanced" | "exploit" | "zero-day";

export type ScriptId =
  | "keylogger"
  | "packet_sniffer"
  | "idle_daemon"
  | "throttle_hook"
  | "null_handler"
  | "fork_bomb"
  | "brute_force"
  | "parity_check"
  | "stack_overflow"
  | "watchdog_timer"
  | "cascade_exploit"
  | "fragile_payload"
  | "zero_fault"
  | "overclock_bin"
  | "deep_scan"
  | "singularity_0day"
  | "echo_chamber";

export type CommandId =
  | "flush_amp"
  | "payload_burst"
  | "spoof_script"
  | "extend_timeout"
  | "recompile"
  | "inject";

export type PatchId =
  | "patch_clean"
  | "patch_burst"
  | "patch_finish"
  | "patch_deep"
  | "patch_recover";

export type LicenseId =
  | "license_slots"
  | "license_threshold"
  | "license_bulk"
  | "license_commands"
  | "license_patches"
  | "license_interest"
  | "license_failsafe";

export type FirewallId =
  | "scrambler"
  | "bit_flip"
  | "readonly"
  | "blackout"
  | "bloat"
  | "throttle"
  | "mirror"
  | "amnesia"
  | "null_amp"
  | "gc_sweep";

interface ScriptDefinition {
  id: ScriptId;
  label: string;
  description: string;
  tier: ScriptTier;
  baseCost: number;
}

interface CommandDefinition {
  id: CommandId;
  label: string;
  description: string;
  baseCost: number;
}

interface PatchDefinition {
  id: PatchId;
  label: string;
  description: string;
  baseCost: number;
}

interface LicenseDefinition {
  id: LicenseId;
  label: string;
  description: string;
  baseCost: number;
}

interface FirewallDefinition {
  id: FirewallId;
  label: string;
  description: string;
}

interface SectorConfig {
  sector: number;
  scoreTarget: number;
  timeLimitSec: number;
}

interface ScoreEvent {
  out: number;
  amp: number;
  gain: number;
  reason: string;
}

export interface FirewallBriefing {
  id: FirewallId;
  label: string;
  description: string;
}

export interface OperationBriefing {
  label: string;
  targetScore: number;
  timeLimitSec: number;
  canSkip: boolean;
  firewalls: FirewallBriefing[];
}

export interface ScorePopup {
  id: number;
  out: number;
  amp: number;
  gain: number;
  reason: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface InputResult {
  accepted: boolean;
  correct: boolean;
  message?: string;
  wordCompleted?: boolean;
  perfectWord?: boolean;
  ampLevel?: number;
  cleanChain?: number;
}

interface ShopOffers {
  scripts: ScriptId[];
  commands: CommandId[];
  patches: PatchId[];
  license: LicenseId | null;
}

interface ActiveOperation {
  sector: number;
  operationInSector: 1 | 2 | 3;
  type: OperationType;
  targetScore: number;
  durationMs: number;
  startedAt: number;
  promptStartedAt: number;

  scoreEarned: number;
  outValue: number;
  ampValue: number;

  typedText: string;
  errorText: string;
  expectedText: string;
  maskedExpectedText: string;
  promptKind: "words" | "code";
  promptWords: string[];
  currentWordIndex: number;
  currentWordTypedLength: number;
  currentWordLockIndex: number;
  currentWordBackspaced: boolean;
  currentWordStartedAt: number | null;

  cleanChain: number;
  wordsScored: number;
  lastWordOutGain: number;
  backspacesInOperation: number;

  payloadBurstWordsLeft: number;
  flushAmpBonusPerWord: number;
  injectWordsLeft: number;
  spoofedScript: ScriptId | null;

  throttleHookTriggered: boolean;
  watchdogTicksApplied: number;
  gcSweepTicksApplied: number;
  bruteForceApplied: boolean;
  singularityUsed: boolean;

  firewalls: FirewallId[];
  promptHidden: boolean;
  scoreFeedbackHidden: boolean;

  lastEvent: ScoreEvent | null;
  rewardMultiplier: number;
}

const STARTING_CREDITS = 4;
const OPERATION_BASE_REWARD = 4;

const BASE_SCRIPT_SLOTS = 3;
const MAX_SCRIPT_SLOTS = 3;
const BASE_COMMAND_SLOTS = 2;
const BASE_PATCH_SLOTS = 2;

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 1, scoreTarget: 500, timeLimitSec: 60 },
  { sector: 2, scoreTarget: 1200, timeLimitSec: 55 },
  { sector: 3, scoreTarget: 2800, timeLimitSec: 50 },
  { sector: 4, scoreTarget: 6000, timeLimitSec: 48 },
  { sector: 5, scoreTarget: 13000, timeLimitSec: 45 },
  { sector: 6, scoreTarget: 28000, timeLimitSec: 42 },
  { sector: 7, scoreTarget: 60000, timeLimitSec: 40 },
  { sector: 8, scoreTarget: 140000, timeLimitSec: 38 },
];

const SCRIPT_DEFS: Record<ScriptId, ScriptDefinition> = {
  keylogger: {
    id: "keylogger",
    label: "keylogger.sh",
    description: "+5 OUT per word typed.",
    tier: "utility",
    baseCost: 3,
  },
  packet_sniffer: {
    id: "packet_sniffer",
    label: "packet_sniffer",
    description: "+0.1 AMP per clean word.",
    tier: "utility",
    baseCost: 3,
  },
  idle_daemon: {
    id: "idle_daemon",
    label: "idle_daemon",
    description: "+0.05 AMP per second remaining when operation clears.",
    tier: "utility",
    baseCost: 3,
  },
  throttle_hook: {
    id: "throttle_hook",
    label: "throttle_hook",
    description: "+0.2 AMP when WPM exceeds threshold.",
    tier: "utility",
    baseCost: 3,
  },
  null_handler: {
    id: "null_handler",
    label: "null_handler",
    description: "Backspace no longer breaks streak.",
    tier: "utility",
    baseCost: 3,
  },
  fork_bomb: {
    id: "fork_bomb",
    label: "fork_bomb.sh",
    description: "Every 5th word doubles current AMP for that score event.",
    tier: "advanced",
    baseCost: 5,
  },
  brute_force: {
    id: "brute_force",
    label: "brute_force",
    description: "Prompt cleared in under 20s gives +3 AMP for the operation.",
    tier: "advanced",
    baseCost: 5,
  },
  parity_check: {
    id: "parity_check",
    label: "parity_check",
    description: "Even-length words use +20 OUT base instead of +10 OUT base.",
    tier: "advanced",
    baseCost: 5,
  },
  stack_overflow: {
    id: "stack_overflow",
    label: "stack_overflow",
    description: "Each cleared operation adds +0.1 AMP permanently for this run.",
    tier: "advanced",
    baseCost: 5,
  },
  watchdog_timer: {
    id: "watchdog_timer",
    label: "watchdog.timer",
    description: "+0.1 AMP per 5 seconds elapsed.",
    tier: "advanced",
    baseCost: 5,
  },
  cascade_exploit: {
    id: "cascade_exploit",
    label: "cascade.exploit",
    description: "Word scored under 2s re-triggers previous word OUT.",
    tier: "exploit",
    baseCost: 7,
  },
  fragile_payload: {
    id: "fragile_payload",
    label: "fragile_payload",
    description: "AMP starts at x3, resets to x1 on any backspace.",
    tier: "exploit",
    baseCost: 7,
  },
  zero_fault: {
    id: "zero_fault",
    label: "zero_fault",
    description: "Zero-backspace operation clear doubles operation score.",
    tier: "exploit",
    baseCost: 7,
  },
  overclock_bin: {
    id: "overclock_bin",
    label: "overclock.bin",
    description: "All AMP additions are doubled, but operation time is reduced by 10s.",
    tier: "exploit",
    baseCost: 7,
  },
  deep_scan: {
    id: "deep_scan",
    label: "deep_scan",
    description: "Words of length 8+ grant +2 AMP instead of base word OUT.",
    tier: "exploit",
    baseCost: 7,
  },
  singularity_0day: {
    id: "singularity_0day",
    label: "singularity.0day",
    description: "Once per operation, a sub-1s word sets AMP = AMP^2 (cap x50).",
    tier: "zero-day",
    baseCost: 10,
  },
  echo_chamber: {
    id: "echo_chamber",
    label: "echo_chamber",
    description: "Script effects trigger twice. Script slot capacity is reduced by 2.",
    tier: "zero-day",
    baseCost: 10,
  },
};

const COMMAND_DEFS: Record<CommandId, CommandDefinition> = {
  flush_amp: {
    id: "flush_amp",
    label: "--flush-amp",
    description: "Reset AMP to 1.0 and add current AMP as flat OUT bonus per remaining word.",
    baseCost: 3,
  },
  payload_burst: {
    id: "payload_burst",
    label: "--payload-burst",
    description: "Next 5 words score triple OUT.",
    baseCost: 3,
  },
  spoof_script: {
    id: "spoof_script",
    label: "--spoof-script",
    description: "Copy a random owned script effect for this operation.",
    baseCost: 3,
  },
  extend_timeout: {
    id: "extend_timeout",
    label: "--extend-timeout",
    description: "+10 seconds to operation timer.",
    baseCost: 3,
  },
  recompile: {
    id: "recompile",
    label: "--recompile",
    description: "Reroll a random equipped script to another script of the same rarity.",
    baseCost: 3,
  },
  inject: {
    id: "inject",
    label: "--inject",
    description: "Next word grants +1 AMP regardless of backspaces.",
    baseCost: 3,
  },
};

const PATCH_DEFS: Record<PatchId, PatchDefinition> = {
  patch_clean: {
    id: "patch_clean",
    label: "patch_clean.bin",
    description: "Clean word bonus +5 OUT per stack.",
    baseCost: 4,
  },
  patch_burst: {
    id: "patch_burst",
    label: "patch_burst.bin",
    description: "Burst trigger gives +0.1 AMP per stack.",
    baseCost: 4,
  },
  patch_finish: {
    id: "patch_finish",
    label: "patch_finish.bin",
    description: "Completion bonus multiplier +0.1 per stack.",
    baseCost: 4,
  },
  patch_deep: {
    id: "patch_deep",
    label: "patch_deep.bin",
    description: "Long word bonus +3 OUT per stack.",
    baseCost: 4,
  },
  patch_recover: {
    id: "patch_recover",
    label: "patch_recover.bin",
    description: "Backspace reset drops AMP by 0.5 per stack instead of full reset.",
    baseCost: 4,
  },
};

const LICENSE_DEFS: Record<LicenseId, LicenseDefinition> = {
  license_slots: {
    id: "license_slots",
    label: "license_slots.ext",
    description: "+1 script slot capacity.",
    baseCost: 8,
  },
  license_threshold: {
    id: "license_threshold",
    label: "license_threshold.ext",
    description: "Speed-script WPM threshold reduced by 10.",
    baseCost: 8,
  },
  license_bulk: {
    id: "license_bulk",
    label: "license_bulk.ext",
    description: "All shop items cost 1 credit less (stackable).",
    baseCost: 8,
  },
  license_commands: {
    id: "license_commands",
    label: "license_commands.ext",
    description: "+1 command slot.",
    baseCost: 8,
  },
  license_patches: {
    id: "license_patches",
    label: "license_patches.ext",
    description: "+1 patch slot.",
    baseCost: 8,
  },
  license_interest: {
    id: "license_interest",
    label: "license_interest.ext",
    description: "+1 credit per operation cleared (retroactive at purchase).",
    baseCost: 8,
  },
  license_failsafe: {
    id: "license_failsafe",
    label: "license_failsafe.ext",
    description: "Once per run, survive timeout failure with 5 seconds extension.",
    baseCost: 8,
  },
};

const FIREWALL_DEFS: Record<FirewallId, FirewallDefinition> = {
  scrambler: {
    id: "scrambler",
    label: "SCRAMBLER",
    description: "Prompt tokens are shuffled each prompt.",
  },
  bit_flip: {
    id: "bit_flip",
    label: "BIT_FLIP",
    description: "AMP gains become OUT gains and OUT gains become AMP gains.",
  },
  readonly: {
    id: "readonly",
    label: "READONLY",
    description: "Backspace is disabled.",
  },
  blackout: {
    id: "blackout",
    label: "BLACKOUT",
    description: "No score feedback is shown until operation end.",
  },
  bloat: {
    id: "bloat",
    label: "BLOAT",
    description: "Score target is doubled.",
  },
  throttle: {
    id: "throttle",
    label: "THROTTLE",
    description: "Time limit is halved, reward is doubled.",
  },
  mirror: {
    id: "mirror",
    label: "MIRROR",
    description: "All words are reversed.",
  },
  amnesia: {
    id: "amnesia",
    label: "AMNESIA",
    description: "Prompt is hidden after 3 seconds.",
  },
  null_amp: {
    id: "null_amp",
    label: "NULL_AMP",
    description: "AMP gains are disabled. Scoring comes only from OUT.",
  },
  gc_sweep: {
    id: "gc_sweep",
    label: "GC_SWEEP",
    description: "AMP resets to 1.0 every 10 seconds.",
  },
};

const NON_FINAL_FIREWALLS: FirewallId[] = [
  "scrambler",
  "bit_flip",
  "readonly",
  "blackout",
  "bloat",
  "throttle",
  "mirror",
  "amnesia",
  "null_amp",
  "gc_sweep",
];

const COMMON_WORDS = [
  "trace",
  "drift",
  "signal",
  "quiet",
  "stack",
  "ghost",
  "token",
  "route",
  "scope",
  "cache",
  "pulse",
  "delta",
  "matrix",
  "kernel",
  "packet",
  "cipher",
  "socket",
  "daemon",
  "buffer",
  "module",
  "vector",
  "branch",
  "commit",
  "thread",
  "orbit",
  "relay",
  "storm",
  "tunnel",
  "watch",
  "vault",
];

const COMPOUND_WORDS = [
  "handover",
  "backtrace",
  "overclock",
  "cacheline",
  "watchtower",
  "nightshift",
  "firebreak",
  "payload",
  "safeguard",
  "checksum",
  "downstream",
  "hardware",
  "lockstep",
  "northbound",
  "failsafe",
  "gridline",
  "redzone",
  "lifeline",
  "coreloop",
  "wildcard",
];

const BASH_TECH = [
  "grep",
  "awk",
  "sed",
  "xargs",
  "chmod",
  "tar",
  "systemctl",
  "journalctl",
  "--force",
  "--all",
  "--verbose",
  "pipeline",
  "daemon",
  "latency",
  "throughput",
  "hotfix",
  "rollback",
  "endpoint",
  "payload",
  "kernel",
  "iptables",
  "netstat",
  "traceroute",
  "syslog",
];

const CAMEL_DIGIT = [
  "cacheMiss2",
  "renderLoop7",
  "packetBurst9",
  "syncThread5",
  "deltaHash3",
  "byteShift8",
  "rootSignal6",
  "patchCycle4",
  "queueDrain2",
  "nodeRelay5",
  "tokenGate8",
  "pingFlood7",
  "traceMode9",
  "buildStep3",
  "configFlag2",
  "indexLoop6",
  "jobRunner4",
  "cleanExit1",
];

const SYMBOL_HEAVY = [
  "./deploy.sh",
  "src/app.ts",
  "--watch",
  "--no-cache",
  "auth@node",
  "{retry:3}",
  "[prod]",
  "$PATH",
  "&&",
  "||",
  "!=",
  "=>",
  "::",
  "npm:build",
  "git@origin",
  "curl://api",
  "db/main#1",
  "flag?true",
  "queue+1",
  "stack*2",
  "root/null",
  "v1.2.3",
];

const JS_SNIPPETS = [
  "function validateUser(user) { if (!user) { return false; } return user.isActive; }",
  "const total = items.reduce((sum, item) => sum + item.price, 0);",
  "function normalize(text) { return text.trim().toLowerCase(); }",
  "const hasAccess = role === 'admin' || role === 'owner';",
  "if (count > 10) { return list.slice(0, 10); }",
  "const payload = { id: userId, token: sessionToken, retry: 3 };",
  "function isValid(code) { return code.length >= 8 && code.includes('_'); }",
  "const next = queue.filter((job) => job.status === 'pending');",
  "async function loadData(api) { const data = await api.fetch(); return data; }",
  "const safe = value ?? defaultValue;",
  "function parseFlag(input) { if (input === '1') { return true; } return false; }",
  "const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';",
  "function canRetry(attempt) { return attempt < 5; }",
  "const config = { timeout: 5000, cache: true, mode: 'strict' };",
  "if (error) { logger.warn(error.message); return null; }",
  "function mapUser(user) { return { id: user.id, name: user.name }; }",
  "const unique = [...new Set(values)];",
  "function isEven(value) { return value % 2 === 0; }",
  "const visible = list.find((entry) => entry.enabled);",
  "function pickFirst(arr) { if (!arr.length) { return null; } return arr[0]; }",
  "const path = `${baseUrl}/api/v1/users`;",
  "function allowWrite(scope) { return scope.includes('write'); }",
  "const ready = state === 'ready' && !isLocked;",
  "function compose(a, b) { return `${a}-${b}`; }",
  "if (signal.aborted) { throw new Error('aborted'); }",
];

const SQL_SNIPPETS = [
  "SELECT id, email FROM users WHERE is_active = 1;",
  "SELECT role, COUNT(*) FROM users GROUP BY role;",
  "UPDATE users SET last_login = NOW() WHERE id = 42;",
  "DELETE FROM sessions WHERE expires_at < NOW();",
  "SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;",
  "INSERT INTO logs(level, message) VALUES('info', 'job started');",
  "SELECT u.id, u.name FROM users u INNER JOIN teams t ON t.id = u.team_id;",
  "SELECT * FROM payments WHERE amount > 1000 LIMIT 25;",
  "SELECT COUNT(*) FROM requests WHERE code = 500;",
  "SELECT name FROM products WHERE stock > 0 ORDER BY name ASC;",
  "SELECT id FROM files WHERE checksum IS NOT NULL;",
  "UPDATE jobs SET status = 'done' WHERE finished_at IS NOT NULL;",
  "SELECT * FROM users WHERE email LIKE '%@company.com';",
  "SELECT project_id, SUM(cost) FROM expenses GROUP BY project_id;",
  "SELECT * FROM tokens WHERE revoked = 0 AND expires_at > NOW();",
  "SELECT id, created_at FROM events ORDER BY created_at DESC LIMIT 10;",
  "SELECT DISTINCT country FROM users;",
  "UPDATE settings SET value = 'on' WHERE key = 'feature_x';",
  "SELECT * FROM alerts WHERE severity IN ('high', 'critical');",
  "SELECT user_id, COUNT(*) FROM sessions GROUP BY user_id HAVING COUNT(*) > 3;",
  "SELECT * FROM invoices WHERE paid = 0;",
  "SELECT * FROM audit WHERE action = 'login' AND success = 1;",
  "SELECT * FROM teams WHERE archived = 0;",
  "SELECT id FROM jobs WHERE status = 'failed' ORDER BY updated_at DESC;",
  "SELECT * FROM configs WHERE env = 'prod';",
];

const SQLI_SNIPPETS = [
  "SELECT * FROM users WHERE name = 'admin' OR '1'='1';",
  "SELECT * FROM accounts WHERE id = 1 UNION SELECT user, pass FROM secrets;",
  "SELECT * FROM items WHERE sku = 'x' --';",
  "SELECT * FROM logs WHERE level = 'warn' OR SLEEP(2)=0;",
  "SELECT * FROM profile WHERE email = '' OR EXISTS(SELECT 1 FROM users);",
  "SELECT * FROM admin WHERE token = '' UNION SELECT version(), NULL;",
  "SELECT * FROM auth WHERE user = 'a' AND pass = '' OR '1'='1';",
  "SELECT * FROM clients WHERE id = 9 OR 1=1 LIMIT 1;",
  "SELECT * FROM files WHERE path = '/tmp' OR 'x'='x';",
  "SELECT * FROM orders WHERE ref = '' OR IF(1=1,1,0)=1;",
  "SELECT * FROM events WHERE id = 4 UNION SELECT table_name, NULL FROM information_schema.tables;",
  "SELECT * FROM users WHERE email = 'a@a.com' OR LENGTH(password) > 0;",
  "SELECT * FROM api_keys WHERE key = '' OR 'a'='a';",
  "SELECT * FROM notes WHERE id = 3 OR id IN (SELECT id FROM users);",
  "SELECT * FROM config WHERE env = 'dev' OR '1'='1';",
  "SELECT * FROM vault WHERE owner = '' UNION SELECT name, value FROM secrets;",
  "SELECT * FROM tasks WHERE id = '' OR EXISTS(SELECT 1 FROM tasks);",
  "SELECT * FROM members WHERE id = 1 OR benchmark(1000000,md5('a'));",
  "SELECT * FROM books WHERE title = '' OR 'x'='x' --';",
  "SELECT * FROM orders WHERE code = '' UNION SELECT user(), NULL;",
];

const BASH_SNIPPETS = [
  "if [ -f /etc/hosts ]; then echo ready; else echo missing; fi",
  "for file in *.log; do grep ERROR \"$file\"; done",
  "if [ \"$COUNT\" -gt 5 ]; then echo high; else echo low; fi",
  "result=$(cat app.log | tail -n 20 | grep WARN)",
  "if ps aux | grep -q node; then echo running; else echo stopped; fi",
  "for user in $(cat users.txt); do echo \"$user\"; done",
  "if [ -d backup ]; then tar -czf backup.tgz backup; fi",
  "line_count=$(wc -l < access.log)",
  "if [ \"$line_count\" -gt 1000 ]; then echo rotate; fi",
  "export API_URL=\"https://api.local\" && curl -s \"$API_URL/health\"",
  "if grep -q TODO src/main.ts; then echo todo-found; fi",
  "for i in 1 2 3; do echo \"retry $i\"; done",
  "if [ -z \"$TOKEN\" ]; then echo no-token; exit 1; fi",
  "archive_name=\"logs_$(date +%s).tgz\"",
  "if [ \"$MODE\" = \"prod\" ]; then echo deploy; else echo dry-run; fi",
  "for svc in api worker cron; do systemctl status \"$svc\"; done",
  "if [ -w /tmp ]; then touch /tmp/test.flag; fi",
  "json=$(curl -s \"$URL\" | jq '.status')",
  "if [ \"$json\" = \"ok\" ]; then echo pass; else echo fail; fi",
  "for path in src test docs; do find \"$path\" -type f | wc -l; done",
  "if [ -n \"$DEBUG\" ]; then set -x; fi",
  "hash=$(sha256sum app.tar.gz | awk '{print $1}')",
  "if [ \"$hash\" != \"\" ]; then echo hashed; fi",
  "for pid in $(pgrep node); do kill -0 \"$pid\" && echo alive; done",
  "if [ -r config.env ]; then source config.env; fi",
];

const CODE_LANGUAGE_POOLS = [JS_SNIPPETS, SQL_SNIPPETS, SQLI_SNIPPETS, BASH_SNIPPETS];

let phase: RoguePhase = "idle";
let statusText = "Type `--start to begin.";

let runScore = 0;
let credits = STARTING_CREDITS;
let operationsCleared = 0;
let failsafeSpent = false;

let licenseCounts: Record<LicenseId, number> = {
  license_slots: 0,
  license_threshold: 0,
  license_bulk: 0,
  license_commands: 0,
  license_patches: 0,
  license_interest: 0,
  license_failsafe: 0,
};

let patchStacks: Record<PatchId, number> = {
  patch_clean: 0,
  patch_burst: 0,
  patch_finish: 0,
  patch_deep: 0,
  patch_recover: 0,
};

let scripts: ScriptId[] = [];
let commands: CommandId[] = [];

let stackOverflowRunAmpBonus = 0;
let zeroDayPicked = false;
let codeSyntaxUnlocked = false;

let operation: ActiveOperation | null = null;
let pendingAfterShop: { sector: number; operationInSector: 1 | 2 | 3 } | null = null;
let shopOffers: ShopOffers = { scripts: [], commands: [], patches: [], license: null };
let shopRerolls = 0;
let shopLicenseBought = false;

let popupCounter = 1;
let popupQueue: ScorePopup[] = [];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomItem<T>(items: ReadonlyArray<T>): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: ReadonlyArray<T>): T[] {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = output[i];
    output[i] = output[j];
    output[j] = tmp;
  }
  return output;
}

function getSectorConfig(sector: number): SectorConfig {
  return SECTOR_CONFIGS[clamp(sector, 1, 8) - 1];
}

function getOperationType(operationInSector: 1 | 2 | 3): OperationType {
  if (operationInSector === 1) return "probe";
  if (operationInSector === 2) return "intrude";
  return "firewall";
}

function getWordCountForSector(sector: number): number {
  return 8 + Math.floor(((clamp(sector, 1, 8) - 1) * 6) / 7);
}

function reverseToken(word: string): string {
  return Array.from(word).reverse().join("");
}

function createSectorWordPool(sector: number): string[] {
  if (sector <= 2) {
    return COMMON_WORDS.filter((word) => word.length >= 3 && word.length <= 6);
  }

  if (sector <= 4) {
    return [...COMMON_WORDS, ...COMPOUND_WORDS];
  }

  if (sector === 5) {
    return [...BASH_TECH, ...COMPOUND_WORDS.slice(0, 8)];
  }

  if (sector === 6) {
    return [...CAMEL_DIGIT, ...BASH_TECH.slice(0, 12)];
  }

  if (sector === 7) {
    const reversed = COMMON_WORDS.slice(0, 12).map((word) => reverseToken(word));
    return [...SYMBOL_HEAVY, ...reversed, ...CAMEL_DIGIT.slice(0, 8)];
  }

  return [...COMMON_WORDS, ...COMPOUND_WORDS, ...BASH_TECH, ...CAMEL_DIGIT, ...SYMBOL_HEAVY];
}

function createPromptWords(
  sector: number,
  count: number,
  firewalls: ReadonlyArray<FirewallId>,
  useCodeSyntax: boolean
): { words: string[]; kind: "words" | "code" } {
  if (useCodeSyntax) {
    const words = createCodeSyntaxPromptWords(count, firewalls);
    return { words, kind: "code" };
  }

  const pool = createSectorWordPool(sector);
  const selected: string[] = [];

  while (selected.length < count) {
    selected.push(randomItem(pool));
  }

  let words = [...selected];

  if (firewalls.includes("scrambler")) {
    words = shuffle(words);
  }

  if (firewalls.includes("mirror")) {
    words = words.map((word) => reverseToken(word));
  }

  return { words, kind: "words" };
}

function tokenizeSnippet(snippet: string): string[] {
  return snippet
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function createCodeSyntaxPromptWords(
  count: number,
  firewalls: ReadonlyArray<FirewallId>
): string[] {
  const output: string[] = [];

  while (output.length < count) {
    const snippetPool = randomItem(CODE_LANGUAGE_POOLS);
    const snippet = randomItem(snippetPool);
    const tokens = tokenizeSnippet(snippet);
    for (const token of tokens) {
      output.push(token);
      if (output.length >= count) break;
    }
  }

  let words = output.slice(0, count);

  if (firewalls.includes("scrambler")) {
    words = shuffle(words);
  }

  if (firewalls.includes("mirror")) {
    words = words.map((word) => reverseToken(word));
  }

  return words;
}

function maskSingleCharInWord(word: string): string {
  if (word.length <= 1) return word;

  const candidates: number[] = [];
  for (let i = 0; i < word.length; i += 1) {
    if (/[A-Za-z0-9]/.test(word[i])) {
      candidates.push(i);
    }
  }

  if (candidates.length === 0) return word;

  const chosen = randomItem(candidates);
  return `${word.slice(0, chosen)}*${word.slice(chosen + 1)}`;
}

function buildMaskedExpectedText(words: ReadonlyArray<string>, kind: "words" | "code"): string {
  if (words.length === 0) return "";

  if (kind === "words") {
    return words.map((word) => maskSingleCharInWord(word)).join(" ");
  }

  const candidates: number[] = [];
  for (let i = 0; i < words.length; i += 1) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(words[i])) {
      candidates.push(i);
    }
  }

  if (candidates.length === 0) {
    for (let i = 0; i < words.length; i += 1) {
      if (words[i].length > 0 && words[i] !== "{") {
        candidates.push(i);
      }
    }
  }

  if (candidates.length === 0) {
    return words.join(" ");
  }

  const maskedIndex = randomItem(candidates);
  const maskedWords = [...words];
  maskedWords[maskedIndex] = "*".repeat(Math.max(1, words[maskedIndex].length));
  return maskedWords.join(" ");
}

function getScriptCount(id: ScriptId): number {
  let count = 0;
  for (const owned of scripts) {
    if (owned === id) count += 1;
  }
  if (operation?.spoofedScript === id) {
    count += 1;
  }
  return count;
}

function hasScript(id: ScriptId): boolean {
  return getScriptCount(id) > 0;
}

function hasFirewall(id: FirewallId): boolean {
  return operation?.firewalls.includes(id) ?? false;
}

function getEchoMultiplier(): number {
  return hasScript("echo_chamber") ? 2 : 1;
}

function getAmpAdditionMultiplier(): number {
  if (!hasScript("overclock_bin")) {
    return 1;
  }

  return Math.pow(2, getEchoMultiplier());
}

function getWpmThreshold(): number {
  return Math.max(10, 60 - licenseCounts.license_threshold * 10);
}

function getScriptSlotCapacity(): number {
  const fromLicense = Math.min(MAX_SCRIPT_SLOTS, BASE_SCRIPT_SLOTS + licenseCounts.license_slots);
  const reducedByEcho = hasScript("echo_chamber") ? 2 : 0;
  return Math.max(1, fromLicense - reducedByEcho);
}

function getCommandSlotCapacity(): number {
  return BASE_COMMAND_SLOTS + licenseCounts.license_commands;
}

function getPatchSlotCapacity(): number {
  return BASE_PATCH_SLOTS + licenseCounts.license_patches;
}

function getUsedPatchSlots(): number {
  return (Object.keys(patchStacks) as PatchId[]).filter((id) => patchStacks[id] > 0).length;
}

function getBulkDiscount(): number {
  return licenseCounts.license_bulk;
}

function getItemCost(baseCost: number): number {
  return Math.max(1, baseCost - getBulkDiscount());
}

function pickFirewallSetForOperation(
  sector: number,
  operationInSector: 1 | 2 | 3
): FirewallId[] {
  if (operationInSector !== 3) {
    return [];
  }

  if (sector === 8) {
    return shuffle(NON_FINAL_FIREWALLS).slice(0, 3);
  }

  return [randomItem(NON_FINAL_FIREWALLS)];
}

function shouldUseCodeSyntaxForSector(sector: number): boolean {
  return codeSyntaxUnlocked && sector >= 2;
}

function buildOperation(
  sector: number,
  operationInSector: 1 | 2 | 3,
  now: number
): ActiveOperation {
  const type = getOperationType(operationInSector);
  const config = getSectorConfig(sector);

  const baseTarget =
    type === "probe"
      ? Math.round(config.scoreTarget * 0.75)
      : type === "intrude"
        ? config.scoreTarget
        : Math.round(config.scoreTarget * 1.25);

  const firewalls = pickFirewallSetForOperation(sector, operationInSector);

  let targetScore = baseTarget;
  let durationMs = config.timeLimitSec * 1000;
  let rewardMultiplier = 1;

  if (firewalls.includes("bloat")) {
    targetScore *= 2;
  }

  if (firewalls.includes("throttle")) {
    durationMs = Math.max(12_000, Math.round(durationMs / 2));
    rewardMultiplier *= 2;
  }

  if (sector === 8 && operationInSector === 3) {
    targetScore *= 3;
  }

  if (hasScript("overclock_bin")) {
    durationMs = Math.max(8_000, durationMs - 10_000);
  }

  const ampStart = hasScript("fragile_payload") ? 3 + stackOverflowRunAmpBonus : 1 + stackOverflowRunAmpBonus;

  const promptResult = createPromptWords(
    sector,
    getWordCountForSector(sector),
    firewalls,
    shouldUseCodeSyntaxForSector(sector)
  );
  const promptWords = promptResult.words;
  const expectedText = promptWords.join(" ");
  const maskedExpectedText = buildMaskedExpectedText(promptWords, promptResult.kind);

  return {
    sector,
    operationInSector,
    type,
    targetScore,
    durationMs,
    startedAt: now,
    promptStartedAt: now,
    scoreEarned: 0,
    outValue: 0,
    ampValue: round2(ampStart),
    typedText: "",
    errorText: "",
    expectedText,
    maskedExpectedText,
    promptKind: promptResult.kind,
    promptWords,
    currentWordIndex: 0,
    currentWordTypedLength: 0,
    currentWordLockIndex: 0,
    currentWordBackspaced: false,
    currentWordStartedAt: null,
    cleanChain: 0,
    wordsScored: 0,
    lastWordOutGain: 0,
    backspacesInOperation: 0,
    payloadBurstWordsLeft: 0,
    flushAmpBonusPerWord: 0,
    injectWordsLeft: 0,
    spoofedScript: null,
    throttleHookTriggered: false,
    watchdogTicksApplied: 0,
    gcSweepTicksApplied: 0,
    bruteForceApplied: false,
    singularityUsed: false,
    firewalls,
    promptHidden: false,
    scoreFeedbackHidden: firewalls.includes("blackout"),
    lastEvent: null,
    rewardMultiplier,
  };
}

function setPromptForCurrentOperation(words: string[], now: number): void {
  if (!operation) return;

  operation.promptWords = words;
  operation.expectedText = words.join(" ");
  operation.maskedExpectedText = buildMaskedExpectedText(words, operation.promptKind);
  operation.typedText = "";
  operation.errorText = "";
  operation.currentWordIndex = 0;
  operation.currentWordTypedLength = 0;
  operation.currentWordLockIndex = 0;
  operation.currentWordBackspaced = false;
  operation.currentWordStartedAt = null;
  operation.promptStartedAt = now;
  operation.promptHidden = false;
}

function pushPopup(out: number, amp: number, gain: number, reason: string): void {
  popupQueue.push({
    id: popupCounter,
    out: Math.round(out),
    amp: round2(amp),
    gain,
    reason,
  });
  popupCounter += 1;
}

function applyAmpGain(delta: number): void {
  if (!operation) return;
  if (delta <= 0) return;
  if (hasFirewall("null_amp")) {
    operation.ampValue = 1;
    return;
  }

  operation.ampValue = round2(operation.ampValue + delta);
}

function addScoreEvent(out: number, amp: number, gain: number, reason: string): void {
  if (!operation) return;

  const safeGain = Math.max(0, Math.round(gain));
  operation.scoreEarned += safeGain;
  runScore += safeGain;

  operation.lastEvent = {
    out: Math.round(out),
    amp: round2(amp),
    gain: safeGain,
    reason,
  };

  if (!operation.scoreFeedbackHidden) {
    pushPopup(out, amp, safeGain, reason);
  }
}

function isOperationCleared(): boolean {
  if (!operation) return false;
  return operation.scoreEarned >= operation.targetScore;
}

function applyStackOverflowProgression(): void {
  if (!hasScript("stack_overflow")) return;
  stackOverflowRunAmpBonus = round2(stackOverflowRunAmpBonus + 0.1 * getEchoMultiplier());
}

function addOperationRewards(): void {
  if (!operation) return;

  let reward = OPERATION_BASE_REWARD;

  const overTargetRatio = operation.scoreEarned / Math.max(1, operation.targetScore);
  const overSteps = clamp(Math.floor((overTargetRatio - 1) / 0.25), 0, 4);
  reward += overSteps;

  if (operation.backspacesInOperation === 0) {
    reward += 2;
  }

  reward += licenseCounts.license_interest;
  reward = Math.max(1, Math.round(reward * operation.rewardMultiplier));

  credits += reward;
  statusText = `Operation cleared. +${reward} credits.`;
}

function applyClearScripts(now: number): void {
  if (!operation) return;

  if (hasScript("idle_daemon")) {
    const secondsRemaining = Math.max(0, getRemainingMs(now) / 1000);
    const idleGain = secondsRemaining * 0.05 * getEchoMultiplier();
    applyAmpGain(idleGain);
  }

  if (hasScript("zero_fault") && operation.backspacesInOperation === 0) {
    const bonus = operation.scoreEarned;
    operation.scoreEarned += bonus;
    runScore += bonus;
    operation.lastEvent = {
      out: Math.round(operation.outValue),
      amp: round2(operation.ampValue),
      gain: bonus,
      reason: "zero_fault",
    };
    if (!operation.scoreFeedbackHidden) {
      pushPopup(operation.outValue, operation.ampValue, bonus, "zero_fault");
    }
  }

  applyStackOverflowProgression();
}

function rollShopOffers(): void {
  const scriptPool = shuffle(Object.keys(SCRIPT_DEFS) as ScriptId[]);
  const commandPool = shuffle(Object.keys(COMMAND_DEFS) as CommandId[]);
  const patchPool = shuffle(Object.keys(PATCH_DEFS) as PatchId[]);
  const licensePool = shuffle(Object.keys(LICENSE_DEFS) as LicenseId[]);

  shopOffers = {
    scripts: scriptPool.slice(0, 3),
    commands: commandPool.slice(0, 2),
    patches: patchPool.slice(0, 2),
    license: licensePool[0] ?? null,
  };
}

function openShop(nextSector: number): void {
  phase = "shop";
  pendingAfterShop = { sector: nextSector, operationInSector: 1 };
  shopRerolls = 0;
  shopLicenseBought = false;
  rollShopOffers();

  const interest = clamp(Math.floor(credits / 5), 0, 5);
  if (interest > 0) {
    credits += interest;
    statusText = `Shop open. Interest payout +${interest} credits.`;
  } else {
    statusText = "Shop open.";
  }
}

function beginOperation(sector: number, operationInSector: 1 | 2 | 3, now: number): void {
  operation = buildOperation(sector, operationInSector, now);
  phase = "operation";

  const type = operation.type === "probe" ? "Probe" : operation.type === "intrude" ? "Intrude" : "Firewall Boss";
  statusText = `Sector ${sector} ${type} started.`;
}

function advanceAfterOperationClear(now: number): void {
  if (!operation) return;

  const { sector, operationInSector } = operation;

  if (operationInSector === 1) {
    beginOperation(sector, 2, now);
    return;
  }

  if (operationInSector === 2) {
    beginOperation(sector, 3, now);
    return;
  }

  if (sector >= 8) {
    phase = "victory";
    operation = null;
    statusText = "ROOT_SYSTEM breached. Run complete.";
    return;
  }

  operation = null;
  openShop(sector + 1);
}

function failOperation(message: string): void {
  phase = "game-over";
  statusText = message;
}

function applyPromptCompletion(now: number): void {
  if (!operation) return;

  const promptElapsedSec = (now - operation.promptStartedAt) / 1000;

  if (hasScript("brute_force") && !operation.bruteForceApplied && promptElapsedSec < 20) {
    let ampGain = 3 * getEchoMultiplier();
    ampGain *= getAmpAdditionMultiplier();
    if (hasFirewall("bit_flip")) {
      operation.outValue = round2(operation.outValue + ampGain);
    } else {
      applyAmpGain(ampGain);
    }
    operation.bruteForceApplied = true;
  }

  const completionMultiplier = 1.5 + patchStacks.patch_finish * 0.1;
  const bonusOut = operation.outValue * (completionMultiplier - 1);
  operation.outValue = round2(operation.outValue + bonusOut);

  const amp = hasFirewall("null_amp") ? 1 : operation.ampValue;
  addScoreEvent(operation.outValue, amp, bonusOut * amp, "prompt_clear");

  if (isOperationCleared()) {
    finalizeOperationClear(now);
    return;
  }

  const newPrompt = createPromptWords(
    operation.sector,
    getWordCountForSector(operation.sector),
    operation.firewalls,
    operation.promptKind === "code"
  );
  setPromptForCurrentOperation(newPrompt.words, now);
  statusText = "Prompt cleared. Next prompt injected.";
}

function applyWordScoring(word: string, durationSec: number, clean: boolean, wpm: number): void {
  if (!operation) return;

  operation.wordsScored += 1;

  const echoMultiplier = getEchoMultiplier();
  let outGain = 0;
  let ampGain = 0;

  const deepScanActive = hasScript("deep_scan") && word.length >= 8;

  if (deepScanActive) {
    ampGain += 2 * echoMultiplier;
  } else {
    const parityBase = hasScript("parity_check") && word.length % 2 === 0 ? 20 * echoMultiplier : 10;
    outGain += parityBase + word.length * 2;

    if (hasScript("keylogger")) {
      outGain += 5 * echoMultiplier;
    }
  }

  if (word.length >= 8) {
    outGain += patchStacks.patch_deep * 3;
  }

  if (operation.flushAmpBonusPerWord > 0) {
    outGain += operation.flushAmpBonusPerWord;
  }

  if (clean) {
    outGain += 15 + patchStacks.patch_clean * 5;

    operation.cleanChain += 1;

    if (hasScript("packet_sniffer")) {
      ampGain += 0.1 * echoMultiplier;
    }

    if (operation.cleanChain > 0 && operation.cleanChain % 3 === 0) {
      ampGain += 0.2 + patchStacks.patch_burst * 0.1;
    }
  } else {
    operation.cleanChain = 0;
  }

  if (hasScript("throttle_hook") && !operation.throttleHookTriggered && wpm > getWpmThreshold()) {
    ampGain += 0.2 * echoMultiplier;
    operation.throttleHookTriggered = true;
  }

  if (hasScript("watchdog_timer")) {
    const elapsedSec = (performance.now() - operation.startedAt) / 1000;
    const ticks = Math.floor(elapsedSec / 5);
    const deltaTicks = ticks - operation.watchdogTicksApplied;

    if (deltaTicks > 0) {
      ampGain += deltaTicks * 0.1 * echoMultiplier;
      operation.watchdogTicksApplied = ticks;
    }
  }

  if (operation.injectWordsLeft > 0) {
    ampGain += 1;
    operation.injectWordsLeft -= 1;
  }

  if (hasScript("cascade_exploit") && durationSec < 2 && operation.lastWordOutGain > 0) {
    outGain += operation.lastWordOutGain * echoMultiplier;
  }

  if (operation.payloadBurstWordsLeft > 0) {
    outGain *= 3;
    operation.payloadBurstWordsLeft -= 1;
  }

  ampGain *= getAmpAdditionMultiplier();

  if (hasFirewall("bit_flip")) {
    const tempOut = outGain;
    outGain = ampGain;
    ampGain = tempOut;
  }

  operation.outValue = round2(operation.outValue + outGain);

  if (!hasFirewall("null_amp")) {
    applyAmpGain(ampGain);
  } else {
    operation.ampValue = 1;
  }

  if (hasScript("singularity_0day") && !operation.singularityUsed && durationSec < 1) {
    const triggers = hasScript("echo_chamber") ? 2 : 1;

    for (let i = 0; i < triggers; i += 1) {
      operation.ampValue = clamp(operation.ampValue * operation.ampValue, 1, 50);
    }

    operation.singularityUsed = true;
  }

  let ampForScore = hasFirewall("null_amp") ? 1 : operation.ampValue;

  if (hasScript("fork_bomb") && operation.wordsScored % 5 === 0) {
    const factor = Math.pow(2, getEchoMultiplier());
    ampForScore = round2(ampForScore * factor);
  }

  const gain = operation.outValue * ampForScore;
  addScoreEvent(operation.outValue, ampForScore, gain, "word");

  operation.lastWordOutGain = outGain;
}

function prepareNewWordIfNeeded(char: string, now: number): void {
  if (!operation) return;
  if (char === " ") return;

  if (operation.currentWordStartedAt === null) {
    operation.currentWordStartedAt = now;
  }
}

function isCurrentWordComplete(): boolean {
  if (!operation) return false;
  const expectedWord = operation.promptWords[operation.currentWordIndex] ?? "";
  return operation.currentWordTypedLength >= expectedWord.length;
}

function moveToNextWordBoundary(): void {
  if (!operation) return;

  operation.currentWordIndex += 1;
  operation.currentWordTypedLength = 0;
  operation.currentWordBackspaced = false;
  operation.currentWordStartedAt = null;
  operation.currentWordLockIndex = operation.typedText.length;
}

function canUseFailsafe(): boolean {
  return licenseCounts.license_failsafe > 0 && !failsafeSpent;
}

function applyBackspacePenalty(): void {
  if (!operation) return;

  operation.currentWordBackspaced = true;
  operation.backspacesInOperation += 1;

  if (hasScript("fragile_payload")) {
    operation.ampValue = 1;
    operation.cleanChain = 0;
    return;
  }

  if (hasScript("null_handler")) {
    return;
  }

  if (patchStacks.patch_recover > 0) {
    const drop = 0.5 * patchStacks.patch_recover;
    operation.ampValue = round2(Math.max(1, operation.ampValue - drop));
  } else {
    operation.ampValue = 1;
  }

  operation.cleanChain = 0;
}

export function startNewRun(now = performance.now()): void {
  resetRunState();
  phase = "operation";
  statusText = "Run started.";
  beginOperation(1, 1, now);
}

export function resetRunState(): void {
  phase = "idle";
  statusText = "Type `--start to begin.";

  runScore = 0;
  credits = STARTING_CREDITS;
  operationsCleared = 0;
  failsafeSpent = false;
  stackOverflowRunAmpBonus = 0;
  zeroDayPicked = false;
  codeSyntaxUnlocked = false;

  scripts = [];
  commands = [];

  licenseCounts = {
    license_slots: 0,
    license_threshold: 0,
    license_bulk: 0,
    license_commands: 0,
    license_patches: 0,
    license_interest: 0,
    license_failsafe: 0,
  };

  patchStacks = {
    patch_clean: 0,
    patch_burst: 0,
    patch_finish: 0,
    patch_deep: 0,
    patch_recover: 0,
  };

  operation = null;
  pendingAfterShop = null;
  shopOffers = { scripts: [], commands: [], patches: [], license: null };
  shopRerolls = 0;
  shopLicenseBought = false;

  popupQueue = [];
  popupCounter = 1;
}

export function tick(now = performance.now()): void {
  if (phase !== "operation" || !operation) {
    return;
  }

  const elapsed = now - operation.startedAt;

  if (operation.firewalls.includes("amnesia") && elapsed >= 3000) {
    operation.promptHidden = true;
  }

  if (operation.firewalls.includes("gc_sweep")) {
    const ticks = Math.floor(elapsed / 10_000);

    if (ticks > operation.gcSweepTicksApplied) {
      operation.ampValue = 1;
      operation.gcSweepTicksApplied = ticks;
      statusText = "GC_SWEEP reset AMP.";
    }
  }

  if (getRemainingMs(now) > 0) {
    return;
  }

  if (canUseFailsafe()) {
    failsafeSpent = true;
    operation.startedAt = now - (operation.durationMs - 5000);
    statusText = "Failsafe triggered. +5s emergency window.";
    return;
  }

  failOperation("Operation timeout. Run failed.");
}

export function typeChar(char: string, now: number, wpm: number): InputResult {
  if (phase !== "operation" || !operation) {
    return { accepted: false, correct: false, message: "No active operation." };
  }

  if (char.length !== 1) {
    return { accepted: false, correct: false };
  }

  const expectedChar = operation.expectedText[operation.typedText.length];
  if (!expectedChar) {
    return { accepted: false, correct: false };
  }

  if (hasFirewall("readonly") && operation.errorText.length > 0) {
    operation.errorText = "";
  }

  if (operation.errorText.length > 0) {
    if (hasFirewall("readonly")) {
      statusText = "Mismatch.";
      return { accepted: false, correct: false, message: statusText };
    }

    const remaining = Math.max(0, operation.expectedText.length - operation.typedText.length);
    if (operation.errorText.length >= remaining) {
      statusText = "Mismatch. Backspace to recover.";
      return { accepted: false, correct: false, message: statusText };
    }
    operation.errorText += char;
    statusText = "Mismatch. Backspace to recover.";
    return { accepted: true, correct: false, message: statusText };
  }

  if (char !== expectedChar) {
    if (hasFirewall("readonly")) {
      statusText = "Mismatch.";
      return { accepted: false, correct: false, message: statusText };
    }

    const remaining = Math.max(0, operation.expectedText.length - operation.typedText.length);
    if (operation.errorText.length >= remaining) {
      statusText = "Mismatch. Backspace to recover.";
      return { accepted: false, correct: false, message: statusText };
    }
    operation.errorText += char;
    statusText = "Mismatch. Backspace to recover.";
    return { accepted: true, correct: false, message: statusText };
  }

  prepareNewWordIfNeeded(char, now);
  operation.typedText += char;

  if (char === " ") {
    moveToNextWordBoundary();
    statusText = "Delimiter accepted.";
    return { accepted: true, correct: true };
  }

  operation.currentWordTypedLength += 1;

  let completionResult: Pick<
    InputResult,
    "wordCompleted" | "perfectWord" | "ampLevel" | "cleanChain"
  > | null = null;

  if (isCurrentWordComplete()) {
    const currentWord = operation.promptWords[operation.currentWordIndex] ?? "";
    const startedAt = operation.currentWordStartedAt ?? now;
    const durationSec = Math.max(0.01, (now - startedAt) / 1000);
    const clean = !operation.currentWordBackspaced;

    applyWordScoring(currentWord, durationSec, clean, wpm);

    completionResult = {
      wordCompleted: true,
      perfectWord: clean,
      ampLevel: hasFirewall("null_amp") ? 1 : operation.ampValue,
      cleanChain: operation.cleanChain
    };

    operation.currentWordLockIndex = operation.typedText.length;
    operation.currentWordBackspaced = false;

    if (operation.typedText.length >= operation.expectedText.length) {
      applyPromptCompletion(now);
      return { accepted: true, correct: true, ...completionResult };
    }
  }

  statusText = "Typing.";
  return { accepted: true, correct: true, ...(completionResult ?? {}) };
}

export function backspace(): InputResult {
  if (phase !== "operation" || !operation) {
    return { accepted: false, correct: false, message: "No active operation." };
  }

  if (hasFirewall("readonly")) {
    statusText = "READONLY active: backspace disabled.";
    return { accepted: false, correct: false, message: statusText };
  }

  if (operation.errorText.length > 0) {
    const removedError = operation.errorText[operation.errorText.length - 1];
    operation.errorText = operation.errorText.slice(0, -1);

    if (removedError !== " ") {
      applyBackspacePenalty();
    }

    statusText = "Backspace used.";
    return { accepted: true, correct: true };
  }

  if (operation.typedText.length === 0) {
    return { accepted: false, correct: false };
  }

  if (operation.typedText.length <= operation.currentWordLockIndex) {
    statusText = "Locked word. Continue forward.";
    return { accepted: false, correct: false, message: statusText };
  }

  const removed = operation.typedText[operation.typedText.length - 1];
  operation.typedText = operation.typedText.slice(0, -1);

  if (removed !== " ") {
    operation.currentWordTypedLength = Math.max(0, operation.currentWordTypedLength - 1);
    applyBackspacePenalty();
  }

  statusText = "Backspace used.";
  return { accepted: true, correct: true };
}

export function skipCurrentOperation(now = performance.now()): ActionResult {
  if (phase !== "operation" || !operation) {
    return { ok: false, message: "No active operation to skip." };
  }

  if (operation.type === "firewall") {
    return { ok: false, message: "Firewall Boss operations cannot be skipped." };
  }

  const { sector, operationInSector } = operation;
  credits += 3;

  if (operationInSector === 1) {
    beginOperation(sector, 2, now);
  } else {
    beginOperation(sector, 3, now);
  }

  statusText = "Operation skipped. +3 credits.";
  return { ok: true, message: statusText };
}

function consumeCommandSlot(index: number): CommandId | null {
  if (index < 0 || index >= commands.length) {
    return null;
  }

  const item = commands[index] ?? null;
  if (!item) return null;

  commands.splice(index, 1);
  return item;
}

export function useCommandSlot(index: number): ActionResult {
  if (phase !== "operation" || !operation) {
    return { ok: false, message: "Commands can be used only during an operation." };
  }

  const commandId = consumeCommandSlot(index);
  if (!commandId) {
    return { ok: false, message: "Selected command slot is empty." };
  }

  if (commandId === "flush_amp") {
    operation.flushAmpBonusPerWord = round2(operation.flushAmpBonusPerWord + operation.ampValue);
    operation.ampValue = 1;
    statusText = "--flush-amp executed.";
    return { ok: true, message: statusText };
  }

  if (commandId === "payload_burst") {
    operation.payloadBurstWordsLeft += 5;
    statusText = "--payload-burst armed for next 5 words.";
    return { ok: true, message: statusText };
  }

  if (commandId === "spoof_script") {
    if (scripts.length === 0) {
      statusText = "No scripts to spoof.";
      return { ok: false, message: statusText };
    }

    operation.spoofedScript = randomItem(scripts);
    statusText = `--spoof-script copied ${SCRIPT_DEFS[operation.spoofedScript].label}.`;
    return { ok: true, message: statusText };
  }

  if (commandId === "extend_timeout") {
    operation.durationMs += 10_000;
    statusText = "--extend-timeout added 10s.";
    return { ok: true, message: statusText };
  }

  if (commandId === "recompile") {
    if (scripts.length === 0) {
      statusText = "No script available to recompile.";
      return { ok: false, message: statusText };
    }

    const targetIndex = Math.floor(Math.random() * scripts.length);
    const current = scripts[targetIndex];
    const tier = SCRIPT_DEFS[current].tier;
    const pool = (Object.keys(SCRIPT_DEFS) as ScriptId[]).filter(
      (id) => SCRIPT_DEFS[id].tier === tier && id !== current
    );

    if (pool.length === 0) {
      statusText = "No alternate script in same rarity tier.";
      return { ok: false, message: statusText };
    }

    const next = randomItem(pool);
    scripts[targetIndex] = next;
    if (tier === "zero-day") {
      zeroDayPicked = scripts.some((id) => SCRIPT_DEFS[id].tier === "zero-day");
    }
    statusText = `--recompile swapped ${SCRIPT_DEFS[current].label} -> ${SCRIPT_DEFS[next].label}.`;
    return { ok: true, message: statusText };
  }

  if (commandId === "inject") {
    operation.injectWordsLeft += 1;
    statusText = "--inject primed for next word.";
    return { ok: true, message: statusText };
  }

  return { ok: false, message: "Unknown command." };
}

export function continueFromShop(now = performance.now()): ActionResult {
  if (phase !== "shop") {
    return { ok: false, message: "Shop is not open." };
  }

  if (!pendingAfterShop) {
    return { ok: false, message: "No pending operation after shop." };
  }

  beginOperation(pendingAfterShop.sector, pendingAfterShop.operationInSector, now);
  pendingAfterShop = null;
  return { ok: true, message: "Operation started." };
}

export function getRerollCost(): number {
  return getItemCost(5 + shopRerolls);
}

export function rerollShopOffers(): ActionResult {
  if (phase !== "shop") {
    return { ok: false, message: "Reroll is available only in shop." };
  }

  const cost = getRerollCost();
  if (credits < cost) {
    return { ok: false, message: "Not enough credits for reroll." };
  }

  credits -= cost;
  shopRerolls += 1;
  rollShopOffers();
  statusText = `Shop rerolled for ${cost} credits.`;
  return { ok: true, message: statusText };
}

export function purchaseScript(id: ScriptId): ActionResult {
  if (phase !== "shop") {
    return { ok: false, message: "Scripts can only be purchased in shop." };
  }

  const definition = SCRIPT_DEFS[id];
  const cost = getItemCost(definition.baseCost);

  if (credits < cost) {
    return { ok: false, message: "Not enough credits." };
  }

  if (scripts.length >= getScriptSlotCapacity()) {
    return { ok: false, message: "No free script slot." };
  }

  if (definition.tier === "zero-day" && zeroDayPicked) {
    return { ok: false, message: "Only one Zero-Day script is allowed per run." };
  }

  const wouldCreateEchoOverflow =
    id === "echo_chamber" && scripts.length + 1 > Math.max(1, getScriptSlotCapacity() - 2);

  if (wouldCreateEchoOverflow) {
    return { ok: false, message: "Not enough slot capacity for echo_chamber." };
  }

  credits -= cost;
  scripts.push(id);

  if (definition.tier === "zero-day") {
    zeroDayPicked = true;
  }

  statusText = `Purchased ${definition.label}.`;
  return { ok: true, message: statusText };
}

export function sellScript(id: ScriptId): ActionResult {
  const index = scripts.findIndex((script) => script === id);
  if (index < 0) {
    return { ok: false, message: "Script not found in loadout." };
  }

  const baseCost = getItemCost(SCRIPT_DEFS[id].baseCost);
  const sale = Math.floor(baseCost / 2);

  scripts.splice(index, 1);
  credits += sale;

  if (SCRIPT_DEFS[id].tier === "zero-day") {
    zeroDayPicked = scripts.some((script) => SCRIPT_DEFS[script].tier === "zero-day");
  }

  statusText = `Sold ${SCRIPT_DEFS[id].label} for ${sale} credits.`;
  return { ok: true, message: statusText };
}

export function purchaseCommand(id: CommandId): ActionResult {
  if (phase !== "shop") {
    return { ok: false, message: "Commands can only be purchased in shop." };
  }

  const definition = COMMAND_DEFS[id];
  const cost = getItemCost(definition.baseCost);

  if (credits < cost) {
    return { ok: false, message: "Not enough credits." };
  }

  if (commands.length >= getCommandSlotCapacity()) {
    return { ok: false, message: "No free command slot." };
  }

  credits -= cost;
  commands.push(id);
  statusText = `Purchased ${definition.label}.`;
  return { ok: true, message: statusText };
}

export function purchasePatch(id: PatchId): ActionResult {
  if (phase !== "shop") {
    return { ok: false, message: "Patches can only be purchased in shop." };
  }

  const definition = PATCH_DEFS[id];
  const cost = getItemCost(definition.baseCost);

  if (credits < cost) {
    return { ok: false, message: "Not enough credits." };
  }

  const isNewType = patchStacks[id] === 0;
  if (isNewType && getUsedPatchSlots() >= getPatchSlotCapacity()) {
    return { ok: false, message: "No free patch slot." };
  }

  credits -= cost;
  patchStacks[id] += 1;
  statusText = `Patched ${definition.label} (x${patchStacks[id]}).`;
  return { ok: true, message: statusText };
}

export function purchaseLicense(): ActionResult {
  if (phase !== "shop") {
    return { ok: false, message: "License can only be purchased in shop." };
  }

  if (shopLicenseBought) {
    return { ok: false, message: "License already purchased this sector." };
  }

  const licenseId = shopOffers.license;
  if (!licenseId) {
    return { ok: false, message: "No license offer available." };
  }

  const definition = LICENSE_DEFS[licenseId];
  const cost = getItemCost(definition.baseCost);

  if (credits < cost) {
    return { ok: false, message: "Not enough credits." };
  }

  credits -= cost;
  shopLicenseBought = true;
  licenseCounts[licenseId] += 1;

  if (licenseId === "license_interest") {
    const retroactive = operationsCleared;
    credits += retroactive;
    statusText = `Purchased ${definition.label}. Retroactive payout +${retroactive}.`;
    return { ok: true, message: statusText };
  }

  statusText = `Purchased ${definition.label}.`;
  return { ok: true, message: statusText };
}

function finalizeOperationClear(now: number): void {
  if (!operation) return;

  if (operation.sector === 1 && operation.operationInSector === 3) {
    codeSyntaxUnlocked = true;
  }

  operationsCleared += 1;

  applyClearScripts(now);
  addOperationRewards();
  advanceAfterOperationClear(now);
}

export function tryFinalizeIfTargetMet(now = performance.now()): void {
  if (phase !== "operation" || !operation) return;
  if (!isOperationCleared()) return;
  finalizeOperationClear(now);
}

export function getPhase(): RoguePhase {
  return phase;
}

export function isOperationActive(): boolean {
  return phase === "operation";
}

export function isShopOpen(): boolean {
  return phase === "shop";
}

export function getStatusText(): string {
  return statusText;
}

export function getRunScore(): number {
  return runScore;
}

export function getCredits(): number {
  return credits;
}

export function getCurrentSector(): number {
  return operation?.sector ?? pendingAfterShop?.sector ?? 1;
}

export function getCurrentOperationInSector(): 1 | 2 | 3 {
  return operation?.operationInSector ?? 1;
}

export function getCurrentOperationType(): OperationType {
  return operation?.type ?? "probe";
}

export function getOperationTarget(): number {
  return operation?.targetScore ?? 0;
}

export function getOperationScore(): number {
  return operation?.scoreEarned ?? 0;
}

export function getOutValue(): number {
  return round2(operation?.outValue ?? 0);
}

export function getAmpValue(): number {
  const amp = operation?.ampValue ?? 1;
  return round2(hasFirewall("null_amp") ? 1 : amp);
}

export function getCleanChain(): number {
  return operation?.cleanChain ?? 0;
}

export function getRemainingMs(now = performance.now()): number {
  if (!operation) return 0;
  const elapsed = now - operation.startedAt;
  return Math.max(0, operation.durationMs - elapsed);
}

export function getOperationDurationMs(): number {
  return operation?.durationMs ?? 0;
}

export function getExpectedText(): string {
  return operation?.expectedText ?? "";
}

export function getMaskedExpectedText(): string {
  return operation?.maskedExpectedText ?? "";
}

export function getTypedText(): string {
  return operation?.typedText ?? "";
}

export function getErrorText(): string {
  return operation?.errorText ?? "";
}

export function getCursorIndex(): number {
  if (!operation) return 0;
  return operation.typedText.length + operation.errorText.length;
}

export function isPromptHidden(): boolean {
  return operation?.promptHidden ?? false;
}

export function getPromptWords(): ReadonlyArray<string> {
  return operation?.promptWords ?? [];
}

export function getActiveFirewalls(): ReadonlyArray<FirewallId> {
  return operation?.firewalls ?? [];
}

export function getActiveFirewallLabels(): string {
  if (!operation || operation.firewalls.length === 0) {
    return "None";
  }

  return operation.firewalls.map((id) => FIREWALL_DEFS[id].label).join(" + ");
}

export function getLastEvent(): ScoreEvent | null {
  if (operation?.scoreFeedbackHidden && phase === "operation") {
    return null;
  }
  return operation?.lastEvent ?? null;
}

export function getScoreProgressRatio(): number {
  if (!operation) return 0;
  return clamp(operation.scoreEarned / Math.max(1, operation.targetScore), 0, 1);
}

export function getScriptLoadout(): ScriptDefinition[] {
  return scripts.map((id) => SCRIPT_DEFS[id]);
}

export function getScriptDefinitions(): Readonly<Record<ScriptId, ScriptDefinition>> {
  return SCRIPT_DEFS;
}

export function getCommandDefinitions(): Readonly<Record<CommandId, CommandDefinition>> {
  return COMMAND_DEFS;
}

export function getPatchDefinitions(): Readonly<Record<PatchId, PatchDefinition>> {
  return PATCH_DEFS;
}

export function getLicenseDefinitions(): Readonly<Record<LicenseId, LicenseDefinition>> {
  return LICENSE_DEFS;
}

export function getPatchStacks(): Readonly<Record<PatchId, number>> {
  return patchStacks;
}

export function getScriptSlotCapacityValue(): number {
  return getScriptSlotCapacity();
}

export function getCommandSlotCapacityValue(): number {
  return getCommandSlotCapacity();
}

export function getPatchSlotCapacityValue(): number {
  return getPatchSlotCapacity();
}

export function getCommandSlots(): Array<CommandId | null> {
  const cap = getCommandSlotCapacity();
  const slots: Array<CommandId | null> = [];

  for (let i = 0; i < cap; i += 1) {
    slots.push(commands[i] ?? null);
  }

  return slots;
}

export function getShopOffers(): ShopOffers {
  return shopOffers;
}

export function getShopRerolls(): number {
  return shopRerolls;
}

export function getShopLicenseBought(): boolean {
  return shopLicenseBought;
}

export function canSkipOperation(): boolean {
  if (!operation) return false;
  return operation.type !== "firewall";
}

export function getOperationLabel(): string {
  if (!operation) {
    return "No active operation";
  }

  const name =
    operation.type === "probe"
      ? "Probe"
      : operation.type === "intrude"
        ? "Intrude"
        : operation.sector === 8
          ? "ROOT_SYSTEM"
          : "Firewall Boss";

  return `Sector ${operation.sector} · ${name}`;
}

export function getOperationBriefing(): OperationBriefing | null {
  if (!operation) return null;

  const firewalls =
    operation.firewalls.length === 0
      ? []
      : operation.firewalls.map((id) => ({
          id,
          label: FIREWALL_DEFS[id].label,
          description: FIREWALL_DEFS[id].description,
        }));

  return {
    label: getOperationLabel(),
    targetScore: operation.targetScore,
    timeLimitSec: Math.max(1, Math.round(operation.durationMs / 1000)),
    canSkip: operation.type !== "firewall",
    firewalls,
  };
}

export function getOperationStartedAt(): number {
  return operation?.startedAt ?? 0;
}

export function shiftOperationTiming(deltaMs: number): void {
  if (!operation) return;
  if (deltaMs <= 0) return;

  operation.startedAt += deltaMs;
  operation.promptStartedAt += deltaMs;
}

export function drainScorePopups(): ScorePopup[] {
  if (popupQueue.length === 0) {
    return [];
  }

  const out = [...popupQueue];
  popupQueue = [];
  return out;
}

export function getCommandLabel(id: CommandId): string {
  return COMMAND_DEFS[id].label;
}

export function getScriptLabel(id: ScriptId): string {
  return SCRIPT_DEFS[id].label;
}

export function getLicenseOfferLabel(): string {
  if (!shopOffers.license) return "None";
  return LICENSE_DEFS[shopOffers.license].label;
}

export function getLicenseOfferDescription(): string {
  if (!shopOffers.license) return "";
  return LICENSE_DEFS[shopOffers.license].description;
}

export function getOperationFailureState(): boolean {
  return phase === "game-over";
}

export function getVictoryState(): boolean {
  return phase === "victory";
}

export function getRootSystemLabel(): string {
  if (operation?.sector === 8 && operation.operationInSector === 3) {
    return "ROOT_SYSTEM";
  }
  return "";
}

export function getScriptSaleValue(id: ScriptId): number {
  const cost = getItemCost(SCRIPT_DEFS[id].baseCost);
  return Math.floor(cost / 2);
}

export function getScriptPrice(id: ScriptId): number {
  return getItemCost(SCRIPT_DEFS[id].baseCost);
}

export function getCommandPrice(id: CommandId): number {
  return getItemCost(COMMAND_DEFS[id].baseCost);
}

export function getPatchPrice(id: PatchId): number {
  return getItemCost(PATCH_DEFS[id].baseCost);
}

export function getLicensePrice(id: LicenseId): number {
  return getItemCost(LICENSE_DEFS[id].baseCost);
}
