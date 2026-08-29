# RiskMulate Rebuild — Game Direction

## Product premise

A factory-management simulation inspired by the readable growth loop of settlement builders such as Whiteout Survival, with an original industrial visual identity and an ISO 31000-aligned risk system.

The player builds a factory from a small site, operates it, receives imperfect evidence, identifies uncertainty that can affect objectives, chooses treatments, and watches consequences propagate through production, safety and finance.

## Pillars

1. Factory growth is the game. Risk management changes how safely and reliably that growth happens.
2. Decisions have visible operational consequences.
3. The factory communicates information through state, animation, alerts and reports rather than constant quizzes.
4. Every registered risk connects cause, uncertain event and consequence to an objective.
5. Performance stays lean enough for normal laptops and modern phones.

## First scenario — First Production Run

Objective: deliver 1,000 finished units within 10 simulated days and keep safety above 70.

Starting state: site office, ₦15m, 8 workers, 420 feedstock, no production equipment.

Required chain: Generator → Raw Material Tank → Pump Station → Process Hall → Warehouse.

Early uncertainty:
- Single-source electrical supply
- Pump degradation under sustained load
- Limited feedstock buffer

The player chooses when to spend on capacity, maintenance and controls. Controls reduce exposure but compete with the same cash used for growth.

## Risk learning loop

Context/objective → observe evidence → identify → analyze likelihood/impact → evaluate exposure → choose treatment → observe residual exposure → monitor outcomes → debrief.

The interface uses a 5×5 likelihood-impact matrix. Risk entries follow cause → event → consequence. Treatments can lower likelihood, impact, or both. Inherent and residual states remain visible for comparison.

## Near-term build sequence

### Slice A — foundation (current)
Construction, resources, production, workers, equipment condition, risk register, treatments, matrix and debrief.

### Slice B — stronger settlement loop
Building upgrades, worker housing/welfare, recruitment, task assignment, material deliveries, roads and construction crews.

### Slice C — richer risk simulation
Risk criteria, inspections, near misses, maintenance schedules, fire/safety systems, supplier risk, opportunity decisions and cascading events.

### Slice D — presentation pass
Original illustrated loading screen, more building silhouettes, weather/time-of-day states, sound cues, contextual animation and tutorial flow.

### Slice E — lecturer layer
Scenario authoring data, assessment exports, replay/audit trail and learning reports.

## Technical direction

The initial renderer is dependency-free Canvas 2D using an isometric projection and procedural assets. This keeps startup, memory use and mobile load low. Simulation ticks are separate from rendered frames. A later WebGL layer is optional rather than foundational.

## Explicit exclusions for the rebuild

No first-person mode, giant open world, combat, heavy physics engine, monorepo, Tauri desktop wrapper or mandatory backend.
