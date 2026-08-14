let installed = false;

export function installIndustrialAudio() {
  if (installed) return;
  installed = true;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  let context = null;
  let master = null;
  let started = false;
  let clankTimer = null;
  let tabletWasOpen = false;

  function createNoiseBuffer(audioContext, seconds = 2) {
    const length = Math.max(1, Math.floor(audioContext.sampleRate * seconds));
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function connectWind(audioContext, destination) {
    const source = audioContext.createBufferSource();
    source.buffer = createNoiseBuffer(audioContext, 2.4);
    source.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    filter.Q.value = 0.55;

    const gain = audioContext.createGain();
    gain.gain.value = 0.018;

    source.connect(filter).connect(gain).connect(destination);
    source.start();
  }

  function connectHum(audioContext, destination, frequency, gainValue, detune = 0) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;

    const gain = audioContext.createGain();
    gain.gain.value = gainValue;

    oscillator.connect(gain).connect(destination);
    oscillator.start();
    return oscillator;
  }

  function connectMachineryPulse(audioContext, destination) {
    const carrier = audioContext.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = 38;

    const carrierGain = audioContext.createGain();
    carrierGain.gain.value = 0.0045;

    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.22;

    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 0.0025;

    lfo.connect(lfoGain).connect(carrierGain.gain);
    carrier.connect(carrierGain).connect(destination);
    carrier.start();
    lfo.start();
  }

  function playTone({ startFrequency, endFrequency, duration, gainValue, type = 'sine' }) {
    if (!context || !master || context.state !== 'running') return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playInteractionTick() {
    playTone({
      startFrequency: 720,
      endFrequency: 430,
      duration: 0.055,
      gainValue: 0.018,
      type: 'triangle',
    });
  }

  function playMetalClank() {
    if (document.hidden) return;
    playTone({
      startFrequency: 310 + Math.random() * 90,
      endFrequency: 115 + Math.random() * 35,
      duration: 0.14 + Math.random() * 0.08,
      gainValue: 0.008 + Math.random() * 0.006,
      type: 'square',
    });
  }

  function scheduleClank() {
    clearTimeout(clankTimer);
    clankTimer = setTimeout(() => {
      if (started) playMetalClank();
      scheduleClank();
    }, 9000 + Math.random() * 15000);
  }

  async function startAudio() {
    if (!context) {
      context = new AudioContextClass({ latencyHint: 'interactive' });
      master = context.createGain();
      master.gain.value = 0.72;
      master.connect(context.destination);

      connectWind(context, master);
      connectHum(context, master, 55, 0.0095, -3);
      connectHum(context, master, 110, 0.0035, 2);
      connectHum(context, master, 165, 0.0015, -1);
      connectMachineryPulse(context, master);
    }

    if (context.state !== 'running') await context.resume();
    started = true;
    scheduleClank();

    if (window.RiskMulateAudio) {
      window.RiskMulateAudio.started = true;
      window.RiskMulateAudio.state = context.state;
    }
  }

  function setMutedByVisibility(hidden) {
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(hidden ? 0.0001 : 0.72, now, 0.08);
  }

  const startButton = document.querySelector('#startButton');
  startButton?.addEventListener('pointerdown', () => { void startAudio(); }, { once: true });
  startButton?.addEventListener('click', () => { void startAudio(); }, { once: true });

  addEventListener('keydown', (event) => {
    if (!started) return;
    if (event.code === 'KeyE' || event.code === 'Enter') playInteractionTick();
  });

  document.querySelector('#mobileInteract')?.addEventListener('click', () => {
    if (started) playInteractionTick();
  });

  document.querySelector('#mobileTablet')?.addEventListener('click', () => {
    if (started) playInteractionTick();
  });

  const tablet = document.querySelector('#tablet');
  if (tablet) {
    tabletWasOpen = tablet.classList.contains('open');
    const observer = new MutationObserver(() => {
      const open = tablet.classList.contains('open');
      if (open !== tabletWasOpen && started) playInteractionTick();
      tabletWasOpen = open;
    });
    observer.observe(tablet, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('visibilitychange', () => {
    setMutedByVisibility(document.hidden);
  });

  window.RiskMulateAudio = {
    started: false,
    state: 'idle',
    start: startAudio,
    playInteractionTick,
    get contextState() {
      return context?.state || 'idle';
    },
  };
}
