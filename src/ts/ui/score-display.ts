import * as Stats from "../core/stats";
import * as ScoreCalculator from "../scoring/score-calculator";
import * as GameState from "../game/game-state";

let scoreElement: HTMLElement | null = null;
let wpmElement: HTMLElement | null = null;
let speedElement: HTMLElement | null = null;
let flawlessElement: HTMLElement | null = null;
let totalElement: HTMLElement | null = null;
let lastGainElement: HTMLElement | null = null;
let accuracyElement: HTMLElement | null = null;
let modeElement: HTMLElement | null = null;
let validationElement: HTMLElement | null = null;
let quizStatsElement: HTMLElement | null = null;
let statusElement: HTMLElement | null = null;
let categoryElement: HTMLElement | null = null;
let difficultyElement: HTMLElement | null = null;
let themeCountElement: HTMLElement | null = null;
let flawlessStreakElement: HTMLElement | null = null;

let previousScore = -1;

function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`;
}

function formatTheme(theme: GameState.QuizTheme): string {
  if (theme === "sql-injection") {
    return "sqli";
  }
  return theme;
}

function formatRegularThemeSummary(themes: GameState.QuizTheme[]): string {
  if (themes.length === 0) {
    return "all";
  }

  if (themes.length === 1) {
    return formatTheme(themes[0]);
  }

  return `${themes.length} themes`;
}

function formatDifficultyLabel(value: string): string {
  return value === "-" ? "-" : value.toUpperCase();
}

function setActiveButtonState(id: string, active: boolean): void {
  const element = document.getElementById(id) as HTMLButtonElement | null;
  if (!element) return;

  element.classList.toggle("isActive", active);
}

function setDisabledState(id: string, disabled: boolean): void {
  const element = document.getElementById(id) as HTMLButtonElement | null;
  if (!element) return;

  element.disabled = disabled;
}

function setQuizThemeButtonStates(): void {
  const selectedThemes = GameState.getSelectedQuizThemes();
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-quiz-theme]");

  buttons.forEach((button) => {
    const theme = button.dataset.quizTheme;
    const isActive = theme ? selectedThemes.includes(theme as GameState.QuizTheme) : false;
    button.classList.toggle("isActive", isActive);
  });
}

export function initScoreDisplay(): void {
  scoreElement = document.getElementById("scoreValue");
  wpmElement = document.getElementById("wpmValue");
  speedElement = document.getElementById("speedMultiValue");
  flawlessElement = document.getElementById("flawlessMultiValue");
  totalElement = document.getElementById("totalMultiValue");
  lastGainElement = document.getElementById("lastGainValue");
  accuracyElement = document.getElementById("accuracyValue");
  modeElement = document.getElementById("modeValue");
  validationElement = document.getElementById("validationValue");
  quizStatsElement = document.getElementById("quizStatsValue");
  statusElement = document.getElementById("statusLine");
  categoryElement = document.getElementById("categoryValue");
  difficultyElement = document.getElementById("difficultyValue");
  themeCountElement = document.getElementById("themeCountValue");
  flawlessStreakElement = document.getElementById("flawlessStreakValue");

  if (
    !scoreElement ||
    !wpmElement ||
    !speedElement ||
    !flawlessElement ||
    !totalElement ||
    !lastGainElement
  ) {
    throw new Error("Score display elements not found");
  }

  updateScoreDisplay();
}

export function updateScoreDisplay(): void {
  if (
    !scoreElement ||
    !wpmElement ||
    !speedElement ||
    !flawlessElement ||
    !totalElement ||
    !lastGainElement
  ) {
    return;
  }

  const score = ScoreCalculator.getTotalScore();
  const wpm = Stats.getWPM();
  const speed = ScoreCalculator.getSpeedMultiplier();
  const flawless = ScoreCalculator.getFlawlessMultiplier();
  const total = ScoreCalculator.getTotalMult();
  const gain = GameState.getLastGain();

  scoreElement.textContent = score.toLocaleString();
  wpmElement.textContent = String(wpm);
  speedElement.textContent = formatMultiplier(speed);
  flawlessElement.textContent = formatMultiplier(flawless);
  totalElement.textContent = formatMultiplier(total);
  lastGainElement.textContent = `+${gain}`;

  if (previousScore !== score) {
    scoreElement.classList.remove("scorePulse");
    void scoreElement.offsetHeight;
    scoreElement.classList.add("scorePulse");
  }

  previousScore = score;

  if (accuracyElement) {
    accuracyElement.textContent = `${Stats.getAccuracy()}%`;
  }

  const mode = GameState.getMode();
  const validation = GameState.getValidationMode();

  if (modeElement) {
    modeElement.textContent = mode === "regular" ? "Regular" : "Quiz";
  }

  if (validationElement) {
    validationElement.textContent = validation === "strict" ? "Strict" : "Loose";
  }

  if (quizStatsElement) {
    quizStatsElement.textContent = `${GameState.getQuizCorrect()}/${GameState.getQuizAnswered()}`;
  }

  const quizQuestion = GameState.getCurrentQuizQuestion();
  const selectedThemes = GameState.getSelectedQuizThemes();

  if (categoryElement) {
    categoryElement.textContent =
      mode === "regular"
        ? formatRegularThemeSummary(selectedThemes)
        : quizQuestion?.theme
          ? formatTheme(quizQuestion.theme)
          : "Quiz";
  }

  if (difficultyElement) {
    difficultyElement.textContent =
      mode === "regular"
        ? formatDifficultyLabel(GameState.getRegularDifficulty())
        : formatDifficultyLabel(quizQuestion?.difficulty ?? "-");
  }

  if (flawlessStreakElement) {
    flawlessStreakElement.textContent = String(GameState.getFlawlessStreak());
  }

  if (themeCountElement) {
    themeCountElement.textContent = `${selectedThemes.length}/${GameState.ALL_QUIZ_THEMES.length}`;
  }

  if (statusElement) {
    const feedback = GameState.getQuizFeedback();
    const lastGainReason = GameState.getLastGainReason();

    if (feedback.length > 0) {
      statusElement.textContent = feedback;
    } else if (lastGainReason === "set") {
      statusElement.textContent = "Set complete";
    } else if (mode === "quiz") {
      statusElement.textContent = "Answer from memory";
    } else {
      statusElement.textContent = "Typing";
    }
  }

  setActiveButtonState("modeRegularBtn", mode === "regular");
  setActiveButtonState("modeQuizBtn", mode === "quiz");
  setActiveButtonState("validationStrictBtn", validation === "strict");
  setActiveButtonState("validationLooseBtn", validation === "loose");
  setActiveButtonState(
    "regularDifficultyEasyBtn",
    GameState.getRegularDifficulty() === "easy"
  );
  setActiveButtonState(
    "regularDifficultyMediumBtn",
    GameState.getRegularDifficulty() === "medium"
  );
  setActiveButtonState(
    "regularDifficultyHardBtn",
    GameState.getRegularDifficulty() === "hard"
  );
  setActiveButtonState(
    "quizDifficultyAllBtn",
    GameState.getQuizDifficultyFilter() === "all"
  );
  setActiveButtonState(
    "quizDifficultyEasyBtn",
    GameState.getQuizDifficultyFilter() === "easy"
  );
  setActiveButtonState(
    "quizDifficultyMediumBtn",
    GameState.getQuizDifficultyFilter() === "medium"
  );
  setActiveButtonState(
    "quizDifficultyHardBtn",
    GameState.getQuizDifficultyFilter() === "hard"
  );
  setQuizThemeButtonStates();

  const quizMode = mode === "quiz";
  setDisabledState("tipBtn", !quizMode);
  setDisabledState("submitBtn", !quizMode);
}
