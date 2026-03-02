import * as Stats from "../core/stats";
import * as ScoreCalculator from "../scoring/score-calculator";
import * as GameState from "../game/game-state";
import * as RogueState from "../game/roguelike-state";

let scoreElement: HTMLElement | null = null;
let wpmElement: HTMLElement | null = null;
let speedElement: HTMLElement | null = null;
let flawlessElement: HTMLElement | null = null;
let totalElement: HTMLElement | null = null;
let lastGainElement: HTMLElement | null = null;
let accuracyElement: HTMLElement | null = null;
let modeElement: HTMLElement | null = null;
let validationElement: HTMLElement | null = null;
let setStatusElement: HTMLElement | null = null;
let statusElement: HTMLElement | null = null;
let quizStatsElement: HTMLElement | null = null;
let categoryElement: HTMLElement | null = null;
let difficultyElement: HTMLElement | null = null;
let themeCountElement: HTMLElement | null = null;
let flawlessStreakElement: HTMLElement | null = null;
let rogueItemSlotsElement: HTMLElement | null = null;
let rogueModuleSlotsElement: HTMLElement | null = null;
let rogueMutatorElement: HTMLElement | null = null;
let trainingControlsElement: HTMLElement | null = null;
let rogueControlsElement: HTMLElement | null = null;

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

function setLabelValue(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function updateRogueSlotInfo(): void {
  if (!rogueItemSlotsElement || !rogueModuleSlotsElement || !rogueMutatorElement) {
    return;
  }

  const consumableSlots = RogueState.getConsumableSlots();
  const moduleSlots = RogueState.getModuleSlots();

  const itemText = consumableSlots
    .map((itemId, index) => {
      if (!itemId) {
        return `[${index + 1}] Empty`;
      }

      const item = RogueState.getConsumableDefinition(itemId);
      return `[${index + 1}] ${item.name}`;
    })
    .join("\n");

  const moduleText = moduleSlots
    .map((moduleId, index) => {
      if (!moduleId) {
        return `[${index + 1}] Empty`;
      }

      const module = RogueState.getModuleDefinition(moduleId);
      return `[${index + 1}] ${module.name}`;
    })
    .join("\n");

  const now = performance.now();
  const activeEffects = RogueState.getActiveEffects();
  const effectText =
    activeEffects.length === 0
      ? "Active boosts: none"
      : `Active boosts: ${activeEffects
          .map((effect) => {
            const seconds = Math.max(0, Math.ceil((effect.endsAt - now) / 1000));
            return `${effect.label} (${seconds}s)`;
          })
          .join(", ")}`;

  rogueItemSlotsElement.textContent = itemText;
  rogueModuleSlotsElement.textContent = moduleText;
  rogueMutatorElement.textContent = `${RogueState.getMutatorSummary()}\n${effectText}`;
}

function updateTrainingPanelValues(): void {
  const mode = GameState.getMode();
  const validation = GameState.getValidationMode();
  const quizQuestion = GameState.getCurrentQuizQuestion();
  const selectedThemes = GameState.getSelectedQuizThemes();

  setLabelValue("modeLabel", "Mode");
  setLabelValue("validationLabel", "Validation");
  setLabelValue("setStatusLabel", "Set Progress");
  setLabelValue("accuracyLabel", "Accuracy");
  setLabelValue("statusLabel", "Status");

  setLabelValue("categoryLabel", "Category");
  setLabelValue("difficultyLabel", "Difficulty");
  setLabelValue("quizStatsLabel", "Quiz Correct");
  setLabelValue("themeCountLabel", "Themes");
  setLabelValue("flawlessStreakLabel", "Flawless Streak");

  if (modeElement) {
    modeElement.textContent = mode === "regular" ? "Regular" : "Quiz";
  }

  if (validationElement) {
    validationElement.textContent = validation === "strict" ? "Strict" : "Loose";
  }

  if (accuracyElement) {
    accuracyElement.textContent = `${Stats.getAccuracy()}%`;
  }

  if (quizStatsElement) {
    quizStatsElement.textContent = `${GameState.getQuizCorrect()}/${GameState.getQuizAnswered()}`;
  }

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
}

function updateRoguePanelValues(totalScore: number): void {
  const levelScore = RogueState.getLevelScore(totalScore);
  const phase = RogueState.getPhase();

  setLabelValue("modeLabel", "Run");
  setLabelValue("validationLabel", "Map");
  setLabelValue("setStatusLabel", "Set");
  setLabelValue("accuracyLabel", "Coins");
  setLabelValue("statusLabel", "Status");

  setLabelValue("categoryLabel", "Level Name");
  setLabelValue("difficultyLabel", "Goal");
  setLabelValue("quizStatsLabel", "Level Score");
  setLabelValue("themeCountLabel", "Time Left");
  setLabelValue("flawlessStreakLabel", "Lives");

  if (modeElement) {
    modeElement.textContent = RogueState.formatRunStateLabel();
  }

  if (validationElement) {
    validationElement.textContent = `${RogueState.getCurrentLevel()}/${RogueState.getMaxLevel()}`;
  }

  if (setStatusElement && phase !== "level") {
    setStatusElement.textContent = "-";
  }

  if (accuracyElement) {
    accuracyElement.textContent = `${RogueState.getCoins()}c`;
  }

  if (categoryElement) {
    categoryElement.textContent = RogueState.getCurrentLevelName();
  }

  if (difficultyElement) {
    difficultyElement.textContent = RogueState.getLevelGoal().toLocaleString();
  }

  if (quizStatsElement) {
    quizStatsElement.textContent = levelScore.toLocaleString();
  }

  if (themeCountElement) {
    if (phase === "level") {
      const remainingSeconds = Math.max(
        0,
        Math.ceil(RogueState.getRemainingMs(performance.now()) / 1000)
      );
      themeCountElement.textContent = `${remainingSeconds}s`;
    } else {
      themeCountElement.textContent = "-";
    }
  }

  if (flawlessStreakElement) {
    flawlessStreakElement.textContent = RogueState.getLifeDisplay();
  }

  if (statusElement) {
    const feedback = GameState.getQuizFeedback();
    statusElement.textContent = feedback.length > 0 ? feedback : RogueState.getStatusText();
  }

  updateRogueSlotInfo();
}

function syncMenuVisibility(): void {
  const rogueTab = GameState.getMainTab() === "rogue";

  trainingControlsElement?.classList.toggle("isHidden", rogueTab);
  rogueControlsElement?.classList.toggle("isHidden", !rogueTab);

  setActiveButtonState("mainTabRogueBtn", rogueTab);
  setActiveButtonState("mainTabTrainingBtn", !rogueTab);
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
  setStatusElement = document.getElementById("setStatusValue");
  quizStatsElement = document.getElementById("quizStatsValue");
  statusElement = document.getElementById("statusLine");
  categoryElement = document.getElementById("categoryValue");
  difficultyElement = document.getElementById("difficultyValue");
  themeCountElement = document.getElementById("themeCountValue");
  flawlessStreakElement = document.getElementById("flawlessStreakValue");
  rogueItemSlotsElement = document.getElementById("rogueItemSlots");
  rogueModuleSlotsElement = document.getElementById("rogueModuleSlots");
  rogueMutatorElement = document.getElementById("rogueMutatorValue");
  trainingControlsElement = document.getElementById("trainingControls");
  rogueControlsElement = document.getElementById("rogueControls");

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

  syncMenuVisibility();

  if (GameState.getMainTab() === "rogue") {
    updateRoguePanelValues(score);
  } else {
    updateTrainingPanelValues();
  }

  const mode = GameState.getMode();
  const validation = GameState.getValidationMode();

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

  const trainingQuizMode = GameState.getMainTab() === "training" && mode === "quiz";
  setDisabledState("tipBtn", !trainingQuizMode);
  setDisabledState("submitBtn", !trainingQuizMode);
}
