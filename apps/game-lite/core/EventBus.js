/**
 * EventBus — single channel for engine ↔ systems communication.
 * Pattern from PlayableIntelligence game-creator / threejs-game core.
 * Modules should prefer eventBus.emit/on over ad-hoc coupling.
 * Legacy `riskmulate:*` window CustomEvents are bridged in Game.js.
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    cbs.delete(callback);
    if (cbs.size === 0) this.listeners.delete(event);
  }

  emit(event, data) {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    for (const cb of [...cbs]) {
      try {
        cb(data);
      } catch (error) {
        console.error(`[RiskMulate EventBus] ${event}`, error);
      }
    }
  }

  clear(event) {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }
}

export const eventBus = new EventBus();
export default eventBus;
