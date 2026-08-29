# RiskMulate — Factory Risk Simulation

RiskMulate is being rebuilt as a lightweight isometric factory-management simulation. The player starts with a small industrial site, grows production capacity, manages workers and machinery, and protects business objectives through risk-management decisions.

This branch intentionally replaces the previous monorepo implementation with a small dependency-free browser app.

## Current vertical slice

- Original isometric Canvas 2D renderer with no external art/runtime dependencies
- Pan, zoom and click/tap selection
- Central site office and seven construction pads
- Generator, raw-material tank, pump station, process hall, warehouse, maintenance bay and worker clinic
- Visible construction progress
- Moving worker figures and generator smoke
- Cash, raw material, finished goods, workforce, energy and safety resources
- 10-day production contract
- Equipment condition/degradation
- Risk alerts tied to factory conditions
- ISO 31000-style cause → event → consequence entries
- Interactive 5×5 likelihood-impact matrix
- Inherent and residual risk values
- Risk treatments with cost and simulation effects
- Scenario success/failure debrief
- Responsive desktop/mobile interface

## Run locally

The app has no runtime dependencies.

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

Run JavaScript syntax checks:

```bash
npm run check
```

## Architecture

- `src/world.js` — isometric renderer, camera, procedural factory assets and worker animation
- `src/simulation.js` — time, production, resources, degradation, incidents and risk state
- `src/game.js` — orchestration and player actions
- `src/ui.js` — HUD, build menu, inspector, alerts, risk register, matrix and debrief
- `src/data.js` — buildings, risks, treatments and build-pad data

## Performance position

This first version uses Canvas 2D rather than a full 3D scene. It is a deliberate reset after the previous build became too heavy. The isometric presentation gives the management-game feel we want with a very small runtime cost. WebGL can be introduced selectively later where it provides a clear visual benefit.

## Educational position

Risk is represented as the effect of uncertainty on objectives. Scenario risks use a cause → event → consequence chain, distinguish inherent and residual exposure, and make treatments affect likelihood and/or impact. Numerical risk scores are paired with scenario criteria rather than treated as universal acceptance rules.
