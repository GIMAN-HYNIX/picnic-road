/* pixelfx(MIT, patch-gg/pixelfx)의 효과를 게임에서 쓰도록 이어 주는 파일. 라이선스는 pfx/LICENSE 참고 */
import * as core from "./core/index.js";
import * as resurrection from "./fx/holy/resurrection.js";
window.PFX = { core, fx: { resurrection } };
