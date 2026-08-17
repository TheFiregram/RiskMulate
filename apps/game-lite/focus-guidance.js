/**
 * Focus guidance (captions + optional voice)
 * ----------------------------------------
 * Educational purpose: direct attention to the right plant zone and process step
 * without a non-diegetic tutorial wall. Captions stay short; speech is optional
 * and muted by default unless the player enables it.
 */

const GUIDANCE = Object.freeze([
  {
    id: 'spawn-orient',
    afterMs: 2200,
    caption: 'Site identity is behind you. Turn around, read the RiskMulate board, then enter the plant.',
    voice: 'Site identity is behind you. Turn around, read the RiskMulate board, then enter the plant.',
  },
  {
    id: 'enter-plant',
    afterMs: 12000,
    caption: 'Walk toward the orange process piping. Look for wet staining at flange joints — that is material evidence, not noise.',
    voice: 'Walk toward the orange process piping. Look for wet staining at flange joints.',
    unlessInspected: ['flange-leak'],
  },
  {
    id: 'inspect-flange',
    afterMs: 26000,
    caption: 'Inspect the leaking flange. Record evidence, return to the equipment, then FIX in the field — not on the tablet alone.',
    voice: 'Inspect the leaking flange. Record evidence, then apply the field fix at the equipment.',
    unlessInspected: ['flange-leak'],
  },
  {
    id: 'broaden-walkdown',
    afterMs: 48000,
    caption: 'Continue the walkdown: supports, electrical entry, drain route, access paths, rear egress, and temporary hose connections.',
    voice: 'Continue the walkdown. Check supports, electrical entry, the drain route, access path, and temporary connections.',
    requireInspected: ['flange-leak'],
  },
  {
    id: 'temp-hose-prompt',
    afterMs: 70000,
    caption: 'Temporary transfer hoses introduce disconnect risk under pressure. Inspect and secure them before startup.',
    voice: 'Temporary transfer hoses introduce disconnect risk under pressure. Inspect and secure them before startup.',
    unlessInspected: ['temp-hose'],
    requireInspected: ['flange-leak'],
  },
  {
    id: 'rear-egress-prompt',
    afterMs: 82000,
    caption: 'Turn toward the rear gate. A second egress obstruction can keep residual emergency-access risk open even after the plant-side route is cleared.',
    voice: 'Check the rear gate egress. One cleared path is not enough if a second route remains blocked.',
    unlessInspected: ['rear-egress'],
    requireInspected: ['flange-leak'],
  },
  {
    id: 'multipath-access-followup',
    afterMs: 0,
    caption: 'Plant-side access is controlled, but residual emergency-access risk stays open while rear egress is blocked. Clear both initiating locations.',
    voice: 'Plant-side access is controlled, but residual emergency access risk stays open while rear egress is blocked.',
    requireFieldFixed: ['access-obstruction'],
    unlessFieldFixed: ['rear-egress'],
  },
  {
    id: 'monitor-review',
    afterMs: 95000,
    caption: 'Untreated findings escalate over time. Monitor and review is continuous — residual risk changes when you treat, not when you close a checklist.',
    voice: 'Untreated findings escalate over time. Monitor and review is continuous.',
  },
]);

function ensureUi() {
  let root = document.querySelector('#focusGuidance');
  if (root) return root;

  const style = document.createElement('style');
  style.textContent = `
    #focusGuidance {
      position: fixed;
      left: 50%;
      bottom: max(5.5rem, env(safe-area-inset-bottom, 0px) + 4.5rem);
      transform: translateX(-50%);
      z-index: 28;
      width: min(92vw, 34rem);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.35s ease;
    }
    #focusGuidance.show { opacity: 1; }
    #focusGuidance .fg-card {
      background: linear-gradient(180deg, rgba(8,16,22,0.88), rgba(8,16,22,0.72));
      border: 1px solid rgba(201,163,41,0.35);
      border-radius: 12px;
      padding: 0.7rem 0.9rem 0.75rem;
      box-shadow: 0 10px 28px rgba(0,0,0,0.35);
      backdrop-filter: blur(8px);
    }
    #focusGuidance .fg-kicker {
      display: block;
      font-size: 0.65rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #d9a34e;
      margin-bottom: 0.25rem;
      font-weight: 700;
    }
    #focusGuidance .fg-text {
      margin: 0;
      color: #e8eef1;
      font-size: 0.92rem;
      line-height: 1.35;
      font-weight: 500;
    }
    #focusGuidanceMute {
      pointer-events: auto;
      position: absolute;
      top: 0.45rem;
      right: 0.55rem;
      border: 0;
      background: transparent;
      color: #8ea3ad;
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  root = document.createElement('div');
  root.id = 'focusGuidance';
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = `
    <div class="fg-card">
      <button type="button" id="focusGuidanceMute" title="Toggle voice guidance">VO OFF</button>
      <span class="fg-kicker">FIELD FOCUS</span>
      <p class="fg-text" id="focusGuidanceText"></p>
    </div>
  `;
  document.body.appendChild(root);

  const muteBtn = root.querySelector('#focusGuidanceMute');
  muteBtn.addEventListener('click', () => {
    const api = window.RiskMulateFocusGuidance;
    if (!api) return;
    api.setVoiceEnabled(!api.voiceEnabled);
    muteBtn.textContent = api.voiceEnabled ? 'VO ON' : 'VO OFF';
  });

  return root;
}

function readProgress() {
  try {
    const raw = localStorage.getItem('riskmulate:continuity-under-disruption-v1');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function speak(text) {
  if (!window.RiskMulateFocusGuidance?.voiceEnabled) return;
  if (typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 1;
    utter.volume = 0.85;
    speechSynthesis.speak(utter);
  } catch {
    /* voice optional */
  }
}

function showCaption(text, voiceText) {
  const root = ensureUi();
  const el = root.querySelector('#focusGuidanceText');
  if (el) el.textContent = text;
  root.classList.add('show');
  speak(voiceText || text);
  clearTimeout(showCaption._hide);
  showCaption._hide = setTimeout(() => {
    root.classList.remove('show');
  }, 9000);
}

export function installFocusGuidance() {
  if (window.RiskMulateFocusGuidance?.installed) return window.RiskMulateFocusGuidance;

  const fired = new Set();
  let startedAt = 0;
  let raf = 0;
  let voiceEnabled = false;

  const api = {
    installed: true,
    voiceEnabled,
    setVoiceEnabled(value) {
      voiceEnabled = Boolean(value);
      api.voiceEnabled = voiceEnabled;
      try {
        localStorage.setItem('riskmulate:focus-vo', voiceEnabled ? '1' : '0');
      } catch {}
    },
  };

  try {
    voiceEnabled = localStorage.getItem('riskmulate:focus-vo') === '1';
    api.voiceEnabled = voiceEnabled;
  } catch {}

  window.RiskMulateFocusGuidance = api;
  ensureUi();
  const muteBtn = document.querySelector('#focusGuidanceMute');
  if (muteBtn) muteBtn.textContent = voiceEnabled ? 'VO ON' : 'VO OFF';

  function tick() {
    if (!startedAt) {
      const start = document.querySelector('#start');
      if (start && start.style.display === 'none') {
        startedAt = performance.now();
      }
      raf = requestAnimationFrame(tick);
      return;
    }

    const elapsed = performance.now() - startedAt;
    const progress = readProgress();
    const inspected = new Set(progress.inspectedFindingIds || []);
    const fieldFixed = new Set(progress.fieldFixedIds || []);

    for (const step of GUIDANCE) {
      if (fired.has(step.id)) continue;
      if (elapsed < step.afterMs) continue;
      if (step.unlessInspected?.some((id) => inspected.has(id))) {
        fired.add(step.id);
        continue;
      }
      if (step.unlessFieldFixed?.some((id) => fieldFixed.has(id))) {
        fired.add(step.id);
        continue;
      }
      if (step.requireInspected && !step.requireInspected.every((id) => inspected.has(id))) {
        continue;
      }
      if (step.requireFieldFixed && !step.requireFieldFixed.every((id) => fieldFixed.has(id))) {
        continue;
      }
      fired.add(step.id);
      showCaption(step.caption, step.voice);
    }

    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
  return api;
}
