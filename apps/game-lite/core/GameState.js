/**
 * Central game state — single source of truth for session progress.
 * Persistence remains in localStorage under the scenario save key;
 * this object mirrors live values for systems that prefer synchronous reads.
 */

import { TREATMENT_BUDGET_MINUTES, FIELD_FIX_SCORE } from '../gameplay-balance.js';

function emptyProgress() {
  return {
    inspectedFindingIds: [],
    evidenceIds: [],
    fieldFixedIds: [],
    treatmentSelection: [],
    discoveredRiskIds: [],
    timedEventIds: [],
    score: 0,
    complete: false,
    minutesUsed: 0,
  };
}

class GameState {
  constructor() {
    this.session = {
      started: false,
      paused: false,
      ready: false,
      engine: 'v2',
    };
    this.progress = emptyProgress();
    this.config = {
      treatmentBudgetMinutes: TREATMENT_BUDGET_MINUTES,
      fieldFixScore: FIELD_FIX_SCORE,
    };
  }

  reset() {
    this.session.started = false;
    this.session.paused = false;
    this.session.ready = false;
    this.progress = emptyProgress();
  }

  applyProgress(detail = {}) {
    if (!detail || typeof detail !== 'object') return this.progress;
    const next = { ...this.progress, ...detail };
    // Normalize arrays
    for (const key of [
      'inspectedFindingIds',
      'evidenceIds',
      'fieldFixedIds',
      'treatmentSelection',
      'discoveredRiskIds',
      'timedEventIds',
    ]) {
      if (Array.isArray(detail[key])) next[key] = [...detail[key]];
    }
    if (Number.isFinite(detail.score)) next.score = detail.score;
    this.progress = next;
    return this.progress;
  }
}

export const gameState = new GameState();
export default gameState;
