/**
 * Input polish — runs after game.js
 * ---------------------------------
 * Ensures free joystick owns locomotion and tablet UI has no hand chrome.
 */

export function installInputPolish() {
  document.querySelectorAll('.tablet-hand-grip').forEach((el) => el.remove());
  document.getElementById('riskmulate-tablet-held-viewmodel')?.remove();

  if (!window.RiskMulateMobileMove) {
    let x = 0;
    let y = 0;
    window.RiskMulateMobileMove = {
      set(nx, ny) {
        x = nx || 0;
        y = ny || 0;
        window.__riskmulateMoveX = x;
        window.__riskmulateMoveY = y;
      },
      get() {
        return { x, y };
      },
    };
  }

  return { installed: true };
}
