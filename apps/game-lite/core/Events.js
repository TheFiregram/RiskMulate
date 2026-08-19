/**
 * Canonical event names (domain:action).
 * Bridge maps these to existing window CustomEvents where needed.
 */
export const Events = Object.freeze({
  GAME_BOOT: 'game:boot',
  GAME_READY: 'game:ready',
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_COMPLETE: 'game:complete',
  GAME_RESET: 'game:reset',

  SCENE_READY: 'scene:ready',
  PLAYER_READY: 'player:ready',

  PROGRESS: 'progress:update',
  FIELD_REPAIR: 'field:repair',
  TIMED_ESCALATION: 'risk:timed-escalation',
  TIMED_EVENT: 'risk:timed-event',

  UI_TOAST: 'ui:toast',
  UI_OBJECTIVE: 'ui:objective',

  // Legacy window event name mapping (CustomEvent type → Events.*)
  LEGACY_MAP: Object.freeze({
    'riskmulate:scene-ready': 'scene:ready',
    'riskmulate:progress': 'progress:update',
    'riskmulate:field-repair': 'field:repair',
    'riskmulate:timed-escalation': 'risk:timed-escalation',
    'riskmulate:timed-event': 'risk:timed-event',
    'riskmulate:player-physics-ready': 'player:ready',
  }),
});

export default Events;
