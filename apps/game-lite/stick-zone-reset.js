/**
 * Stick zone hard reset
 * --------------------
 * Clones #stickZone to drop any legacy fixed-center listeners registered by game.js,
 * then reinstalls the free-origin joystick so touch-down is always neutral.
 */
import { installMobileJoystick } from './mobile-joystick.js';

export function installStickZoneReset() {
  const zone = document.querySelector('#stickZone');
  if (!zone) return null;

  // Clone node → strips all event listeners from the old element.
  const clean = zone.cloneNode(true);
  zone.parentNode.replaceChild(clean, zone);

  // Re-bind free joystick on the clean zone.
  return installMobileJoystick();
}
