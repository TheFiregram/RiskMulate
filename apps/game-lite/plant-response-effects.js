import { scenario } from './scenario.js';
import { setLeakingFlangeControlled } from './flanges.js';

/**
 * Plant response layer
 * --------------------
 * Educational purpose: treatment is not only a tablet checklist.
 * When students select or commit controls, the facility should change so they
 * can see residual risk reduction as a physical consequence of decisions.
 */

const FINDING_ACTION_MAP = Object.freeze({
  'flange-leak': 'isolate-line',
  'storm-drain': 'protect-drain',
  'access-obstruction': 'clear-access',
  'electrical-panel': 'electrical-loto',
  'support-vibration': 'support-startup-hold',
  'temp-hose': 'secure-temp-hose',
});

const ACTION_LABELS = Object.freeze({
  'isolate-line': 'Line isolated',
  'protect-drain': 'Drain protected',
  'clear-access': 'Access cleared',
  'electrical-loto': 'Circuit locked out',
  'support-startup-hold': 'Startup hold tagged',
  'secure-temp-hose': 'Temporary hose secured',
});
