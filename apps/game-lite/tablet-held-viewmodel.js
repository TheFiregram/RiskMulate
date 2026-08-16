/**
 * Tablet held viewmodel
 * --------------------
 * Hands-on-tablet grips were removed: they broke immersion and read as UI chrome
 * rather than plant fieldwork. The tablet is a full-screen risk process surface;
 * first-person hands stay hidden while it is open (handled in first-person-hands.js).
 */

export function installTabletHeldViewmodel() {
  document.querySelectorAll('.tablet-hand-grip').forEach((el) => el.remove());
  document.getElementById('riskmulate-tablet-held-viewmodel')?.remove();
  return { installed: true, hands: false };
}
