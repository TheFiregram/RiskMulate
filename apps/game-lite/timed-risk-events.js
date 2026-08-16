import { scenario } from './scenario.js';
import { isFindingFixed, isFindingFixable } from './field-repair.js';
import { setFlangeLeakIntensity } from './flange-escalation.js';

/**
 * Timed risk event seeds — continuous risk loop
 * ---------------------------------------------
 * Educational purpose (ISO 31000 Monitor & Review):
 * Risk is the effect of uncertainty on objectives over time.
 * Untreated initiating events can escalate while the student walks the plant.
 * Field treatment changes residual likelihood before the consequence pathway
 * fully develops. This is not a one-shot checklist.
 */

const saveKey = `riskmulate:${scenario.id}`;

const EVENT_SEEDS = Object.freeze([
  {
    id: 'flange-escalate',
    findingId: 'flange-leak',
    afterSeconds: 38,
    title: 'Leak pathway intensifying',
    body: 'The untreated flange release is progressing. Residual likelihood is rising while the initiating event remains free.',
    teaching:
      'Monitor & review: residual risk is not static. Isolation at the source still cuts the cause → event chain before startup.',
    severity: 'warning',
  },
  {
    id: 'support-fatigue-cue',
    findingId: 'support-vibration',
    afterSeconds: 55,
    title: 'Support vibration under load',
    body: 'Mechanical uncertainty on the damaged support continues. Fatigue risk remains on the process line until a hold or repair is committed.',
    teaching:
      'A startup hold is a valid control when integrity is uncertain. Deferral can reduce residual likelihood without a full repair now.',
    severity: 'warning',
  },
  {
    id: 'drain-exposure-cue',
    findingId: 'storm-drain',
    afterSeconds: 70,
    title: 'Stormwater route still open',
    body: 'If a spill reaches the unprotected drain, the environmental consequence pathway remains available.',
    teaching:
      'Same initiating release, different residual impact: covering the drain breaks the pathway to the environment.',
    severity: 'info',
  },
  {
    id: 'access-blocked-cue',
    findingId: 'access-obstruction',
    afterSeconds: 85,
    title: 'Emergency route still obstructed',
    body: 'Response time against a developing event is still degraded while the service route is blocked.',
    teaching:
      'Housekeeping becomes risk treatment when it changes response capability against objectives.',
    severity: 'info',
  },
  {
    id: 'electrical-live-cue',
    findingId: 'electrical-panel',
    afterSeconds: 100,
    title: 'Energized fault pathway open',
    body: 'Without lockout, the electrical initiating pathway remains available to personnel and equipment.',
    teaching:
      'LOTO removes the energy source from service. Warning signs alone do not control the mechanism.',
    severity: 'warning',
  },
]);

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(saveKey) || 'null') || {};
  } catch {
    return {};
  }
}

function ensureBanner() {
  let el = document.querySelector('#timedRiskBanner');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'timedRiskBanner';
  el.className = 'timed-risk-banner';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

function showBanner(seed) {
  const el = ensureBanner();
  el.dataset.severity = seed.severity || 'info';
  el.innerHTML = `<strong>${seed.title}</strong><span>${seed.body}</span><em>${seed.teaching}</em>`;
  el.classList.add('show');
  clearTimeout(showBanner._timer);
  showBanner._timer = setTimeout(() => el.classList.remove('show'), 5600);
}

function injectBannerStyle() {
  if (document.querySelector('#timed-risk-style')) return;
  const style = document.createElement('style');
  style.id = 'timed-risk-style';
  style.textContent = `
    .timed-risk-banner {
      position: fixed;
      left: 50%;
      top: calc(var(--safe-top, 12px) + 52px);
      transform: translateX(-50%) translateY(-8px);
      width: min(460px, calc(100vw - 24px));
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid rgba(217, 163, 78, 0.45);
      background: rgba(18, 12, 6, 0.9);
      color: #f3e6d2;
      opacity: 0;
      pointer-events: none;
      transition: opacity 180ms ease, transform 180ms ease;
      z-index: 44;
      backdrop-filter: blur(8px);
      text-align: left;
    }
    .timed-risk-banner.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .timed-risk-banner[data-severity="warning"] {
      border-color: rgba(227, 140, 72, 0.55);
    }
    .timed-risk-banner strong {
      display: block;
      margin-bottom: 4px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #f0c27a;
    }
    .timed-risk-banner span {
      display: block;
      font-size: 12px;
      line-height: 1.4;
      color: #e8dcc8;
    }
    .timed-risk-banner em {
      display: block;
      margin-top: 6px;
      font-style: normal;
      font-size: 11px;
      line-height: 1.35;
      color: #b9a88c;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 6px;
    }
    @media (max-width: 760px) {
      .timed-risk-banner {
        top: calc(var(--safe-top, 8px) + 44px);
      }
    }
  `;
  document.head.appendChild(style);
}

export function installTimedRiskEvents() {
  if (window.RiskMulateTimedEvents?.installed) return window.RiskMulateTimedEvents;

  injectBannerStyle();

  const fired = new Set();
  let startedAt = null;
  let timerId = null;

  function tick() {
    if (startedAt == null) return;
    const progress = readProgress();
    if (progress.complete) return;

    const elapsed = (performance.now() - startedAt) / 1000;
    const inspected = Array.isArray(progress.inspectedFindingIds)
      ? progress.inspectedFindingIds
      : [];

    for (const seed of EVENT_SEEDS) {
      if (fired.has(seed.id)) continue;
      if (elapsed < seed.afterSeconds) continue;

      if (!inspected.includes(seed.findingId)) {
        fired.add(seed.id);
        continue;
      }
      if (isFindingFixed(seed.findingId, progress)) {
        fired.add(seed.id);
        continue;
      }

      fired.add(seed.id);
      showBanner(seed);

      if (seed.findingId === 'flange-leak') {
        setFlangeLeakIntensity(1.85);
      }

      try {
        const next = { ...progress };
        next.score = Math.max(0, (next.score || 0) - 8);
        next.timedEventIds = Array.isArray(next.timedEventIds)
          ? [...new Set([...next.timedEventIds, seed.id])]
          : [seed.id];
        localStorage.setItem(saveKey, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('riskmulate:progress', { detail: { ...next } }));
      } catch {
        /* ignore storage issues */
      }

      window.dispatchEvent(new CustomEvent('riskmulate:timed-event', {
        detail: {
          id: seed.id,
          findingId: seed.findingId,
          title: seed.title,
          body: seed.body,
          teaching: seed.teaching,
          severity: seed.severity,
          elapsed,
        },
      }));

      window.RiskMulateAudio?.playInteractionTick?.();
    }
  }

  function startClock() {
    if (startedAt != null) return;
    startedAt = performance.now();
    timerId = window.setInterval(tick, 1000);
  }

  const startButton = document.querySelector('#startButton');
  startButton?.addEventListener('click', () => {
    window.setTimeout(startClock, 1200);
  }, { once: true });

  const startEl = document.querySelector('#start');
  if (startEl && (startEl.hidden || getComputedStyle(startEl).display === 'none')) {
    startClock();
  }

  window.addEventListener('riskmulate:field-repair', (event) => {
    const findingId = event.detail?.findingId;
    if (!findingId) return;
    for (const seed of EVENT_SEEDS) {
      if (seed.findingId === findingId) fired.add(seed.id);
    }
  });

  const api = {
    installed: true,
    seeds: EVENT_SEEDS,
    reset() {
      fired.clear();
      startedAt = null;
      if (timerId) clearInterval(timerId);
      timerId = null;
    },
  };
  window.RiskMulateTimedEvents = api;
  return api;
}
