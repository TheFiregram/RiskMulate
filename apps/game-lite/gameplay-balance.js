/**
 * Gameplay balance constants (PlayableIntelligence / improve-game pattern)
 * ----------------------------------------------------------------------
 * Single source for pacing, scoring, and discovery timing.
 * Educational product: ISO 31000 cycle must stay readable under time pressure.
 *
 * Design targets (class demo ~15–20 min active play inside 23 min authority window):
 * 1. Core loop is obvious: inspect → evidence → field FIX → residual changes
 * 2. Escalation ramps after the student has had time to act, not as spam
 * 3. Multipath access is taught after plant-side is discoverable
 * 4. Score rewards field control more than tablet-only intent
 */

/** Authority / scenario window (minutes). Keep in sync with scenario.treatmentBudgetMinutes. */
export const TREATMENT_BUDGET_MINUTES = 23;

/** Field FIX score pulse — primary positive reinforcement for treat-at-equipment. */
export const FIELD_FIX_SCORE = 35;

/** Score penalty when an untreated pathway escalates (timed seed). Softer than early drafts. */
export const TIMED_EVENT_PENALTY = 5;

/**
 * Timed escalation schedule (seconds after session start).
 * Order matches recommended walkdown: flange → support → drain → plant access → electrical → hose → rear.
 * Rear is last so multipath residual lands after plant-side access is known.
 */
export const TIMED_ESCALATION_SECONDS = Object.freeze({
  'flange-leak': 42,
  'support-vibration': 68,
  'storm-drain': 95,
  'access-obstruction': 120,
  'electrical-panel': 145,
  'temp-hose': 165,
  'rear-egress': 190,
});

/**
 * Focus-guidance caption timing (ms after start).
 * Staggered so VO/captions do not stack on escalations.
 */
export const FOCUS_GUIDANCE_MS = Object.freeze({
  'spawn-orient': 2000,
  'enter-plant': 11000,
  'inspect-flange': 24000,
  'broaden-walkdown': 50000,
  'temp-hose-prompt': 78000,
  'rear-egress-prompt': 125000,
  'monitor-review': 160000,
});

/** How long residual / timed banners stay visible (ms). */
export const BANNER_VISIBLE_MS = 5800;

/** Monitor prompt interval once open pathways exist (seconds of open time). */
export const MONITOR_OPEN_PATHWAY_INTERVAL_S = 110;

/** Minimum inspected findings before monitor register auto-opens. */
export const MONITOR_REGISTER_MIN_INSPECTED = 2;

/**
 * Recommended class demo path (instructor talking points, not enforced).
 * Keeps six pathways but prioritizes the teaching sequence.
 */
export const CLASS_DEMO_PATH = Object.freeze([
  'flange-leak',
  'support-vibration',
  'storm-drain',
  'access-obstruction',
  'rear-egress',
  'temp-hose',
  'electrical-panel',
]);

export default {
  TREATMENT_BUDGET_MINUTES,
  FIELD_FIX_SCORE,
  TIMED_EVENT_PENALTY,
  TIMED_ESCALATION_SECONDS,
  FOCUS_GUIDANCE_MS,
  BANNER_VISIBLE_MS,
  MONITOR_OPEN_PATHWAY_INTERVAL_S,
  MONITOR_REGISTER_MIN_INSPECTED,
  CLASS_DEMO_PATH,
};
