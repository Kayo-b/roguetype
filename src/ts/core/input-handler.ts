import * as Stats from "./stats";
import * as RogueState from "../game/roguelike-state";
import { updateDisplay } from "../ui/typing-display";
import { recordCompletedRunStats, updateScoreDisplay } from "../ui/score-display";
import { getCommandIcon, getPatchIcon, getScriptIcon } from "../ui/item-icons";
import { playLetterThock, playPerfectWordAccent, primeGameAudio } from "../audio/game-sfx";
import {
  clearCustomContentEntries,
  getCustomContentChapterRange,
  getCustomContentChapters,
  getCustomContentSourceName,
  getCustomContentSourceType,
  getCustomContentTruncatedAfterChapterTitle,
  getEffectiveGameRules,
  getGameSettings,
  parseCustomContentCsv,
  setCustomChapterRange,
  setCustomContentEntries,
  setGameMode,
  setHardcoreEnabled,
  setSoundEffectsEnabled,
} from "../game/game-settings";
import { importEpubCustomContent } from "../game/epub-import";

const COMMAND_HELP =
  "Commands: `--start `--reset `--skip `--shop `--continue `--use <slot> `--mode <quotes|books|letters> `--help";

let commandOutputElement: HTMLElement | null = null;
let commandLiveElement: HTMLElement | null = null;
let contentModeSelectElement: HTMLSelectElement | null = null;
let gameModeSelectElement: HTMLSelectElement | null = null;
let hardcoreToggleElement: HTMLInputElement | null = null;
let soundToggleElement: HTMLInputElement | null = null;
let customPanelElement: HTMLElement | null = null;
let customContentInputElement: HTMLInputElement | null = null;
let customChapterRangeElement: HTMLElement | null = null;
let customChapterStartSelectElement: HTMLSelectElement | null = null;
let customChapterEndSelectElement: HTMLSelectElement | null = null;
let customContentStatusElement: HTMLElement | null = null;
let customContentClearButtonElement: HTMLButtonElement | null = null;
let popupLayerElement: HTMLElement | null = null;
let floatingScriptsElement: HTMLElement | null = null;
let floatingUtilityElement: HTMLElement | null = null;

let storeOverlayElement: HTMLElement | null = null;
let storeScriptsElement: HTMLElement | null = null;
let storeCommandsElement: HTMLElement | null = null;
let storePatchesElement: HTMLElement | null = null;
let storeLicenseElement: HTMLElement | null = null;
let storeCreditsElement: HTMLElement | null = null;
let storeStatusElement: HTMLElement | null = null;
let storeCloseButtonElement: HTMLButtonElement | null = null;
let storeRerollButtonElement: HTMLButtonElement | null = null;

let timerFillElement: HTMLElement | null = null;
let timerTextElement: HTMLElement | null = null;

let briefingOverlayElement: HTMLElement | null = null;
let briefingSubtitleElement: HTMLElement | null = null;
let briefingTargetElement: HTMLElement | null = null;
let briefingTimeElement: HTMLElement | null = null;
let briefingSkipElement: HTMLElement | null = null;
let briefingDebuffsElement: HTMLElement | null = null;
let briefingLoadoutElement: HTMLElement | null = null;
let briefingAutoActionsElement: HTMLElement | null = null;
let briefingCloseButtonElement: HTMLButtonElement | null = null;

let runSummaryOverlayElement: HTMLElement | null = null;
let summaryScoreStatElement: HTMLElement | null = null;
let summaryScoreElement: HTMLElement | null = null;
let summaryWpmElement: HTMLElement | null = null;
let summaryAccuracyElement: HTMLElement | null = null;
let summaryTimeElement: HTMLElement | null = null;
let summaryErrorsElement: HTMLElement | null = null;
let summaryRestartButtonElement: HTMLButtonElement | null = null;
let summaryCloseButtonElement: HTMLButtonElement | null = null;

let briefingOpen = false;
let briefingOpenedAt = 0;
let lastBriefedOperationKey = "";
let briefingRemainingMsSnapshot = 0;
let lastRenderedPhase: RogueState.RoguePhase | null = null;
let lastRenderedOperationKey = "";
let queuedAutoUseSlots: number[] = [];
let summaryOpen = false;
let summaryDismissedForEndState = false;

let commandMode = false;
let commandBuffer = "";
let completionStatsRecorded = false;
let lastCustomChapterOptionsSignature = "";
let lastCustomChapterRangeVisible: boolean | null = null;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;

  if (target.isContentEditable) return true;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON";
}

function isPrintableKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

function setCommandOutput(command: string, result: string): void {
  if (!commandOutputElement) return;
  commandOutputElement.textContent = `$ ${command}\n${result}`;
}

function updateCommandLiveLine(): void {
  if (!commandLiveElement) return;

  if (commandMode) {
    commandLiveElement.textContent = `$ \`${commandBuffer}`;
    return;
  }

  commandLiveElement.textContent =
    "$ [typing] Type passage text · Press ` for commands · Ctrl+1..9 use action slots";
}

function updateCustomContentStatus(): void {
  if (!customContentStatusElement) return;

  const settings = getGameSettings();
  const count = settings.custom.entries.length;
  const sourceName = getCustomContentSourceName();
  const sourceType = getCustomContentSourceType();
  const truncatedAfter = getCustomContentTruncatedAfterChapterTitle();

  if (count <= 0) {
    customContentStatusElement.textContent = "No custom text loaded.";
    return;
  }

  if (sourceType === "epub") {
    const chapters = getCustomContentChapters();
    const range = getCustomContentChapterRange();
    const firstChapter = chapters[0]?.id ?? 1;
    const lastChapter = chapters[chapters.length - 1]?.id ?? firstChapter;
    const startChapter = range.start ?? firstChapter;
    const endChapter = range.end ?? lastChapter;
    const titleSuffix = sourceName ? ` from ${sourceName}` : "";
    const truncatedSuffix = truncatedAfter
      ? ` Truncated before chapter: ${truncatedAfter}.`
      : "";
    customContentStatusElement.textContent = `${count} entries across ${chapters.length} chapters${titleSuffix}. Range ${startChapter}-${endChapter}.${truncatedSuffix}`;
    return;
  }

  if (sourceName) {
    customContentStatusElement.textContent = `${count} entries loaded from ${sourceName}.`;
    return;
  }

  customContentStatusElement.textContent = `${count} custom text entries loaded.`;
}

function updateCustomChapterRangeControls(): void {
  if (!customChapterRangeElement || !customChapterStartSelectElement || !customChapterEndSelectElement) {
    return;
  }

  const sourceType = getCustomContentSourceType();
  const chapters = getCustomContentChapters();
  const showRange = sourceType === "epub" && chapters.length > 0;

  if (lastCustomChapterRangeVisible !== showRange) {
    customChapterRangeElement.classList.toggle("isHidden", !showRange);
    lastCustomChapterRangeVisible = showRange;
  }

  if (!showRange) {
    if (lastCustomChapterOptionsSignature !== "") {
      customChapterStartSelectElement.innerHTML = "";
      customChapterEndSelectElement.innerHTML = "";
      lastCustomChapterOptionsSignature = "";
    }
    return;
  }

  const optionsSignature = chapters
    .map((chapter) => `${chapter.id}:${chapter.title}:${chapter.startEntry}:${chapter.endEntry}`)
    .join("|");

  if (optionsSignature !== lastCustomChapterOptionsSignature) {
    const optionsHtml = chapters
      .map((chapter) => `<option value="${chapter.id}">${chapter.id}. ${escapeHtml(chapter.title)}</option>`)
      .join("");
    customChapterStartSelectElement.innerHTML = optionsHtml;
    customChapterEndSelectElement.innerHTML = optionsHtml;
    lastCustomChapterOptionsSignature = optionsSignature;
  }

  const range = getCustomContentChapterRange();
  const fallbackStart = chapters[0].id;
  const fallbackEnd = chapters[chapters.length - 1].id;
  const resolvedStart = String(range.start ?? fallbackStart);
  const resolvedEnd = String(range.end ?? fallbackEnd);
  const activeElement = document.activeElement;

  if (activeElement !== customChapterStartSelectElement) {
    if (customChapterStartSelectElement.value !== resolvedStart) {
      customChapterStartSelectElement.value = resolvedStart;
    }
  }

  if (activeElement !== customChapterEndSelectElement) {
    if (customChapterEndSelectElement.value !== resolvedEnd) {
      customChapterEndSelectElement.value = resolvedEnd;
    }
  }

  const disabled = chapters.length <= 1;
  if (customChapterStartSelectElement.disabled !== disabled) {
    customChapterStartSelectElement.disabled = disabled;
  }
  if (customChapterEndSelectElement.disabled !== disabled) {
    customChapterEndSelectElement.disabled = disabled;
  }
}

function isEpubFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".epub") || file.type === "application/epub+zip";
}

function isZenMode(): boolean {
  return getEffectiveGameRules().mode === "zen";
}

function shouldShowRunSummaryForCurrentState(): boolean {
  if (isZenMode()) return false;
  return RogueState.getOperationFailureState();
}

function updateModeControlsState(): void {
  const settings = getGameSettings();
  const rules = getEffectiveGameRules();

  if (gameModeSelectElement) {
    gameModeSelectElement.value = settings.mode;
  }

  if (hardcoreToggleElement) {
    hardcoreToggleElement.checked = settings.hardcoreEnabled;
  }

  if (soundToggleElement) {
    soundToggleElement.checked = settings.soundEffectsEnabled;
  }

  if (customPanelElement) {
    customPanelElement.classList.toggle("isHidden", false);
  }

  if (contentModeSelectElement) {
    contentModeSelectElement.disabled = false;
  }

  const appElement = document.getElementById("app");
  if (appElement) {
    appElement.classList.toggle("isZenMode", rules.mode === "zen");
    appElement.classList.toggle("isGameMode", rules.mode === "game");
  }

  const zenHiddenIds = ["hudStrip", "playMeta", "commandDock", "skipOperationBtn"];
  for (const id of zenHiddenIds) {
    const node = document.getElementById(id);
    if (!node) continue;
    node.classList.toggle("isHidden", rules.mode === "zen");
  }

  const scoreMetricIds = ["runMetric", "bestMetric", "outMetric", "ampMetric", "streakMetric"];
  for (const id of scoreMetricIds) {
    const node = document.getElementById(id);
    if (!node) continue;
    node.classList.toggle("isHidden", !rules.scoreEnabled);
  }

  if (floatingScriptsElement) {
    floatingScriptsElement.classList.toggle("isHidden", !rules.itemsShopEnabled);
  }

  if (floatingUtilityElement) {
    floatingUtilityElement.classList.toggle("isHidden", !rules.itemsShopEnabled);
  }

  updateCustomContentStatus();
  updateCustomChapterRangeControls();
}

function finalizeRunMetricsIfNeeded(): void {
  if (completionStatsRecorded) return;
  const phase = RogueState.getPhase();
  if (phase !== "game-over" && phase !== "victory") return;

  Stats.stopTimer();
  recordCompletedRunStats(RogueState.getRunScore(), Stats.getWPM());
  completionStatsRecorded = true;
}

function showStoreModal(open: boolean): void {
  if (!storeOverlayElement) return;

  storeOverlayElement.classList.toggle("isOpen", open);
  storeOverlayElement.setAttribute("aria-hidden", open ? "false" : "true");
}

function showBriefingModal(open: boolean): void {
  if (!briefingOverlayElement) return;

  briefingOverlayElement.classList.toggle("isOpen", open);
  briefingOverlayElement.setAttribute("aria-hidden", open ? "false" : "true");
}

function showRunSummaryModal(open: boolean): void {
  if (!runSummaryOverlayElement) return;

  summaryOpen = open;
  runSummaryOverlayElement.classList.toggle("isOpen", open);
  runSummaryOverlayElement.setAttribute("aria-hidden", open ? "false" : "true");
}

function renderRunSummary(): void {
  if (
    !summaryScoreElement ||
    !summaryWpmElement ||
    !summaryAccuracyElement ||
    !summaryTimeElement ||
    !summaryErrorsElement
  ) {
    return;
  }

  Stats.stopTimer();
  const zenMode = isZenMode();

  if (summaryScoreStatElement) {
    summaryScoreStatElement.classList.toggle("isHidden", zenMode);
  }

  summaryScoreElement.textContent = RogueState.getRunScore().toLocaleString();
  summaryWpmElement.textContent = String(Stats.getWPM());
  summaryAccuracyElement.textContent = `${Stats.getAccuracy()}%`;
  summaryTimeElement.textContent = `${Stats.getElapsedTime().toFixed(1)}s`;
  summaryErrorsElement.textContent = String(Stats.getIncorrectChars());
}

function maybeOpenRunSummary(): void {
  if (summaryOpen) return;
  if (!shouldShowRunSummaryForCurrentState()) return;
  if (summaryDismissedForEndState) return;

  renderRunSummary();
  showRunSummaryModal(true);
}

function startRun(): void {
  Stats.reset();
  Stats.startTimer();
  RogueState.startNewRun(performance.now());
  completionStatsRecorded = false;
  summaryDismissedForEndState = false;
  showRunSummaryModal(false);
  showStoreModal(false);
  briefingOpen = false;
  briefingOpenedAt = 0;
  lastBriefedOperationKey = "";
  briefingRemainingMsSnapshot = 0;
  queuedAutoUseSlots = [];
  showBriefingModal(false);
  commandMode = false;
  commandBuffer = "";
  updateCommandLiveLine();
  renderAll();
}

function resetRun(): void {
  Stats.reset();
  RogueState.resetRunState();
  completionStatsRecorded = false;
  summaryDismissedForEndState = false;
  showRunSummaryModal(false);
  showStoreModal(false);
  briefingOpen = false;
  briefingOpenedAt = 0;
  lastBriefedOperationKey = "";
  briefingRemainingMsSnapshot = 0;
  queuedAutoUseSlots = [];
  showBriefingModal(false);
  commandMode = false;
  commandBuffer = "";
  updateCommandLiveLine();
  renderAll();
}

function updateTimerStrip(): void {
  if (!timerFillElement || !timerTextElement) return;
  const rules = getEffectiveGameRules();

  if (!RogueState.isOperationActive()) {
    timerFillElement.style.width = "0%";
    timerTextElement.textContent = "-";
    return;
  }

  if (!rules.timeEnabled) {
    timerFillElement.style.width = "0%";
    timerTextElement.textContent = "∞";
    return;
  }

  const remainingMs = briefingOpen
    ? briefingRemainingMsSnapshot
    : RogueState.getRemainingMs(performance.now());
  timerFillElement.style.width = "0%";

  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  timerTextElement.textContent = String(seconds);
}

function renderPopups(): void {
  if (!popupLayerElement) return;

  const popups = RogueState.drainScorePopups();
  for (const popup of popups) {
    const node = document.createElement("div");
    node.className = "scorePopup";
    node.textContent = `+${Math.round(popup.out)} OUT × ${popup.amp.toFixed(2)} AMP = ${popup.gain.toLocaleString()}`;
    popupLayerElement.appendChild(node);

    window.setTimeout(() => {
      node.remove();
    }, 820);
  }
}

function positionPopupLayerAtCursor(): void {
  if (!popupLayerElement) return;

  const cursorAnchor = document.getElementById("cursorAnchor");
  const promptBlock = document.getElementById("promptBlock");
  if (!cursorAnchor || !promptBlock) return;

  const cursorRect = cursorAnchor.getBoundingClientRect();
  const promptRect = promptBlock.getBoundingClientRect();

  const left = Math.max(0, cursorRect.left - promptRect.left);
  const top = Math.max(0, cursorRect.top - promptRect.top - 50);

  popupLayerElement.style.left = `${left}px`;
  popupLayerElement.style.top = `${top}px`;
}

function keepViewportPinnedToTopOnRoundChange(): void {
  const phase = RogueState.getPhase();
  const operationKey = RogueState.isOperationActive()
    ? `${RogueState.getCurrentSector()}-${RogueState.getCurrentOperationInSector()}`
    : "";

  const phaseChanged = phase !== lastRenderedPhase;
  const operationChanged = operationKey !== lastRenderedOperationKey;

  if ((phaseChanged || operationChanged) && window.scrollY > 0) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  lastRenderedPhase = phase;
  lastRenderedOperationKey = operationKey;
}

function syncStatsPromptSnapshot(): void {
  if (!RogueState.isOperationActive()) {
    Stats.updatePromptSnapshot("", "");
    return;
  }

  Stats.updatePromptSnapshot(RogueState.getExpectedText(), RogueState.getTypedText());
}

function renderAll(): void {
  keepViewportPinnedToTopOnRoundChange();
  syncStatsPromptSnapshot();
  finalizeRunMetricsIfNeeded();
  updateModeControlsState();
  updateDisplay();
  updateScoreDisplay();
  updateTimerStrip();
  updateCommandLiveLine();
  positionPopupLayerAtCursor();
  renderPopups();

  maybeOpenOperationBriefing();

  if (RogueState.isShopOpen()) {
    refreshStoreModal();
    showStoreModal(true);
  } else {
    showStoreModal(false);
  }

  const shouldShowSummary = shouldShowRunSummaryForCurrentState();
  if (!shouldShowSummary && summaryOpen) {
    showRunSummaryModal(false);
  }
  if (!shouldShowSummary) {
    summaryDismissedForEndState = false;
  }
  maybeOpenRunSummary();
}

function processTypedChar(char: string): void {
  if (briefingOpen) return;
  if (!RogueState.isOperationActive()) {
    return;
  }

  const now = performance.now();
  const result = RogueState.typeChar(char, now, Stats.getWPM());

  if (result.accepted && char !== " ") {
    playLetterThock();
  }

  if (result.wordCompleted && result.perfectWord) {
    const ampLevel = result.ampLevel ?? RogueState.getAmpValue();
    const cleanChain = result.cleanChain ?? RogueState.getCleanChain();
    playPerfectWordAccent(ampLevel, cleanChain);
  }

  if (result.accepted && result.correct) {
    Stats.recordCorrectChar();
  } else if (!result.correct) {
    Stats.recordIncorrectChar();
  }

  RogueState.tryFinalizeIfTargetMet(now);
}

function processBackspace(): void {
  if (briefingOpen) return;
  const result = RogueState.backspace();

  if (result.accepted) {
    Stats.recordBackspace();
  }
}

function useCommandSlot(slotIndex: number): void {
  if (briefingOpen) return;
  const result = RogueState.useCommandSlot(slotIndex);
  setCommandOutput(`--use ${slotIndex + 1}`, result.message);
  renderAll();
}

function collectQueuedAutoUseSlots(): void {
  if (!briefingAutoActionsElement) {
    queuedAutoUseSlots = [];
    return;
  }

  const checkedNodes = briefingAutoActionsElement.querySelectorAll<HTMLInputElement>(
    "input[data-auto-slot]:checked"
  );

  queuedAutoUseSlots = Array.from(checkedNodes)
    .map((node) => Number(node.dataset.autoSlot ?? "-1"))
    .filter((slot) => Number.isFinite(slot) && slot >= 0)
    .sort((a, b) => b - a);
}

function applyQueuedAutoUseSlots(): void {
  if (queuedAutoUseSlots.length === 0) return;

  const messages: string[] = [];
  for (const slot of queuedAutoUseSlots) {
    const result = RogueState.useCommandSlot(slot);
    messages.push(`#${slot + 1} ${result.message}`);
  }

  queuedAutoUseSlots = [];
  setCommandOutput("auto-activate", messages.join(" | "));
}

function renderBriefingLoadout(): void {
  if (!briefingLoadoutElement) return;

  const scripts = RogueState.getScriptLoadout();
  const commandSlots = RogueState.getCommandSlots();
  const commandDefs = RogueState.getCommandDefinitions();
  const patchStacks = RogueState.getPatchStacks();
  const patchDefs = RogueState.getPatchDefinitions();

  const scriptCards = scripts.map(
    (script) =>
      `<article class=\"briefingItem\" title=\"${escapeHtml(script.description)}\"><span class=\"briefingItemIcon\">${getScriptIcon(script.id)}</span><span class=\"briefingItemLabel\">${escapeHtml(script.label)}</span></article>`
  );

  const actionCards = commandSlots
    .map((id) => {
      if (!id) return null;
      const def = commandDefs[id];
      return `<article class=\"briefingItem\" title=\"${escapeHtml(def.description)}\"><span class=\"briefingItemIcon\">${getCommandIcon(id)}</span><span class=\"briefingItemLabel\">${escapeHtml(def.label)}</span></article>`;
    })
    .filter((entry): entry is string => entry !== null);

  const patchEntries = (Object.keys(patchStacks) as RogueState.PatchId[]).filter(
    (id) => patchStacks[id] > 0
  );
  const patchCards = patchEntries.map((id) => {
    const def = patchDefs[id];
    return `<article class=\"briefingItem\" title=\"${escapeHtml(def.description)}\"><span class=\"briefingItemIcon\">${getPatchIcon(id)}</span><span class=\"briefingItemLabel\">${escapeHtml(def.label)} x${patchStacks[id]}</span></article>`;
  });

  const cards = [...scriptCards, ...actionCards, ...patchCards];
  if (cards.length === 0) {
    briefingLoadoutElement.innerHTML =
      '<article class=\"briefingItem isEmpty\"><span class=\"briefingItemLabel\">No items equipped.</span></article>';
    return;
  }

  briefingLoadoutElement.innerHTML = cards.join("");
}

function renderBriefingAutoActions(): void {
  if (!briefingAutoActionsElement) return;

  const slots = RogueState.getCommandSlots();
  const defs = RogueState.getCommandDefinitions();
  const rows = slots
    .map((id, index) => {
      if (!id) return null;
      const def = defs[id];
      return `<label class=\"briefingAutoRow\"><input type=\"checkbox\" data-auto-slot=\"${index}\" /><span class=\"briefingItemIcon\">${getCommandIcon(id)}</span><span class=\"briefingAutoLabel\">Use ${escapeHtml(def.label)} at stage start</span></label>`;
    })
    .filter((entry): entry is string => entry !== null);

  if (rows.length === 0) {
    briefingAutoActionsElement.innerHTML =
      '<div class=\"briefingAutoEmpty\">No actions available to auto-activate.</div>';
    return;
  }

  briefingAutoActionsElement.innerHTML = rows.join("");
}

function closeOperationBriefing(): void {
  if (!briefingOpen) return;

  collectQueuedAutoUseSlots();
  const now = performance.now();
  const pausedFor = Math.max(0, now - briefingOpenedAt);
  RogueState.shiftOperationTiming(pausedFor);
  briefingOpen = false;
  briefingRemainingMsSnapshot = 0;
  showBriefingModal(false);
  applyQueuedAutoUseSlots();
  renderAll();
}

function maybeOpenOperationBriefing(): void {
  if (isZenMode()) return;
  if (!RogueState.isOperationActive()) return;
  if (briefingOpen) return;

  const operationKey = `${RogueState.getCurrentSector()}-${RogueState.getCurrentOperationInSector()}`;
  if (operationKey === lastBriefedOperationKey) {
    return;
  }

  const briefing = RogueState.getOperationBriefing();
  if (!briefing) return;

  lastBriefedOperationKey = operationKey;
  briefingOpen = true;
  briefingOpenedAt = performance.now();
  briefingRemainingMsSnapshot = RogueState.getRemainingMs(briefingOpenedAt);

  if (briefingSubtitleElement) {
    briefingSubtitleElement.textContent = briefing.label;
  }

  if (briefingTargetElement) {
    briefingTargetElement.textContent = briefing.targetScore.toLocaleString();
  }

  if (briefingTimeElement) {
    briefingTimeElement.textContent = briefing.timeLimitSec > 0 ? `${briefing.timeLimitSec}s` : "Off";
  }

  if (briefingSkipElement) {
    briefingSkipElement.textContent = briefing.canSkip ? "Yes (+3 credits)" : "No";
  }

  if (briefingDebuffsElement) {
    if (briefing.firewalls.length === 0) {
      briefingDebuffsElement.innerHTML =
        '<article class="briefingDebuffCard"><div class="briefingDebuffName">NONE</div><div class="briefingDebuffDesc">No active challenge on this stage.</div></article>';
    } else {
      briefingDebuffsElement.innerHTML = briefing.firewalls
        .map(
          (firewall) =>
            `<article class="briefingDebuffCard"><div class="briefingDebuffName">${escapeHtml(firewall.label)}</div><div class="briefingDebuffDesc">${escapeHtml(firewall.description)}</div></article>`
        )
        .join("");
    }
  }

  renderBriefingLoadout();
  renderBriefingAutoActions();

  showBriefingModal(true);
}

function executeTerminalCommand(rawInput: string): void {
  const commandText = rawInput.trim();
  const normalized = commandText.startsWith("`") ? commandText.slice(1).trim() : commandText;

  if (normalized.length === 0) {
    setCommandOutput(rawInput, "Type a command after `. Use `--help.");
    return;
  }

  const [commandRaw, ...args] = normalized.split(/\s+/);
  const command = commandRaw.toLowerCase();

  if (command === "--help") {
    setCommandOutput(rawInput, COMMAND_HELP);
    return;
  }

  if (command === "--start") {
    startRun();
    setCommandOutput(rawInput, "Run started.");
    return;
  }

  if (command === "--reset") {
    resetRun();
    setCommandOutput(rawInput, "Run reset.");
    return;
  }

  if (command === "--skip") {
    const result = RogueState.skipCurrentOperation(performance.now());
    setCommandOutput(rawInput, result.message);
    renderAll();
    return;
  }

  if (command === "--shop") {
    if (!RogueState.isShopOpen()) {
      setCommandOutput(rawInput, "Workshop is not open.");
      return;
    }

    refreshStoreModal();
    showStoreModal(true);
    setCommandOutput(rawInput, "Workshop opened.");
    return;
  }

  if (command === "--continue") {
    const result = RogueState.continueFromShop(performance.now());
    setCommandOutput(rawInput, result.message);
    renderAll();
    return;
  }

  if (command === "--use") {
    const slotRaw = args[0];
    const slot = Number(slotRaw);

    if (!Number.isFinite(slot) || slot < 1) {
      setCommandOutput(rawInput, "Usage: `--use <slot-number>");
      return;
    }

    useCommandSlot(slot - 1);
    return;
  }

  if (command === "--mode") {
    const modeRaw = (args[0] ?? "").toLowerCase();
    if (modeRaw !== "quotes" && modeRaw !== "books" && modeRaw !== "letters") {
      setCommandOutput(rawInput, "Usage: `--mode <quotes|books|letters>");
      return;
    }

    const result = RogueState.setPromptContentMode(modeRaw);
    if (contentModeSelectElement) {
      contentModeSelectElement.value = RogueState.getPromptContentMode();
    }
    setCommandOutput(rawInput, result.message);
    renderAll();
    return;
  }

  setCommandOutput(rawInput, `Unknown command "${command}". Use \`--help.`);
}

function refreshStoreModal(): void {
  if (
    !storeScriptsElement ||
    !storeCommandsElement ||
    !storePatchesElement ||
    !storeLicenseElement ||
    !storeCreditsElement ||
    !storeStatusElement ||
    !storeCloseButtonElement ||
    !storeRerollButtonElement
  ) {
    return;
  }

  const offers = RogueState.getShopOffers();
  const scriptDefs = RogueState.getScriptDefinitions();
  const commandDefs = RogueState.getCommandDefinitions();
  const patchDefs = RogueState.getPatchDefinitions();
  const licenseDefs = RogueState.getLicenseDefinitions();

  storeCreditsElement.textContent = `${RogueState.getCredits()}c`;
  storeStatusElement.textContent = RogueState.getStatusText();

  const loadout = RogueState.getScriptLoadout();
  const scriptCap = RogueState.getScriptSlotCapacityValue();
  const hasZeroDay = loadout.some((script) => script.tier === "zero-day");

  const scriptCards = offers.scripts.map((id) => {
    const def = scriptDefs[id];
    const price = RogueState.getScriptPrice(id);

    const noSlots = loadout.length >= scriptCap;
    const zeroDayBlocked = def.tier === "zero-day" && hasZeroDay;
    const disabled =
      RogueState.getCredits() < price || noSlots || zeroDayBlocked ? "disabled" : "";

    return `<article class="storeCard">
      <div class="storeCardHead">
        <div class="storeCardTitle">${escapeHtml(def.label)}</div>
        <div class="storeCardPrice">${price}c</div>
      </div>
      <div class="storeCardDesc">${escapeHtml(def.description)}</div>
      <button class="storeBtn" type="button" data-buy-script="${id}" ${disabled}>Buy Booster</button>
    </article>`;
  });

  const commandSlots = RogueState.getCommandSlots();
  const commandFull = commandSlots.every((slot) => slot !== null);

  const commandCards = offers.commands.map((id) => {
    const def = commandDefs[id];
    const price = RogueState.getCommandPrice(id);
    const disabled = RogueState.getCredits() < price || commandFull ? "disabled" : "";

    return `<article class="storeCard">
      <div class="storeCardHead">
        <div class="storeCardTitle">${escapeHtml(def.label)}</div>
        <div class="storeCardPrice">${price}c</div>
      </div>
      <div class="storeCardDesc">${escapeHtml(def.description)}</div>
      <button class="storeBtn" type="button" data-buy-command="${id}" ${disabled}>Buy Action</button>
    </article>`;
  });

  const patchStacks = RogueState.getPatchStacks();
  const usedPatchTypes = Object.values(patchStacks).filter((count) => count > 0).length;
  const patchCap = RogueState.getPatchSlotCapacityValue();

  const patchCards = offers.patches.map((id) => {
    const def = patchDefs[id];
    const price = RogueState.getPatchPrice(id);
    const blockedBySlots = patchStacks[id] === 0 && usedPatchTypes >= patchCap;
    const disabled = RogueState.getCredits() < price || blockedBySlots ? "disabled" : "";

    return `<article class="storeCard">
      <div class="storeCardHead">
        <div class="storeCardTitle">${escapeHtml(def.label)}</div>
        <div class="storeCardPrice">${price}c</div>
      </div>
      <div class="storeCardDesc">${escapeHtml(def.description)}</div>
      <button class="storeBtn" type="button" data-buy-patch="${id}" ${disabled}>Buy Talent</button>
    </article>`;
  });

  let licenseCard = '<article class="storeCard isEmpty">No upgrade available.</article>';
  if (offers.license) {
    const def = licenseDefs[offers.license];
    const price = RogueState.getLicensePrice(def.id);
    const disabled =
      RogueState.getCredits() < price || RogueState.getShopLicenseBought() ? "disabled" : "";

    licenseCard = `<article class="storeCard">
      <div class="storeCardHead">
        <div class="storeCardTitle">${escapeHtml(def.label)}</div>
        <div class="storeCardPrice">${price}c</div>
      </div>
      <div class="storeCardDesc">${escapeHtml(def.description)}</div>
      <button class="storeBtn" type="button" data-buy-license="${def.id}" ${disabled}>Buy Upgrade</button>
    </article>`;
  }

  storeScriptsElement.innerHTML = scriptCards.join("");
  storeCommandsElement.innerHTML = commandCards.join("");
  storePatchesElement.innerHTML = patchCards.join("");
  storeLicenseElement.innerHTML = licenseCard;

  const rerollCost = RogueState.getRerollCost();
  storeRerollButtonElement.textContent = `REROLL ${rerollCost}c`;
  storeRerollButtonElement.disabled = RogueState.getCredits() < rerollCost;

  storeCloseButtonElement.textContent = "Start Next Stage";
}

function bindStoreEvents(): void {
  storeOverlayElement = document.getElementById("storeOverlay");
  storeScriptsElement = document.getElementById("storeScripts");
  storeCommandsElement = document.getElementById("storeCommands");
  storePatchesElement = document.getElementById("storePatches");
  storeLicenseElement = document.getElementById("storeLicense");
  storeCreditsElement = document.getElementById("storeCreditsValue");
  storeStatusElement = document.getElementById("storeStatus");
  storeCloseButtonElement = document.getElementById("storeCloseBtn") as HTMLButtonElement | null;
  storeRerollButtonElement = document.getElementById("storeRerollBtn") as HTMLButtonElement | null;

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const buyScriptButton = target.closest<HTMLButtonElement>("[data-buy-script]");
    if (buyScriptButton) {
      const id = buyScriptButton.dataset.buyScript as RogueState.ScriptId | undefined;
      if (!id) return;
      const result = RogueState.purchaseScript(id);
      setCommandOutput(`buy ${id}`, result.message);
      renderAll();
      return;
    }

    const buyCommandButton = target.closest<HTMLButtonElement>("[data-buy-command]");
    if (buyCommandButton) {
      const id = buyCommandButton.dataset.buyCommand as RogueState.CommandId | undefined;
      if (!id) return;
      const result = RogueState.purchaseCommand(id);
      setCommandOutput(`buy ${id}`, result.message);
      renderAll();
      return;
    }

    const buyPatchButton = target.closest<HTMLButtonElement>("[data-buy-patch]");
    if (buyPatchButton) {
      const id = buyPatchButton.dataset.buyPatch as RogueState.PatchId | undefined;
      if (!id) return;
      const result = RogueState.purchasePatch(id);
      setCommandOutput(`buy ${id}`, result.message);
      renderAll();
      return;
    }

    const buyLicenseButton = target.closest<HTMLButtonElement>("[data-buy-license]");
    if (buyLicenseButton) {
      const result = RogueState.purchaseLicense();
      setCommandOutput("buy upgrade", result.message);
      renderAll();
      return;
    }

    const useCommandButton = target.closest<HTMLButtonElement>("[data-use-command-slot]");
    if (useCommandButton) {
      const slot = Number(useCommandButton.dataset.useCommandSlot ?? "-1");
      if (Number.isNaN(slot) || slot < 0) return;
      useCommandSlot(slot);
      return;
    }

    const sellScriptButton = target.closest<HTMLButtonElement>("[data-sell-script]");
    if (sellScriptButton) {
      const scriptId = sellScriptButton.dataset.sellScript as RogueState.ScriptId | undefined;
      if (!scriptId) return;
      const result = RogueState.sellScript(scriptId);
      setCommandOutput(`sell ${scriptId}`, result.message);
      renderAll();
    }
  });

  storeRerollButtonElement?.addEventListener("click", () => {
    const result = RogueState.rerollShopOffers();
    setCommandOutput("reroll", result.message);
    renderAll();
  });

  storeCloseButtonElement?.addEventListener("click", () => {
    const result = RogueState.continueFromShop(performance.now());
    setCommandOutput("continue", result.message);
    renderAll();
  });
}

function bindTopControls(): void {
  const startRunBtn = document.getElementById("startRunBtn") as HTMLButtonElement | null;
  const resetRunBtn = document.getElementById("resetRunBtn") as HTMLButtonElement | null;
  const skipOperationBtn = document.getElementById("skipOperationBtn") as HTMLButtonElement | null;
  contentModeSelectElement = document.getElementById("contentModeSelect") as HTMLSelectElement | null;
  gameModeSelectElement = document.getElementById("gameModeSelect") as HTMLSelectElement | null;
  hardcoreToggleElement = document.getElementById("hardcoreToggle") as HTMLInputElement | null;
  soundToggleElement = document.getElementById("soundToggle") as HTMLInputElement | null;
  customPanelElement = document.getElementById("customSettingsPanel");
  customContentInputElement = document.getElementById("customContentInput") as HTMLInputElement | null;
  customChapterRangeElement = document.getElementById("customChapterRange");
  customChapterStartSelectElement = document.getElementById(
    "customChapterStartSelect"
  ) as HTMLSelectElement | null;
  customChapterEndSelectElement = document.getElementById(
    "customChapterEndSelect"
  ) as HTMLSelectElement | null;
  customContentStatusElement = document.getElementById("customContentStatus");
  customContentClearButtonElement = document.getElementById(
    "customContentClearBtn"
  ) as HTMLButtonElement | null;
  floatingScriptsElement = document.getElementById("floatingScripts");
  floatingUtilityElement = document.getElementById("floatingUtility");

  startRunBtn?.addEventListener("click", () => {
    primeGameAudio();
    startRun();
  });

  resetRunBtn?.addEventListener("click", () => {
    primeGameAudio();
    resetRun();
  });

  skipOperationBtn?.addEventListener("click", () => {
    primeGameAudio();
    const result = RogueState.skipCurrentOperation(performance.now());
    setCommandOutput("skip", result.message);
    renderAll();
  });

  if (contentModeSelectElement) {
    contentModeSelectElement.value = RogueState.getPromptContentMode();
    contentModeSelectElement.addEventListener("change", () => {
      const rawMode = contentModeSelectElement?.value;
      if (!rawMode) return;
      if (rawMode !== "quotes" && rawMode !== "books" && rawMode !== "letters") return;

      const result = RogueState.setPromptContentMode(rawMode);
      setCommandOutput(`mode ${rawMode}`, result.message);
      renderAll();
    });
  }

  gameModeSelectElement?.addEventListener("change", () => {
    const nextMode = gameModeSelectElement?.value;
    if (nextMode !== "game" && nextMode !== "zen") return;

    setGameMode(nextMode);
    updateModeControlsState();
    setCommandOutput("mode", `Game mode set to ${nextMode}.`);
    resetRun();
  });

  hardcoreToggleElement?.addEventListener("change", () => {
    const checked = Boolean(hardcoreToggleElement?.checked);
    setHardcoreEnabled(checked);
    updateModeControlsState();
    setCommandOutput("hardcore", checked ? "Hardcore enabled." : "Hardcore disabled.");
    renderAll();
  });

  soundToggleElement?.addEventListener("change", () => {
    const checked = Boolean(soundToggleElement?.checked);
    setSoundEffectsEnabled(checked);
    updateModeControlsState();
    setCommandOutput("sound", checked ? "Sound effects enabled." : "Sound effects disabled.");
    renderAll();
  });

  customChapterStartSelectElement?.addEventListener("change", () => {
    const start = Number(customChapterStartSelectElement?.value ?? "");
    const end = Number(customChapterEndSelectElement?.value ?? "");
    const range = setCustomChapterRange(
      Number.isFinite(start) ? start : null,
      Number.isFinite(end) ? end : null
    );
    setCommandOutput(
      "chapter range",
      `Using chapters ${range.start ?? "-"} to ${range.end ?? "-"}.`
    );
    updateModeControlsState();
    resetRun();
  });

  customChapterEndSelectElement?.addEventListener("change", () => {
    const start = Number(customChapterStartSelectElement?.value ?? "");
    const end = Number(customChapterEndSelectElement?.value ?? "");
    const range = setCustomChapterRange(
      Number.isFinite(start) ? start : null,
      Number.isFinite(end) ? end : null
    );
    setCommandOutput(
      "chapter range",
      `Using chapters ${range.start ?? "-"} to ${range.end ?? "-"}.`
    );
    updateModeControlsState();
    resetRun();
  });

  customContentInputElement?.addEventListener("change", async () => {
    const file = customContentInputElement?.files?.[0];
    if (!file) return;

    try {
      if (isEpubFile(file)) {
        setCommandOutput("custom import", `Importing EPUB ${file.name}...`);
        const result = await importEpubCustomContent(file, 5_000);
        const storedCount = setCustomContentEntries(result.entries, result.sourceName, {
          sourceType: "epub",
          chapters: result.chapters,
          dedupe: false,
          truncatedAfterChapterTitle: result.truncatedAfterChapterTitle,
        });
        const warningSuffix =
          result.warnings.length > 0 ? ` ${result.warnings.length} sections skipped.` : "";
        const truncatedSuffix = result.truncatedAfterChapterTitle
          ? ` Truncated before chapter: ${result.truncatedAfterChapterTitle}.`
          : "";
        setCommandOutput(
          "custom import",
          `Loaded ${storedCount} entries from EPUB (${result.chapters.length}/${result.discoveredChapterCount} chapters).${truncatedSuffix}${warningSuffix}`
        );
      } else {
        const text = await file.text();
        const parsedEntries = parseCustomContentCsv(text);
        if (parsedEntries.length === 0) {
          setCommandOutput("custom import", "No valid entries were found in the uploaded file.");
        } else {
          const storedCount = setCustomContentEntries(parsedEntries, file.name, {
            sourceType: "plain",
            dedupe: true,
          });
          setCommandOutput(
            "custom import",
            `Loaded ${storedCount} custom entries from ${file.name}.`
          );
        }
      }
    } catch {
      setCommandOutput("custom import", "Failed to import custom content file.");
    }

    if (customContentInputElement) {
      customContentInputElement.value = "";
    }

    updateModeControlsState();
    resetRun();
  });

  customContentClearButtonElement?.addEventListener("click", () => {
    clearCustomContentEntries();
    setCommandOutput("custom clear", "Custom content cleared.");
    updateModeControlsState();
    resetRun();
  });

  updateModeControlsState();
}

function bindBriefingEvents(): void {
  briefingOverlayElement = document.getElementById("briefingOverlay");
  briefingSubtitleElement = document.getElementById("briefingSubtitle");
  briefingTargetElement = document.getElementById("briefingTarget");
  briefingTimeElement = document.getElementById("briefingTime");
  briefingSkipElement = document.getElementById("briefingSkip");
  briefingDebuffsElement = document.getElementById("briefingDebuffs");
  briefingLoadoutElement = document.getElementById("briefingLoadout");
  briefingAutoActionsElement = document.getElementById("briefingAutoActions");
  briefingCloseButtonElement = document.getElementById("briefingCloseBtn") as HTMLButtonElement | null;

  briefingCloseButtonElement?.addEventListener("click", () => {
    closeOperationBriefing();
  });
}

function bindRunSummaryEvents(): void {
  runSummaryOverlayElement = document.getElementById("runSummaryOverlay");
  summaryScoreStatElement = document.getElementById("summaryScoreStat");
  summaryScoreElement = document.getElementById("summaryScore");
  summaryWpmElement = document.getElementById("summaryWpm");
  summaryAccuracyElement = document.getElementById("summaryAccuracy");
  summaryTimeElement = document.getElementById("summaryTime");
  summaryErrorsElement = document.getElementById("summaryErrors");
  summaryRestartButtonElement = document.getElementById("summaryRestartBtn") as HTMLButtonElement | null;
  summaryCloseButtonElement = document.getElementById("summaryCloseBtn") as HTMLButtonElement | null;

  summaryRestartButtonElement?.addEventListener("click", () => {
    primeGameAudio();
    startRun();
  });

  summaryCloseButtonElement?.addEventListener("click", () => {
    summaryDismissedForEndState = true;
    showRunSummaryModal(false);
  });
}

function handleCommandModeKey(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    commandMode = false;
    commandBuffer = "";
    updateCommandLiveLine();
    renderAll();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const commandText = `\`${commandBuffer}`;
    commandMode = false;
    commandBuffer = "";
    executeTerminalCommand(commandText);
    updateCommandLiveLine();
    renderAll();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    commandBuffer = commandBuffer.slice(0, -1);
    updateCommandLiveLine();
    renderAll();
    return;
  }

  if (isPrintableKey(event)) {
    event.preventDefault();
    commandBuffer += event.key;
    updateCommandLiveLine();
    renderAll();
  }
}

function bindKeyboardCapture(): void {
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    primeGameAudio();

    if (summaryOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        summaryDismissedForEndState = true;
        showRunSummaryModal(false);
      }
      return;
    }

    if (briefingOpen) {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        closeOperationBriefing();
      }
      return;
    }

    if (!isZenMode() && event.ctrlKey && event.key >= "1" && event.key <= "9") {
      event.preventDefault();
      const slot = Number(event.key) - 1;
      useCommandSlot(slot);
      return;
    }

    if (!isZenMode() && commandMode) {
      handleCommandModeKey(event);
      return;
    }

    if (!isZenMode() && event.key === "`") {
      event.preventDefault();
      commandMode = true;
      commandBuffer = "";
      updateCommandLiveLine();
      renderAll();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      processBackspace();
      renderAll();
      return;
    }

    if (event.key === "Escape") {
      if (RogueState.isShopOpen()) {
        event.preventDefault();
        showStoreModal(true);
      }
      return;
    }

    if (isPrintableKey(event)) {
      event.preventDefault();
      processTypedChar(event.key);
      renderAll();
    }
  });
}

export function tickGame(): void {
  if (!briefingOpen) {
    RogueState.tick(performance.now());
  }
  renderAll();
}

export function initInputHandler(): void {
  commandOutputElement = document.getElementById("commandOutput");
  commandLiveElement = document.getElementById("commandLive");
  popupLayerElement = document.getElementById("scorePopupLayer");
  timerFillElement = document.getElementById("timerFill");
  timerTextElement = document.getElementById("timerText");

  if (!commandOutputElement || !commandLiveElement || !popupLayerElement) {
    throw new Error("Input handler elements not found");
  }

  bindStoreEvents();
  bindBriefingEvents();
  bindRunSummaryEvents();
  bindTopControls();
  bindKeyboardCapture();

  setCommandOutput("ready", "Use `--start to begin a run.");
  updateCommandLiveLine();
  renderAll();
}
