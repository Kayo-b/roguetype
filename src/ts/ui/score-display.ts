import * as Stats from "../core/stats";
import * as RogueState from "../game/roguelike-state";

const BEST_RUN_SCORE_STORAGE_KEY = "roguetype.bestRunScore";

let runScoreElement: HTMLElement | null = null;
let bestScoreElement: HTMLElement | null = null;
let outValueElement: HTMLElement | null = null;
let ampValueElement: HTMLElement | null = null;
let streakValueElement: HTMLElement | null = null;
let wpmValueElement: HTMLElement | null = null;

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
let bestRunScore = 0;
let bestRunScoreLoaded = false;

function readStoredBestRunScore(): number {
  try {
    const raw = localStorage.getItem(BEST_RUN_SCORE_STORAGE_KEY);
    if (!raw) return 0;

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  } catch {
    return 0;
  }
}

function writeStoredBestRunScore(value: number): void {
  try {
    localStorage.setItem(BEST_RUN_SCORE_STORAGE_KEY, String(Math.max(0, Math.floor(value))));
  } catch {
    // Ignore storage failures (private mode / blocked storage).
  }
}

function ensureBestRunScoreLoaded(): void {
  if (bestRunScoreLoaded) return;
  bestRunScore = readStoredBestRunScore();
  bestRunScoreLoaded = true;
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
    !wpmValueElement
  ) {
    return;
  }

  ensureBestRunScoreLoaded();

  const runScore = RogueState.getRunScore();
  if (runScore > bestRunScore) {
    bestRunScore = runScore;
    writeStoredBestRunScore(bestRunScore);
  }

  runScoreElement.textContent = runScore.toLocaleString();
  bestScoreElement.textContent = bestRunScore.toLocaleString();
  outValueElement.textContent = Math.round(RogueState.getOutValue()).toLocaleString();
  ampValueElement.textContent = `${RogueState.getAmpValue().toFixed(2)}x`;
  streakValueElement.textContent = String(RogueState.getCleanChain());
  wpmValueElement.textContent = String(Stats.getWPM());
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

  const score = RogueState.getOperationScore();
  const target = RogueState.getOperationTarget();
  const ratio = RogueState.getScoreProgressRatio();

  targetValueElement.textContent = `${score.toLocaleString()} / ${target.toLocaleString()}`;
  targetFillElement.style.width = `${Math.round(ratio * 100)}%`;
  sectorValueElement.textContent = `${RogueState.getCurrentSector()} · ${RogueState.getCurrentOperationType()}`;
  creditsValueElement.textContent = `${RogueState.getCredits()}c`;
  statusLineElement.textContent = RogueState.getStatusText();

  const lastEvent = RogueState.getLastEvent();
  if (!lastEvent) {
    lastEventLineElement.textContent = "-";
  } else {
    lastEventLineElement.textContent = `+${Math.round(lastEvent.out)} OUT × ${lastEvent.amp.toFixed(2)} AMP = ${lastEvent.gain.toLocaleString()}`;
  }

  const phase = RogueState.getPhase();
  if (phase === "operation") phaseValueElement.textContent = "Operation";
  else if (phase === "shop") phaseValueElement.textContent = "Shop";
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
    const sale = RogueState.getScriptSaleValue(script.id);
    return `<article class="slotChip" title="${escapeHtml(script.description)}">
      <div class="slotName">${escapeHtml(script.label)}</div>
      <button type="button" class="miniBtn" data-sell-script="${script.id}">SELL ${sale}</button>
    </article>`;
  });

  const emptyCount = Math.max(0, capacity - loadout.length);
  for (let i = 0; i < emptyCount; i += 1) {
    chips.push('<article class="slotChip isEmpty">[empty]</article>');
  }

  scriptSlotsElement.innerHTML = chips.join("");

  const title = document.getElementById("scriptSlotsTitle");
  if (title) {
    title.textContent = `Scripts ${loadout.length}/${capacity}`;
  }
}

function renderCommandSlots(): void {
  if (!commandSlotsElement) return;

  const slots = RogueState.getCommandSlots();
  const defs = RogueState.getCommandDefinitions();
  const phase = RogueState.getPhase();

  const chips = slots.map((commandId, index) => {
    if (!commandId) {
      return '<article class="slotChip isEmpty">[empty]</article>';
    }

    const def = defs[commandId];
    const disabled = phase !== "operation" ? "disabled" : "";

    return `<article class="slotChip" title="${escapeHtml(def.description)}">
      <div class="slotName">${escapeHtml(def.label)}</div>
      <button type="button" class="miniBtn" data-use-command-slot="${index}" ${disabled}>USE</button>
    </article>`;
  });

  commandSlotsElement.innerHTML = chips.join("");

  const title = document.getElementById("commandSlotsTitle");
  if (title) {
    title.textContent = `Commands ${slots.filter(Boolean).length}/${slots.length}`;
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
    return `<article class="slotChip" title="${escapeHtml(def.description)}">
      <div class="slotName">${escapeHtml(def.label)}</div>
      <div class="stackBadge">x${stacks[id]}</div>
    </article>`;
  });

  const emptyCount = Math.max(0, RogueState.getPatchSlotCapacityValue() - entries.length);
  for (let i = 0; i < emptyCount; i += 1) {
    chips.push('<article class="slotChip isEmpty">[empty]</article>');
  }

  patchSlotsElement.innerHTML = chips.join("");

  const title = document.getElementById("patchSlotsTitle");
  if (title) {
    title.textContent = `Patches ${entries.length}/${RogueState.getPatchSlotCapacityValue()}`;
  }
}

export function initScoreDisplay(): void {
  runScoreElement = document.getElementById("runScoreValue");
  bestScoreElement = document.getElementById("bestScoreValue");
  outValueElement = document.getElementById("outValue");
  ampValueElement = document.getElementById("ampValue");
  streakValueElement = document.getElementById("streakValue");
  wpmValueElement = document.getElementById("wpmValue");

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
