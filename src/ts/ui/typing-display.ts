import * as RogueState from "../game/roguelike-state";

let promptTitleElement: HTMLElement | null = null;
let promptFirewallElement: HTMLElement | null = null;
let promptContentElement: HTMLElement | null = null;

function escapeChar(char: string): string {
  if (char === "&") return "&amp;";
  if (char === "<") return "&lt;";
  if (char === ">") return "&gt;";
  if (char === '"') return "&quot;";
  if (char === "'") return "&#39;";
  return char;
}

function renderPromptText(): void {
  if (!promptContentElement) return;

  const expected = RogueState.getExpectedText();
  const typed = RogueState.getTypedText();
  const errorText = RogueState.getErrorText();
  const cursorIndex = RogueState.getCursorIndex();

  let html = "";
  let inWord = false;

  for (let i = 0; i < expected.length; i += 1) {
    const isSpace = expected[i] === " ";
    if (!isSpace && !inWord) {
      html += '<span class="promptWord">';
      inWord = true;
    } else if (isSpace && inWord) {
      html += "</span>";
      inWord = false;
    }

    const cursorHtml =
      i === cursorIndex ? '<span id="cursorAnchor" class="cursorAnchor" aria-hidden="true"></span>' : "";

    const rawChar = expected[i];
    const visibleChar = escapeChar(rawChar);
    const classes = ["promptChar"];
    if (isSpace) classes.push("promptSpace");

    if (i < typed.length) {
      classes.push("promptCharCorrect");
      html += `${cursorHtml}<span class="${classes.join(" ")}">${visibleChar}</span>`;
    } else if (i < typed.length + errorText.length) {
      const wrongChar = errorText[i - typed.length];
      const wrongVisible = escapeChar(wrongChar);
      classes.push("promptCharIncorrect");
      html += `${cursorHtml}<span class="${classes.join(" ")}">${wrongVisible}</span>`;
    } else {
      html += `${cursorHtml}<span class="${classes.join(" ")}">${visibleChar}</span>`;
    }
  }

  if (inWord) {
    html += "</span>";
  }

  if (cursorIndex >= expected.length) {
    html += '<span id="cursorAnchor" class="cursorAnchor" aria-hidden="true"></span>';
  }

  promptContentElement.innerHTML = html;
}

function renderHeader(): void {
  if (!promptTitleElement || !promptFirewallElement) return;

  const label = RogueState.getOperationLabel();
  const firewalls = RogueState.getActiveFirewallLabels();

  promptTitleElement.textContent = label;
  promptFirewallElement.textContent = firewalls === "None" ? "No active challenge" : firewalls;
}

export function initDisplay(): void {
  promptTitleElement = document.getElementById("promptTitle");
  promptFirewallElement = document.getElementById("promptFirewall");
  promptContentElement = document.getElementById("promptContent");

  if (!promptTitleElement || !promptFirewallElement || !promptContentElement) {
    throw new Error("Typing display elements not found");
  }

  updateDisplay();
}

export function updateDisplay(): void {
  renderHeader();
  renderPromptText();
}
