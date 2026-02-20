import * as GameState from "../game/game-state";

let caretElement: HTMLElement | null = null;
let typingLaneElement: HTMLElement | null = null;
let caretMeasureElement: HTMLElement | null = null;

let blinkTimeout: number | null = null;

function escapeSpaces(value: string): string {
  return value.replace(/ /g, "\u00A0");
}

export function initCaret(): void {
  caretElement = document.getElementById("caret");
  typingLaneElement = document.getElementById("typingLane");
  caretMeasureElement = document.getElementById("caretMeasure");

  if (!caretElement || !typingLaneElement || !caretMeasureElement) {
    throw new Error("Caret elements not found");
  }

  updateCaretPosition();
}

export function updateCaretPosition(): void {
  if (!caretElement || !typingLaneElement || !caretMeasureElement) return;

  const typedText = GameState.getTypedText();
  caretMeasureElement.textContent = escapeSpaces(typedText);

  const contentWidth = caretMeasureElement.getBoundingClientRect().width;
  const laneWidth = typingLaneElement.clientWidth;
  const leftPadding = 14;
  const visibleLimit = Math.max(0, laneWidth - leftPadding - 14);

  if (contentWidth > visibleLimit) {
    typingLaneElement.scrollLeft = contentWidth - visibleLimit;
  } else {
    typingLaneElement.scrollLeft = 0;
  }

  const left = leftPadding + contentWidth - typingLaneElement.scrollLeft;
  const top = 12;
  const height = Math.max(20, typingLaneElement.clientHeight - 24);

  caretElement.style.left = `${left}px`;
  caretElement.style.top = `${top}px`;
  caretElement.style.height = `${height}px`;
  caretElement.style.opacity = "1";
}

export function restartBlink(): void {
  if (!caretElement) return;

  caretElement.style.animation = "none";
  void caretElement.offsetHeight;

  if (blinkTimeout !== null) {
    window.clearTimeout(blinkTimeout);
  }

  blinkTimeout = window.setTimeout(() => {
    if (caretElement) {
      caretElement.style.animation = "caretBlink 1s infinite";
    }
  }, 120);
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
