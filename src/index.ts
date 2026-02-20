import "@webtui/css";
import "./styles/main.scss";
import { initDisplay } from "./ts/ui/typing-display";
import { initScoreDisplay } from "./ts/ui/score-display";
import { initInputHandler, tickGame } from "./ts/core/input-handler";
import { initCaret } from "./ts/core/caret";

initDisplay();
initCaret();
initScoreDisplay();
initInputHandler();

window.setInterval(() => {
  tickGame();
}, 180);

console.log("RogueType initialized");
