/**
 * Free-position virtual joystick
 * -----------------------------
 * Touch anywhere on the left pad: the stick origin is the finger down point.
 * Movement is relative to that origin only — neutral until the finger moves.
 * Capture-phase handlers own the zone so legacy fixed-center code cannot bias input.
 */

export function installMobileJoystick() {
  const zone = document.querySelector('#stickZone');
  const knob = document.querySelector('#stickKnob');
  if (!zone || !knob) return null;

  zone.classList.add('free-stick');
  zone.dataset.freeJoystick = '1';
  zone.setAttribute('aria-label', 'Move: touch left side, drag from where your finger lands');

  let touchId = null;
  let originX = 0;
  let originY = 0;
  const maxRadius = 48;
  const deadZone = 0.08;

  function setMove(x, y) {
    let mx = x || 0;
    let my = y || 0;
    const mag = Math.hypot(mx, my);
    if (mag < deadZone) {
      mx = 0;
      my = 0;
    } else if (mag > 1) {
      mx /= mag;
      my /= mag;
    }

    if (window.RiskMulateMobileMove?.set) {
      window.RiskMulateMobileMove.set(mx, my);
    } else {
      window.__riskmulateMoveX = mx;
      window.__riskmulateMoveY = my;
    }
  }

  function placeVisual(clientX, clientY) {
    const zoneRect = zone.getBoundingClientRect();
    const size = 88;
    const localX = clientX - zoneRect.left;
    const localY = clientY - zoneRect.top;
    const left = Math.min(zoneRect.width - size, Math.max(0, localX - size / 2));
    const top = Math.min(zoneRect.height - size, Math.max(0, localY - size / 2));
    zone.style.setProperty('--stick-x', `${left}px`);
    zone.style.setProperty('--stick-y', `${top}px`);
    zone.classList.add('active');
    knob.style.transform = 'translate(0px, 0px)';
  }

  function resetVisual() {
    zone.classList.remove('active');
    knob.style.transform = 'translate(0px, 0px)';
    touchId = null;
    setMove(0, 0);
  }

  const opts = { passive: false, capture: true };

  zone.addEventListener('touchstart', (event) => {
    if (touchId !== null) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    touchId = touch.identifier;
    originX = touch.clientX;
    originY = touch.clientY;
    placeVisual(originX, originY);
    setMove(0, 0);
    window.dispatchEvent(new CustomEvent('riskmulate:move-touch', { detail: { active: true } }));
  }, opts);

  zone.addEventListener('touchmove', (event) => {
    const touch = [...event.changedTouches].find((item) => item.identifier === touchId);
    if (!touch) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    let dx = touch.clientX - originX;
    let dy = touch.clientY - originY;
    const length = Math.hypot(dx, dy);
    if (length > maxRadius) {
      dx = (dx / length) * maxRadius;
      dy = (dy / length) * maxRadius;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    setMove(dx / maxRadius, dy / maxRadius);
  }, opts);

  zone.addEventListener('touchend', (event) => {
    if (![...event.changedTouches].some((item) => item.identifier === touchId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    resetVisual();
    window.dispatchEvent(new CustomEvent('riskmulate:move-touch', { detail: { active: false } }));
  }, opts);

  zone.addEventListener('touchcancel', (event) => {
    event.stopImmediatePropagation();
    resetVisual();
    window.dispatchEvent(new CustomEvent('riskmulate:move-touch', { detail: { active: false } }));
  }, opts);

  window.RiskMulateJoystick = { zone, reset: resetVisual };
  return window.RiskMulateJoystick;
}
