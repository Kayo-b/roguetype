export type GameMode = "regular" | "quiz";
export type ValidationMode = "strict" | "loose";
export type QuizDifficulty = "easy" | "medium" | "hard";
export type RegularDifficulty = "easy" | "medium" | "hard";
export type QuizDifficultyFilter = QuizDifficulty | "all";
export type QuizTheme =
  | "standard"
  | "javascript"
  | "python"
  | "bash"
  | "sql"
  | "sql-injection"
  | "git"
  | "custom";

export const ALL_QUIZ_THEMES: QuizTheme[] = [
  "standard",
  "javascript",
  "python",
  "bash",
  "sql",
  "sql-injection",
  "git",
  "custom",
];

export interface QuizQuestion {
  id: string;
  theme: QuizTheme;
  difficulty: QuizDifficulty;
  prompt: string;
  answer: string;
  tip: string;
  caseSensitive?: boolean;
}

let mode: GameMode = "regular";
let validationMode: ValidationMode = "strict";
let isActive = false;

let promptText = "";
let expectedText = "";
let typedText = "";

let wordsPerSet = 10;
let mistakesInSet = 0;
let strictLockIndex = 0;
let flawlessStreak = 0;
let flawlessMultiplier = 1;
let regularDifficulty: RegularDifficulty = "easy";
let quizDifficultyFilter: QuizDifficultyFilter = "all";

let speedMultiplier = 1;
let totalMultiplier = 1;
let lastGain = 0;
let lastGainReason = "";

let currentQuizQuestion: QuizQuestion | null = null;
let selectedQuizThemes: QuizTheme[] = [...ALL_QUIZ_THEMES];
let quizTipVisible = false;
let quizTipUsed = false;
let quizFeedback = "";
let revealedAnswer = "";
let quizAnswered = 0;
let quizCorrect = 0;
let quizMinorErrorsLast = 0;

function calculateFlawlessMultiplierFromStreak(streak: number): number {
  return Math.min(3.5, 1 + streak * 0.2);
}

function normalizeThemes(input: QuizTheme[]): QuizTheme[] {
  const next = input.filter((theme): theme is QuizTheme =>
    ALL_QUIZ_THEMES.includes(theme)
  );

  if (next.length === 0) {
    return [...ALL_QUIZ_THEMES];
  }

  return [...new Set(next)];
}

export function getMode(): GameMode {
  return mode;
}

export function setMode(nextMode: GameMode): void {
  mode = nextMode;
}

export function getValidationMode(): ValidationMode {
  return validationMode;
}

export function setValidationMode(nextMode: ValidationMode): void {
  validationMode = nextMode;
}

export function getIsActive(): boolean {
  return isActive;
}

export function setIsActive(active: boolean): void {
  isActive = active;
}

export function getPromptText(): string {
  return promptText;
}

export function getExpectedText(): string {
  return expectedText;
}

export function getTypedText(): string {
  return typedText;
}

export function setPromptAndExpected(prompt: string, expected: string): void {
  promptText = prompt;
  expectedText = expected;
  typedText = "";
  strictLockIndex = 0;
  revealedAnswer = "";
  quizFeedback = "";
  quizTipVisible = false;
  quizTipUsed = false;
  quizMinorErrorsLast = 0;
}

export function appendTypedText(text: string): void {
  typedText += text;
}

export function setTypedText(text: string): void {
  typedText = text;
}

export function clearTypedText(): void {
  typedText = "";
}

export function getWordsPerSet(): number {
  return wordsPerSet;
}

export function setWordsPerSet(count: number): void {
  wordsPerSet = Math.max(1, count);
}

export function getRegularDifficulty(): RegularDifficulty {
  return regularDifficulty;
}

export function setRegularDifficulty(next: RegularDifficulty): void {
  regularDifficulty = next;
}

export function getQuizDifficultyFilter(): QuizDifficultyFilter {
  return quizDifficultyFilter;
}

export function setQuizDifficultyFilter(next: QuizDifficultyFilter): void {
  quizDifficultyFilter = next;
}

export function getMistakesInSet(): number {
  return mistakesInSet;
}

export function markSetMistake(): void {
  mistakesInSet++;
}

export function resetSetMistakes(): void {
  mistakesInSet = 0;
}

export function getStrictLockIndex(): number {
  return strictLockIndex;
}

export function setStrictLockIndex(index: number): void {
  strictLockIndex = Math.max(0, index);
}

export function resetStrictLockIndex(): void {
  strictLockIndex = 0;
}

export function registerSetCompletion(isFlawless: boolean): number {
  if (isFlawless) {
    flawlessStreak++;
  } else {
    flawlessStreak = 0;
  }

  flawlessMultiplier = calculateFlawlessMultiplierFromStreak(flawlessStreak);
  return flawlessMultiplier;
}

export function getFlawlessStreak(): number {
  return flawlessStreak;
}

export function getFlawlessMultiplier(): number {
  return flawlessMultiplier;
}

export function setSpeedMultiplier(value: number): void {
  speedMultiplier = value;
}

export function getSpeedMultiplier(): number {
  return speedMultiplier;
}

export function setTotalMultiplier(value: number): void {
  totalMultiplier = value;
}

export function getTotalMultiplier(): number {
  return totalMultiplier;
}

export function setLastGain(value: number, reason: string): void {
  lastGain = value;
  lastGainReason = reason;
}

export function getLastGain(): number {
  return lastGain;
}

export function getLastGainReason(): string {
  return lastGainReason;
}

export function setCurrentQuizQuestion(question: QuizQuestion | null): void {
  currentQuizQuestion = question;
}

export function getCurrentQuizQuestion(): QuizQuestion | null {
  return currentQuizQuestion;
}

export function setSelectedQuizThemes(themes: QuizTheme[]): void {
  selectedQuizThemes = normalizeThemes(themes);
}

export function getSelectedQuizThemes(): QuizTheme[] {
  return selectedQuizThemes;
}

export function resetSelectedQuizThemes(): void {
  selectedQuizThemes = [...ALL_QUIZ_THEMES];
}

export function getQuizTipVisible(): boolean {
  return quizTipVisible;
}

export function setQuizTipVisible(visible: boolean): void {
  quizTipVisible = visible;
}

export function getQuizTipUsed(): boolean {
  return quizTipUsed;
}

export function setQuizTipUsed(used: boolean): void {
  quizTipUsed = used;
}

export function getQuizFeedback(): string {
  return quizFeedback;
}

export function setQuizFeedback(feedback: string): void {
  quizFeedback = feedback;
}

export function getRevealedAnswer(): string {
  return revealedAnswer;
}

export function setRevealedAnswer(answer: string): void {
  revealedAnswer = answer;
}

export function getQuizAnswered(): number {
  return quizAnswered;
}

export function getQuizCorrect(): number {
  return quizCorrect;
}

export function incrementQuizAnswered(correct: boolean): void {
  quizAnswered++;
  if (correct) {
    quizCorrect++;
  }
}

export function getQuizMinorErrorsLast(): number {
  return quizMinorErrorsLast;
}

export function setQuizMinorErrorsLast(errors: number): void {
  quizMinorErrorsLast = Math.max(0, errors);
}

export function resetProgressForNewRun(): void {
  isActive = false;
  wordsPerSet = 10;
  mistakesInSet = 0;
  strictLockIndex = 0;
  flawlessStreak = 0;
  flawlessMultiplier = 1;
  speedMultiplier = 1;
  totalMultiplier = 1;
  lastGain = 0;
  lastGainReason = "";
  quizAnswered = 0;
  quizCorrect = 0;
  quizMinorErrorsLast = 0;
  quizFeedback = "";
  revealedAnswer = "";
  quizTipVisible = false;
  quizTipUsed = false;
}
