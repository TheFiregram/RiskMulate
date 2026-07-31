//! Deterministic lifecycle skeleton for RiskMulator simulations.

#![allow(clippy::missing_errors_doc)]

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

/// The lifecycle state of a simulation run.
#[allow(missing_docs)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RunStatus {
    Ready,
    Running,
    Paused,
    Completed,
}

/// Immutable identity and current lifecycle state for one run.
#[allow(missing_docs)]
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationRun {
    pub id: String,
    pub scenario_id: String,
    pub seed: u64,
    pub tick: u64,
    pub status: RunStatus,
}

/// Failures produced by invalid lifecycle operations.
#[allow(missing_docs)]
#[derive(Clone, Debug, Error, PartialEq, Eq)]
pub enum SimulationError {
    #[error("simulation run was not found")]
    NotFound,
    #[error("cannot {operation} a run in {status:?} state")]
    InvalidTransition {
        operation: &'static str,
        status: RunStatus,
    },
}

/// Contract for deterministic simulation lifecycle management.
#[allow(missing_docs)]
pub trait SimulationEngine {
    fn create_run(&mut self, scenario_id: String, seed: u64) -> SimulationRun;
    fn get_run(&self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn start(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn pause(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn resume(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn step(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn complete(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
}

/// In-memory lifecycle implementation. It executes no scenario business rules.
#[derive(Default)]
pub struct InMemorySimulationEngine {
    runs: BTreeMap<String, SimulationRun>,
}

impl InMemorySimulationEngine {
    fn transition(
        &mut self,
        id: &str,
        operation: &'static str,
        allowed: &[RunStatus],
        target: RunStatus,
    ) -> Result<SimulationRun, SimulationError> {
        let run = self.runs.get_mut(id).ok_or(SimulationError::NotFound)?;
        if !allowed.contains(&run.status) {
            return Err(SimulationError::InvalidTransition {
                operation,
                status: run.status,
            });
        }
        run.status = target;
        Ok(run.clone())
    }
}

impl SimulationEngine for InMemorySimulationEngine {
    fn create_run(&mut self, scenario_id: String, seed: u64) -> SimulationRun {
        let run = SimulationRun {
            id: Uuid::new_v4().to_string(),
            scenario_id,
            seed,
            tick: 0,
            status: RunStatus::Ready,
        };
        self.runs.insert(run.id.clone(), run.clone());
        run
    }

    fn get_run(&self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.runs.get(id).cloned().ok_or(SimulationError::NotFound)
    }

    fn start(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.transition(id, "start", &[RunStatus::Ready], RunStatus::Running)
    }

    fn pause(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.transition(id, "pause", &[RunStatus::Running], RunStatus::Paused)
    }

    fn resume(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.transition(id, "resume", &[RunStatus::Paused], RunStatus::Running)
    }

    fn step(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        let run = self.runs.get_mut(id).ok_or(SimulationError::NotFound)?;
        if run.status != RunStatus::Running {
            return Err(SimulationError::InvalidTransition {
                operation: "step",
                status: run.status,
            });
        }
        run.tick = run.tick.saturating_add(1);
        Ok(run.clone())
    }

    fn complete(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.transition(
            id,
            "complete",
            &[RunStatus::Running, RunStatus::Paused],
            RunStatus::Completed,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::{InMemorySimulationEngine, RunStatus, SimulationEngine, SimulationError};

    #[test]
    fn lifecycle_advances_without_executing_scenario_rules() {
        let mut engine = InMemorySimulationEngine::default();
        let run = engine.create_run("scenario-1".into(), 42);
        assert_eq!(run.status, RunStatus::Ready);
        assert_eq!(engine.start(&run.id).unwrap().status, RunStatus::Running);
        assert_eq!(engine.step(&run.id).unwrap().tick, 1);
        assert_eq!(engine.pause(&run.id).unwrap().status, RunStatus::Paused);
        assert_eq!(engine.resume(&run.id).unwrap().status, RunStatus::Running);
        assert_eq!(
            engine.complete(&run.id).unwrap().status,
            RunStatus::Completed
        );
    }

    #[test]
    fn invalid_transitions_are_rejected() {
        let mut engine = InMemorySimulationEngine::default();
        let run = engine.create_run("scenario-1".into(), 7);
        assert_eq!(
            engine.step(&run.id),
            Err(SimulationError::InvalidTransition {
                operation: "step",
                status: RunStatus::Ready
            })
        );
    }
}
