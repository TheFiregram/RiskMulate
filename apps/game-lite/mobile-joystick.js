/**
 * Free-position virtual joystick
 * -----------------------------
 * The left half of the screen is the move pad. Touch anywhere on the left side
 * to spawn the analog under the finger, then drag relative to that origin.
 */

export function installMobileJoystick() {
  const zone = document.querySelector('#stickZone');
  const knob = document.querySelector('#stickKnob');
  const ring = zone?.querySelector('.stick-ring');
  if (!zone || !knob) return null;

  // Expand hit area to full left side; visual stick follows the finger origin.
  zone.classList.add('free-stick');
  zone.setAttribute('aria-label', 'Move: touch anywhere on the left side and drag');

  let touchId = null;
  let originX = 0;
  let originY = 0;
  const maxRadius = 42;

  function setMove(x, y) {
    if (window.RiskMulateMobileMove?.set) {
      window.RiskMulateMobileMove.set(x, y);
      return;
    }
    // Fallback for early boot before game.js registers the bridge.
    window.__riskmulateMoveX = x;
    window.__riskmulateMoveY = y;
  }

  function placeVisual(clientX, clientY) {
    const zoneRect = zone.getBoundingClientRect();
    const localX = clientX - zoneRect.left;
    const localY = clientY - zoneRect.top;
    const size = 88;
    const left = Math.min(zoneRect.width - size, Math.max(0, localX - size / 2));
    const top = Math.min(zoneRect.height - size, Math.max(0, localY - size / 2));
    zone.style.setProperty('--stick-x', `${left}px`);
    zone.style.setProperty('--stick-y', `${top}px`);
    zone.classList.add('active');
  }

  function resetVisual() {
    zone.classList.remove('active');
    knob.style.transform = 'translate(0px, 0px)';
    touchId = null;
    setMove(0, 0);
  }

  zone.addEventListener('touchstart', (event) => {
    // Prefer a fresh touch; ignore multi-touch on the same zone.
    const touch = event.changedTouches[0];
    if (!touch) return;
    event.preventDefault();
    touchId = touch.identifier;
    originX = touch.clientX;
    originY = touch.clientY;
    placeVisual(originX, originY);
    setMove(0, 0);
    window.dispatchEvent(new CustomEvent('riskmulate:move-touch', { detail: { active: true } }));
  }, { passive: false });

  zone.addEventListener('touchmove', (event) => {
    const touch = [...event.changedTouches].find((item) => item.identifier === touchId);
    if (!touch) return;
    event.preventDefault();
    let dx = touch.clientX - originX;
    let dy = touch.clientY - originY;
    const length = Math.hypot(dx, dy);
    if (length > maxRadius) {
      dx = (dx / length) * maxRadius;
      dy = (dy / length) * maxRadius;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    setMove(dx / maxRadius, dy / maxRadius);
  }, { passive: false });

  zone.addEventListener('touchend', (event) => {
    if ([...event.changedTouches].some((item) => item.identifier === touchId)) {
      resetVisual();
      window.dispatchEvent(new CustomEvent('riskmulate:move-touch', { detail: { active: false } }));
    }
  }, { passive: false });

  zone.addEventListener('touchcancel', () => {
    resetVisual();
    window.dispatchEvent(new CustomEvent('riskmulate:move-touch', { detail: { active: false } }));
  }, { passive: false });

  // Mark zone so game.js can skip its legacy fixed-stick handlers.
  zone.dataset.freeJoystick = '1';
  window.RiskMulateJoystick = { zone, reset: resetVisual };
  return window.RiskMulateJoystick;
}
