/**
 * Scenario debrief panel (ISO 31000 Monitor & Review)
 * ---------------------------------------------------
 * Surfaces scenario.debrief lessons when the continuity window completes.
 * Educational purpose: treatment does not erase residual risk; students must
 * record residual exposure and feed lessons into the next context setting.
 */

import { scenario } from './scenario.js';

function injectStyle() {
  if (document.getElementById('scenario-debrief-style')) return;
  const style = document.createElement('style');
  style.id = 'scenario-debrief-style';
  style.textContent = `
    .scenario-debrief {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -48%);
      z-index: 60;
      width: min(440px, calc(100vw - 28px));
      max-height: min(72vh, 560px);
      overflow: auto;
      padding: 16px 16px 14px;
      border-radius: 14px;
      background: rgba(8, 14, 18, 0.94);
      border: 1px solid rgba(140, 180, 200, 0.35);
      color: #d8e6ec;
      font: 12px/1.45 system-ui, -apple-system, sans-serif;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      backdrop-filter: blur(10px);
    }
    .scenario-debrief.show {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, -50%);
    }
    .scenario-debrief h2 {
      margin: 0 0 8px;
      font-size: 14px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #9fd0e0;
    }
    .scenario-debrief .headline {
      margin: 0 0 10px;
      color: #eef5f8;
      font-size: 13px;
      font-weight: 600;
    }
    .scenario-debrief ul {
      margin: 0 0 12px;
      padding-left: 18px;
      color: #c5d4db;
    }
    .scenario-debrief li { margin-bottom: 6px; }
    .scenario-debrief .counterfactual {
      margin: 0 0 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.08);
      color: #e8c27a;
      font-size: 12px;
    }
    .scenario-debrief button {
      display: block;
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(120, 170, 190, 0.35);
      background: rgba(30, 50, 60, 0.85);
      color: #e8f2f6;
      font: 600 12px system-ui;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function showScenarioDebrief() {
  const data = scenario.debrief;
  if (!data) return;
  injectStyle();
  let el = document.querySelector('.scenario-debrief');
  if (!el) {
    el = document.createElement('div');
    el.className = 'scenario-debrief';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Scenario debrief');
    document.body.appendChild(el);
  }
  const lessons = Array.isArray(data.lessons)
    ? data.lessons.map((item) => `<li>${item}</li>`).join('')
    : '';
  el.innerHTML = `
    <h2>Monitor &amp; review · debrief</h2>
    <p class="headline">${data.headline || ''}</p>
    <ul>${lessons}</ul>
    ${data.counterfactual ? `<p class="counterfactual">${data.counterfactual}</p>` : ''}
    <button type="button" data-close-debrief>Continue monitoring residual risk</button>
  `;
  el.classList.add('show');
  el.querySelector('[data-close-debrief]')?.addEventListener('click', () => {
    el.classList.remove('show');
  }, { once: true });
}

export function installScenarioDebrief() {
  if (window.RiskMulateScenarioDebrief?.installed) {
    return window.RiskMulateScenarioDebrief;
  }
  injectStyle();
  window.addEventListener('riskmulate:progress', (event) => {
    if (event.detail?.complete) showScenarioDebrief();
  });
  const api = { installed: true, showScenarioDebrief };
  window.RiskMulateScenarioDebrief = api;
  return api;
}
