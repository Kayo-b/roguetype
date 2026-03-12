import * as Stats from "../core/stats";

const PASSAGES = [
  "quiet rain drifts across the empty road",
  "the lantern swings beside a narrow bridge",
  "dust settles softly on the wooden table",
  "a distant bell echoes through the valley",
  "paper maps fold back into careful hands",
  "the market closes before the evening wind",
  "small waves tap against the dark harbor",
  "the candle burns until the room turns gold",
  "the orchard path bends toward hidden hills",
  "a soft voice calls from beyond the gate",
  "the river bends around a sleeping town",
  "new footsteps cross the moonlit courtyard",
  "a hidden process wakes behind the silent daemon",
  "the cache remembers what the logs forgot",
  "the monitor blinks while the stack unwinds",
  "a fragile socket waits for one more reply",
  "the parser stares at a broken payload",
  "silent workers spin beneath the load balancer",
  "one final prompt appears in green letters",
  "cat records.log | grep 'warning' | tail -n 8",
  "find . -type f -name '*.log' | xargs wc -l",
  "grep -R \"TODO\" src | head -n 20",
  "awk '{print $2}' metrics.txt | sort -nr | head -n 5",
  "curl -s \"$URL\" | jq '.status'",
];

interface TypingState {
  expected: string;
  typed: string;
  completedPassages: number;
  sessionStarted: boolean;
  autoAdvanceToken: number;
}

interface Elements {
  root: HTMLElement;
  prompt: HTMLElement;
  status: HTMLElement;
  progress: HTMLElement;
  completed: HTMLElement;
  accuracy: HTMLElement;
  wpm: HTMLElement;
  rawWpm: HTMLElement;
  newPassageButton: HTMLButtonElement;
  resetSessionButton: HTMLButtonElement;
}

const state: TypingState = {
  expected: PASSAGES[0],
  typed: "",
  completedPassages: 0,
  sessionStarted: false,
  autoAdvanceToken: 0,
};

let elements: Elements | null = null;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pickNextPassage(current: string): string {
  if (PASSAGES.length <= 1) return current;

  let next = current;
  while (next === current) {
    next = PASSAGES[Math.floor(Math.random() * PASSAGES.length)] ?? current;
  }

  return next;
}

function getPrefixCorrectCount(): number {
  let count = 0;
  while (count < state.typed.length && state.typed[count] === state.expected[count]) {
    count += 1;
  }
  return count;
}

function getProgressLabel(): string {
  const progress = state.expected.length === 0 ? 0 : Math.round((state.typed.length / state.expected.length) * 100);
  return `${progress}%`;
}

function syncPromptSnapshot(): void {
  Stats.updatePromptSnapshot(state.expected, state.typed);
}

function focusTypingSurface(): void {
  elements?.root.focus();
}

function renderPrompt(): void {
  if (!elements) return;

  const parts: string[] = [];
  let inWord = false;

  for (let index = 0; index < state.expected.length; index += 1) {
    const expectedChar = state.expected[index] ?? "";
    const typedChar = state.typed[index];
    const isActiveChar = index === state.typed.length;
    const isIncorrect = typedChar !== undefined && typedChar !== expectedChar;
    const visibleChar = isIncorrect && typedChar === " " ? expectedChar : typedChar === undefined ? expectedChar : typedChar;
    const escapedChar = escapeHtml(visibleChar === " " ? " " : visibleChar);
    const classes = ["promptChar"];

    if (expectedChar === " " && inWord) {
      parts.push("</span>");
      inWord = false;
    } else if (expectedChar !== " " && !inWord) {
      parts.push('<span class="promptWord">');
      inWord = true;
    }

    if (expectedChar === " ") {
      classes.push("promptSpace");
    }

    if (typedChar !== undefined) {
      classes.push(typedChar === expectedChar ? "promptCharCorrect" : "promptCharIncorrect");
    } else {
      classes.push("promptCharPending");
    }

    if (isActiveChar) {
      classes.push("promptCharActive");
    }

    parts.push(`<span class="${classes.join(" ")}">${escapedChar}</span>`);
  }

  if (inWord) {
    parts.push("</span>");
  }

  if (state.typed.length >= state.expected.length) {
    parts.push('<span class="cursorEndAnchor" aria-hidden="true"></span>');
  }

  elements.prompt.innerHTML = parts.join("");
}

function renderMetrics(): void {
  if (!elements) return;

  const stats = Stats.getAllStats();
  elements.progress.textContent = getProgressLabel();
  elements.completed.textContent = String(state.completedPassages);
  elements.accuracy.textContent = `${stats.accuracy}%`;
  elements.wpm.textContent = String(stats.wpm);
  elements.rawWpm.textContent = String(stats.rawWpm);
}

function renderStatus(): void {
  if (!elements) return;

  if (!state.sessionStarted && state.typed.length === 0 && state.completedPassages === 0) {
    elements.status.textContent = "Type anywhere to begin. Press Esc for a new passage.";
    return;
  }

  if (state.typed === state.expected) {
    elements.status.textContent = "Passage complete. Loading another one...";
    return;
  }

  const correctPrefix = getPrefixCorrectCount();
  const remaining = Math.max(0, state.expected.length - correctPrefix);
  elements.status.textContent = `${remaining} characters remaining.`;
}

function render(): void {
  renderPrompt();
  renderMetrics();
  renderStatus();
}

function loadPassage(nextPassage: string): void {
  state.expected = nextPassage;
  state.typed = "";
  syncPromptSnapshot();
  render();
}

function scheduleNextPassage(): void {
  const token = state.autoAdvanceToken + 1;
  state.autoAdvanceToken = token;

  window.setTimeout(() => {
    if (state.autoAdvanceToken !== token) return;
    loadPassage(pickNextPassage(state.expected));
    focusTypingSurface();
  }, 450);
}

function startSessionIfNeeded(): void {
  if (state.sessionStarted) return;
  Stats.reset();
  Stats.startTimer();
  state.sessionStarted = true;
  state.completedPassages = 0;
  syncPromptSnapshot();
}

function resetSession(): void {
  state.sessionStarted = false;
  state.completedPassages = 0;
  state.autoAdvanceToken += 1;
  Stats.reset();
  loadPassage(pickNextPassage(state.expected));
  focusTypingSurface();
}

function skipToNextPassage(): void {
  state.autoAdvanceToken += 1;
  loadPassage(pickNextPassage(state.expected));
  focusTypingSurface();
}

function backspace(): void {
  if (state.typed.length === 0) return;
  state.autoAdvanceToken += 1;
  state.typed = state.typed.slice(0, -1);
  Stats.recordBackspace();
  syncPromptSnapshot();
  render();
}

function typeCharacter(inputChar: string): void {
  if (state.typed.length >= state.expected.length) return;

  startSessionIfNeeded();
  state.autoAdvanceToken += 1;

  const expectedChar = state.expected[state.typed.length] ?? "";
  if (inputChar === expectedChar) {
    Stats.recordCorrectChar();
  } else {
    Stats.recordIncorrectChar();
  }

  state.typed += inputChar;
  syncPromptSnapshot();
  render();

  if (state.typed === state.expected) {
    state.completedPassages += 1;
    render();
    scheduleNextPassage();
  }
}

function normalizeTypedKey(event: KeyboardEvent): string | null {
  if (event.key === "Enter") return " ";
  if (event.key.length === 1) return event.key;
  return null;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (event.key === "Tab") {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    skipToNextPassage();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    backspace();
    return;
  }

  const typedKey = normalizeTypedKey(event);
  if (!typedKey) return;

  event.preventDefault();
  typeCharacter(typedKey);
}

function mustElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

export function initTypingOnlyApp(): void {
  elements = {
    root: mustElement<HTMLElement>("typingApp"),
    prompt: mustElement<HTMLElement>("promptContent"),
    status: mustElement<HTMLElement>("statusText"),
    progress: mustElement<HTMLElement>("progressValue"),
    completed: mustElement<HTMLElement>("completedValue"),
    accuracy: mustElement<HTMLElement>("accuracyValue"),
    wpm: mustElement<HTMLElement>("wpmValue"),
    rawWpm: mustElement<HTMLElement>("rawWpmValue"),
    newPassageButton: mustElement<HTMLButtonElement>("newPassageBtn"),
    resetSessionButton: mustElement<HTMLButtonElement>("resetSessionBtn"),
  };

  elements.newPassageButton.addEventListener("click", () => {
    skipToNextPassage();
  });

  elements.resetSessionButton.addEventListener("click", () => {
    resetSession();
  });

  elements.root.addEventListener("click", () => {
    focusTypingSurface();
  });

  window.addEventListener("keydown", handleKeydown, { capture: true });

  Stats.reset();
  syncPromptSnapshot();
  render();
  focusTypingSurface();
}
