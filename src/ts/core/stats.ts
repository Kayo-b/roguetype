
let startTime: number | null = null;
let endTime: number | null = null;
let correctChars = 0;
let incorrectChars = 0;
let totalKeystrokes = 0;
let backspaceCount = 0;

interface PromptSnapshot {
  expected: string;
  typed: string;
}

interface CharTally {
  correctWordChars: number;
  correctSpaces: number;
  allCorrectChars: number;
  spaces: number;
  incorrectChars: number;
  extraChars: number;
}

const completedPromptSnapshots: PromptSnapshot[] = [];
let activePromptExpected = "";
let activePromptTyped = "";

export function startTimer(): void {
  startTime = performance.now();
  endTime = null;
}

export function stopTimer(): void {
  endTime = performance.now();
}

export function getElapsedTime(): number {
  if (!startTime) return 0;
  const end = endTime ?? performance.now();
  return (end - startTime) / 1000; // Convert to seconds
}

export function recordCorrectChar(): void {
  correctChars++;
  totalKeystrokes++;
}

export function recordIncorrectChar(): void {
  incorrectChars++;
  totalKeystrokes++;
}

export function recordBackspace(): void {
  backspaceCount++;
  totalKeystrokes++;
}

export function getWPM(): number {
  const elapsed = getElapsedTime();
  if (elapsed === 0) return 0;

  const tally = tallyChars();
  const words = (tally.correctWordChars + tally.correctSpaces) / 5;
  const minutes = elapsed / 60;

  return Math.round(words / minutes);
}

export function getRawWPM(): number {
  const elapsed = getElapsedTime();
  if (elapsed === 0) return 0;

  const tally = tallyChars();
  const totalChars =
    tally.allCorrectChars + tally.spaces + tally.incorrectChars + tally.extraChars;
  const words = totalChars / 5;
  const minutes = elapsed / 60;

  return Math.round(words / minutes);
}

function splitWordsKeepingActiveBoundary(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.length > 0 ? normalized.split(" ") : [];

  if (/\s$/.test(text)) {
    words.push("");
  }

  return words;
}

function tallyPromptChars(snapshot: PromptSnapshot): CharTally {
  let correctWordChars = 0;
  let allCorrectChars = 0;
  let incorrect = 0;
  let extraChars = 0;
  let correctSpaces = 0;

  const inputWords = splitWordsKeepingActiveBoundary(snapshot.typed);
  const targetWords = splitWordsKeepingActiveBoundary(snapshot.expected);

  for (let i = 0; i < inputWords.length; i += 1) {
    const inputWord = inputWords[i] ?? "";
    const targetWord = targetWords[i] ?? "";

    if (inputWord === targetWord) {
      correctWordChars += targetWord.length;
      allCorrectChars += targetWord.length;
      if (i < inputWords.length - 1) {
        correctSpaces += 1;
      }
      continue;
    }

    if (inputWord.length >= targetWord.length) {
      for (let c = 0; c < inputWord.length; c += 1) {
        if (c < targetWord.length) {
          if (inputWord[c] === targetWord[c]) {
            allCorrectChars += 1;
          } else {
            incorrect += 1;
          }
        } else {
          extraChars += 1;
        }
      }
      continue;
    }

    for (let c = 0; c < inputWord.length; c += 1) {
      if (inputWord[c] === targetWord[c]) {
        allCorrectChars += 1;
      } else {
        incorrect += 1;
      }
    }
  }

  const spaces = Math.max(0, inputWords.length - 1);

  return {
    correctWordChars,
    correctSpaces,
    allCorrectChars,
    spaces,
    incorrectChars: incorrect,
    extraChars,
  };
}

function tallyChars(): CharTally {
  const aggregate: CharTally = {
    correctWordChars: 0,
    correctSpaces: 0,
    allCorrectChars: 0,
    spaces: 0,
    incorrectChars: 0,
    extraChars: 0,
  };

  const snapshots = [...completedPromptSnapshots];
  if (activePromptExpected.length > 0 || activePromptTyped.length > 0) {
    snapshots.push({ expected: activePromptExpected, typed: activePromptTyped });
  }

  for (const snapshot of snapshots) {
    const tally = tallyPromptChars(snapshot);
    aggregate.correctWordChars += tally.correctWordChars;
    aggregate.correctSpaces += tally.correctSpaces;
    aggregate.allCorrectChars += tally.allCorrectChars;
    aggregate.spaces += tally.spaces;
    aggregate.incorrectChars += tally.incorrectChars;
    aggregate.extraChars += tally.extraChars;
  }

  return aggregate;
}

export function updatePromptSnapshot(expected: string, typed: string): void {
  const nextExpected = expected ?? "";
  const nextTyped = typed ?? "";

  if (nextExpected !== activePromptExpected) {
    if (activePromptExpected.length > 0 || activePromptTyped.length > 0) {
      completedPromptSnapshots.push({ expected: activePromptExpected, typed: activePromptTyped });
    }

    activePromptExpected = nextExpected;
    activePromptTyped = nextTyped;
    return;
  }

  activePromptTyped = nextTyped;
}

export function getAccuracy(): number {
  const total = correctChars + incorrectChars;
  if (total === 0) return 100;

  return Math.round((correctChars / total) * 100);
}

export function getConsistency(): number {
  if (totalKeystrokes === 0) return 100;

  const effectiveKeystrokes = correctChars;
  return Math.round((effectiveKeystrokes / totalKeystrokes) * 100);
}

export function getCorrectChars(): number {
  return correctChars;
}

export function getIncorrectChars(): number {
  return incorrectChars;
}

export function getBackspaceCount(): number {
  return backspaceCount;
}

export interface Stats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  correctChars: number;
  incorrectChars: number;
  backspaces: number;
  elapsedTime: number;
}

export function getAllStats(): Stats {
  return {
    wpm: getWPM(),
    rawWpm: getRawWPM(),
    accuracy: getAccuracy(),
    consistency: getConsistency(),
    correctChars,
    incorrectChars,
    backspaces: backspaceCount,
    elapsedTime: getElapsedTime(),
  };
}

export function reset(): void {
  startTime = null;
  endTime = null;
  correctChars = 0;
  incorrectChars = 0;
  totalKeystrokes = 0;
  backspaceCount = 0;
  completedPromptSnapshots.length = 0;
  activePromptExpected = "";
  activePromptTyped = "";
}
