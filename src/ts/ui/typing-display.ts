import * as RogueState from "../game/roguelike-state";

let promptTitleElement: HTMLElement | null = null;
let promptFirewallElement: HTMLElement | null = null;
let promptContentElement: HTMLElement | null = null;

function renderPromptText(): void {
  if (!promptContentElement) return;

  const expected = RogueState.getExpectedText();
  const maskedExpected = RogueState.getMaskedExpectedText();
  const typed = RogueState.getTypedText();
  const errorText = RogueState.getErrorText();
  const cursorIndex = RogueState.getCursorIndex();
  const hidden = RogueState.isPromptHidden();

  let html = "";

  for (let i = 0; i < expected.length; i += 1) {
    if (i === cursorIndex) {
      html += '<span id="cursorAnchor" class="cursorAnchor" aria-hidden="true"></span>';
    }

    const rawChar = hidden ? (maskedExpected[i] ?? expected[i]) : expected[i];
    const visibleChar = rawChar === " " ? "&nbsp;" : rawChar;

    if (i < typed.length) {
      html += `<span class="promptChar promptCharCorrect">${visibleChar}</span>`;
      continue;
    }

    if (i < typed.length + errorText.length) {
      const wrongChar = errorText[i - typed.length];
      const wrongVisible = wrongChar === " " ? "&nbsp;" : wrongChar;
      html += `<span class="promptChar promptCharIncorrect">${wrongVisible}</span>`;
      continue;
    }

    if (hidden && rawChar === "*") {
      html += `<span class="promptChar promptCharMasked">${visibleChar}</span>`;
    } else {
      html += `<span class="promptChar">${visibleChar}</span>`;
    }
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
  promptFirewallElement.textContent = firewalls === "None" ? "No firewall modifier" : firewalls;
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
