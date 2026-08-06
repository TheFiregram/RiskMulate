# RiskMulate Game Lite

A dependency-free browser slice for low-spec devices and static hosting.

## Run

Open `index.html` directly, or deploy `apps/game-lite` as a static site on Vercel.

## Current learning loop

1. Establish objectives and context.
2. Identify a risk using a cause → event → consequence statement.
3. Analyze inherent likelihood and impact.
4. Evaluate against the acceptance threshold.
5. Select a treatment package.
6. Record residual risk and monitoring actions.
7. Receive immediate feedback and a scenario debrief.

## Architecture direction

The game is divided into small scenario slices. Each slice can later receive a Three.js scene, glTF assets, audio, NPCs, and inspection animations without changing the educational state machine. Placeholder visuals are kept lightweight so gameplay development is not blocked by access to high-end hardware.

## Next implementation targets

- Move scenario data into JSON.
- Add save and resume through local storage.
- Add tablet-style risk register and rationale editors.
- Add NPC consultations with contradictory evidence.
- Add two event seeds and counterfactual debriefs.
- Replace the CSS industrial scene with a performance-budgeted Three.js scene.
