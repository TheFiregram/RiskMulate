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
];

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
  } else {
    console.info('[RiskMulate] Class-readiness: all core teaching bridges online');
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
