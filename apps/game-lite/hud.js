import { scenario } from './scenario.js';

const stageEl = document.querySelector('#stage');
const startButton = document.querySelector('#startButton');
const phaseNameEl = document.querySelector('#phaseName');
const phaseOrdinalEl = document.querySelector('#phaseOrdinal');
const riskCountEl = document.querySelector('#hudRiskCount');
const evidenceCountEl = document.querySelector('#hudEvidenceCount');
const scoreEl = document.querySelector('#hudScore');
const elapsedEl = document.querySelector('#hudElapsed');
const objectiveToast = document.querySelector('#objectiveToast');
const cycleSteps = [...document.querySelectorAll('.cycle-step')];

const saveKey = `riskmulate:${scenario.id}`;
const stageNames = scenario.stages.map((item) => item.name);
let sessionStartedAt = null;
let objectiveTimer = null;

const NAVIGATION_EVENT = 'riskmulate:navigation';
const MAP_HALF_SIZE = 26.65;
const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const COMPASS_SPACING = 44;

function installNavigationHud() {
  if (!document.querySelector('#navigationCompass')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="hud navigation-compass" id="navigationCompass" aria-label="Heading north 000 degrees">
        <div class="compass-tape" id="compassTape" aria-hidden="true"></div>
        <span class="compass-index" aria-hidden="true"></span>
        <strong class="compass-heading" id="compassHeading">N · 000°</strong>
      </div>

      <div class="hud minimap-shell" id="facilityMap" role="img" aria-label="Facility map with player and objective markers">
        <div class="minimap-head"><span>FACILITY MAP</span><b>N</b></div>
        <div class="minimap-grid">
          <i class="map-building map-building-left"></i>
          <i class="map-building map-building-right"></i>
          <i class="map-tank map-tank-one"></i>
          <i class="map-tank map-tank-two"></i>
          <i class="map-tank map-tank-three"></i>
          <i class="map-pipeline map-pipeline-main"></i>
          <i class="map-objective" title="Current field objective"></i>
          <i class="map-player" id="mapPlayer" aria-hidden="true"></i>
        </div>
      </div>
    `);
  }

  return {
    compass: document.querySelector('#navigationCompass'),
    tape: document.querySelector('#compassTape'),
    heading: document.querySelector('#compassHeading'),
    map: document.querySelector('#facilityMap'),
    player: document.querySelector('#mapPlayer'),
  };
}

const navigationHud = installNavigationHud();

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function directionForHeading(heading) {
  return COMPASS_POINTS[Math.round(heading / 45) % COMPASS_POINTS.length];
}

function renderCompass(heading) {
  if (!navigationHud.tape || !navigationHud.heading || !navigationHud.compass) return;

  const sector = heading / 45;
  const baseSector = Math.floor(sector);
  const fraction = sector - baseSector;
  const markers = [];

  for (let offset = -4; offset <= 4; offset += 1) {
    const pointIndex = ((baseSector + offset) % COMPASS_POINTS.length + COMPASS_POINTS.length)
      % COMPASS_POINTS.length;
    const point = COMPASS_POINTS[pointIndex];
    const x = (offset - fraction) * COMPASS_SPACING;
    const markerClass = point.length === 1 ? 'cardinal' : 'ordinal';
    markers.push(`<span class="${markerClass}" style="left:calc(50% + ${x.toFixed(2)}px)">${point}</span>`);
  }

  const roundedHeading = Math.round(heading) % 360;
  const direction = directionForHeading(heading);
  navigationHud.tape.innerHTML = markers.join('');
  navigationHud.heading.textContent = `${direction} · ${String(roundedHeading).padStart(3, '0')}°`;
  navigationHud.compass.setAttribute('aria-label', `Heading ${direction} ${roundedHeading} degrees`);
}

function updateMapPlayer(x, z, heading) {
  if (!navigationHud.player) return;
  const mapSize = MAP_HALF_SIZE * 2;
  const left = Math.min(100, Math.max(0, ((x + MAP_HALF_SIZE) / mapSize) * 100));
  const top = Math.min(100, Math.max(0, ((z + MAP_HALF_SIZE) / mapSize) * 100));
  navigationHud.player.style.left = `${left.toFixed(2)}%`;
  navigationHud.player.style.top = `${top.toFixed(2)}%`;
  navigationHud.player.style.transform = `translate(-50%, -50%) rotate(${heading.toFixed(2)}deg)`;
}

function updateNavigation({ x = 0, z = 15, yaw = 0 } = {}) {
  const heading = normalizeDegrees((-yaw * 180) / Math.PI);
  renderCompass(heading);
  updateMapPlayer(x, z, heading);
}

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(saveKey) || 'null') || {
      found: false,
      stage: -1,
      score: 0,
      complete: false,
    };
  } catch {
    return { found: false, stage: -1, score: 0, complete: false };
  }
}

function updateCycle(activeStage, progress) {
  const activeIndex = stageNames.indexOf(activeStage);
  cycleSteps.forEach((step) => {
    const index = stageNames.indexOf(step.dataset.stage);
    step.classList.toggle('active', !progress.complete && index === activeIndex);
    step.classList.toggle('done', progress.complete || (activeIndex >= 0 && index < activeIndex));
  });
}

function updateHud() {
  const progress = readProgress();
  const runtimeStage = stageEl?.textContent?.trim() || 'Inspection';
  const activeStage = progress.complete ? 'Monitor & Review' : runtimeStage;
  const stageIndex = stageNames.indexOf(activeStage);

  if (progress.complete) {
    phaseOrdinalEl.textContent = '06 / 06';
    phaseNameEl.textContent = 'Review complete';
  } else if (stageIndex >= 0) {
    phaseOrdinalEl.textContent = `${String(stageIndex + 1).padStart(2, '0')} / ${String(stageNames.length).padStart(2, '0')}`;
    phaseNameEl.textContent = activeStage;
  } else {
    phaseOrdinalEl.textContent = 'FIELD';
    phaseNameEl.textContent = 'Inspection';
  }

  const riskTotal = scenario.risks?.length || 6;
  const evidenceTotal = scenario.evidenceTotal || 16;
  const discovered = Array.isArray(progress.discoveredRiskIds)
    ? progress.discoveredRiskIds.length
    : (progress.found ? 1 : 0);
  const evidence = Array.isArray(progress.evidenceIds)
    ? progress.evidenceIds.length
    : (progress.found ? 1 : 0);
  if (riskCountEl) riskCountEl.textContent = `${discovered}/${riskTotal}`;
  if (evidenceCountEl) evidenceCountEl.textContent = `${evidence}/${evidenceTotal}`;
  if (scoreEl) scoreEl.textContent = String(progress.score || 0);
  updateCycle(activeStage, progress);
}

function updateElapsed() {
  if (!sessionStartedAt) {
    elapsedEl.textContent = '00:00';
    return;
  }
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  elapsedEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function showObjectiveBrief() {
  clearTimeout(objectiveTimer);
  objectiveToast.classList.add('show');
  objectiveTimer = setTimeout(() => objectiveToast.classList.remove('show'), 4800);
}

stageEl && new MutationObserver(updateHud).observe(stageEl, {
  childList: true,
  characterData: true,
  subtree: true,
});

startButton?.addEventListener('click', () => {
  sessionStartedAt = Date.now();
  updateElapsed();
  showObjectiveBrief();
});

window.addEventListener('riskmulate:progress', () => updateHud());
window.addEventListener('storage', (event) => {
  if (event.key === saveKey) updateHud();
});

window.addEventListener(NAVIGATION_EVENT, (event) => updateNavigation(event.detail));

updateHud();
updateElapsed();
updateNavigation();
setInterval(updateElapsed, 1000);
