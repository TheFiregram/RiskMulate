/**
 * Monitor & Review loop (ISO 31000)
 * ---------------------------------
 * Educational purpose: treatment is not the end of the cycle. Residual risk
 * must be monitored and reviewed against objectives. This layer surfaces:
 *  - residual risk register strip after field controls
 *  - time-based monitor prompts for untreated inspected findings
 *  - short debrief when the player has treated multiple pathways
 */

import { scenario } from './scenario.js';
import { isFindingFixed } from './field-repair.js';

const saveKey = `riskmulate:${scenario.id}`;

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(saveKey) || 'null') || {};
  } catch {
    return {};
  }
}

function inherentScore(risk) {
  return risk.inherentLikelihood * risk.inherentImpact;
}

function residualFor(risk, selection) {
  const treated = Array.isArray(selection) ? selection : [];
  let L = risk.inherentLikelihood;
  let I = risk.inherentImpact;

  const caps = {
    'solvent-release': { actions: ['isolate-line'], L: 2 },
    'environmental-release': { actions: ['protect-drain'], L: 1 },
    'emergency-access': { actions: ['clear-access'], L: 1 },
    'electrical-fault': { actions: ['electrical-loto'], L: 1 },
    'pipe-fatigue': { actions: ['support-startup-hold', 'support-repair-now'], L: 2 },
    'hose-disconnect': { actions: ['secure-temp-hose'], L: 1 },
  };

  const rule = caps[risk.id];
  if (rule && rule.actions.some((a) => treated.includes(a))) {
    L = Math.min(L, rule.L);
  }
  return { likelihood: L, impact: I, score: L * I };
}

function injectStyle() {
  if (document.getElementById('monitor-review-style')) return;
  const style = document.createElement('style');
  style.id = 'monitor-review-style';
  style.textContent = `
    .monitor-register {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: calc(var(--safe-bottom, 12px) + 150px);
      z-index: 42;
      max-width: 420px;
      margin: 0 auto;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(10, 16, 20, 0.88);
      border: 1px solid rgba(120, 170, 190, 0.28);
      color: #d7e4ea;
      font: 11px/1.4 system-ui, -apple-system, sans-serif;
      opacity: 0;
      transform: translateY(8px);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      backdrop-filter: blur(8px);
    }
    .monitor-register.show {
      opacity: 1;
      transform: translateY(0);
    }
    .monitor-register strong {
      display: block;
      margin-bottom: 6px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9fd0e0;
      font-size: 10px;
    }
    .monitor-register .row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 3px 0;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .monitor-register .row:first-of-type {
      border-top: none;
    }
    .monitor-register .name {
      color: #c5d4db;
      flex: 1;
    }
    .monitor-register .score {
      color: #e8c27a;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .monitor-register .score.down {
      color: #8fd4a4;
    }
    .monitor-register em {
      display: block;
      margin-top: 8px;
      font-style: normal;
      color: #9aafb8;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 6px;
      font-size: 11px;
      line-height: 1.35;
    }
    .monitor-prompt {
      position: fixed;
      left: 50%;
      top: calc(var(--safe-top, 8px) + 86px);
      transform: translateX(-50%) translateY(-6px);
      z-index: 43;
      max-width: min(440px, calc(100vw - 24px));
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(12, 18, 22, 0.9);
      border: 1px solid rgba(150, 180, 120, 0.35);
      color: #dce8d8;
      font: 12px/1.4 system-ui, -apple-system, sans-serif;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      text-align: left;
    }
    .monitor-prompt.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .monitor-prompt strong {
      display: block;
      margin-bottom: 4px;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #b6d48a;
    }
    @media (max-width: 760px) {
      .monitor-register {
        bottom: calc(var(--safe-bottom, 12px) + 190px);
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureRegister() {
  let el = document.querySelector('.monitor-register');
  if (!el) {
    el = document.createElement('div');
    el.className = 'monitor-register';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  return el;
}

function ensurePrompt() {
  let el = document.querySelector('.monitor-prompt');
  if (!el) {
    el = document.createElement('div');
    el.className = 'monitor-prompt';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  return el;
}

function showRegister(progress) {
  const selection = Array.isArray(progress?.treatmentSelection)
    ? progress.treatmentSelection
    : [];
  const rows = scenario.risks
    .map((risk) => {
      const before = inherentScore(risk);
      const after = residualFor(risk, selection);
      return {
        name: risk.name,
        before,
        after: after.score,
        reduced: after.score < before,
        text: `L${after.likelihood}×I${after.impact}=${after.score}`,
        inherent: `L${risk.inherentLikelihood}×I${risk.inherentImpact}=${before}`,
      };
    })
    .sort((a, b) => b.after - a.after)
    .slice(0, 5);

  const el = ensureRegister();
  el.innerHTML = `
    <strong>Monitor &amp; review · residual register</strong>
    ${rows
      .map(
        (row) => `
      <div class="row">
        <span class="name">${row.name}</span>
        <span class="score ${row.reduced ? 'down' : ''}">${row.inherent} → ${row.text}</span>
      </div>`,
      )
      .join('')}
    <em>ISO 31000: residual risk is not zero by default. Monitor whether controls remain effective against objectives.</em>
  `;
  el.classList.add('show');
  clearTimeout(showRegister._timer);
  showRegister._timer = setTimeout(() => el.classList.remove('show'), 7000);
}

function showMonitorPrompt(message, teaching) {
  const el = ensurePrompt();
  el.innerHTML = `
    <strong>Monitor &amp; review</strong>
    <span>${message}</span>
    ${teaching ? `<em style="display:block;margin-top:6px;font-style:normal;color:#a8b8a0;font-size:11px;line-height:1.35">${teaching}</em>` : ''}
  `;
  el.classList.add('show');
  clearTimeout(showMonitorPrompt._timer);
  showMonitorPrompt._timer = setTimeout(() => el.classList.remove('show'), 5600);
}

export function installMonitorReviewLoop() {
  if (window.RiskMulateMonitorReview?.installed) {
    return window.RiskMulateMonitorReview;
  }

  injectStyle();

  let startedAt = null;
  let lastRegisterAt = 0;
  let promptIndex = 0;

  window.addEventListener('riskmulate:field-repair', (event) => {
    const progress = event.detail?.progress || readProgress();
    showRegister(progress);

    const fixedCount = Array.isArray(progress.fieldFixedIds)
      ? progress.fieldFixedIds.length
      : 0;
    if (fixedCount >= 2 && fixedCount % 2 === 0) {
      showMonitorPrompt(
        'Controls are in place. Residual risk still needs review against plant objectives.',
        'Do not treat “fixed” as “closed”. Confirm residual likelihood is acceptable and that monitoring continues.',
      );
    }
  });

  window.addEventListener('riskmulate:progress', (event) => {
    const progress = event.detail || readProgress();
    if (progress.complete) {
      showRegister(progress);
      showMonitorPrompt(
        'Scenario window closed. Review residual risk — treatment reduced likelihood, not always impact.',
        'ISO 31000 cycle: monitor effectiveness, record residual, and feed lessons into the next context setting.',
      );
    }
  });

  window.addEventListener('riskmulate:timed-escalation', (event) => {
    const findingId = event.detail?.findingId;
    showMonitorPrompt(
      findingId
        ? `Escalation on ${findingId}: untreated uncertainty is changing residual exposure.`
        : 'Time pressure increased residual exposure on an open pathway.',
      'Monitor & review is continuous — delay after identification can raise likelihood even before impact changes.',
    );
  });

  function tick() {
    const progress = readProgress();
    if (progress.complete) return;

    if (startedAt == null) {
      if (Array.isArray(progress.inspectedFindingIds) && progress.inspectedFindingIds.length) {
        startedAt = performance.now();
      }
      return;
    }

    const elapsed = (performance.now() - startedAt) / 1000;
    const inspected = Array.isArray(progress.inspectedFindingIds)
      ? progress.inspectedFindingIds
      : [];
    const open = inspected.filter((id) => !isFindingFixed(id, progress));

    if (open.length && elapsed > 45 + promptIndex * 90) {
      promptIndex += 1;
      const sample = open[0];
      showMonitorPrompt(
        `Open pathway still under monitor: ${sample}. Inspected ≠ treated.`,
        'ISO 31000 separates identification from treatment. Residual risk stays until a control changes the cause–event chain.',
      );
    }

    const now = performance.now();
    if (open.length && now - lastRegisterAt > 120000) {
      lastRegisterAt = now;
      showRegister(progress);
    }
  }

  const timer = setInterval(tick, 4000);

  const api = {
    installed: true,
    showRegister,
    showMonitorPrompt,
    dispose() {
      clearInterval(timer);
    },
  };
  window.RiskMulateMonitorReview = api;
  return api;
}
