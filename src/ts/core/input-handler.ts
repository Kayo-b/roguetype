import * as Stats from "./stats";
import { wordManager } from "./word-manager";
import {
  getNextQuizQuestion,
  refreshQuizContentFromStorage,
  validateQuizAnswer,
} from "./quiz-manager";
import * as GameState from "../game/game-state";
import * as ScoreCalculator from "../scoring/score-calculator";
import { updateDisplay } from "../ui/typing-display";
import { updateScoreDisplay } from "../ui/score-display";
import {
  createCustomContentTemplate,
  loadRegularDifficulty,
  loadSelectedQuizDifficultyFilter,
  loadSelectedQuizThemes,
  saveRegularDifficulty,
  saveSelectedQuizDifficultyFilter,
  saveSelectedQuizThemes,
  saveCustomContentPackage,
  validateCustomContentPackage,
} from "../utils/storage";

const REGULAR_WORDS_PER_SET = 10;
const QUIZ_AUTO_NEXT_MS = 900;
const THEME_STORAGE_KEY = "roguetype:theme";

let inputElement: HTMLInputElement | null = null;
let quizAutoNextTimeout: number | null = null;
let activeTheme: "dark" | "bright" = "dark";

function renderAll(): void {
  updateDisplay();
  updateScoreDisplay();
}

function focusInputSoon(): void {
  if (!inputElement) return;
  window.setTimeout(() => inputElement?.focus(), 0);
}

function clearPendingQuizAutoNext(): void {
  if (quizAutoNextTimeout !== null) {
    window.clearTimeout(quizAutoNextTimeout);
    quizAutoNextTimeout = null;
  }
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

function syncSpeedMultiplier(): void {
  const speed = ScoreCalculator.calculateSpeedMultiplier(Stats.getWPM());
  ScoreCalculator.setSpeedMultiplier(speed);
  ScoreCalculator.setFlawlessMultiplier(GameState.getFlawlessMultiplier());
}

function syncStrictLockFromCurrentInput(): void {
  if (GameState.getMode() !== "regular") return;

  const current = GameState.getTypedText();
  const lastSpaceIndex = current.lastIndexOf(" ");
  GameState.setStrictLockIndex(lastSpaceIndex >= 0 ? lastSpaceIndex + 1 : 0);
}

function getRegularWordsPerSet(): number {
  return wordManager.getRecommendedWordsPerSet(REGULAR_WORDS_PER_SET);
}

function loadRegularPrompt(): void {
  clearPendingQuizAutoNext();

  GameState.setMode("regular");
  GameState.setCurrentQuizQuestion(null);

  const wordsPerSet = getRegularWordsPerSet();
  GameState.setWordsPerSet(wordsPerSet);

  const prompt = wordManager.createRegularPrompt(
    wordsPerSet,
    GameState.getRegularDifficulty(),
    GameState.getSelectedQuizThemes()
  );
  GameState.setPromptAndExpected(prompt, prompt);
  GameState.resetSetMistakes();
  GameState.resetStrictLockIndex();
  GameState.setQuizFeedback("");
  GameState.setRevealedAnswer("");
}

function loadQuizQuestion(): void {
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
  if (!GameState.getIsActive()) {
    GameState.setIsActive(true);
    Stats.startTimer();
  }
}

function handleTypedCharacter(char: string): void {
  if (char.length === 0) return;

  startTimerIfNeeded();

  const expected = GameState.getExpectedText();
  const typed = GameState.getTypedText();
  const mode = GameState.getMode();

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
    char === " " &&
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

  if (mode === "regular" && isCorrect && char !== " ") {
    ScoreCalculator.addRegularCharScore(char);
  }

  syncSpeedMultiplier();

  if (mode === "regular" && GameState.getTypedText().length >= expected.length) {
    finalizeRegularSet();
  }
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
    GameState.setQuizFeedback(
      isFlawless
        ? `Flawless set! streak ${GameState.getFlawlessStreak()}`
        : "Set complete"
    );
  } else {
    ScoreCalculator.recordNoGain("set-miss");
    GameState.setQuizFeedback("Set submitted with mistakes");
  }

  GameState.resetSetMistakes();
  GameState.resetStrictLockIndex();

  const nextPrompt = wordManager.createRegularPrompt(
    GameState.getWordsPerSet(),
    GameState.getRegularDifficulty(),
    GameState.getSelectedQuizThemes()
  );
  GameState.setPromptAndExpected(nextPrompt, nextPrompt);
}

function submitQuizAnswer(): void {
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
  for (const char of value) {
    if (char === "\n" || char === "\r") continue;
    handleTypedCharacter(char);
  }

  renderAll();
}

function resetRun(): void {
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

function bindControlButtons(): void {
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
  const customPackageInput = document.getElementById("customPackageInput") as
    | HTMLInputElement
    | null;

  const quizThemeButtons = document.querySelectorAll<HTMLButtonElement>(
    "[data-quiz-theme]"
  );

  modeRegularBtn?.addEventListener("click", () => {
    loadRegularPrompt();
    renderAll();
    focusInputSoon();
  });

  modeQuizBtn?.addEventListener("click", () => {
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
    GameState.setQuizDifficultyFilter("all");
    saveSelectedQuizDifficultyFilter("all");

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    }

    renderAll();
    focusInputSoon();
  });

  quizDifficultyEasyBtn?.addEventListener("click", () => {
    GameState.setQuizDifficultyFilter("easy");
    saveSelectedQuizDifficultyFilter("easy");

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    }

    renderAll();
    focusInputSoon();
  });

  quizDifficultyMediumBtn?.addEventListener("click", () => {
    GameState.setQuizDifficultyFilter("medium");
    saveSelectedQuizDifficultyFilter("medium");

    if (GameState.getMode() === "quiz") {
      loadQuizQuestion();
    }

    renderAll();
    focusInputSoon();
  });

  quizDifficultyHardBtn?.addEventListener("click", () => {
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
    resetRun();
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
    customPackageInput?.click();
    focusInputSoon();
  });

  customPackageInput?.addEventListener("change", () => {
    const file = customPackageInput.files?.[0];
    if (!file) return;

    void importCustomPackageFile(file);
    customPackageInput.value = "";
    focusInputSoon();
  });
}

export function tickGame(): void {
  syncSpeedMultiplier();
  updateScoreDisplay();
}

export function initInputHandler(): void {
  inputElement = document.getElementById("hiddenInput") as HTMLInputElement | null;

  if (!inputElement) {
    throw new Error("hidden input element not found");
  }

  wordManager.refreshCustomWordsFromStorage();
  refreshQuizContentFromStorage();

  document.addEventListener("click", () => {
    focusInputSoon();
  });

  inputElement.addEventListener("blur", () => {
    focusInputSoon();
  });

  inputElement.addEventListener("input", (event: Event) => {
    const target = event.target as HTMLInputElement;
    processInputValue(target.value);
    target.value = "";
  });

  inputElement.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      resetRun();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      handleBackspace();
      return;
    }

    if (event.key === "Enter") {
      if (GameState.getMode() === "quiz") {
        event.preventDefault();
        submitQuizAnswer();
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
    }
  });

  bindControlButtons();
  restoreTheme();
  restoreQuizThemes();
  restoreDifficultyPreferences();

  loadRegularPrompt();
  syncSpeedMultiplier();
  renderAll();
  inputElement.focus();
}
