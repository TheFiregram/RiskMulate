# RiskMulate: Factory Shift

Factory Shift is a browser-based operational risk simulation. The player enters an industrial filtration yard, inspects a degraded process pump, reconciles conflicting evidence, and commits to one of three operating responses. The first decision then unlocks a connected factory-operations view where the player manages a downstream filtration constraint.

The scenario teaches risk reasoning through action rather than a quiz. Its debrief presents the cause, event, consequence, treatment, and residual risk created by the player’s decision.

## Playable scenario

**Incident:** P-204 is approaching its vibration trip limit shortly before a filtration restart.

The player must:

1. Accept the work order on the field tablet.
2. Inspect four marked components in the 3D yard.
3. Compare sensor data, equipment condition, an operator report, and the standby path.
4. Choose whether to monitor P-204, transfer flow to P-205, or stop for repair.
5. For the recommended transfer, start P-205 at its field console, prove 4.9 bar on the physical meter, and turn the P-204 isolation wheel.
6. Observe the plant response and review the risk debrief.
7. Continue into the live plant network and see how the pump response changes throughput, buffer, quality, and open risk.
8. Follow the in-world beacon to the physical F-201 filter skid.
9. Inspect its pressure panel, turbidity analyzer, wash controller, and clearwell indicator.
10. Select a response on the tablet, then operate the matching valve or backwash control in the yard.
11. Watch the equipment react and trace the result through the full production system.
12. Review one combined shift score covering both decisions, all eight observations, and the remaining factory risk.

The P-204 scene uses the optimized Meshy engine body as a hero asset, paired with a live gauge, warning lamp, inspection sensors, standby start console, and isolation valve. The recommended response is now a three-control field procedure instead of an automatic animation.

The second decision asks the player to push through the loaded filter, open a bypass, or perform a controlled backwash. Each path has a separate physical control and visible equipment reaction. The choice then changes the factory KPIs and exposes a constraint-to-consequence chain.

## Controls

| Action | Laptop | Phone or tablet |
| --- | --- | --- |
| Walk forward or back | `W` / `S` or `↑` / `↓` | Left virtual stick |
| Turn | `←` / `→` or mouse | Drag the right side of the scene |
| Strafe | `A` / `D` | Left virtual stick |
| Aim up or down | `Page Up` / `Page Down` or mouse | Drag the right side of the scene |
| Sprint | Hold `Shift` while moving | Push the virtual stick fully |
| Inspect or operate | `E` | Context action button |
| Field tablet | `T` | Tablet button |
| Navigate tablet or menus | Arrow keys or `Tab` | Tap |
| Select focused command | `Enter` or `Space` | Tap |
| Close tablet or menu | `Escape` | Close button |
| Presenter guide | `P` | On-screen guide button |
| Presenter shortcut | `F9` | Not shown |

Choose **Start guided tutorial** on the title screen for a ten-step field coach. It introduces one action at a time, shows the exact controls for that step, and advances after the player completes the task. The coach never completes evidence, decisions, or equipment controls for the player. Press `P` to hide or reopen task help. `F9` remains a private presenter shortcut for jumping between completed proof points.

## Risk learning model

- Risk is framed as uncertainty affecting the restart, safety, containment, and continuity objectives.
- Evidence is separated from interpretation.
- The fault is expressed through a cause, event, and consequence chain.
- Every response states what it protects, what exposure remains, and its control condition.
- The debrief compares safety, continuity, and asset-protection outcomes.
- Residual risk is reported after treatment.
- The factory layer shows how a local control changes downstream capacity, quality, inventory, and risk.

## Technology

- Next.js 16 and React 19
- Three.js with GLTF models, PBR materials, HDR environment lighting, post-processing, collisions, and raycast interaction
- Static-first deployment on Vercel
- Local scenario state with no required backend service

## Local development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Release checks:

```bash
npm run lint
npm run build:vercel
npm run build:standalone
npm test
```

## Deployment

For the RiskMulate monorepo, set the Vercel Root Directory to `apps/factory-shift`. The project build command is defined in `vercel.json`. `npm run build:standalone` produces a static CDN release in `standalone/` for the public submission shell.

## Asset credits

Meshy-generated props and CC0 environment resources from Poly Haven and ambientCG are listed in [ASSET_CREDITS.md](ASSET_CREDITS.md).
