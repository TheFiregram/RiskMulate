/**
 * Class-readiness self-check
 * -------------------------
 * Verifies the minimum shippable teaching loop is wired after boot:
 * move bridge, field repair, plant response, timed events, residual feedback, debrief.
 * Soft warnings only — never blocks play.
 */

const CHECKS = [
  {
    id: 'scene',
    label: '3D scene',
    test: () => Boolean(window.RiskMulateScene?.scene && window.RiskMulateScene?.THREE),
  },
  {
    id: 'move',
    label: 'Mobile move bridge',
    test: () => typeof window.RiskMulateMobileMove?.set === 'function',
  },
  {
    id: 'field-repair',
    label: 'Field repair map',
    test: () => Boolean(window.RiskMulateFieldRepair?.applyFieldRepair),
  },
  {
    id: 'field-fix',
    label: 'Field FIX interaction',
    test: () => Boolean(window.RiskMulateFieldFixInteraction?.doFix),
  },
  {
    id: 'plant-response',
    label: 'Plant visual response',
    test: () => Boolean(window.RiskMulatePlantResponse?.refresh || window.RiskMulatePlantResponse),
  },
  {
    id: 'timed',
    label: 'Timed escalation loop',
    test: () => Boolean(window.RiskMulateTimedEvents?.installed),
  },
  {
    id: 'residual',
    label: 'Residual feedback',
    test: () => Boolean(window.RiskMulateResidualFeedback?.installed),
  },
  {
    id: 'debrief',
    label: 'Scenario debrief',
    test: () => Boolean(window.RiskMulateScenarioDebrief?.installed),
  },
  {
    id: 'mobile-fix-btn',
    label: 'Mobile FIX control',
    test: () => Boolean(document.querySelector('#mobileFix')),
  },
  {
    id: 'session-reset',
    label: 'Classroom session reset',
    test: () => Boolean(window.RiskMulateSessionReset?.installed || document.querySelector('#sessionResetBtn')),
  },
  {
    id: 'focus-guidance',
    label: 'Focus guidance captions',
    test: () => Boolean(window.RiskMulateFocusGuidance?.installed || document.querySelector('#focusGuidance')),
  },
  {
    id: 'billboard',
    label: 'Site identity billboard',
    test: () => Boolean(window.RiskMulateBillboard?.built || window.RiskMulateBillboard?.installed),
  },
  {
    id: 'scenario-six',
    label: 'Six-pathway scenario',
    test: () => (window.RiskMulateScenario?.risks?.length || 0) >= 6,
  },
  {
    id: 'hud-score',
    label: 'Live SCORE readout',
    test: () => Boolean(document.querySelector('#hudScore')),
  },
  {
    id: 'multipath-residual',
    label: 'Multipath residual engine',
    test: () => typeof window.RiskMulateContinuity?.computeResidualProfile === 'function'
      || typeof window.RiskMulateContinuity?.installed === 'boolean'
      || Boolean(document.querySelector('#continuityHud')),
  },
  {
    id: 'monitor-review',
    label: 'Monitor residual register',
    test: () => Boolean(window.RiskMulateMonitorReview?.installed),
  },
];

function showReadyBadge(summary) {
  if (document.querySelector('#class-readiness-badge')) return;
  const el = document.createElement('div');
  el.id = 'class-readiness-badge';
  el.setAttribute('role', 'status');
  el.style.cssText = 'position:fixed;top:calc(var(--safe-top,8px) + 8px);right:10px;z-index:50;padding:6px 10px;border-radius:999px;font:10px/1.2 system-ui;letter-spacing:0.06em;text-transform:uppercase;pointer-events:none;opacity:0;transition:opacity .3s ease;';
  if (summary.ready) {
    el.style.background = 'rgba(12,40,24,0.88)';
    el.style.border = '1px solid rgba(111,191,128,0.45)';
    el.style.color = '#b6e6c2';
    el.textContent = 'Teaching loop ready';
  } else {
    el.style.background = 'rgba(40,28,10,0.9)';
    el.style.border = '1px solid rgba(217,163,78,0.45)';
    el.style.color = '#f0d6a8';
    el.textContent = `Loop partial ${summary.passed}/${summary.total}`;
  }
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 4200);
}

function runChecks() {
  const results = CHECKS.map((check) => {
    let ok = false;
    try {
      ok = Boolean(check.test());
    } catch {
      ok = false;
    }
    return { id: check.id, label: check.label, ok };
  });
  const failed = results.filter((r) => !r.ok);
  const summary = {
    ready: failed.length === 0,
    passed: results.filter((r) => r.ok).length,
    total: results.length,
    failed: failed.map((r) => r.id),
    results,
  };
  window.RiskMulateClassReadiness = {
    installed: true,
    ...summary,
    recheck: runChecks,
  };
  if (failed.length) {
    console.warn('[RiskMulate] Class-readiness gaps:', failed.map((f) => f.label).join(', '));
    if (!window.__riskmulateClassBadgeShown && failed.length <= 3) {
      window.__riskmulateClassBadgeShown = true;
      showReadyBadge(summary);
    }
  } else {
    console.info('[RiskMulate] Class-readiness: all core teaching bridges online');
    if (!window.__riskmulateClassBadgeShown) {
      window.__riskmulateClassBadgeShown = true;
      showReadyBadge(summary);
    }
  }
  return summary;
}

export function installClassReadiness() {
  const kick = () => runChecks();
  window.setTimeout(kick, 1200);
  window.setTimeout(kick, 3500);
  window.addEventListener('riskmulate:scene-ready', () => window.setTimeout(kick, 400));
  return { installed: true, recheck: runChecks };
}
