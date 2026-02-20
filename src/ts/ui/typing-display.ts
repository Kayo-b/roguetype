import * as GameState from "../game/game-state";
import { updateCaretPosition, restartBlink } from "../core/caret";

let promptTitleElement: HTMLElement | null = null;
let promptContentElement: HTMLElement | null = null;
let typedContentElement: HTMLElement | null = null;
let laneGhostElement: HTMLElement | null = null;
let quizTipElement: HTMLElement | null = null;
let quizFeedbackElement: HTMLElement | null = null;
let answerRevealElement: HTMLElement | null = null;

function formatThemeForTitle(theme: GameState.QuizTheme): string {
  return theme === "sql-injection" ? "SQLI" : theme.toUpperCase();
}

function getPromptWordProgress(input: string): number {
  const trimmed = input.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function initDisplay(): void {
  promptTitleElement = document.getElementById("promptTitle");
  promptContentElement = document.getElementById("promptContent");
  typedContentElement = document.getElementById("typedContent");
  laneGhostElement = document.getElementById("laneGhost");
  quizTipElement = document.getElementById("quizTip");
  quizFeedbackElement = document.getElementById("quizFeedback");
  answerRevealElement = document.getElementById("answerReveal");

  if (
    !promptTitleElement ||
    !promptContentElement ||
    !typedContentElement ||
    !laneGhostElement ||
    !quizTipElement ||
    !quizFeedbackElement ||
    !answerRevealElement
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
    const regularDifficulty = GameState.getRegularDifficulty().toUpperCase();
    promptTitleElement.textContent = `REGULAR MODE · ${regularDifficulty}`;

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

function renderTypedLane(): void {
  if (!typedContentElement || !laneGhostElement) return;

  const typed = GameState.getTypedText();
  const expected = GameState.getExpectedText();
  const mode = GameState.getMode();

  if (typed.length === 0) {
    typedContentElement.innerHTML = "";
    laneGhostElement.textContent = "type here...";
    return;
  }

  laneGhostElement.textContent = "";

  let html = "";
  for (let i = 0; i < typed.length; i++) {
    const typedChar = typed[i];
    const expectedChar = expected[i];
    const isCorrect = expectedChar !== undefined && typedChar === expectedChar;
    const className =
      mode === "quiz"
        ? "typedChar typedCharNeutral"
        : isCorrect
          ? "typedChar typedCharCorrect"
          : "typedChar typedCharIncorrect";
    const displayChar = typedChar === " " ? "&nbsp;" : typedChar;

    html += `<span class=\"${className}\">${displayChar}</span>`;
  }

  typedContentElement.innerHTML = html;
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

export function updateDisplay(): void {
  renderPromptText();
  renderTypedLane();
  renderQuizMessages();
  syncSetStatusInline();
  updateCaretPosition();
  restartBlink();
}
