import * as Stats from "./stats";
import { wordManager } from "./word-manager";
import {
  getNextQuizQuestion,
  refreshQuizContentFromStorage,
  validateQuizAnswer,
} from "./quiz-manager";
import * as GameState from "../game/game-state";
import * as RogueState from "../game/roguelike-state";
import * as ScoreCalculator from "../scoring/score-calculator";
import { updateDisplay } from "../ui/typing-display";
import { updateScoreDisplay } from "../ui/score-display";
import {
  createCustomContentTemplate,
  loadRegularDifficulty,
  loadSelectedQuizDifficultyFilter,
  loadSelectedQuizThemes,
  saveCustomContentPackage,
  saveRegularDifficulty,
  saveSelectedQuizDifficultyFilter,
  saveSelectedQuizThemes,
  validateCustomContentPackage,
} from "../utils/storage";

const REGULAR_WORDS_PER_SET = 10;
const QUIZ_AUTO_NEXT_MS = 900;
const THEME_STORAGE_KEY = "roguetype:theme";
const COMMAND_HELP_TEXT =
  "Commands use ! prefix: !--help !--rogue !--training !--mode regular|quiz !--validation strict|loose !--difficulty easy|medium|hard !--quiz-difficulty all|easy|medium|hard !--theme add|remove|set|reset|list !--next !--tip !--submit !--reset !--start !--theme-mode dark|bright !--template !--import";

let inputElement: HTMLInputElement | null = null;
let commandInputElement: HTMLInputElement | null = null;
let commandOutputElement: HTMLElement | null = null;
let customPackageInputElement: HTMLInputElement | null = null;
let terminalElement: HTMLElement | null = null;
let quizAutoNextTimeout: number | null = null;
let activeTheme: "dark" | "bright" = "dark";

let storeOverlayElement: HTMLElement | null = null;
let storeItemsListElement: HTMLElement | null = null;
let storeModulesListElement: HTMLElement | null = null;
let storeCloseButtonElement: HTMLButtonElement | null = null;
let storeCoinsValueElement: HTMLElement | null = null;
let storeStatusElement: HTMLElement | null = null;

function renderAll(): void {
  updateDisplay();
  updateScoreDisplay();
}

function setInlineFocusTarget(target: "typing" | "command"): void {
  commandInputElement?.classList.toggle("isInlineTarget", target === "command");
}

function isCommandModeValue(value: string): boolean {
  return value.startsWith("!");
}

function syncInlineInputModeFromValue(value: string): void {
  const commandMode = isCommandModeValue(value);
  setInlineFocusTarget(commandMode ? "command" : "typing");
  terminalElement?.classList.toggle("isCommandMode", commandMode);
}

function focusInputSoon(): void {
  if (!commandInputElement) return;
  window.setTimeout(() => {
    commandInputElement?.focus();
    syncInlineInputModeFromValue(commandInputElement?.value ?? "");
  }, 0);
}

function clearPendingQuizAutoNext(): void {
  if (quizAutoNextTimeout !== null) {
    window.clearTimeout(quizAutoNextTimeout);
    quizAutoNextTimeout = null;
  }
}

function isRogueTab(): boolean {
  return GameState.getMainTab() === "rogue";
}

function getWordSeparator(): " " | "_" {
  return isRogueTab() ? "_" : " ";
}

function canTypeIntoPrompt(): boolean {
  if (!isRogueTab()) return true;
  return RogueState.isLevelActive();
}

function isStoreModalOpen(): boolean {
  return storeOverlayElement?.classList.contains("isOpen") ?? false;
}

function setStoreModalOpen(open: boolean): void {
  if (!storeOverlayElement) return;

  storeOverlayElement.classList.toggle("isOpen", open);
  storeOverlayElement.setAttribute("aria-hidden", open ? "false" : "true");
}

function syncStoreCoinsInline(): void {
  if (storeCoinsValueElement) {
    storeCoinsValueElement.textContent = String(RogueState.getCoins());
  }
}

function syncStoreStatusInline(message: string): void {
  if (storeStatusElement) {
    storeStatusElement.textContent = message;
  }
}

function refreshStoreModal(): void {
  if (!storeItemsListElement || !storeModulesListElement || !storeCloseButtonElement) {
    return;
  }

  syncStoreCoinsInline();

  const phase = RogueState.getPhase();
  const consumableSlots = RogueState.getConsumableSlots();
  const moduleSlots = RogueState.getModuleSlots();
  const hasFreeConsumableSlot = consumableSlots.some((entry) => entry === null);
  const hasFreeModuleSlot = moduleSlots.some((entry) => entry === null);
  const ownedModules = new Set(moduleSlots.filter((entry): entry is RogueState.RogueModuleId => entry !== null));

  const itemCards = RogueState.getStoreConsumableOffers().map((offer) => {
    const canBuy =
      phase === "store" &&
      hasFreeConsumableSlot &&
      RogueState.getCoins() >= offer.cost;

    return `<article class="storeCard" box-="square">
      <div class="storeCardTop">
        <div>
          <div class="storeCardTitle">${offer.name}</div>
          <div class="storeCardDesc">${offer.description}</div>
        </div>
        <div class="storeCardCost">${offer.cost}c</div>
      </div>
      <button class="storeBuyBtn" type="button" box-="square" data-buy-consumable="${offer.id}" ${canBuy ? "" : "disabled"}>Buy</button>
    </article>`;
  });

  const moduleCards = RogueState.getStoreModuleOffers().map((offer) => {
    const alreadyOwned = ownedModules.has(offer.id);
    const canBuy =
      phase === "store" &&
      hasFreeModuleSlot &&
      !alreadyOwned &&
      RogueState.getCoins() >= offer.cost;

    const buttonLabel = alreadyOwned ? "Equipped" : "Equip";

    return `<article class="storeCard" box-="square">
      <div class="storeCardTop">
        <div>
          <div class="storeCardTitle">${offer.name}</div>
          <div class="storeCardDesc">${offer.description}</div>
        </div>
        <div class="storeCardCost">${offer.cost}c</div>
      </div>
      <button class="storeBuyBtn" type="button" box-="square" data-buy-module="${offer.id}" ${canBuy ? "" : "disabled"}>${buttonLabel}</button>
    </article>`;
  });

  storeItemsListElement.innerHTML = itemCards.join("");
  storeModulesListElement.innerHTML = moduleCards.join("");

  if (phase === "store") {
    storeCloseButtonElement.textContent = "Start Next Level";
  } else if (phase === "victory") {
    storeCloseButtonElement.textContent = "Close";
  } else {
    storeCloseButtonElement.textContent = "Close";
  }

  syncStoreStatusInline(RogueState.getStatusText());
}

function openStoreModal(): void {
  refreshStoreModal();
  setStoreModalOpen(true);
}

function closeStoreModal(): void {
  setStoreModalOpen(false);
}

function applyTheme(theme: "dark" | "bright"): void {
  activeTheme = theme;

  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-webtui-theme", theme === "bright" ? "light" : "dark");

  const toggleButton = document.getElementById("themeToggleBtn");
  if (toggleButton) {
    toggleButton.textContent = theme === "bright" ? "Dark Mode" : "Bright Mode";
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function restoreTheme(): void {
  let storedTheme: "dark" | "bright" = "dark";

  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "bright" || value === "dark") {
      storedTheme = value;
    }
  } catch {
    // Ignore storage failures in restricted environments.
  }

  applyTheme(storedTheme);
}

function restoreQuizThemes(): void {
  const selected = loadSelectedQuizThemes();
  GameState.setSelectedQuizThemes(selected);
}

function restoreDifficultyPreferences(): void {
  GameState.setRegularDifficulty(loadRegularDifficulty());
  GameState.setQuizDifficultyFilter(loadSelectedQuizDifficultyFilter());
}

function syncRogueScoringBonuses(): void {
  if (!isRogueTab()) {
    ScoreCalculator.setFlatGainBonus(0);
    ScoreCalculator.setGlobalGainMultiplier(1);
    return;
  }

  const now = performance.now();
  ScoreCalculator.setFlatGainBonus(RogueState.getFlatGainBonus(now));
  ScoreCalculator.setGlobalGainMultiplier(RogueState.getGainMultiplier(now));
}

function syncSpeedMultiplier(): void {
  syncRogueScoringBonuses();

  const speed = ScoreCalculator.calculateSpeedMultiplier(Stats.getWPM());
  const rogueSpeedMultiplier = isRogueTab()
    ? RogueState.getSpeedMultiplier(performance.now())
    : 1;

  ScoreCalculator.setSpeedMultiplier(speed * rogueSpeedMultiplier);
  ScoreCalculator.setFlawlessMultiplier(GameState.getFlawlessMultiplier());
}

function syncStrictLockFromCurrentInput(): void {
  if (GameState.getMode() !== "regular") return;

  const separator = getWordSeparator();
  const current = GameState.getTypedText();
  const lastSeparatorIndex = current.lastIndexOf(separator);
  GameState.setStrictLockIndex(lastSeparatorIndex >= 0 ? lastSeparatorIndex + 1 : 0);
}

function getRegularWordsPerSet(): number {
  if (!isRogueTab()) {
    return wordManager.getRecommendedWordsPerSet(REGULAR_WORDS_PER_SET);
  }

  const level = RogueState.getCurrentLevel();
  return Math.min(16, 9 + Math.floor((level - 1) / 2));
}

function createRegularPromptForCurrentTab(): string {
  const wordsPerSet = getRegularWordsPerSet();

  if (isRogueTab()) {
    const basePrompt = wordManager.createRoguePrompt(
      RogueState.getCurrentLevel(),
      wordsPerSet
    );
    return RogueState.transformPromptForRogue(basePrompt);
  }

  const basePrompt = wordManager.createRegularPrompt(
    wordsPerSet,
    GameState.getRegularDifficulty(),
    GameState.getSelectedQuizThemes()
  );

  return basePrompt;
}

function loadRegularPrompt(): void {
  clearPendingQuizAutoNext();

  GameState.setMode("regular");
  GameState.setCurrentQuizQuestion(null);

  const wordsPerSet = getRegularWordsPerSet();
  GameState.setWordsPerSet(wordsPerSet);

  const prompt = createRegularPromptForCurrentTab();
  GameState.setPromptAndExpected(prompt, prompt);
  GameState.resetSetMistakes();
  GameState.resetStrictLockIndex();
  GameState.setQuizFeedback("");
  GameState.setRevealedAnswer("");
}

function loadQuizQuestion(): void {
  if (isRogueTab()) return;

  clearPendingQuizAutoNext();

  GameState.setMode("quiz");
  let question: GameState.QuizQuestion;

  try {
    question = getNextQuizQuestion(
      GameState.getSelectedQuizThemes(),
      GameState.getQuizDifficultyFilter()
    );
  } catch {
    GameState.setCurrentQuizQuestion(null);
    GameState.setPromptAndExpected(
      "No quiz questions match the current theme and difficulty filters.",
      ""
    );
    GameState.setQuizFeedback("No matching quiz questions");
    GameState.setRevealedAnswer("");
    return;
  }

  GameState.setCurrentQuizQuestion(question);
  GameState.setPromptAndExpected(question.prompt, question.answer);
  GameState.setQuizFeedback("");
  GameState.setRevealedAnswer("");
}

function startTimerIfNeeded(): void {
  if (!canTypeIntoPrompt()) return;

  if (!GameState.getIsActive()) {
    GameState.setIsActive(true);
    Stats.startTimer();
  }
}

function evaluateRogueProgress(): void {
  if (!isRogueTab()) return;
  if (!RogueState.isLevelActive()) return;

  const totalScore = ScoreCalculator.getTotalScore();

  if (!RogueState.isLevelGoalMet(totalScore)) {
    return;
  }

  RogueState.completeLevel(totalScore);
  GameState.setQuizFeedback(RogueState.getStatusText());

  if (RogueState.isStoreOpen()) {
    openStoreModal();
  }

  if (RogueState.getPhase() === "victory") {
    openStoreModal();
  }
}

function handleTypedCharacter(char: string): void {
  if (char.length === 0 || !canTypeIntoPrompt()) return;

  startTimerIfNeeded();

  const expected = GameState.getExpectedText();
  const typed = GameState.getTypedText();
  const mode = GameState.getMode();
  const separator = getWordSeparator();

  if (mode === "regular" && typed.length >= expected.length) {
    return;
  }

  const nextIndex = typed.length;
  const expectedChar = expected[nextIndex];
  const isCorrect = expectedChar !== undefined && char === expectedChar;

  GameState.appendTypedText(char);

  if (
    mode === "regular" &&
    GameState.getValidationMode() === "strict" &&
    char === separator &&
    isCorrect
  ) {
    GameState.setStrictLockIndex(GameState.getTypedText().length);
  }

  if (isCorrect) {
    Stats.recordCorrectChar();
  } else {
    Stats.recordIncorrectChar();
    if (mode === "regular") {
      GameState.markSetMistake();
    }
  }

  if (mode === "regular" && isCorrect && char !== separator) {
    ScoreCalculator.addRegularCharScore(char);
  }

  syncSpeedMultiplier();

  if (mode === "regular" && GameState.getTypedText().length >= expected.length) {
    finalizeRegularSet();
  }

  evaluateRogueProgress();
}

function finalizeRegularSet(): void {
  const typed = GameState.getTypedText();
  const expected = GameState.getExpectedText();

  const isExact = typed === expected;
  const isFlawless = isExact && GameState.getMistakesInSet() === 0;

  const newFlawlessMultiplier = GameState.registerSetCompletion(isFlawless);
  ScoreCalculator.setFlawlessMultiplier(newFlawlessMultiplier);

  if (isExact) {
    ScoreCalculator.addRegularSetBonus(GameState.getWordsPerSet(), isFlawless);

    if (isRogueTab()) {
      GameState.setQuizFeedback(
        isFlawless
          ? `Flawless chain ${GameState.getFlawlessStreak()}`
          : "Set complete"
      );
    } else {
      GameState.setQuizFeedback(
        isFlawless
          ? `Flawless set! streak ${GameState.getFlawlessStreak()}`
          : "Set complete"
      );
    }
  } else {
    ScoreCalculator.recordNoGain("set-miss");
    GameState.setQuizFeedback("Set submitted with mistakes");
  }

  GameState.resetSetMistakes();
  GameState.resetStrictLockIndex();

  evaluateRogueProgress();

  if (isRogueTab() && !RogueState.isLevelActive()) {
    return;
  }

  const nextPrompt = createRegularPromptForCurrentTab();
  GameState.setPromptAndExpected(nextPrompt, nextPrompt);
}

function submitQuizAnswer(): void {
  if (isRogueTab()) return;
  if (GameState.getMode() !== "quiz") return;

  const question = GameState.getCurrentQuizQuestion();
  if (!question) return;

  const typedAnswer = GameState.getTypedText();

  if (typedAnswer.trim().length === 0) {
    GameState.setQuizFeedback("Type an answer first");
    renderAll();
    return;
  }

  const result = validateQuizAnswer(
    question,
    typedAnswer,
    GameState.getValidationMode()
  );

  GameState.incrementQuizAnswered(result.isCorrect);
  GameState.setQuizMinorErrorsLast(result.minorErrors);

  if (result.isCorrect) {
    const gain = ScoreCalculator.addQuizAnswerScore({
      difficulty: question.difficulty,
      usedTip: GameState.getQuizTipUsed(),
      minorErrors: result.minorErrors,
    });

    if (result.minorErrors > 0 && GameState.getValidationMode() === "loose") {
      GameState.setQuizFeedback(
        `Accepted in loose mode (${result.minorErrors} minor errors) +${gain}`
      );
    } else {
      GameState.setQuizFeedback(`Correct +${gain}`);
    }

    GameState.setRevealedAnswer("");
    GameState.clearTypedText();

    quizAutoNextTimeout = window.setTimeout(() => {
      if (GameState.getMode() !== "quiz") return;
      loadQuizQuestion();
      renderAll();
    }, QUIZ_AUTO_NEXT_MS);
  } else {
    ScoreCalculator.recordNoGain("quiz-wrong");
    GameState.setQuizFeedback("Incorrect. Check revealed syntax and retry.");
    GameState.setRevealedAnswer(question.answer);
  }

  syncSpeedMultiplier();
  renderAll();
}

function handleBackspace(): void {
  if (!canTypeIntoPrompt()) return;

  const typed = GameState.getTypedText();
  if (typed.length === 0) return;

  if (
    GameState.getMode() === "regular" &&
    GameState.getValidationMode() === "strict" &&
    typed.length <= GameState.getStrictLockIndex()
  ) {
    GameState.setQuizFeedback("Strict mode: previous words are locked");
    renderAll();
    return;
  }

  GameState.setTypedText(typed.slice(0, -1));
  Stats.recordBackspace();

  if (GameState.getMode() === "regular") {
    GameState.markSetMistake();
  }

  syncSpeedMultiplier();
  renderAll();
}

function processInputValue(value: string): void {
  if (!canTypeIntoPrompt()) {
    renderAll();
    return;
  }

  for (const char of value) {
    if (char === "\n" || char === "\r") continue;
    handleTypedCharacter(char);
  }

  renderAll();
}

function applyEditedTextFromInput(nextValue: string): void {
  if (!canTypeIntoPrompt()) {
    renderAll();
    return;
  }

  if (
    GameState.getMode() === "regular" &&
    GameState.getValidationMode() === "strict"
  ) {
    const strictLockIndex = GameState.getStrictLockIndex();
    const lockedPrefix = GameState.getTypedText().slice(0, strictLockIndex);

    if (!nextValue.startsWith(lockedPrefix)) {
      GameState.setQuizFeedback("Strict mode: previous words are locked");
      renderAll();
      return;
    }
  }

  GameState.setTypedText(nextValue);

  if (GameState.getMode() === "regular") {
    GameState.markSetMistake();
  }

  syncSpeedMultiplier();

  if (
    GameState.getMode() === "regular" &&
    GameState.getTypedText().length >= GameState.getExpectedText().length
  ) {
    finalizeRegularSet();
    renderAll();
    return;
  }

  renderAll();
}

function resetTrainingRun(): void {
  clearPendingQuizAutoNext();

  Stats.reset();
  ScoreCalculator.reset();
  GameState.resetProgressForNewRun();
  GameState.setValidationMode("strict");

  if (GameState.getMode() === "quiz") {
    loadQuizQuestion();
  } else {
    loadRegularPrompt();
  }

  syncSpeedMultiplier();
  renderAll();
}

function startRogueRun(): void {
  clearPendingQuizAutoNext();
  closeStoreModal();

  Stats.reset();
  ScoreCalculator.reset();
  GameState.resetProgressForNewRun();
  GameState.setMode("regular");
  GameState.setValidationMode("strict");

  RogueState.startNewRun(ScoreCalculator.getTotalScore());
  GameState.setQuizFeedback("Rogue run started");

  loadRegularPrompt();
  syncSpeedMultiplier();
  refreshStoreModal();
  renderAll();
}

function resetCurrentRun(): void {
  if (isRogueTab()) {
    startRogueRun();
    return;
  }

  resetTrainingRun();
}

function applySelectedQuizThemes(themes: GameState.QuizTheme[]): void {
  if (themes.length === 0) {
    GameState.resetSelectedQuizThemes();
    saveSelectedQuizThemes(GameState.getSelectedQuizThemes());
    GameState.setQuizFeedback("No themes selected. Restored all themes.");
    return;
  }

  GameState.setSelectedQuizThemes(themes);
  saveSelectedQuizThemes(GameState.getSelectedQuizThemes());
}

function downloadTemplateFile(): void {
  const template = createCustomContentTemplate();
  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: "application/json",
  });

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = "roguetype-custom-template.json";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);

  GameState.setQuizFeedback("Template downloaded");
  renderAll();
}

async function importCustomPackageFile(file: File): Promise<void> {
  let parsed: unknown;

  try {
    const text = await file.text();
    parsed = JSON.parse(text) as unknown;
  } catch {
    GameState.setQuizFeedback("Import failed: invalid JSON file");
    renderAll();
    return;
  }

  const validation = validateCustomContentPackage(parsed);
  if (!validation.ok) {
    GameState.setQuizFeedback(`Import failed: ${validation.error}`);
    renderAll();
    return;
  }

  saveCustomContentPackage(validation.data);

  wordManager.refreshCustomWordsFromStorage();
  refreshQuizContentFromStorage();

  if (GameState.getMode() === "quiz") {
    loadQuizQuestion();
  } else {
    loadRegularPrompt();
  }

  const importedWordCount = validation.data.words?.regular.length ?? 0;
  const importedQuizCount = validation.data.quizzes?.length ?? 0;
  const quizLabel = importedQuizCount === 1 ? "quiz" : "quizzes";

  GameState.setQuizFeedback(
    `Imported: ${validation.data.meta.name} (${importedWordCount} words, ${importedQuizCount} ${quizLabel})`
  );
  renderAll();
}

function setCommandOutput(command: string, result: string): void {
  if (!commandOutputElement) return;
  commandOutputElement.textContent = `$ ${command}\n${result}`;
}

function resolveQuizTheme(rawTheme: string): GameState.QuizTheme | null {
  const normalized = rawTheme.trim().toLowerCase();

  if (normalized === "js" || normalized === "javascript") return "javascript";
  if (normalized === "py" || normalized === "python") return "python";
  if (normalized === "bash") return "bash";
  if (normalized === "sql") return "sql";
  if (normalized === "sqli" || normalized === "sql-injection") {
    return "sql-injection";
  }
  if (normalized === "git") return "git";
  if (normalized === "custom") return "custom";
  if (normalized === "std" || normalized === "standard") return "standard";

  return null;
}

function parseThemeArgs(rawArgs: string[]): {
  themes: GameState.QuizTheme[];
  invalid: string[];
} {
  const themeTokens = rawArgs
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const themes: GameState.QuizTheme[] = [];
  const invalid: string[] = [];

  for (const token of themeTokens) {
    const theme = resolveQuizTheme(token);
    if (!theme) {
      invalid.push(token);
      continue;
    }

    if (!themes.includes(theme)) {
      themes.push(theme);
    }
  }

  return { themes, invalid };
}

function refreshPromptFromCurrentMode(): void {
  if (GameState.getMode() === "quiz") {
    loadQuizQuestion();
  } else {
    loadRegularPrompt();
  }
}

function executeTerminalCommand(rawCommandInput: string): void {
  const commandText = rawCommandInput.trim();
  if (commandText.length === 0) {
    return;
  }

  const normalizedCommandText = commandText.startsWith("!")
    ? commandText.slice(1).trim()
    : commandText;

  if (normalizedCommandText.length === 0) {
    setCommandOutput(commandText, "Type a command after !. Use !--help.");
    renderAll();
    return;
  }

  const [commandRaw, ...argTokensRaw] = normalizedCommandText.split(/\s+/);
  const command = commandRaw.toLowerCase();
  const argTokens = argTokensRaw.map((entry) => entry.toLowerCase());
  let result = "";

  if (command === "--help") {
    result = COMMAND_HELP_TEXT;
    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--rogue") {
    switchMainTab("rogue");
    result = "Switched to rogue mode.";
    setCommandOutput(commandText, result);
    focusInputSoon();
    return;
  }

  if (command === "--training" || command === "--web") {
    switchMainTab("training");
    result = "Switched to training mode.";
    setCommandOutput(commandText, result);
    focusInputSoon();
    return;
  }

  if (command === "--start") {
    switchMainTab("rogue");
    startRogueRun();
    result = "Started a new rogue run.";
    setCommandOutput(commandText, result);
    focusInputSoon();
    return;
  }

  if (command === "--reset") {
    resetCurrentRun();
    result = "Run reset.";
    setCommandOutput(commandText, result);
    focusInputSoon();
    return;
  }

  if (command === "--mode") {
    const nextMode = argTokens[0];

    if (!nextMode || (nextMode !== "regular" && nextMode !== "quiz")) {
      result = "Usage: --mode regular|quiz";
    } else if (isRogueTab() && nextMode === "quiz") {
      result = "Quiz mode is only available in training tab.";
    } else if (nextMode === "quiz") {
      loadQuizQuestion();
      result = "Mode set to quiz.";
    } else {
      loadRegularPrompt();
      result = "Mode set to regular.";
    }

    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--validation") {
    const validationMode = argTokens[0];

    if (!validationMode || (validationMode !== "strict" && validationMode !== "loose")) {
      result = "Usage: --validation strict|loose";
    } else {
      GameState.setValidationMode(validationMode);
      if (validationMode === "strict") {
        syncStrictLockFromCurrentInput();
      }
      result = `Validation set to ${validationMode}.`;
    }

    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--difficulty") {
    const difficulty = argTokens[0];

    if (!difficulty || (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard")) {
      result = "Usage: --difficulty easy|medium|hard";
    } else {
      GameState.setRegularDifficulty(difficulty);
      saveRegularDifficulty(difficulty);
      if (GameState.getMode() === "regular") {
        loadRegularPrompt();
      }
      result = `Regular difficulty set to ${difficulty}.`;
    }

    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--quiz-difficulty") {
    const difficulty = argTokens[0];

    if (
      !difficulty ||
      (difficulty !== "all" &&
        difficulty !== "easy" &&
        difficulty !== "medium" &&
        difficulty !== "hard")
    ) {
      result = "Usage: --quiz-difficulty all|easy|medium|hard";
    } else if (isRogueTab()) {
      result = "Quiz filters are only available in training tab.";
    } else {
      GameState.setQuizDifficultyFilter(difficulty);
      saveSelectedQuizDifficultyFilter(difficulty);
      if (GameState.getMode() === "quiz") {
        loadQuizQuestion();
      }
      result = `Quiz difficulty filter set to ${difficulty}.`;
    }

    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--theme") {
    if (isRogueTab()) {
      result = "Theme filters are only available in training tab.";
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    const action = argTokens[0];
    const themeArgs = argTokens.slice(1);

    if (!action) {
      result = "Usage: --theme add|remove|set|reset|list ...";
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    if (action === "list") {
      const selected = GameState.getSelectedQuizThemes();
      result = `Themes: ${selected.join(", ")}`;
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    if (action === "reset") {
      GameState.resetSelectedQuizThemes();
      saveSelectedQuizThemes(GameState.getSelectedQuizThemes());
      refreshPromptFromCurrentMode();
      result = "Themes reset to all.";
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    const parsed = parseThemeArgs(themeArgs);

    if (parsed.invalid.length > 0) {
      result = `Unknown themes: ${parsed.invalid.join(", ")}`;
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    if (parsed.themes.length === 0) {
      result = "No valid themes provided.";
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    if (action === "set") {
      applySelectedQuizThemes(parsed.themes);
      refreshPromptFromCurrentMode();
      result = `Themes set: ${GameState.getSelectedQuizThemes().join(", ")}`;
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    if (action === "add") {
      const nextThemes = [...GameState.getSelectedQuizThemes(), ...parsed.themes];
      applySelectedQuizThemes(nextThemes);
      refreshPromptFromCurrentMode();
      result = `Themes active: ${GameState.getSelectedQuizThemes().join(", ")}`;
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    if (action === "remove") {
      const removeSet = new Set(parsed.themes);
      const nextThemes = GameState.getSelectedQuizThemes().filter(
        (theme) => !removeSet.has(theme)
      );
      applySelectedQuizThemes(nextThemes);
      refreshPromptFromCurrentMode();
      result = `Themes active: ${GameState.getSelectedQuizThemes().join(", ")}`;
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    result = "Usage: --theme add|remove|set|reset|list ...";
    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--next") {
    if (isRogueTab()) {
      loadRegularPrompt();
      result = "Loaded next rogue set.";
    } else if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
      result = "Loaded next quiz question.";
    } else {
      loadRegularPrompt();
      result = "Loaded next regular set.";
    }

    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--tip") {
    if (isRogueTab() || GameState.getMode() !== "quiz") {
      result = "Tip is available only in training quiz mode.";
    } else {
      GameState.setQuizTipVisible(true);
      GameState.setQuizTipUsed(true);
      GameState.setQuizFeedback("Tip used (-score modifier)");
      result = "Tip revealed.";
    }

    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--submit") {
    if (isRogueTab() || GameState.getMode() !== "quiz") {
      result = "Submit is available only in training quiz mode.";
      setCommandOutput(commandText, result);
      renderAll();
      focusInputSoon();
      return;
    }

    submitQuizAnswer();
    result = "Quiz answer submitted.";
    setCommandOutput(commandText, result);
    focusInputSoon();
    return;
  }

  if (command === "--theme-mode") {
    const themeArg = argTokens[0];

    if (!themeArg || (themeArg !== "dark" && themeArg !== "bright")) {
      result = "Usage: --theme-mode dark|bright";
    } else {
      applyTheme(themeArg);
      result = `Theme set to ${themeArg}.`;
    }

    setCommandOutput(commandText, result);
    renderAll();
    focusInputSoon();
    return;
  }

  if (command === "--template") {
    downloadTemplateFile();
    result = "Template download started.";
    setCommandOutput(commandText, result);
    focusInputSoon();
    return;
  }

  if (command === "--import") {
    customPackageInputElement?.click();
    result = "Select a JSON package file to import.";
    setCommandOutput(commandText, result);
    focusInputSoon();
    return;
  }

  result = `Unknown command "${command}". Use --help.`;
  setCommandOutput(commandText, result);
  renderAll();
  focusInputSoon();
}

function switchMainTab(tab: GameState.MainTab): void {
  if (GameState.getMainTab() === tab) return;

  GameState.setMainTab(tab);
  clearPendingQuizAutoNext();

  if (tab === "rogue") {
    GameState.setMode("regular");

    if (RogueState.getPhase() === "idle") {
      startRogueRun();
      return;
    }

    if (RogueState.isStoreOpen()) {
      openStoreModal();
    } else {
      closeStoreModal();
    }

    loadRegularPrompt();
  } else {
    closeStoreModal();

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    } else {
      loadRegularPrompt();
    }
  }

  syncSpeedMultiplier();
  renderAll();
  focusInputSoon();
}

function bindStoreEvents(): void {
  storeOverlayElement = document.getElementById("storeOverlay");
  storeItemsListElement = document.getElementById("storeItemsList");
  storeModulesListElement = document.getElementById("storeModulesList");
  storeCloseButtonElement = document.getElementById("storeCloseBtn") as
    | HTMLButtonElement
    | null;
  storeCoinsValueElement = document.getElementById("storeCoinsValue");
  storeStatusElement = document.getElementById("storeStatus");

  storeItemsListElement?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-buy-consumable]");
    if (!button) return;

    const itemId = button.dataset.buyConsumable as
      | RogueState.RogueConsumableId
      | undefined;

    if (!itemId) return;

    const result = RogueState.purchaseConsumable(itemId);
    GameState.setQuizFeedback(result.message);
    syncStoreStatusInline(result.message);
    refreshStoreModal();
    renderAll();
    focusInputSoon();
  });

  storeModulesListElement?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-buy-module]");
    if (!button) return;

    const moduleId = button.dataset.buyModule as RogueState.RogueModuleId | undefined;
    if (!moduleId) return;

    const result = RogueState.purchaseModule(moduleId);
    GameState.setQuizFeedback(result.message);
    syncStoreStatusInline(result.message);
    refreshStoreModal();
    renderAll();
    focusInputSoon();
  });

  storeCloseButtonElement?.addEventListener("click", () => {
    if (RogueState.getPhase() === "store") {
      RogueState.advanceAfterStore(ScoreCalculator.getTotalScore());
      loadRegularPrompt();
      closeStoreModal();
      GameState.setQuizFeedback(RogueState.getStatusText());
      syncSpeedMultiplier();
      renderAll();
      focusInputSoon();
      return;
    }

    closeStoreModal();
    renderAll();
    focusInputSoon();
  });
}

function bindControlButtons(): void {
  const mainTabRogueBtn = document.getElementById("mainTabRogueBtn");
  const mainTabTrainingBtn = document.getElementById("mainTabTrainingBtn");

  const modeRegularBtn = document.getElementById("modeRegularBtn");
  const modeQuizBtn = document.getElementById("modeQuizBtn");
  const validationStrictBtn = document.getElementById("validationStrictBtn");
  const validationLooseBtn = document.getElementById("validationLooseBtn");
  const regularDifficultyEasyBtn = document.getElementById(
    "regularDifficultyEasyBtn"
  );
  const regularDifficultyMediumBtn = document.getElementById(
    "regularDifficultyMediumBtn"
  );
  const regularDifficultyHardBtn = document.getElementById(
    "regularDifficultyHardBtn"
  );
  const quizDifficultyAllBtn = document.getElementById("quizDifficultyAllBtn");
  const quizDifficultyEasyBtn = document.getElementById("quizDifficultyEasyBtn");
  const quizDifficultyMediumBtn = document.getElementById(
    "quizDifficultyMediumBtn"
  );
  const quizDifficultyHardBtn = document.getElementById("quizDifficultyHardBtn");
  const tipBtn = document.getElementById("tipBtn");
  const submitBtn = document.getElementById("submitBtn");
  const nextBtn = document.getElementById("nextBtn");
  const resetRunBtn = document.getElementById("resetRunBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");
  const importPackageBtn = document.getElementById("importPackageBtn");
  const rogueStartBtn = document.getElementById("rogueStartBtn");
  const rogueResetBtn = document.getElementById("rogueResetBtn");
  customPackageInputElement = document.getElementById("customPackageInput") as
    | HTMLInputElement
    | null;

  const quizThemeButtons = document.querySelectorAll<HTMLButtonElement>(
    "[data-quiz-theme]"
  );

  mainTabRogueBtn?.addEventListener("click", () => {
    switchMainTab("rogue");
  });

  mainTabTrainingBtn?.addEventListener("click", () => {
    switchMainTab("training");
  });

  rogueStartBtn?.addEventListener("click", () => {
    switchMainTab("rogue");
    startRogueRun();
    focusInputSoon();
  });

  rogueResetBtn?.addEventListener("click", () => {
    switchMainTab("rogue");
    startRogueRun();
    focusInputSoon();
  });

  modeRegularBtn?.addEventListener("click", () => {
    if (isRogueTab()) return;
    loadRegularPrompt();
    renderAll();
    focusInputSoon();
  });

  modeQuizBtn?.addEventListener("click", () => {
    if (isRogueTab()) return;
    loadQuizQuestion();
    renderAll();
    focusInputSoon();
  });

  validationStrictBtn?.addEventListener("click", () => {
    GameState.setValidationMode("strict");
    syncStrictLockFromCurrentInput();
    renderAll();
    focusInputSoon();
  });

  validationLooseBtn?.addEventListener("click", () => {
    GameState.setValidationMode("loose");
    renderAll();
    focusInputSoon();
  });

  regularDifficultyEasyBtn?.addEventListener("click", () => {
    GameState.setRegularDifficulty("easy");
    saveRegularDifficulty("easy");

    if (GameState.getMode() === "regular") {
      loadRegularPrompt();
    }

    renderAll();
    focusInputSoon();
  });

  regularDifficultyMediumBtn?.addEventListener("click", () => {
    GameState.setRegularDifficulty("medium");
    saveRegularDifficulty("medium");

    if (GameState.getMode() === "regular") {
      loadRegularPrompt();
    }

    renderAll();
    focusInputSoon();
  });

  regularDifficultyHardBtn?.addEventListener("click", () => {
    GameState.setRegularDifficulty("hard");
    saveRegularDifficulty("hard");

    if (GameState.getMode() === "regular") {
      loadRegularPrompt();
    }

    renderAll();
    focusInputSoon();
  });

  quizDifficultyAllBtn?.addEventListener("click", () => {
    if (isRogueTab()) return;

    GameState.setQuizDifficultyFilter("all");
    saveSelectedQuizDifficultyFilter("all");

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    }

    renderAll();
    focusInputSoon();
  });

  quizDifficultyEasyBtn?.addEventListener("click", () => {
    if (isRogueTab()) return;

    GameState.setQuizDifficultyFilter("easy");
    saveSelectedQuizDifficultyFilter("easy");

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    }

    renderAll();
    focusInputSoon();
  });

  quizDifficultyMediumBtn?.addEventListener("click", () => {
    if (isRogueTab()) return;

    GameState.setQuizDifficultyFilter("medium");
    saveSelectedQuizDifficultyFilter("medium");

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    }

    renderAll();
    focusInputSoon();
  });

  quizDifficultyHardBtn?.addEventListener("click", () => {
    if (isRogueTab()) return;

    GameState.setQuizDifficultyFilter("hard");
    saveSelectedQuizDifficultyFilter("hard");

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    }

    renderAll();
    focusInputSoon();
  });

  quizThemeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isRogueTab()) return;

      const theme = button.dataset.quizTheme as GameState.QuizTheme | undefined;
      if (!theme) return;

      const currentThemes = GameState.getSelectedQuizThemes();
      const nextThemes = currentThemes.includes(theme)
        ? currentThemes.filter((entry) => entry !== theme)
        : [...currentThemes, theme];

      applySelectedQuizThemes(nextThemes);

      if (GameState.getMode() === "quiz") {
        loadQuizQuestion();
      } else {
        loadRegularPrompt();
      }

      renderAll();
      focusInputSoon();
    });
  });

  tipBtn?.addEventListener("click", () => {
    if (isRogueTab()) return;
    if (GameState.getMode() !== "quiz") return;

    GameState.setQuizTipVisible(true);
    GameState.setQuizTipUsed(true);
    GameState.setQuizFeedback("Tip used (-score modifier)");
    renderAll();
    focusInputSoon();
  });

  submitBtn?.addEventListener("click", () => {
    submitQuizAnswer();
    focusInputSoon();
  });

  nextBtn?.addEventListener("click", () => {
    if (isRogueTab()) return;

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    } else {
      const prompt = wordManager.createRegularPrompt(
        GameState.getWordsPerSet(),
        GameState.getRegularDifficulty(),
        GameState.getSelectedQuizThemes()
      );
      GameState.setPromptAndExpected(prompt, prompt);
      GameState.resetSetMistakes();
      GameState.resetStrictLockIndex();
      GameState.setQuizFeedback("Skipped to next set");
    }

    renderAll();
    focusInputSoon();
  });

  resetRunBtn?.addEventListener("click", () => {
    resetCurrentRun();
    focusInputSoon();
  });

  themeToggleBtn?.addEventListener("click", () => {
    const nextTheme = activeTheme === "dark" ? "bright" : "dark";
    applyTheme(nextTheme);
    focusInputSoon();
  });

  downloadTemplateBtn?.addEventListener("click", () => {
    downloadTemplateFile();
    focusInputSoon();
  });

  importPackageBtn?.addEventListener("click", () => {
    customPackageInputElement?.click();
    focusInputSoon();
  });

  customPackageInputElement?.addEventListener("change", () => {
    const packageInput = customPackageInputElement;
    const file = packageInput?.files?.[0];
    if (!file || !packageInput) return;

    void importCustomPackageFile(file);
    packageInput.value = "";
    focusInputSoon();
  });
}

function bindCommandInput(): void {
  commandInputElement = document.getElementById("commandInput") as
    | HTMLInputElement
    | null;
  commandOutputElement = document.getElementById("commandOutput");

  commandInputElement?.addEventListener("focus", () => {
    syncInlineInputModeFromValue(commandInputElement?.value ?? "");
  });
}

function tickRogueLevelState(): void {
  if (!isRogueTab()) return;

  RogueState.pruneExpiredEffects(performance.now());

  if (!RogueState.isLevelActive()) {
    return;
  }

  evaluateRogueProgress();

  if (!RogueState.isLevelActive()) {
    return;
  }

  const remainingMs = RogueState.getRemainingMs(performance.now());
  if (remainingMs > 0) {
    return;
  }

  const rescued = RogueState.tryTriggerDeusEx(performance.now());
  if (rescued) {
    GameState.setQuizFeedback(RogueState.getStatusText());
    syncSpeedMultiplier();
    return;
  }

  RogueState.failLevel();
  GameState.setQuizFeedback("Run failed. Press Start New Run.");
}

function handleConsumableHotkey(event: KeyboardEvent): boolean {
  if (!isRogueTab()) return false;
  if (!event.ctrlKey) return false;
  if (event.key !== "1" && event.key !== "2" && event.key !== "3") {
    return false;
  }

  event.preventDefault();

  const slotIndex = Number(event.key) - 1;
  const result = RogueState.activateConsumableSlot(slotIndex, performance.now());
  GameState.setQuizFeedback(result.message);
  syncSpeedMultiplier();
  refreshStoreModal();
  renderAll();
  return true;
}

export function tickGame(): void {
  tickRogueLevelState();
  syncSpeedMultiplier();
  updateScoreDisplay();
}

export function initInputHandler(): void {
  inputElement = document.getElementById("commandInput") as HTMLInputElement | null;
  terminalElement = document.getElementById("typingTerminal");

  if (!inputElement) {
    throw new Error("command input element not found");
  }

  wordManager.refreshCustomWordsFromStorage();
  refreshQuizContentFromStorage();

  bindCommandInput();

  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("#terminalCommandWrap")) {
      return;
    }

    focusInputSoon();
  });

  inputElement.addEventListener("blur", () => {
    focusInputSoon();
  });

  inputElement.addEventListener("input", (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    syncInlineInputModeFromValue(value);

    if (isCommandModeValue(value)) {
      return;
    }

    const typedBefore = GameState.getTypedText();

    if (value.length >= typedBefore.length && value.startsWith(typedBefore)) {
      const addedText = value.slice(typedBefore.length);
      if (addedText.length > 0) {
        processInputValue(addedText);
      }
    } else {
      applyEditedTextFromInput(value);
    }

    const canonicalValue = GameState.getTypedText();
    if (target.value !== canonicalValue) {
      target.value = canonicalValue;
    }
    syncInlineInputModeFromValue(target.value);
  });

  inputElement.addEventListener("keydown", (event: KeyboardEvent) => {
    const currentInput = inputElement;
    if (!currentInput) return;

    const currentValue = currentInput.value;
    const inCommandMode = isCommandModeValue(currentValue);

    if (handleConsumableHotkey(event)) {
      return;
    }

    if (event.key === "Escape") {
      if (inCommandMode && currentValue.length > 0) {
        event.preventDefault();
        currentInput.value = "";
        syncInlineInputModeFromValue(currentInput.value);
        return;
      }

      event.preventDefault();

      if (isStoreModalOpen()) {
        if (RogueState.getPhase() === "store") {
          GameState.setQuizFeedback("Store is active. Use Start Next Level to continue.");
          renderAll();
          return;
        }

        closeStoreModal();
        renderAll();
        currentInput.value = GameState.getTypedText();
        syncInlineInputModeFromValue(currentInput.value);
        return;
      }

      resetCurrentRun();
      currentInput.value = GameState.getTypedText();
      syncInlineInputModeFromValue(currentInput.value);
      return;
    }

    if (event.key === "Backspace") {
      if (inCommandMode) {
        return;
      }

      const selectionStart = currentInput.selectionStart ?? currentValue.length;
      const selectionEnd = currentInput.selectionEnd ?? currentValue.length;
      const hasSelection = selectionStart !== selectionEnd;
      const caretAtEnd =
        selectionStart === currentValue.length &&
        selectionEnd === currentValue.length;

      if (hasSelection || !caretAtEnd) {
        return;
      }

      event.preventDefault();
      handleBackspace();
      currentInput.value = GameState.getTypedText();
      syncInlineInputModeFromValue(currentInput.value);
      return;
    }

    if (event.key === "Enter") {
      if (inCommandMode) {
        event.preventDefault();
        executeTerminalCommand(currentValue);
        currentInput.value = "";
        syncInlineInputModeFromValue(currentInput.value);
        focusInputSoon();
        return;
      }

      if (GameState.getMode() === "quiz" && !isRogueTab()) {
        event.preventDefault();
        submitQuizAnswer();
        currentInput.value = GameState.getTypedText();
        syncInlineInputModeFromValue(currentInput.value);
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      focusInputSoon();
      return;
    }
  });

  bindStoreEvents();
  bindControlButtons();
  restoreTheme();
  restoreQuizThemes();
  restoreDifficultyPreferences();

  GameState.setMainTab("rogue");
  startRogueRun();
  inputElement.focus();
  syncInlineInputModeFromValue(inputElement.value);
}
