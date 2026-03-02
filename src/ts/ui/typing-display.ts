import * as GameState from "../game/game-state";
import * as RogueState from "../game/roguelike-state";

let promptTitleElement: HTMLElement | null = null;
let promptContentElement: HTMLElement | null = null;
let quizTipElement: HTMLElement | null = null;
let quizFeedbackElement: HTMLElement | null = null;
let answerRevealElement: HTMLElement | null = null;
let terminalElement: HTMLElement | null = null;

function formatThemeForTitle(theme: GameState.QuizTheme): string {
  return theme === "sql-injection" ? "SQLI" : theme.toUpperCase();
}

function getPromptWordProgress(input: string): number {
  const trimmed = input.trim();
  if (trimmed.length === 0) return 0;
  const separatorPattern = GameState.getMainTab() === "rogue" ? /_+/ : /\s+/;
  return trimmed.split(separatorPattern).length;
}

export function initDisplay(): void {
  promptTitleElement = document.getElementById("promptTitle");
  promptContentElement = document.getElementById("promptContent");
  quizTipElement = document.getElementById("quizTip");
  quizFeedbackElement = document.getElementById("quizFeedback");
  answerRevealElement = document.getElementById("answerReveal");
  terminalElement = document.getElementById("typingTerminal");

  if (
    !promptTitleElement ||
    !promptContentElement ||
    !quizTipElement ||
    !quizFeedbackElement ||
    !answerRevealElement ||
    !terminalElement
  ) {
    throw new Error("Typing display elements not found");
  }

  updateDisplay();
}

function renderPromptText(): void {
  if (!promptContentElement || !promptTitleElement) return;

  const mode = GameState.getMode();
  const expected = GameState.getExpectedText();
  const typed = GameState.getTypedText();

  if (mode === "regular") {
    if (GameState.getMainTab() === "rogue") {
      const level = RogueState.getCurrentLevel();
      const levelName = RogueState.getCurrentLevelName();
      const bossTag = RogueState.isBossLevel() ? " · BOSS" : "";
      promptTitleElement.textContent = `ROGUE MODE · L${level} ${levelName.toUpperCase()}${bossTag}`;
    } else {
      const regularDifficulty = GameState.getRegularDifficulty().toUpperCase();
      promptTitleElement.textContent = `REGULAR MODE · ${regularDifficulty}`;
    }

    let html = "";
    for (let i = 0; i < expected.length; i++) {
      const expectedChar = expected[i];
      const typedChar = typed[i];
      const displayChar = expectedChar === " " ? "&nbsp;" : expectedChar;

      if (typedChar === undefined) {
        html += `<span class=\"promptChar\">${displayChar}</span>`;
      } else if (typedChar === expectedChar) {
        html += `<span class=\"promptChar promptCharCorrect\">${displayChar}</span>`;
      } else {
        html += `<span class=\"promptChar promptCharIncorrect\">${displayChar}</span>`;
      }
    }

    promptContentElement.innerHTML = html;
    return;
  }

  const question = GameState.getCurrentQuizQuestion();
  const category = question?.theme;
  const difficulty = question?.difficulty ?? "-";
  const categoryLabel = category ? formatThemeForTitle(category) : "QUIZ";
  promptTitleElement.textContent = `QUIZ MODE · ${categoryLabel} · ${difficulty.toUpperCase()}`;
  promptContentElement.textContent = GameState.getPromptText();
}

function renderQuizMessages(): void {
  if (!quizTipElement || !quizFeedbackElement || !answerRevealElement) return;

  const mode = GameState.getMode();

  if (mode !== "quiz") {
    quizTipElement.textContent = "";
    quizFeedbackElement.textContent = "";
    answerRevealElement.textContent = "";
    return;
  }

  const question = GameState.getCurrentQuizQuestion();
  const tip = GameState.getQuizTipVisible() ? `Tip: ${question?.tip ?? ""}` : "";
  const feedback = GameState.getQuizFeedback();
  const revealedAnswer = GameState.getRevealedAnswer();

  quizTipElement.textContent = tip;
  quizFeedbackElement.textContent = feedback;
  answerRevealElement.textContent = revealedAnswer
    ? `Correct syntax: ${revealedAnswer}`
    : "";
}

function syncSetStatusInline(): void {
  const setStatusElement = document.getElementById("setStatusValue");
  if (!setStatusElement) return;

  if (GameState.getMode() === "quiz") {
    setStatusElement.textContent = "Question input";
    return;
  }

  const progress = getPromptWordProgress(GameState.getTypedText());
  const total = GameState.getWordsPerSet();
  setStatusElement.textContent = `${Math.min(progress, total)}/${total}`;
}

function applyRogueTerminalAccent(): void {
  if (!terminalElement) return;

  if (GameState.getMainTab() === "rogue") {
    const accent = RogueState.getCurrentAccentColor();
    terminalElement.style.setProperty("--rogue-level-accent", accent);
    terminalElement.classList.add("isRogueLevel");
    return;
  }

  terminalElement.style.removeProperty("--rogue-level-accent");
  terminalElement.classList.remove("isRogueLevel");
}

export function updateDisplay(): void {
  applyRogueTerminalAccent();
  renderPromptText();
  renderQuizMessages();
  syncSetStatusInline();
}
