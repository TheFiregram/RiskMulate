# Simulation Engine

The first Simulation Engine implementation is a deterministic lifecycle skeleton. It retains a scenario identifier and seed, validates run-state transitions, and counts ticks. It does not interpret scenarios or implement simulation business rules.

`SimulationEngine` is the public interface. `InMemorySimulationEngine` exists to exercise and integrate the lifecycle safely before persistence and domain execution are specified.
