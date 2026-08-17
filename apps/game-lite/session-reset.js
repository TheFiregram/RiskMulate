/**
 * Classroom session reset
 * ----------------------
 * Shared lab devices need a one-tap way to clear local progress so the next
 * student starts the full ISO 31000 cycle from context, not a prior residual state.
 */

function clearRiskMulateStorage() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('riskmulate:')) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
  return keys.length;
}

function alignAuthorityWindow() {
  try {
    const strongs = document.querySelectorAll('.start-mission-grid strong');
    for (const el of strongs) {
      if (/\d+-minute response window/i.test(el.textContent || '')) {
        const minutes = window.RiskMulateScenario?.treatmentBudgetMinutes || 23;
        el.textContent = `${minutes}-minute response window`;
      }
    }
  } catch {
    /* ignore */
  }
}

function injectStyle() {
  if (document.querySelector('#session-reset-style')) return;
  const style = document.createElement('style');
  style.id = 'session-reset-style';
  style.textContent = `
    .session-reset-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.65rem;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      border: 1px solid rgba(180, 200, 210, 0.28);
      background: rgba(8, 14, 18, 0.55);
      color: #9eb0ba;
      font: 600 0.68rem/1 system-ui, -apple-system, sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .session-reset-btn:hover,
    .session-reset-btn:focus-visible {
      color: #e8f0f4;
      border-color: rgba(201, 163, 41, 0.45);
      outline: none;
    }
  `;
  document.head.appendChild(style);
}

export function installSessionReset() {
  if (window.RiskMulateSessionReset?.installed) {
    return window.RiskMulateSessionReset;
  }

  injectStyle();
  alignAuthorityWindow();

  const startCard = document.querySelector('#start .start-card');
  if (startCard && !document.querySelector('#sessionResetBtn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'sessionResetBtn';
    btn.className = 'session-reset-btn';
    btn.title = 'Clear local progress for a new class session';
    btn.textContent = 'New class session';
    const small = startCard.querySelector('.small');
    if (small) small.insertAdjacentElement('afterend', btn);
    else startCard.appendChild(btn);

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const cleared = clearRiskMulateStorage();
      btn.textContent = cleared ? 'Session cleared — reloading…' : 'No saved session — reloading…';
      window.setTimeout(() => window.location.reload(), 450);
    });
  }

  const api = {
    installed: true,
    clear: clearRiskMulateStorage,
  };
  window.RiskMulateSessionReset = api;
  return api;
}
