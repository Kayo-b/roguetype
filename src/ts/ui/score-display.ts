import * as Stats from "../core/stats";
import * as RogueState from "../game/roguelike-state";

let runScoreElement: HTMLElement | null = null;
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
    !outValueElement ||
    !ampValueElement ||
    !streakValueElement ||
    !wpmValueElement
  ) {
    return;
  }

  runScoreElement.textContent = RogueState.getRunScore().toLocaleString();
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

  const defs = RogueState.getScriptDefinitions();
  const loadout = RogueState.getScriptLoadout();
  const capacity = RogueState.getScriptSlotCapacityValue();

  const cards = loadout.map((script) => {
    const sale = RogueState.getScriptSaleValue(script.id);
    return `<article class="slotCard">
      <div class="slotCardHead">
        <div class="slotName">${escapeHtml(script.label)}</div>
        <button type="button" class="miniBtn" data-sell-script="${script.id}">SELL ${sale}</button>
      </div>
      <div class="slotDesc">${escapeHtml(script.description)}</div>
      <div class="slotTier">${escapeHtml(script.tier)}</div>
    </article>`;
  });

  const emptyCount = Math.max(0, capacity - loadout.length);
  for (let i = 0; i < emptyCount; i += 1) {
    cards.push('<article class="slotCard isEmpty">[ empty script slot ]</article>');
  }

  scriptSlotsElement.innerHTML = cards.join("");

  const title = document.getElementById("scriptSlotsTitle");
  if (title) {
    title.textContent = `Scripts ${loadout.length}/${capacity}`;
  }

  if (Object.keys(defs).length === 0) {
    scriptSlotsElement.innerHTML = "";
  }
}

function renderCommandSlots(): void {
  if (!commandSlotsElement) return;

  const slots = RogueState.getCommandSlots();
  const defs = RogueState.getCommandDefinitions();
  const phase = RogueState.getPhase();

  const cards = slots.map((commandId, index) => {
    if (!commandId) {
      return '<article class="slotCard isEmpty">[ empty command slot ]</article>';
    }

    const def = defs[commandId];
    const disabled = phase !== "operation" ? "disabled" : "";

    return `<article class="slotCard">
      <div class="slotCardHead">
        <div class="slotName">${escapeHtml(def.label)}</div>
        <button type="button" class="miniBtn" data-use-command-slot="${index}" ${disabled}>USE</button>
      </div>
      <div class="slotDesc">${escapeHtml(def.description)}</div>
    </article>`;
  });

  commandSlotsElement.innerHTML = cards.join("");

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

  const cards = entries.map((id) => {
    const def = defs[id];
    return `<article class="slotCard">
      <div class="slotCardHead">
        <div class="slotName">${escapeHtml(def.label)}</div>
        <div class="stackBadge">x${stacks[id]}</div>
      </div>
      <div class="slotDesc">${escapeHtml(def.description)}</div>
    </article>`;
  });

  const emptyCount = Math.max(0, RogueState.getPatchSlotCapacityValue() - entries.length);
  for (let i = 0; i < emptyCount; i += 1) {
    cards.push('<article class="slotCard isEmpty">[ empty patch slot ]</article>');
  }

  patchSlotsElement.innerHTML = cards.join("");

  const title = document.getElementById("patchSlotsTitle");
  if (title) {
    title.textContent = `Patches ${entries.length}/${RogueState.getPatchSlotCapacityValue()}`;
  }
}

export function initScoreDisplay(): void {
  runScoreElement = document.getElementById("runScoreValue");
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

  if (!runScoreElement || !targetValueElement || !scriptSlotsElement) {
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
