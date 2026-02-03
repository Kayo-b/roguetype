import "./styles/main.scss";
import { initDisplay } from "./ts/ui/typing-display";
import { initScoreDisplay } from "./ts/ui/score-display";
import { initInputHandler } from "./ts/core/input-handler";
import { initCaret } from "./ts/core/caret";

// async function rerenderScore() {
//     let count = 0
//     while(count < 10000) {
//         setInterval(() => initScoreDisplay(), 1000);
//         count++
//     }
// }
// rerenderScore();
setInterval(() => initScoreDisplay(), 1000);
initDisplay();
initCaret();
initInputHandler();

console.log("RogueType initialized");
