import * as Stats from "../core/stats";
import * as RogueState from "../game/roguelike-state";
import { getEffectiveGameRules } from "../game/game-settings";
import { getCommandIcon, getPatchIcon, getScriptIcon } from "./item-icons";

const LEGACY_BEST_RUN_SCORE_STORAGE_KEY = "roguetype.bestRunScore";
const RUN_METRICS_STORAGE_KEY = "roguetype.runMetrics.v1";

interface StoredRunMetrics {
  bestScore: number;
  bestWpm: number;
  totalRuns: number;
  totalWpm: number;
}

let runScoreElement: HTMLElement | null = null;
let bestScoreElement: HTMLElement | null = null;
let outValueElement: HTMLElement | null = null;
let ampValueElement: HTMLElement | null = null;
let streakValueElement: HTMLElement | null = null;
let wpmValueElement: HTMLElement | null = null;
let bestWpmValueElement: HTMLElement | null = null;
let avgWpmValueElement: HTMLElement | null = null;

let targetValueElement: HTMLElement | null = null;
let targetFillElement: HTMLElement | null = null;
let sectorValueElement: HTMLElement | null = null;
let creditsValueElement: HTMLElement | null = null;
let statusLineElement: HTMLElement | null = null;
let lastEventLineElement: HTMLElement | null = null;
let phaseValueElement: HTMLElement | null = null;

let scriptSlotsElement: HTMLElement | null = null;
let commandSlotsElement: HTMLElement | null = null;
let patchSlotsElement: HTMLElement | null = null;

let runMetrics: StoredRunMetrics = { bestScore: 0, bestWpm: 0, totalRuns: 0, totalWpm: 0 };
let runMetricsLoaded = false;

function normalizeNonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.floor(value);
}

function readLegacyBestScore(): number {
  try {
    const raw = localStorage.getItem(LEGACY_BEST_RUN_SCORE_STORAGE_KEY);
    if (!raw) return 0;

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  } catch {
    return 0;
  }
}

function readStoredRunMetrics(): StoredRunMetrics {
  const legacyBestScore = readLegacyBestScore();

  try {
    const raw = localStorage.getItem(RUN_METRICS_STORAGE_KEY);
    if (!raw) {
      return { bestScore: legacyBestScore, bestWpm: 0, totalRuns: 0, totalWpm: 0 };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return { bestScore: legacyBestScore, bestWpm: 0, totalRuns: 0, totalWpm: 0 };
    }

    const record = parsed as Record<string, unknown>;
    const bestScore = Math.max(legacyBestScore, normalizeNonNegativeInt(record.bestScore));
    const bestWpm = normalizeNonNegativeInt(record.bestWpm);
    const totalRuns = normalizeNonNegativeInt(record.totalRuns);
    const totalWpm = normalizeNonNegativeInt(record.totalWpm);

    return {
      bestScore,
      bestWpm,
      totalRuns,
      totalWpm,
    };
  } catch {
    return { bestScore: legacyBestScore, bestWpm: 0, totalRuns: 0, totalWpm: 0 };
  }
}

function writeStoredRunMetrics(value: StoredRunMetrics): void {
  try {
    localStorage.setItem(RUN_METRICS_STORAGE_KEY, JSON.stringify(value));
    localStorage.setItem(LEGACY_BEST_RUN_SCORE_STORAGE_KEY, String(value.bestScore));
  } catch {
    // Ignore storage failures (private mode / blocked storage).
  }
}

function ensureRunMetricsLoaded(): void {
  if (runMetricsLoaded) return;
  runMetrics = readStoredRunMetrics();
  runMetricsLoaded = true;
}

function getAverageWpm(): number {
  ensureRunMetricsLoaded();
  if (runMetrics.totalRuns <= 0 || runMetrics.totalWpm <= 0) return 0;
  return Math.round(runMetrics.totalWpm / runMetrics.totalRuns);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function updateMainMetrics(): void {
  if (
    !runScoreElement ||
    !bestScoreElement ||
    !outValueElement ||
    !ampValueElement ||
    !streakValueElement ||
    !wpmValueElement ||
    !bestWpmValueElement ||
    !avgWpmValueElement
  ) {
    return;
  }

  ensureRunMetricsLoaded();

  const rules = getEffectiveGameRules();
  const runScore = RogueState.getRunScore();

  if (rules.scoreEnabled && runScore > runMetrics.bestScore) {
    runMetrics.bestScore = runScore;
    writeStoredRunMetrics(runMetrics);
  }

  if (rules.scoreEnabled) {
    runScoreElement.textContent = runScore.toLocaleString();
    bestScoreElement.textContent = runMetrics.bestScore.toLocaleString();
    outValueElement.textContent = Math.round(RogueState.getOutValue()).toLocaleString();
    ampValueElement.textContent = `${RogueState.getAmpValue().toFixed(2)}x`;
    streakValueElement.textContent = String(RogueState.getCleanChain());
  } else {
    runScoreElement.textContent = "-";
    bestScoreElement.textContent = "-";
    outValueElement.textContent = "-";
    ampValueElement.textContent = "-";
    streakValueElement.textContent = "-";
  }

  wpmValueElement.textContent = String(Stats.getWPM());
  bestWpmValueElement.textContent = String(runMetrics.bestWpm);
  avgWpmValueElement.textContent = String(getAverageWpm());
}

function updateOperationState(): void {
  if (
    !targetValueElement ||
    !targetFillElement ||
    !sectorValueElement ||
    !creditsValueElement ||
    !statusLineElement ||
    !lastEventLineElement ||
    !phaseValueElement
  ) {
    return;
  }

  const rules = getEffectiveGameRules();
  const score = RogueState.getOperationScore();
  const target = RogueState.getOperationTarget();
  const ratio = RogueState.getScoreProgressRatio();
  const opType = RogueState.getCurrentOperationType();
  const opLabel = opType === "probe" ? "warmup" : opType === "intrude" ? "flow" : "challenge";

  if (rules.scoreEnabled) {
    targetValueElement.textContent = score.toLocaleString();
    targetValueElement.title = `Target ${target.toLocaleString()}`;
  } else {
    targetValueElement.textContent = `${Math.round(ratio * 100)}%`;
    targetValueElement.title = "Prompt completion";
  }

  targetFillElement.style.width = `${Math.round(ratio * 100)}%`;
  sectorValueElement.textContent = `${RogueState.getCurrentSector()} · ${opLabel}`;
  creditsValueElement.textContent = `${RogueState.getCredits()}c`;
  statusLineElement.textContent = RogueState.getStatusText();

  const lastEvent = RogueState.getLastEvent();
  if (!lastEvent) {
    lastEventLineElement.textContent = "-";
  } else {
    lastEventLineElement.textContent = `+${Math.round(lastEvent.out)} OUT × ${lastEvent.amp.toFixed(2)} AMP = ${lastEvent.gain.toLocaleString()}`;
  }

  const phase = RogueState.getPhase();
  if (phase === "operation") phaseValueElement.textContent = "Stage";
  else if (phase === "shop") phaseValueElement.textContent = "Workshop";
  else if (phase === "victory") phaseValueElement.textContent = "Victory";
  else if (phase === "game-over") phaseValueElement.textContent = "Game Over";
  else phaseValueElement.textContent = "Idle";

  const skipBtn = document.getElementById("skipOperationBtn") as HTMLButtonElement | null;
  if (skipBtn) {
    skipBtn.disabled = !RogueState.canSkipOperation() || phase !== "operation";
  }
}

function renderScriptSlots(): void {
  if (!scriptSlotsElement) return;

  const loadout = RogueState.getScriptLoadout();
  const capacity = RogueState.getScriptSlotCapacityValue();

  const chips = loadout.map((script) => {
    const hint = `${script.label} - ${script.description}`;
    return `<div class="loadoutSquare" title="${escapeHtml(hint)}"><span class="slotIcon">${getScriptIcon(script.id)}</span></div>`;
  });

  const emptyCount = Math.max(0, capacity - loadout.length);
  for (let i = 0; i < emptyCount; i += 1) {
    chips.push('<div class="loadoutSquare isEmpty" aria-hidden="true"></div>');
  }

  scriptSlotsElement.innerHTML = chips.join("");

  const title = document.getElementById("scriptSlotsTitle");
  if (title) {
    title.textContent = `Boosters ${loadout.length}/${capacity}`;
  }
}

function renderCommandSlots(): void {
  if (!commandSlotsElement) return;

  const slots = RogueState.getCommandSlots();
  const defs = RogueState.getCommandDefinitions();
  const phase = RogueState.getPhase();

  const chips = slots.map((commandId, index) => {
    if (!commandId) {
      return '<div class="loadoutSquare isEmpty" aria-hidden="true"></div>';
    }

    const def = defs[commandId];
    const disabled = phase !== "operation" ? "disabled" : "";
    const hint = `${def.label} - ${def.description}`;

    return `<button type="button" class="loadoutSquare isAction" title="${escapeHtml(hint)}" data-use-command-slot="${index}" ${disabled}><span class="slotIcon">${getCommandIcon(commandId)}</span></button>`;
  });

  commandSlotsElement.innerHTML = chips.join("");

  const title = document.getElementById("commandSlotsTitle");
  if (title) {
    title.textContent = `Actions ${slots.filter(Boolean).length}/${slots.length}`;
  }
}

function renderPatchSlots(): void {
  if (!patchSlotsElement) return;

  const stacks = RogueState.getPatchStacks();
  const defs = RogueState.getPatchDefinitions();
  const entries = (Object.keys(stacks) as Array<keyof typeof stacks>).filter(
    (id) => stacks[id] > 0
  );

  const chips = entries.map((id) => {
    const def = defs[id];
    const hint = `${def.label} - ${def.description}`;
    const stack = stacks[id] > 1 ? `<span class="stackBadge">${stacks[id]}</span>` : "";
    return `<div class="loadoutSquare" title="${escapeHtml(hint)}"><span class="slotIcon">${getPatchIcon(id)}</span>${stack}</div>`;
  });

  const emptyCount = Math.max(0, RogueState.getPatchSlotCapacityValue() - entries.length);
  for (let i = 0; i < emptyCount; i += 1) {
    chips.push('<div class="loadoutSquare isEmpty" aria-hidden="true"></div>');
  }

  patchSlotsElement.innerHTML = chips.join("");

  const title = document.getElementById("patchSlotsTitle");
  if (title) {
    title.textContent = `Talents ${entries.length}/${RogueState.getPatchSlotCapacityValue()}`;
  }
}

export function recordCompletedRunStats(score: number, wpm: number): void {
  ensureRunMetricsLoaded();

  const safeScore = Math.max(0, Math.floor(score));
  const safeWpm = Math.max(0, Math.floor(wpm));

  if (safeScore > runMetrics.bestScore) {
    runMetrics.bestScore = safeScore;
  }

  if (safeWpm > runMetrics.bestWpm) {
    runMetrics.bestWpm = safeWpm;
  }

  runMetrics.totalRuns += 1;
  runMetrics.totalWpm += safeWpm;
  writeStoredRunMetrics(runMetrics);
}

export function initScoreDisplay(): void {
  runScoreElement = document.getElementById("runScoreValue");
  bestScoreElement = document.getElementById("bestScoreValue");
  outValueElement = document.getElementById("outValue");
  ampValueElement = document.getElementById("ampValue");
  streakValueElement = document.getElementById("streakValue");
  wpmValueElement = document.getElementById("wpmValue");
  bestWpmValueElement = document.getElementById("bestWpmValue");
  avgWpmValueElement = document.getElementById("avgWpmValue");

  targetValueElement = document.getElementById("targetValue");
  targetFillElement = document.getElementById("targetFill");
  sectorValueElement = document.getElementById("sectorValue");
  creditsValueElement = document.getElementById("creditsValue");
  statusLineElement = document.getElementById("statusLine");
  lastEventLineElement = document.getElementById("lastEventLine");
  phaseValueElement = document.getElementById("phaseValue");

  scriptSlotsElement = document.getElementById("scriptSlots");
  commandSlotsElement = document.getElementById("commandSlots");
  patchSlotsElement = document.getElementById("patchSlots");

  if (!runScoreElement || !bestScoreElement || !targetValueElement || !scriptSlotsElement) {
    throw new Error("Score display elements not found");
  }

  updateScoreDisplay();
}

export function updateScoreDisplay(): void {
  updateMainMetrics();
  updateOperationState();
  renderScriptSlots();
  renderCommandSlots();
  renderPatchSlots();
}
