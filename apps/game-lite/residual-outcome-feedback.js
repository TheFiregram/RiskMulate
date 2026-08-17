import { scenario } from './scenario.js';
import { computeResidualProfile } from './continuity-simulation.js';

/**
 * Residual outcome feedback
 * -------------------------
 * Educational purpose: after a field control, show how residual likelihood/impact
 * changed for the linked risk. Closes the treat → monitor loop with a clear
 * cause → control → residual chain.
 */

const ACTION_TO_RISK = Object.freeze({
  'isolate-line': 'solvent-release',
  'protect-drain': 'environmental-release',
  'clear-access': 'emergency-access',
  'electrical-loto': 'electrical-fault',
  'support-startup-hold': 'pipe-fatigue',
  'secure-temp-hose': 'hose-disconnect',
});

function ensureToast() {
  let el = document.querySelector('#residualOutcomeToast');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'residualOutcomeToast';
  el.className = 'residual-outcome-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

function injectStyle() {
  if (document.querySelector('#residual-outcome-style')) return;
  const style = document.createElement('style');
  style.id = 'residual-outcome-style';
  style.textContent = `
    .residual-outcome-toast {
      position: fixed;
      right: 14px;
      bottom: calc(var(--safe-bottom, 12px) + 120px);
      width: min(320px, calc(100vw - 28px));
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid rgba(111, 191, 128, 0.4);
      background: rgba(6, 18, 14, 0.9);
      color: #e4f3e8;
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease, transform 160ms ease;
      transform: translateY(8px);
      z-index: 42;
      font-size: 12px;
      line-height: 1.4;
      backdrop-filter: blur(6px);
    }
    .residual-outcome-toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .residual-outcome-toast strong {
      display: block;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9fe0b0;
      margin-bottom: 4px;
    }
    .residual-outcome-toast span {
      display: block;
      margin-bottom: 6px;
    }
    .residual-outcome-toast em {
      display: block;
      font-style: normal;
      color: #b7c9be;
      font-size: 11px;
    }
    @media (max-width: 760px) {
      .residual-outcome-toast {
        left: 14px;
        right: 14px;
        width: auto;
        bottom: calc(var(--safe-bottom, 12px) + 175px);
      }
    }
  `;
  document.head.appendChild(style);
}

function showResidual(actionId, progress, findingId) {
  const riskId = ACTION_TO_RISK[actionId];
  if (!riskId) return;
  const risk = scenario.risks.find((item) => item.id === riskId);
  if (!risk) return;

  const before = {
    likelihood: risk.inherentLikelihood,
    impact: risk.inherentImpact,
    score: risk.inherentLikelihood * risk.inherentImpact,
  };
  const selection = Array.isArray(progress?.treatmentSelection) ? progress.treatmentSelection : [];
  const residuals = computeResidualProfile(scenario, selection, progress || {});
  const after = residuals[riskId] || before;

  // Pathway-specific residual teaching (ISO 31000: residual remains until consequence drivers change).
  let note =
    'Treatment changed residual likelihood on this pathway. Impact stays high until the consequence is fully removed from the design basis.';
  if (actionId === 'clear-access') {
    const fixed = new Set(Array.isArray(progress?.fieldFixedIds) ? progress.fieldFixedIds : []);
    const plantSide = fixed.has('access-obstruction');
    const rearSide = fixed.has('rear-egress');
    if (plantSide && rearSide) {
      note =
        'Both initiating locations for emergency-access are controlled. Residual response-time risk is reduced across the pad and the rear gate.';
    } else if (plantSide && !rearSide) {
      note =
        'Plant-side access is clear, but rear egress remains obstructed. The same residual pathway can stay partially open from a second location.';
    } else if (rearSide && !plantSide) {
      note =
        'Rear egress is clear, but the plant-side service route is still blocked. Residual emergency-access risk is only partially treated.';
    } else {
      note =
        'Selecting clear-access records treatment intent. Residual emergency-access risk only falls after both field locations — plant-side and rear egress — are controlled.';
    }
  } else if (actionId === 'secure-temp-hose') {
    note =
      'Secondary retention (or removal) lowers hose-disconnect likelihood before pressure is introduced. Residual impact stays high if a release still occurs.';
  } else if (actionId === 'isolate-line') {
    note =
      'Isolation reduces solvent-release likelihood during the disruption window. Flange residual can remain above acceptance until repair is verified.';
  } else if (actionId === 'protect-drain') {
    note =
      'Drain protection changes the consequence pathway of a spill — residual environmental-release likelihood drops even if the initiating leak is still present.';
  } else if (actionId === 'electrical-loto') {
    note =
      'LOTO removes energy from the fault pathway. Residual electrical risk stays controlled only while isolation is maintained and repair is completed.';
  } else if (actionId === 'support-startup-hold') {
    note =
      'A startup hold does not repair the support — it reduces exposure to vibration-driven fatigue until mechanical integrity is restored.';
  }

  const el = ensureToast();
  el.innerHTML = `
    <strong>Residual risk update</strong>
    <span>${risk.name}: inherent L${before.likelihood}×I${before.impact}=${before.score} → residual L${after.likelihood}×I${after.impact}=${after.score}</span>
    <em>${note}</em>
  `;
  el.classList.add('show');
  clearTimeout(showResidual._timer);
  showResidual._timer = setTimeout(() => el.classList.remove('show'), 5600);
}

export function installResidualOutcomeFeedback() {
  if (window.RiskMulateResidualFeedback?.installed) {
    return window.RiskMulateResidualFeedback;
  }
  injectStyle();

  window.addEventListener('riskmulate:field-repair', (event) => {
    const detail = event.detail || {};
    showResidual(detail.actionId, detail.progress, detail.findingId);
  });

  const api = { installed: true, showResidual };
  window.RiskMulateResidualFeedback = api;
  return api;
}
