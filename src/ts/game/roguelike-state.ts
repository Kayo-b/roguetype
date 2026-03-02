export type RoguePhase = "idle" | "level" | "store" | "game-over" | "victory";

export type RogueConsumableId =
  | "scoring_surge"
  | "overclock_draught"
  | "lucky_battery";

export type RogueModuleId =
  | "deus_ex_machina"
  | "overclock_core"
  | "stability_anchor";

export interface RogueConsumableDefinition {
  id: RogueConsumableId;
  name: string;
  description: string;
  cost: number;
  durationMs: number;
  flatGainBonus: number;
  gainMultiplier: number;
  speedMultiplier: number;
}

export interface RogueModuleDefinition {
  id: RogueModuleId;
  name: string;
  description: string;
  cost: number;
  passiveFlatGainBonus: number;
  passiveGainMultiplier: number;
  passiveSpeedMultiplier: number;
  goalMultiplier: number;
  coinRewardMultiplier: number;
  levelTimeDeltaMs: number;
}

export interface RogueEffect {
  sourceId: string;
  label: string;
  endsAt: number;
  flatGainBonus: number;
  gainMultiplier: number;
  speedMultiplier: number;
}

interface PassiveBonuses {
  flatGainBonus: number;
  gainMultiplier: number;
  speedMultiplier: number;
  goalMultiplier: number;
  coinRewardMultiplier: number;
  levelTimeDeltaMs: number;
}

const MAX_LEVEL = 10;
const MAX_SLOTS = 3;
const STARTING_COINS = 22;
const BASE_SPEED_MUTATOR = 2;

const LEVEL_NAMES = [
  "Boot Sector",
  "Signal Hall",
  "Cipher Alley",
  "Kernel Vault",
  "Ghost Relay",
  "Vector Keep",
  "Fracture Lane",
  "Paradox Engine",
  "Anomaly Gate",
  "Boss: Mirror Core",
];

const LEVEL_ACCENTS = [
  "#4ecdc4",
  "#5dd39e",
  "#79cfa6",
  "#8ccf7e",
  "#b7d36f",
  "#e0c46c",
  "#e6a963",
  "#ea8f6b",
  "#e86d7a",
  "#f26a8d",
];

const UPSIDE_DOWN_MAP: Record<string, string> = {
  b: "q",
  d: "p",
  m: "w",
  n: "u",
  p: "d",
  q: "b",
  u: "n",
  w: "m",
  "6": "9",
  "9": "6",
  B: "Q",
  D: "P",
  M: "W",
  N: "U",
  P: "D",
  Q: "B",
  U: "N",
  W: "M",
};

const CONSUMABLE_DEFINITIONS: Record<
  RogueConsumableId,
  RogueConsumableDefinition
> = {
  scoring_surge: {
    id: "scoring_surge",
    name: "Scoring Surge",
    description:
      "For 10s: +25 flat points to each gain event. Activate with CTRL + 1/2/3.",
    cost: 10,
    durationMs: 10_000,
    flatGainBonus: 25,
    gainMultiplier: 1,
    speedMultiplier: 1,
  },
  overclock_draught: {
    id: "overclock_draught",
    name: "Overclock Draught",
    description: "For 8s: +35% gain multiplier and +20% speed multiplier.",
    cost: 13,
    durationMs: 8_000,
    flatGainBonus: 0,
    gainMultiplier: 1.35,
    speedMultiplier: 1.2,
  },
  lucky_battery: {
    id: "lucky_battery",
    name: "Lucky Battery",
    description: "For 7s: +15 flat points and +65% gain multiplier.",
    cost: 15,
    durationMs: 7_000,
    flatGainBonus: 15,
    gainMultiplier: 1.65,
    speedMultiplier: 1,
  },
};

const MODULE_DEFINITIONS: Record<RogueModuleId, RogueModuleDefinition> = {
  deus_ex_machina: {
    id: "deus_ex_machina",
    name: "Deus Ex Machina",
    description:
      "If a level fails by timeout, auto-revive once. Grants 3s emergency boost.",
    cost: 24,
    passiveFlatGainBonus: 0,
    passiveGainMultiplier: 1,
    passiveSpeedMultiplier: 1,
    goalMultiplier: 1,
    coinRewardMultiplier: 1,
    levelTimeDeltaMs: 0,
  },
  overclock_core: {
    id: "overclock_core",
    name: "Overclock Core",
    description: "+30% gain multiplier, but level goals are 18% harder.",
    cost: 17,
    passiveFlatGainBonus: 0,
    passiveGainMultiplier: 1.3,
    passiveSpeedMultiplier: 1,
    goalMultiplier: 1.18,
    coinRewardMultiplier: 1,
    levelTimeDeltaMs: 0,
  },
  stability_anchor: {
    id: "stability_anchor",
    name: "Stability Anchor",
    description: "+12 flat gain and +7s level time, but speed multiplier is reduced.",
    cost: 16,
    passiveFlatGainBonus: 12,
    passiveGainMultiplier: 1,
    passiveSpeedMultiplier: 0.84,
    goalMultiplier: 1,
    coinRewardMultiplier: 1,
    levelTimeDeltaMs: 7_000,
  },
};

let phase: RoguePhase = "idle";
let level = 1;
let pendingLevel = 2;
let coins = STARTING_COINS;
let levelGoal = 0;
let levelStartedAt = 0;
let levelDurationMs = 0;
let levelStartScore = 0;
let statusText = "Start a run";

let storeConsumableOffers: RogueConsumableId[] = [];
let storeModuleOffers: RogueModuleId[] = [];

let consumableSlots: Array<RogueConsumableId | null> = [null, null, null];
let moduleSlots: Array<RogueModuleId | null> = [null, null, null];
let activeEffects: RogueEffect[] = [];
let deusExSpent = false;

function getModulePassives(): PassiveBonuses {
  const output: PassiveBonuses = {
    flatGainBonus: 0,
    gainMultiplier: 1,
    speedMultiplier: 1,
    goalMultiplier: 1,
    coinRewardMultiplier: 1,
    levelTimeDeltaMs: 0,
  };

  for (const moduleId of moduleSlots) {
    if (!moduleId) continue;
    const moduleDef = MODULE_DEFINITIONS[moduleId];
    output.flatGainBonus += moduleDef.passiveFlatGainBonus;
    output.gainMultiplier *= moduleDef.passiveGainMultiplier;
    output.speedMultiplier *= moduleDef.passiveSpeedMultiplier;
    output.goalMultiplier *= moduleDef.goalMultiplier;
    output.coinRewardMultiplier *= moduleDef.coinRewardMultiplier;
    output.levelTimeDeltaMs += moduleDef.levelTimeDeltaMs;
  }

  return output;
}

function computeGoalForLevel(targetLevel: number): number {
  const baseGoal = Math.round(420 * Math.pow(1.37, targetLevel - 1));
  const modulePassives = getModulePassives();
  return Math.round(baseGoal * modulePassives.goalMultiplier);
}

function computeDurationForLevel(targetLevel: number): number {
  const baseSeconds = Math.max(24, 46 - (targetLevel - 1) * 2);
  const passives = getModulePassives();
  return Math.max(12_000, baseSeconds * 1000 + passives.levelTimeDeltaMs);
}

function randomizeOffers(): void {
  const allConsumables = Object.keys(CONSUMABLE_DEFINITIONS) as RogueConsumableId[];
  const allModules = Object.keys(MODULE_DEFINITIONS) as RogueModuleId[];

  storeConsumableOffers = shuffle(allConsumables).slice(0, 3);
  storeModuleOffers = shuffle(allModules).slice(0, 3);
}

function shuffle<T>(items: T[]): T[] {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = output[i];
    output[i] = output[j];
    output[j] = temp;
  }
  return output;
}

function startLevel(targetLevel: number, currentTotalScore: number): void {
  level = targetLevel;
  levelGoal = computeGoalForLevel(level);
  levelDurationMs = computeDurationForLevel(level);
  levelStartScore = currentTotalScore;
  levelStartedAt = performance.now();
  phase = "level";
  statusText = isBossLevel() ? "Boss level live" : "Level in progress";
}

function hasModule(moduleId: RogueModuleId): boolean {
  return moduleSlots.includes(moduleId);
}

function getOpenSlotIndex(slots: ReadonlyArray<unknown | null>): number {
  return slots.findIndex((slot) => slot === null);
}

function reverseText(value: string): string {
  return Array.from(value).reverse().join("");
}

function flipUpsideDownStyle(value: string): string {
  const chars = Array.from(value);
  const flipped = chars.reverse().map((char) => UPSIDE_DOWN_MAP[char] ?? char);
  return flipped.join("");
}

function buildEffectFromConsumable(
  definition: RogueConsumableDefinition,
  now: number
): RogueEffect {
  return {
    sourceId: definition.id,
    label: definition.name,
    endsAt: now + definition.durationMs,
    flatGainBonus: definition.flatGainBonus,
    gainMultiplier: definition.gainMultiplier,
    speedMultiplier: definition.speedMultiplier,
  };
}

function buildDeusExEffect(now: number): RogueEffect {
  return {
    sourceId: "deus_ex_burst",
    label: "Deus Ex Burst",
    endsAt: now + 3_000,
    flatGainBonus: 18,
    gainMultiplier: 1.8,
    speedMultiplier: 1.55,
  };
}

export function startNewRun(currentTotalScore: number): void {
  phase = "idle";
  level = 1;
  pendingLevel = 2;
  coins = STARTING_COINS;
  levelGoal = 0;
  levelStartedAt = 0;
  levelDurationMs = 0;
  levelStartScore = 0;
  statusText = "Run started";
  activeEffects = [];
  deusExSpent = false;

  consumableSlots = ["scoring_surge", null, null];
  moduleSlots = [null, null, null];

  randomizeOffers();
  startLevel(1, currentTotalScore);
}

export function resetRunState(): void {
  phase = "idle";
  level = 1;
  pendingLevel = 2;
  coins = STARTING_COINS;
  levelGoal = 0;
  levelStartedAt = 0;
  levelDurationMs = 0;
  levelStartScore = 0;
  statusText = "Start a run";
  activeEffects = [];
  consumableSlots = [null, null, null];
  moduleSlots = [null, null, null];
  storeConsumableOffers = [];
  storeModuleOffers = [];
  deusExSpent = false;
}

export function getPhase(): RoguePhase {
  return phase;
}

export function isLevelActive(): boolean {
  return phase === "level";
}

export function isStoreOpen(): boolean {
  return phase === "store";
}

export function getCurrentLevel(): number {
  return level;
}

export function getMaxLevel(): number {
  return MAX_LEVEL;
}

export function getCurrentLevelName(): string {
  return LEVEL_NAMES[level - 1] ?? `Level ${level}`;
}

export function getCurrentAccentColor(): string {
  return LEVEL_ACCENTS[level - 1] ?? LEVEL_ACCENTS[0];
}

export function isBossLevel(targetLevel = level): boolean {
  return targetLevel >= MAX_LEVEL;
}

export function getStatusText(): string {
  return statusText;
}

export function getCoins(): number {
  return coins;
}

export function getLevelGoal(): number {
  return levelGoal;
}

export function getLevelScore(currentTotalScore: number): number {
  return Math.max(0, currentTotalScore - levelStartScore);
}

export function isLevelGoalMet(currentTotalScore: number): boolean {
  if (phase !== "level") return false;
  return getLevelScore(currentTotalScore) >= levelGoal;
}

export function getRemainingMs(now = performance.now()): number {
  if (phase !== "level") return 0;
  const elapsed = now - levelStartedAt;
  return Math.max(0, levelDurationMs - elapsed);
}

export function completeLevel(currentTotalScore: number): void {
  if (phase !== "level") return;

  const levelScore = getLevelScore(currentTotalScore);
  const baseReward = Math.round(8 + level * 4);
  const passives = getModulePassives();
  const reward = Math.max(
    1,
    Math.round(baseReward * passives.coinRewardMultiplier)
  );
  coins += reward;

  if (level >= MAX_LEVEL) {
    phase = "victory";
    storeConsumableOffers = [];
    storeModuleOffers = [];
    statusText = "Map cleared. You defeated Mirror Core.";
    return;
  }

  pendingLevel = level + 1;
  phase = "store";
  statusText = `Level clear (${levelScore}). +${reward} coins`;
  randomizeOffers();

  const now = performance.now();
  pruneExpiredEffects(now);
}

export function advanceAfterStore(currentTotalScore: number): void {
  if (phase !== "store") return;
  startLevel(pendingLevel, currentTotalScore);
}

export function failLevel(): void {
  if (phase !== "level") return;
  phase = "game-over";
  statusText = "Run failed";
}

export function tryTriggerDeusEx(now = performance.now()): boolean {
  if (phase !== "level") return false;
  if (deusExSpent) return false;
  if (!hasModule("deus_ex_machina")) return false;

  deusExSpent = true;
  levelDurationMs += 7_000;
  activeEffects.push(buildDeusExEffect(now));
  statusText = "Deus Ex Machina triggered. Emergency surge active.";
  return true;
}

export function getStoreConsumableOffers(): RogueConsumableDefinition[] {
  return storeConsumableOffers.map((id) => CONSUMABLE_DEFINITIONS[id]);
}

export function getStoreModuleOffers(): RogueModuleDefinition[] {
  return storeModuleOffers.map((id) => MODULE_DEFINITIONS[id]);
}

export function getConsumableSlots(): ReadonlyArray<RogueConsumableId | null> {
  return consumableSlots;
}

export function getModuleSlots(): ReadonlyArray<RogueModuleId | null> {
  return moduleSlots;
}

export function getConsumableDefinition(
  itemId: RogueConsumableId
): RogueConsumableDefinition {
  return CONSUMABLE_DEFINITIONS[itemId];
}

export function getModuleDefinition(
  moduleId: RogueModuleId
): RogueModuleDefinition {
  return MODULE_DEFINITIONS[moduleId];
}

export function purchaseConsumable(itemId: RogueConsumableId): {
  ok: boolean;
  message: string;
} {
  const definition = CONSUMABLE_DEFINITIONS[itemId];
  if (coins < definition.cost) {
    return { ok: false, message: "Not enough coins" };
  }

  const slotIndex = getOpenSlotIndex(consumableSlots);
  if (slotIndex < 0) {
    return { ok: false, message: "Consumable slots are full (max 3)" };
  }

  coins -= definition.cost;
  consumableSlots[slotIndex] = itemId;
  statusText = `Bought ${definition.name}`;
  return { ok: true, message: `Bought ${definition.name}` };
}

export function purchaseModule(moduleId: RogueModuleId): {
  ok: boolean;
  message: string;
} {
  const definition = MODULE_DEFINITIONS[moduleId];

  if (hasModule(moduleId)) {
    return { ok: false, message: "Module already equipped" };
  }

  if (coins < definition.cost) {
    return { ok: false, message: "Not enough coins" };
  }

  const slotIndex = getOpenSlotIndex(moduleSlots);
  if (slotIndex < 0) {
    return { ok: false, message: "Module slots are full (max 3)" };
  }

  coins -= definition.cost;
  moduleSlots[slotIndex] = moduleId;
  statusText = `Equipped ${definition.name}`;
  return { ok: true, message: `Equipped ${definition.name}` };
}

export function activateConsumableSlot(
  slotIndex: number,
  now = performance.now()
): { ok: boolean; message: string } {
  if (phase !== "level") {
    return { ok: false, message: "Consumables can only be used during a level" };
  }

  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
    return { ok: false, message: "Invalid slot index" };
  }

  const itemId = consumableSlots[slotIndex];
  if (!itemId) {
    return { ok: false, message: `Slot ${slotIndex + 1} is empty` };
  }

  const definition = CONSUMABLE_DEFINITIONS[itemId];
  activeEffects.push(buildEffectFromConsumable(definition, now));
  consumableSlots[slotIndex] = null;
  statusText = `${definition.name} activated`;

  return { ok: true, message: `${definition.name} active for ${definition.durationMs / 1000}s` };
}

export function pruneExpiredEffects(now = performance.now()): void {
  activeEffects = activeEffects.filter((effect) => effect.endsAt > now);
}

export function getFlatGainBonus(now = performance.now()): number {
  pruneExpiredEffects(now);
  const passives = getModulePassives();
  const active = activeEffects.reduce(
    (sum, effect) => sum + effect.flatGainBonus,
    0
  );
  return passives.flatGainBonus + active;
}

export function getGainMultiplier(now = performance.now()): number {
  pruneExpiredEffects(now);
  const passives = getModulePassives();
  const active = activeEffects.reduce(
    (mult, effect) => mult * effect.gainMultiplier,
    1
  );
  return passives.gainMultiplier * active;
}

export function getSpeedMultiplier(now = performance.now()): number {
  pruneExpiredEffects(now);
  const passives = getModulePassives();
  const active = activeEffects.reduce(
    (mult, effect) => mult * effect.speedMultiplier,
    1
  );
  return BASE_SPEED_MUTATOR * passives.speedMultiplier * active;
}

export function getActiveEffects(): ReadonlyArray<RogueEffect> {
  return activeEffects;
}

export function transformPromptForRogue(basePrompt: string): string {
  const withUnderscores = basePrompt.replace(/ /g, "_");

  if (!isBossLevel()) {
    return withUnderscores;
  }

  const tokens = withUnderscores.split("_").map((token) => {
    if (token.length < 3) return token;

    const roll = Math.random();
    if (roll < 0.42) {
      return reverseText(token);
    }

    if (roll < 0.72) {
      return flipUpsideDownStyle(token);
    }

    return token;
  });

  return tokens.join("_");
}

export function formatRunStateLabel(): string {
  if (phase === "level") return "In Level";
  if (phase === "store") return "Store";
  if (phase === "victory") return "Victory";
  if (phase === "game-over") return "Game Over";
  return "Idle";
}

export function getMutatorSummary(): string {
  return "Start mutator: Speed x2, separators become underscores";
}

export function getLifeDisplay(): string {
  if (hasModule("deus_ex_machina")) {
    return deusExSpent ? "1 (Deus used)" : "1 (+Deus)";
  }
  return "1";
}
