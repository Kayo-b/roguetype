// Cursor rendering and positioning
import * as InputState from "./input-state";

let caretElement: HTMLElement | null = null;
let wordsElement: HTMLElement | null = null;

export function initCaret(): void {
  caretElement = document.getElementById("caret");
  wordsElement = document.getElementById("words");

  if (!caretElement || !wordsElement) {
    throw new Error("Caret or words element not found");
  }

  updateCaretPosition();
}

export function updateCaretPosition(): void {
  if (!caretElement || !wordsElement) return;

  const wordIndex = InputState.getCurrentWordIndex();
  const charIndex = InputState.getCurrentInput().length;

  const wordElement = wordsElement.querySelector(
    `[data-index="${wordIndex}"]`
  ) as HTMLElement;

  if (!wordElement) {
    caretElement.style.opacity = "0";
    return;
  }

  caretElement.style.opacity = "1";

  const chars = wordElement.querySelectorAll(".char");

  if (charIndex < chars.length) {
    const charElement = chars[charIndex] as HTMLElement;
    positionCaretAtElement(charElement);
  } else if (chars.length > 0) {
    const lastChar = chars[chars.length - 1] as HTMLElement;
    positionCaretAfterElement(lastChar);
  } else {
    positionCaretAtElement(wordElement);
  }
}

function positionCaretAtElement(element: HTMLElement): void {
  if (!caretElement || !wordsElement) return;

  const wordsRect = wordsElement.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  //harcoded start positions need to be changed to relative-to-string position
  // or keep it fixed but then number of lines must be constant
  const left = 30 + (elementRect.left - wordsRect.left);
  const top = 105 + (elementRect.top - wordsRect.top);

  caretElement.style.left = `${left}px`;
  caretElement.style.top = `${top}px`;
}

function positionCaretAfterElement(element: HTMLElement): void {
  if (!caretElement || !wordsElement) return;

  const wordsRect = wordsElement.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  const left = 30 + elementRect.right - wordsRect.left;
  const top = 105 + elementRect.top - wordsRect.top;

  caretElement.style.left = `${left}px`;
  caretElement.style.top = `${top}px`;
}

let blinkTimeout: number | null = null;

export function restartBlink(): void {
  if (!caretElement) return;

  caretElement.style.animation = "none";

  void caretElement.offsetHeight;

  if (blinkTimeout) {
    clearTimeout(blinkTimeout);
  }

  blinkTimeout = window.setTimeout(() => {
    if (caretElement) {
      caretElement.style.animation = "blink 1s infinite";
    }
  }, 500);
}

export function hideCaret(): void {
  if (caretElement) {
    caretElement.style.opacity = "0";
  }
}

export function showCaret(): void {
  if (caretElement) {
    caretElement.style.opacity = "1";
  }
}
