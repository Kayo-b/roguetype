import {
  getCustomContentBookmarkCursor,
  getCustomContentSourceType,
  getEffectiveGameRules,
  getFilteredCustomContentEntries,
  setCustomContentBookmarkCursor,
} from "./game-settings";

export type RoguePhase = "idle" | "operation" | "shop" | "game-over" | "victory";
export type OperationType = "probe" | "intrude" | "firewall";
export type PromptContentMode = "quotes" | "books" | "letters";

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
const OPERATION_BASE_REWARD = 2;
const ZEN_PROMPT_WORD_COUNT = 8;

const BASE_SCRIPT_SLOTS = 3;
const MAX_SCRIPT_SLOTS = 3;
const BASE_COMMAND_SLOTS = 2;
const BASE_PATCH_SLOTS = 2;

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 1, scoreTarget: 1200, timeLimitSec: 60 },
  { sector: 2, scoreTarget: 2400, timeLimitSec: 55 },
  { sector: 3, scoreTarget: 5800, timeLimitSec: 50 },
  { sector: 4, scoreTarget: 11600, timeLimitSec: 48 },
  { sector: 5, scoreTarget: 13000, timeLimitSec: 45 },
  { sector: 6, scoreTarget: 28000, timeLimitSec: 42 },
  { sector: 7, scoreTarget: 60000, timeLimitSec: 40 },
  { sector: 8, scoreTarget: 140000, timeLimitSec: 38 },
];

const SCRIPT_DEFS: Record<ScriptId, ScriptDefinition> = {
  keylogger: {
    id: "keylogger",
    label: "Steady Rhythm",
    description: "+5 OUT per word typed.",
    tier: "utility",
    baseCost: 3,
  },
  packet_sniffer: {
    id: "packet_sniffer",
    label: "Clean Cadence",
    description: "+0.1 AMP per clean word.",
    tier: "utility",
    baseCost: 3,
  },
  idle_daemon: {
    id: "idle_daemon",
    label: "Quiet Reserve",
    description: "+0.05 AMP per second remaining when operation clears.",
    tier: "utility",
    baseCost: 3,
  },
  throttle_hook: {
    id: "throttle_hook",
    label: "Speed Spark",
    description: "+0.2 AMP when WPM exceeds threshold.",
    tier: "utility",
    baseCost: 3,
  },
  null_handler: {
    id: "null_handler",
    label: "Soft Reset",
    description: "Backspace no longer breaks clean chain.",
    tier: "utility",
    baseCost: 3,
  },
  fork_bomb: {
    id: "fork_bomb",
    label: "Pulse Bloom",
    description: "Every 5th word doubles current AMP for that score event.",
    tier: "advanced",
    baseCost: 5,
  },
  brute_force: {
    id: "brute_force",
    label: "Swift Finish",
    description: "Prompt cleared in under 20s gives +3 AMP for the operation.",
    tier: "advanced",
    baseCost: 5,
  },
  parity_check: {
    id: "parity_check",
    label: "Balanced Stride",
    description: "Even-length words use +20 OUT base instead of +10 OUT base.",
    tier: "advanced",
    baseCost: 5,
  },
  stack_overflow: {
    id: "stack_overflow",
    label: "Carryover Momentum",
    description: "Each cleared operation adds +0.1 AMP permanently for this run.",
    tier: "advanced",
    baseCost: 5,
  },
  watchdog_timer: {
    id: "watchdog_timer",
    label: "Time Focus",
    description: "+0.1 AMP per 5 seconds elapsed.",
    tier: "advanced",
    baseCost: 5,
  },
  cascade_exploit: {
    id: "cascade_exploit",
    label: "Echo Stride",
    description: "Word scored under 2s re-triggers previous word OUT.",
    tier: "exploit",
    baseCost: 7,
  },
  fragile_payload: {
    id: "fragile_payload",
    label: "High-Wire Focus",
    description: "AMP starts at x3, resets to x1 on any backspace.",
    tier: "exploit",
    baseCost: 7,
  },
  zero_fault: {
    id: "zero_fault",
    label: "Flawless Finish",
    description: "Zero-backspace operation clear doubles operation score.",
    tier: "exploit",
    baseCost: 7,
  },
  overclock_bin: {
    id: "overclock_bin",
    label: "Quickened Pace",
    description: "All AMP additions are doubled, but operation time is reduced by 10s.",
    tier: "exploit",
    baseCost: 7,
  },
  deep_scan: {
    id: "deep_scan",
    label: "Long-Word Lift",
    description: "Words of length 8+ grant +2 AMP instead of base word OUT.",
    tier: "exploit",
    baseCost: 7,
  },
  singularity_0day: {
    id: "singularity_0day",
    label: "Breakthrough Moment",
    description: "Once per operation, a sub-1s word sets AMP = AMP^2 (cap x50).",
    tier: "zero-day",
    baseCost: 10,
  },
  echo_chamber: {
    id: "echo_chamber",
    label: "Double Resonance",
    description: "Booster effects trigger twice. Booster slot capacity is reduced by 2.",
    tier: "zero-day",
    baseCost: 10,
  },
};

const COMMAND_DEFS: Record<CommandId, CommandDefinition> = {
  flush_amp: {
    id: "flush_amp",
    label: "Reset Momentum",
    description: "Reset AMP to 1.0 and add current AMP as flat OUT bonus per remaining word.",
    baseCost: 3,
  },
  payload_burst: {
    id: "payload_burst",
    label: "Burst Focus",
    description: "Next 5 words score triple OUT.",
    baseCost: 3,
  },
  spoof_script: {
    id: "spoof_script",
    label: "Mirror Booster",
    description: "Copy a random owned booster effect for this stage.",
    baseCost: 3,
  },
  extend_timeout: {
    id: "extend_timeout",
    label: "Extra Time",
    description: "+10 seconds to the stage timer.",
    baseCost: 3,
  },
  recompile: {
    id: "recompile",
    label: "Recast Booster",
    description: "Reroll a random equipped booster to another booster of the same rarity.",
    baseCost: 3,
  },
  inject: {
    id: "inject",
    label: "Next Word Lift",
    description: "Next word grants +1 AMP regardless of backspaces.",
    baseCost: 3,
  },
};

const PATCH_DEFS: Record<PatchId, PatchDefinition> = {
  patch_clean: {
    id: "patch_clean",
    label: "Clean Focus",
    description: "Clean word bonus +5 OUT per stack.",
    baseCost: 4,
  },
  patch_burst: {
    id: "patch_burst",
    label: "Burst Focus",
    description: "Burst trigger gives +0.1 AMP per stack.",
    baseCost: 4,
  },
  patch_finish: {
    id: "patch_finish",
    label: "Finish Focus",
    description: "Completion bonus multiplier +0.1 per stack.",
    baseCost: 4,
  },
  patch_deep: {
    id: "patch_deep",
    label: "Depth Focus",
    description: "Long word bonus +3 OUT per stack.",
    baseCost: 4,
  },
  patch_recover: {
    id: "patch_recover",
    label: "Recovery Focus",
    description: "Backspace reset drops AMP by 0.5 per stack instead of full reset.",
    baseCost: 4,
  },
};

const LICENSE_DEFS: Record<LicenseId, LicenseDefinition> = {
  license_slots: {
    id: "license_slots",
    label: "Extra Booster Slot",
    description: "+1 booster slot capacity.",
    baseCost: 8,
  },
  license_threshold: {
    id: "license_threshold",
    label: "Faster Spark",
    description: "Speed-spark WPM threshold reduced by 10.",
    baseCost: 8,
  },
  license_bulk: {
    id: "license_bulk",
    label: "Bargain Pass",
    description: "All workshop items cost 1 credit less (stackable).",
    baseCost: 8,
  },
  license_commands: {
    id: "license_commands",
    label: "Extra Action Slot",
    description: "+1 action slot.",
    baseCost: 8,
  },
  license_patches: {
    id: "license_patches",
    label: "Extra Talent Slot",
    description: "+1 talent slot.",
    baseCost: 8,
  },
  license_interest: {
    id: "license_interest",
    label: "Steady Income",
    description: "+1 credit per cleared stage (retroactive at purchase).",
    baseCost: 8,
  },
  license_failsafe: {
    id: "license_failsafe",
    label: "Second Wind",
    description: "Once per run, survive timeout failure with a 5 second extension.",
    baseCost: 8,
  },
};

const FIREWALL_DEFS: Record<FirewallId, FirewallDefinition> = {
  scrambler: {
    id: "scrambler",
    label: "SHUFFLE",
    description: "Prompt words are shuffled each new prompt.",
  },
  bit_flip: {
    id: "bit_flip",
    label: "INVERT",
    description: "AMP gains become OUT gains and OUT gains become AMP gains.",
  },
  readonly: {
    id: "readonly",
    label: "NO_BACKSPACE",
    description: "Backspace is disabled.",
  },
  blackout: {
    id: "blackout",
    label: "HIDDEN_SCORE",
    description: "No score feedback is shown until the stage ends.",
  },
  bloat: {
    id: "bloat",
    label: "HEAVY_TARGET",
    description: "Score target is doubled.",
  },
  throttle: {
    id: "throttle",
    label: "SHORT_CLOCK",
    description: "Time limit is halved, reward is doubled.",
  },
  mirror: {
    id: "mirror",
    label: "MIRROR",
    description: "All words are reversed.",
  },
  amnesia: {
    id: "amnesia",
    label: "FADE_OUT",
    description: "Prompt is hidden after 3 seconds.",
  },
  null_amp: {
    id: "null_amp",
    label: "NO_AMP",
    description: "AMP gains are disabled. Scoring comes only from OUT.",
  },
  gc_sweep: {
    id: "gc_sweep",
    label: "RESET_WAVE",
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
  "null_amp",
  "gc_sweep",
];

const COMMON_WORDS = [
  "quiet",
  "gentle",
  "meadow",
  "harbor",
  "silver",
  "window",
  "evening",
  "morning",
  "garden",
  "paper",
  "candle",
  "river",
  "horizon",
  "lantern",
  "warmth",
  "breeze",
  "willow",
  "shore",
  "songbird",
  "pillow",
  "coffee",
  "bookshop",
  "sunrise",
  "sunset",
  "autumn",
  "spring",
  "winter",
  "summer",
  "valley",
  "journey",
];

const COMPOUND_WORDS = [
  "moonlight",
  "wildflower",
  "starlight",
  "daybreak",
  "hillside",
  "raindrop",
  "fireplace",
  "doorframe",
  "bookcase",
  "footpath",
  "seashore",
  "heartbeat",
  "sunbeam",
  "northwind",
  "pinecone",
  "soundtrack",
  "snowfall",
  "lakeside",
  "daydream",
  "handwritten",
];

const QUOTE_PASSAGES = [
  "Take rest when you need it, then return with a clear and patient mind.",
  "Small steps repeated each day can carry you farther than hurried leaps.",
  "Attention is a quiet power that grows each time you bring it back.",
  "A calm breath can turn a difficult moment into a steady beginning.",
  "Keep your pace kind and your focus honest, and progress will appear.",
  "What matters most is not speed alone, but steady effort over time.",
  "The room feels different when your thoughts settle into one clear line.",
  "Practice is a conversation between patience, repetition, and gentle correction.",
  "You do not have to rush the work that teaches you how to improve.",
  "When the page grows noisy, return to the next word and continue.",
  "Confidence is often built from many quiet sessions that nobody sees.",
  "The simple habit of showing up can change the whole direction of a day.",
  "Each careful line you type is a promise to keep moving forward.",
  "The best rhythm is the one you can keep without strain.",
  "Let the sentence guide your hands and let your hands guide your focus.",
  "Progress hides in ordinary moments that are repeated with care.",
  "Calm attention turns long passages into manageable pieces.",
  "A good session feels less like pressure and more like flow.",
  "You can be precise and relaxed at the same time.",
  "The next line is enough; you do not need the whole chapter at once.",
  "Consistency can be quiet, but its results are unmistakable.",
  "Make room for mistakes, then make room for correction and growth.",
  "The mind settles when the task is clear and the pace is steady.",
  "Gentle focus is still focus, and often it lasts much longer.",
];

const BOOK_PASSAGES = [
  "In the early light, the village road was empty except for the baker and his cart.",
  "She paused at the doorway, listening to rain gather softly against the old windows.",
  "The river curved around the town, carrying leaves, reflections, and late afternoon light.",
  "On the shelf sat a worn atlas, its pages folded at the corners from years of travel.",
  "By evening the harbor lanterns were lit, and the water answered with long ribbons of gold.",
  "He wrote one sentence, crossed it out, and began again with a steadier hand.",
  "At the market square, voices rose and fell like birds circling above a stone fountain.",
  "The teacher opened a narrow book and read while the room settled into silence.",
  "A pale moon hung above the ridge as travelers followed the road toward the inn.",
  "She turned the key, pushed open the gate, and stepped into an overgrown courtyard.",
  "From the balcony they could see distant hills fading into a blue evening haze.",
  "The station clock struck nine, and the final train sighed into the night.",
  "In the library annex, dust drifted through beams of light above quiet wooden tables.",
  "Winter arrived early that year, and the first snow erased every footprint by noon.",
  "He carried a letter in his coat pocket and read it only when the wind was still.",
  "At dawn the orchard smelled of earth and rain, and every branch glittered with dew.",
  "The innkeeper set two cups on the table and waited for the story to begin.",
  "A small boat rocked near the pier while gulls argued over the morning catch.",
  "They walked through narrow streets where each window held a different evening scene.",
  "The map was old, but the ink remained dark where the mountain pass was marked.",
  "A crackling fire and a stack of books made the long storm feel almost welcome.",
  "She read the same paragraph twice and found a different meaning the second time.",
  "Along the cliff path, wild grass bent in waves beneath the ocean wind.",
  "When the bell rang, the square fell quiet for a single reflective moment.",
];

const LETTER_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

let phase: RoguePhase = "idle";
let statusText = "Type `--start to begin.";
let promptContentMode: PromptContentMode = "quotes";

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

let operation: ActiveOperation | null = null;
let pendingAfterShop: { sector: number; operationInSector: 1 | 2 | 3 } | null = null;
let shopOffers: ShopOffers = { scripts: [], commands: [], patches: [], license: null };
let shopRerolls = 0;
let shopLicenseBought = false;

let popupCounter = 1;
let popupQueue: ScorePopup[] = [];
let customContentEntryCursor = 0;

const EMPTY_PATCH_STACKS: Readonly<Record<PatchId, number>> = {
  patch_clean: 0,
  patch_burst: 0,
  patch_finish: 0,
  patch_deep: 0,
  patch_recover: 0,
};

const EMPTY_SHOP_OFFERS: ShopOffers = { scripts: [], commands: [], patches: [], license: null };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRules() {
  return getEffectiveGameRules();
}

function isZenMode(): boolean {
  return getRules().mode === "zen";
}

function isHardcoreEnabled(): boolean {
  return getRules().hardcoreEnabled;
}

function isItemsShopEnabled(): boolean {
  return getRules().itemsShopEnabled;
}

function isScoreEnabled(): boolean {
  return getRules().scoreEnabled;
}

function isTimeEnabled(): boolean {
  return getRules().timeEnabled;
}

function getLicenseCount(id: LicenseId): number {
  if (!isItemsShopEnabled()) return 0;
  return licenseCounts[id];
}

function getPatchCount(id: PatchId): number {
  if (!isItemsShopEnabled()) return 0;
  return patchStacks[id];
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
  return 24 + Math.floor(((clamp(sector, 1, 8) - 1) * 18) / 7);
}

function createSectorWordPool(sector: number): string[] {
  if (sector <= 2) {
    return COMMON_WORDS.filter((word) => word.length >= 4 && word.length <= 7);
  }

  if (sector <= 4) {
    return [...COMMON_WORDS, ...COMPOUND_WORDS];
  }

  return [...COMMON_WORDS, ...COMPOUND_WORDS];
}

function applyWordFirewalls(words: ReadonlyArray<string>, firewalls: ReadonlyArray<FirewallId>): string[] {
  let output = [...words];

  if (firewalls.includes("scrambler")) {
    output = shuffle(output);
  }

  return output;
}

function tokenizePassage(passage: string): string[] {
  return passage
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function createPassagePromptWords(
  count: number,
  firewalls: ReadonlyArray<FirewallId>,
  sourcePool: ReadonlyArray<string>
): string[] {
  const output: string[] = [];

  while (output.length < count) {
    const passage = randomItem(sourcePool);
    const tokens = tokenizePassage(passage);

    for (const token of tokens) {
      output.push(token);
      if (output.length >= count) break;
    }
  }

  const words = output.slice(0, count);
  return applyWordFirewalls(words, firewalls);
}

function createLetterWord(length: number): string {
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += LETTER_ALPHABET[Math.floor(Math.random() * LETTER_ALPHABET.length)];
  }
  return output;
}

function createRandomLetterPromptWords(count: number, firewalls: ReadonlyArray<FirewallId>): string[] {
  const words: string[] = [];

  while (words.length < count) {
    const length = 4 + Math.floor(Math.random() * 5);
    words.push(createLetterWord(length));
  }

  return applyWordFirewalls(words, firewalls);
}

function tokenizeCustomEntry(entry: string): string[] {
  return entry
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function createCustomPromptWords(count: number, firewalls: ReadonlyArray<FirewallId>): string[] {
  const entries = getFilteredCustomContentEntries();
  if (entries.length === 0) {
    return createRandomLetterPromptWords(count, firewalls);
  }

  const sourceType = getCustomContentSourceType();
  const useSequentialOrder = sourceType === "epub";
  const words: string[] = [];

  if (sourceType === "epub" && isZenMode()) {
    while (customContentEntryCursor < entries.length) {
      const entryIndex = customContentEntryCursor;
      const tokens = tokenizeCustomEntry(entries[entryIndex]);
      customContentEntryCursor += 1;
      if (tokens.length === 0) continue;
      setCustomContentBookmarkCursor(entryIndex);
      return applyWordFirewalls(tokens, firewalls);
    }
    return [];
  }

  if (useSequentialOrder) {
    let attempts = 0;
    const maxAttempts = Math.max(entries.length * 3, count * 6);

    while (words.length < count && attempts < maxAttempts) {
      const entryIndex = customContentEntryCursor % entries.length;
      customContentEntryCursor = (customContentEntryCursor + 1) % entries.length;
      attempts += 1;

      const tokens = tokenizeCustomEntry(entries[entryIndex]);
      if (tokens.length === 0) continue;

      for (const token of tokens) {
        words.push(token);
        if (words.length >= count) break;
      }
    }
  } else {
    while (words.length < count) {
      const entry = randomItem(entries);
      const tokens = tokenizeCustomEntry(entry);
      if (tokens.length === 0) {
        continue;
      }

      for (const token of tokens) {
        words.push(token);
        if (words.length >= count) break;
      }
    }
  }

  if (words.length === 0) {
    return createRandomLetterPromptWords(count, firewalls);
  }

  return applyWordFirewalls(words.slice(0, count), firewalls);
}

function createPromptWords(
  sector: number,
  count: number,
  firewalls: ReadonlyArray<FirewallId>,
  mode: PromptContentMode
): { words: string[]; kind: "words" | "code" } {
  if (getRules().useCustomContent) {
    const words = createCustomPromptWords(count, firewalls);
    return { words, kind: "words" };
  }

  if (mode === "letters") {
    const words = createRandomLetterPromptWords(count, firewalls);
    return { words, kind: "words" };
  }

  if (mode === "books") {
    const words = createPassagePromptWords(count, firewalls, BOOK_PASSAGES);
    return { words, kind: "words" };
  }

  const quoteWords = createPassagePromptWords(count, firewalls, QUOTE_PASSAGES);
  if (quoteWords.length >= count) {
    return { words: quoteWords, kind: "words" };
  }

  const fallbackPool = createSectorWordPool(sector);
  const fallbackWords: string[] = [];
  while (fallbackWords.length < count) {
    fallbackWords.push(randomItem(fallbackPool));
  }
  return { words: applyWordFirewalls(fallbackWords, firewalls), kind: "words" };
}

function buildMaskedExpectedText(words: ReadonlyArray<string>, kind: "words" | "code"): string {
  if (words.length === 0) return "";
  if (kind === "words") return words.join(" ");
  return words.join(" ");
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
  if (!isItemsShopEnabled()) return false;
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
  return Math.max(10, 60 - getLicenseCount("license_threshold") * 10);
}

function getScriptSlotCapacity(): number {
  const fromLicense = Math.min(MAX_SCRIPT_SLOTS, BASE_SCRIPT_SLOTS + getLicenseCount("license_slots"));
  const reducedByEcho = hasScript("echo_chamber") ? 2 : 0;
  return Math.max(1, fromLicense - reducedByEcho);
}

function getCommandSlotCapacity(): number {
  return BASE_COMMAND_SLOTS + getLicenseCount("license_commands");
}

function getPatchSlotCapacity(): number {
  return BASE_PATCH_SLOTS + getLicenseCount("license_patches");
}

function getUsedPatchSlots(): number {
  return (Object.keys(patchStacks) as PatchId[]).filter((id) => patchStacks[id] > 0).length;
}

function getBulkDiscount(): number {
  return getLicenseCount("license_bulk");
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

function buildOperation(
  sector: number,
  operationInSector: 1 | 2 | 3,
  now: number
): ActiveOperation {
  const zenMode = isZenMode();
  const type = zenMode ? "probe" : getOperationType(operationInSector);
  const config = getSectorConfig(sector);

  const baseTarget =
    type === "probe"
      ? Math.round(config.scoreTarget * 1.75)
      : type === "intrude"
        ? Math.round(config.scoreTarget * 2.5)
        : Math.round(config.scoreTarget * 3.6);

  const firewalls = zenMode ? [] : pickFirewallSetForOperation(sector, operationInSector);

  let targetScore = zenMode ? 0 : baseTarget;
  let durationMs = zenMode
    ? Number.POSITIVE_INFINITY
    : isTimeEnabled()
      ? config.timeLimitSec * 1000
      : Number.POSITIVE_INFINITY;
  let rewardMultiplier = 1;

  if (firewalls.includes("bloat")) {
    targetScore *= 2;
  }

  if (isTimeEnabled() && firewalls.includes("throttle")) {
    durationMs = Math.max(12_000, Math.round(durationMs / 2));
    rewardMultiplier *= 2;
  }

  if (sector === 8 && operationInSector === 3) {
    targetScore *= 3;
  }

  if (isTimeEnabled() && hasScript("overclock_bin")) {
    durationMs = Math.max(8_000, durationMs - 10_000);
  }

  const ampStart = zenMode
    ? 1
    : hasScript("fragile_payload")
      ? 3 + stackOverflowRunAmpBonus
      : 1 + stackOverflowRunAmpBonus;

  const promptResult = createPromptWords(
    sector,
    zenMode ? ZEN_PROMPT_WORD_COUNT : getWordCountForSector(sector),
    firewalls,
    promptContentMode
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
  if (!isScoreEnabled()) {
    operation.lastEvent = null;
    return;
  }

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
  if (!isScoreEnabled()) return false;
  return operation.scoreEarned >= operation.targetScore;
}

function applyStackOverflowProgression(): void {
  if (!hasScript("stack_overflow")) return;
  stackOverflowRunAmpBonus = round2(stackOverflowRunAmpBonus + 0.1 * getEchoMultiplier());
}

function addOperationRewards(): void {
  if (!operation) return;

  let reward = OPERATION_BASE_REWARD;

  if (isScoreEnabled()) {
    const overTargetRatio = operation.scoreEarned / Math.max(1, operation.targetScore);
    const overSteps = clamp(Math.floor((overTargetRatio - 1) / 0.25), 0, 4);
    reward += overSteps;
  }

  if (operation.backspacesInOperation === 0) {
    reward += 2;
  }

  reward += getLicenseCount("license_interest");
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

function openShop(nextSector: number, now: number): void {
  if (!isItemsShopEnabled()) {
    beginOperation(nextSector, 1, now);
    return;
  }

  phase = "shop";
  pendingAfterShop = { sector: nextSector, operationInSector: 1 };
  shopRerolls = 0;
  shopLicenseBought = false;
  rollShopOffers();

  const interest = clamp(Math.floor(credits / 5), 0, 5);
  if (interest > 0) {
    credits += interest;
    statusText = `Workshop open. Interest payout +${interest} credits.`;
  } else {
    statusText = "Workshop open.";
  }
}

function beginOperation(sector: number, operationInSector: 1 | 2 | 3, now: number): void {
  operation = buildOperation(sector, operationInSector, now);
  phase = "operation";

  const type = operation.type === "probe" ? "Warmup" : operation.type === "intrude" ? "Flow" : "Challenge";
  statusText = `Stage ${sector} ${type} started.`;
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
    statusText = "Final chapter cleared. Run complete.";
    return;
  }

  operation = null;
  openShop(sector + 1, now);
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

  if (!isScoreEnabled()) {
    if (isZenMode()) {
      const nextPrompt = createPromptWords(
        operation.sector,
        ZEN_PROMPT_WORD_COUNT,
        operation.firewalls,
        promptContentMode
      );

      if (nextPrompt.words.length > 0) {
        operation.promptKind = nextPrompt.kind;
        setPromptForCurrentOperation(nextPrompt.words, now);
        statusText = "Page complete. Next page loaded.";
        return;
      }
    }

    finalizeOperationClear(now);
    return;
  }

  const completionMultiplier = 1.5 + getPatchCount("patch_finish") * 0.1;
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
    promptContentMode
  );
  setPromptForCurrentOperation(newPrompt.words, now);
  statusText = "Passage cleared. New passage loaded.";
}

function applyWordScoring(word: string, durationSec: number, clean: boolean, wpm: number): void {
  if (!operation) return;

  operation.wordsScored += 1;
  if (!isScoreEnabled()) {
    operation.cleanChain = clean ? operation.cleanChain + 1 : 0;
    operation.lastWordOutGain = 0;
    return;
  }

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
    outGain += getPatchCount("patch_deep") * 3;
  }

  if (operation.flushAmpBonusPerWord > 0) {
    outGain += operation.flushAmpBonusPerWord;
  }

  if (clean) {
    outGain += 15 + getPatchCount("patch_clean") * 5;

    operation.cleanChain += 1;

    if (hasScript("packet_sniffer")) {
      ampGain += 0.1 * echoMultiplier;
    }

    if (operation.cleanChain > 0 && operation.cleanChain % 3 === 0) {
      ampGain += 0.2 + getPatchCount("patch_burst") * 0.1;
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
  return getLicenseCount("license_failsafe") > 0 && !failsafeSpent;
}

function applyBackspacePenalty(): void {
  if (!operation) return;

  operation.currentWordBackspaced = true;
  operation.backspacesInOperation += 1;
  if (!isScoreEnabled()) {
    operation.cleanChain = 0;
    return;
  }

  if (hasScript("fragile_payload")) {
    operation.ampValue = 1;
    operation.cleanChain = 0;
    return;
  }

  if (hasScript("null_handler")) {
    return;
  }

  const patchRecover = getPatchCount("patch_recover");
  if (patchRecover > 0) {
    const drop = 0.5 * patchRecover;
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
  customContentEntryCursor = 0;

  if (isZenMode() && getCustomContentSourceType() === "epub") {
    const entries = getFilteredCustomContentEntries();
    if (entries.length > 0) {
      const bookmarked = getCustomContentBookmarkCursor();
      customContentEntryCursor =
        bookmarked === null ? 0 : Math.max(0, Math.min(bookmarked, entries.length - 1));
    }
  }
}

export function tick(now = performance.now()): void {
  if (phase !== "operation" || !operation) {
    return;
  }

  const elapsed = now - operation.startedAt;

  if (operation.firewalls.includes("gc_sweep")) {
    const ticks = Math.floor(elapsed / 10_000);

    if (ticks > operation.gcSweepTicksApplied) {
      operation.ampValue = 1;
      operation.gcSweepTicksApplied = ticks;
      statusText = "RESET_WAVE set AMP back to 1.0.";
    }
  }

  if (!isTimeEnabled()) {
    return;
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

  failOperation("Stage timeout. Run failed.");
}

export function typeChar(char: string, now: number, wpm: number): InputResult {
  if (phase !== "operation" || !operation) {
    return { accepted: false, correct: false, message: "No active stage." };
  }

  if (char.length !== 1) {
    return { accepted: false, correct: false };
  }

  const expectedChar = operation.expectedText[operation.typedText.length];
  if (!expectedChar) {
    return { accepted: false, correct: false };
  }

  const failHardcore = (): InputResult => {
    failOperation("Hardcore mode: wrong key. Run failed.");
    return { accepted: true, correct: false, message: statusText };
  };

  if (hasFirewall("readonly") && operation.errorText.length > 0) {
    operation.errorText = "";
  }

  if (operation.errorText.length > 0) {
    if (isHardcoreEnabled()) {
      return failHardcore();
    }

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
    if (isHardcoreEnabled()) {
      return failHardcore();
    }

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
    return { accepted: false, correct: false, message: "No active stage." };
  }

  if (hasFirewall("readonly")) {
    statusText = "NO_BACKSPACE active: backspace disabled.";
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
    return { ok: false, message: "No active stage to skip." };
  }

  if (isZenMode()) {
    return { ok: false, message: "Skip is unavailable in Zen mode." };
  }

  if (operation.type === "firewall") {
    return { ok: false, message: "Challenge stages cannot be skipped." };
  }

  const { sector, operationInSector } = operation;
  credits += 3;

  if (operationInSector === 1) {
    beginOperation(sector, 2, now);
  } else {
    beginOperation(sector, 3, now);
  }

  statusText = "Stage skipped. +3 credits.";
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
  if (!isItemsShopEnabled()) {
    return { ok: false, message: "Items and workshop are disabled in the current mode." };
  }

  if (phase !== "operation" || !operation) {
    return { ok: false, message: "Actions can be used only during a stage." };
  }

  const commandId = consumeCommandSlot(index);
  if (!commandId) {
    return { ok: false, message: "Selected command slot is empty." };
  }

  if (commandId === "flush_amp") {
    operation.flushAmpBonusPerWord = round2(operation.flushAmpBonusPerWord + operation.ampValue);
    operation.ampValue = 1;
    statusText = "Reset Momentum used.";
    return { ok: true, message: statusText };
  }

  if (commandId === "payload_burst") {
    operation.payloadBurstWordsLeft += 5;
    statusText = "Burst Focus armed for next 5 words.";
    return { ok: true, message: statusText };
  }

  if (commandId === "spoof_script") {
    if (scripts.length === 0) {
      statusText = "No boosters to mirror.";
      return { ok: false, message: statusText };
    }

    operation.spoofedScript = randomItem(scripts);
    statusText = `Mirror Booster copied ${SCRIPT_DEFS[operation.spoofedScript].label}.`;
    return { ok: true, message: statusText };
  }

  if (commandId === "extend_timeout") {
    operation.durationMs += 10_000;
    statusText = "Extra Time added 10s.";
    return { ok: true, message: statusText };
  }

  if (commandId === "recompile") {
    if (scripts.length === 0) {
      statusText = "No booster available to recast.";
      return { ok: false, message: statusText };
    }

    const targetIndex = Math.floor(Math.random() * scripts.length);
    const current = scripts[targetIndex];
    const tier = SCRIPT_DEFS[current].tier;
    const pool = (Object.keys(SCRIPT_DEFS) as ScriptId[]).filter(
      (id) => SCRIPT_DEFS[id].tier === tier && id !== current
    );

    if (pool.length === 0) {
      statusText = "No alternate booster in the same rarity tier.";
      return { ok: false, message: statusText };
    }

    const next = randomItem(pool);
    scripts[targetIndex] = next;
    if (tier === "zero-day") {
      zeroDayPicked = scripts.some((id) => SCRIPT_DEFS[id].tier === "zero-day");
    }
    statusText = `Recast Booster swapped ${SCRIPT_DEFS[current].label} -> ${SCRIPT_DEFS[next].label}.`;
    return { ok: true, message: statusText };
  }

  if (commandId === "inject") {
    operation.injectWordsLeft += 1;
    statusText = "Next Word Lift primed for next word.";
    return { ok: true, message: statusText };
  }

  return { ok: false, message: "Unknown command." };
}

export function continueFromShop(now = performance.now()): ActionResult {
  if (!isItemsShopEnabled()) {
    return { ok: false, message: "Items and workshop are disabled in the current mode." };
  }

  if (phase !== "shop") {
    return { ok: false, message: "Workshop is not open." };
  }

  if (!pendingAfterShop) {
    return { ok: false, message: "No pending stage after workshop." };
  }

  beginOperation(pendingAfterShop.sector, pendingAfterShop.operationInSector, now);
  pendingAfterShop = null;
  return { ok: true, message: "Stage started." };
}

export function getRerollCost(): number {
  if (!isItemsShopEnabled()) {
    return 0;
  }

  return getItemCost(5 + shopRerolls);
}

export function rerollShopOffers(): ActionResult {
  if (!isItemsShopEnabled()) {
    return { ok: false, message: "Items and workshop are disabled in the current mode." };
  }

  if (phase !== "shop") {
    return { ok: false, message: "Reroll is available only in workshop." };
  }

  const cost = getRerollCost();
  if (credits < cost) {
    return { ok: false, message: "Not enough credits for reroll." };
  }

  credits -= cost;
  shopRerolls += 1;
  rollShopOffers();
  statusText = `Workshop rerolled for ${cost} credits.`;
  return { ok: true, message: statusText };
}

export function purchaseScript(id: ScriptId): ActionResult {
  if (!isItemsShopEnabled()) {
    return { ok: false, message: "Items and workshop are disabled in the current mode." };
  }

  if (phase !== "shop") {
    return { ok: false, message: "Boosters can only be purchased in workshop." };
  }

  const definition = SCRIPT_DEFS[id];
  const cost = getItemCost(definition.baseCost);

  if (credits < cost) {
    return { ok: false, message: "Not enough credits." };
  }

  if (scripts.length >= getScriptSlotCapacity()) {
    return { ok: false, message: "No free booster slot." };
  }

  if (definition.tier === "zero-day" && zeroDayPicked) {
    return { ok: false, message: "Only one Zero-Day booster is allowed per run." };
  }

  const wouldCreateEchoOverflow =
    id === "echo_chamber" && scripts.length + 1 > Math.max(1, getScriptSlotCapacity() - 2);

  if (wouldCreateEchoOverflow) {
    return { ok: false, message: "Not enough slot capacity for Double Resonance." };
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
    return { ok: false, message: "Booster not found in loadout." };
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
  if (!isItemsShopEnabled()) {
    return { ok: false, message: "Items and workshop are disabled in the current mode." };
  }

  if (phase !== "shop") {
    return { ok: false, message: "Actions can only be purchased in workshop." };
  }

  const definition = COMMAND_DEFS[id];
  const cost = getItemCost(definition.baseCost);

  if (credits < cost) {
    return { ok: false, message: "Not enough credits." };
  }

  if (commands.length >= getCommandSlotCapacity()) {
    return { ok: false, message: "No free action slot." };
  }

  credits -= cost;
  commands.push(id);
  statusText = `Purchased ${definition.label}.`;
  return { ok: true, message: statusText };
}

export function purchasePatch(id: PatchId): ActionResult {
  if (!isItemsShopEnabled()) {
    return { ok: false, message: "Items and workshop are disabled in the current mode." };
  }

  if (phase !== "shop") {
    return { ok: false, message: "Talents can only be purchased in workshop." };
  }

  const definition = PATCH_DEFS[id];
  const cost = getItemCost(definition.baseCost);

  if (credits < cost) {
    return { ok: false, message: "Not enough credits." };
  }

  const isNewType = patchStacks[id] === 0;
  if (isNewType && getUsedPatchSlots() >= getPatchSlotCapacity()) {
    return { ok: false, message: "No free talent slot." };
  }

  credits -= cost;
  patchStacks[id] += 1;
  statusText = `Upgraded ${definition.label} (x${patchStacks[id]}).`;
  return { ok: true, message: statusText };
}

export function purchaseLicense(): ActionResult {
  if (!isItemsShopEnabled()) {
    return { ok: false, message: "Items and workshop are disabled in the current mode." };
  }

  if (phase !== "shop") {
    return { ok: false, message: "Upgrade can only be purchased in workshop." };
  }

  if (shopLicenseBought) {
    return { ok: false, message: "Upgrade already purchased this stage." };
  }

  const licenseId = shopOffers.license;
  if (!licenseId) {
    return { ok: false, message: "No upgrade offer available." };
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

  operationsCleared += 1;

  if (isZenMode()) {
    phase = "idle";
    operation = null;
    statusText =
      getCustomContentSourceType() === "epub"
        ? "Book complete. Start a new run to read again."
        : "Zen run complete.";
    return;
  }

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

export function getPromptContentMode(): PromptContentMode {
  return promptContentMode;
}

export function getPromptContentModeLabel(mode = promptContentMode): string {
  if (mode === "books") return "Book Passages";
  if (mode === "letters") return "Random Letters";
  return "Quotes";
}

export function setPromptContentMode(mode: PromptContentMode): ActionResult {
  promptContentMode = mode;
  statusText = `Text source set to ${getPromptContentModeLabel(mode)}.`;

  if (phase === "operation" && operation) {
    const promptResult = createPromptWords(
      operation.sector,
      isZenMode() ? ZEN_PROMPT_WORD_COUNT : getWordCountForSector(operation.sector),
      operation.firewalls,
      promptContentMode
    );
    operation.promptKind = promptResult.kind;
    setPromptForCurrentOperation(promptResult.words, performance.now());
  }

  return { ok: true, message: statusText };
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
  if (!isTimeEnabled()) return Number.POSITIVE_INFINITY;
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
  if (!isScoreEnabled()) {
    return null;
  }

  if (operation?.scoreFeedbackHidden && phase === "operation") {
    return null;
  }
  return operation?.lastEvent ?? null;
}

export function getScoreProgressRatio(): number {
  if (!operation) return 0;
  if (!isScoreEnabled()) {
    if (operation.expectedText.length === 0) return 0;
    const typed = operation.typedText.length + operation.errorText.length;
    return clamp(typed / operation.expectedText.length, 0, 1);
  }
  return clamp(operation.scoreEarned / Math.max(1, operation.targetScore), 0, 1);
}

export function getScriptLoadout(): ScriptDefinition[] {
  if (!isItemsShopEnabled()) {
    return [];
  }

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
  if (!isItemsShopEnabled()) {
    return EMPTY_PATCH_STACKS;
  }

  return patchStacks;
}

export function getScriptSlotCapacityValue(): number {
  if (!isItemsShopEnabled()) {
    return 0;
  }

  return getScriptSlotCapacity();
}

export function getCommandSlotCapacityValue(): number {
  if (!isItemsShopEnabled()) {
    return 0;
  }

  return getCommandSlotCapacity();
}

export function getPatchSlotCapacityValue(): number {
  if (!isItemsShopEnabled()) {
    return 0;
  }

  return getPatchSlotCapacity();
}

export function getCommandSlots(): Array<CommandId | null> {
  if (!isItemsShopEnabled()) {
    return [];
  }

  const cap = getCommandSlotCapacity();
  const slots: Array<CommandId | null> = [];

  for (let i = 0; i < cap; i += 1) {
    slots.push(commands[i] ?? null);
  }

  return slots;
}

export function getShopOffers(): ShopOffers {
  if (!isItemsShopEnabled()) {
    return EMPTY_SHOP_OFFERS;
  }

  return shopOffers;
}

export function getShopRerolls(): number {
  if (!isItemsShopEnabled()) {
    return 0;
  }

  return shopRerolls;
}

export function getShopLicenseBought(): boolean {
  if (!isItemsShopEnabled()) {
    return false;
  }

  return shopLicenseBought;
}

export function canSkipOperation(): boolean {
  if (isZenMode()) return false;
  if (!operation) return false;
  return operation.type !== "firewall";
}

export function getOperationLabel(): string {
  if (!operation) {
    return "No active stage";
  }

  if (isZenMode()) {
    return "Zen Run";
  }

  const name =
    operation.type === "probe"
      ? "Warmup"
      : operation.type === "intrude"
        ? "Flow"
        : operation.sector === 8
          ? "Final Chapter"
          : "Challenge";

  return `Stage ${operation.sector} · ${name}`;
}

export function getOperationBriefing(): OperationBriefing | null {
  if (isZenMode()) return null;
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
    timeLimitSec: isTimeEnabled() ? Math.max(1, Math.round(operation.durationMs / 1000)) : 0,
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
    return "Final Chapter";
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
