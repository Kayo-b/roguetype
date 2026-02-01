import "./styles/main.scss";
import { initDisplay } from "./ts/ui/typing-display";
import { initInputHandler } from "./ts/core/input-handler";
import { initCaret } from "./ts/core/caret";

initDisplay();
initCaret();
initInputHandler();

console.log("RogueType initialized");
