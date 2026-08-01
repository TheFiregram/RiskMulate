//! Deterministic, offline simulation runtime for `RiskMulator Studio`.

#![allow(clippy::missing_errors_doc, missing_docs)]

use std::collections::{BTreeMap, VecDeque};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use thiserror::Error;
use uuid::Uuid;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RunStatus {
    Ready,
    Running,
    Paused,
    Completed,
    Failed,
    Archived,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    pub id: String,
    pub participant_id: String,
    pub action_type: String,
    pub target: String,
    #[serde(default)]
    pub parameters: Value,
    pub submitted_tick: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rule {
    pub id: String,
    pub action_type: String,
    #[serde(default)]
    pub required_parameter: Option<String>,
    #[serde(default)]
    pub minimum: Option<f64>,
    #[serde(default)]
    pub penalty: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledEvent {
    pub id: String,
    pub at_tick: u64,
    pub title: String,
    #[serde(default)]
    pub score_delta: i64,
    #[serde(default)]
    pub probability: Option<u8>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub sequence: u64,
    pub tick: u64,
    pub kind: String,
    pub message: String,
    pub score_delta: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub tick: u64,
    pub score: i64,
    pub checksum: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationRun {
    pub id: String,
    pub scenario_id: String,
    pub seed: u64,
    pub tick: u64,
    pub status: RunStatus,
    pub speed: f32,
    pub score: i64,
    pub queued_actions: usize,
    pub audit: Vec<AuditEntry>,
    pub snapshots: Vec<Snapshot>,
}

#[derive(Clone, Debug, Error, PartialEq)]
pub enum SimulationError {
    #[error("simulation run was not found")]
    NotFound,
    #[error("cannot {operation} a run in {status:?} state")]
    InvalidTransition {
        operation: &'static str,
        status: RunStatus,
    },
    #[error("simulation speed must be between 0.25 and 16")]
    InvalidSpeed,
    #[error("action rejected by rule {rule_id}: {reason}")]
    RuleRejected { rule_id: String, reason: String },
}

#[derive(Clone, Default)]
struct Runtime {
    run: Option<SimulationRun>,
    queue: VecDeque<Action>,
    rules: Vec<Rule>,
    events: Vec<ScheduledEvent>,
}

pub trait SimulationEngine {
    fn create_run(&mut self, scenario_id: String, seed: u64) -> SimulationRun;
    fn get_run(&self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn start(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn pause(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn resume(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn step(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
    fn complete(&mut self, id: &str) -> Result<SimulationRun, SimulationError>;
}

#[derive(Default)]
pub struct InMemorySimulationEngine {
    runs: BTreeMap<String, Runtime>,
}

impl InMemorySimulationEngine {
    pub fn configure(
        &mut self,
        id: &str,
        rules: Vec<Rule>,
        events: Vec<ScheduledEvent>,
    ) -> Result<(), SimulationError> {
        let runtime = self.runs.get_mut(id).ok_or(SimulationError::NotFound)?;
        runtime.rules = rules;
        runtime.events = events;
        Ok(())
    }

    pub fn queue_action(
        &mut self,
        id: &str,
        mut action: Action,
    ) -> Result<SimulationRun, SimulationError> {
        let runtime = self.runs.get_mut(id).ok_or(SimulationError::NotFound)?;
        let run = runtime.run.as_mut().ok_or(SimulationError::NotFound)?;
        if run.status != RunStatus::Running && run.status != RunStatus::Paused {
            return Err(SimulationError::InvalidTransition {
                operation: "queue action",
                status: run.status,
            });
        }
        action.submitted_tick = run.tick;
        runtime.queue.push_back(action);
        run.queued_actions = runtime.queue.len();
        Ok(run.clone())
    }

    pub fn set_speed(&mut self, id: &str, speed: f32) -> Result<SimulationRun, SimulationError> {
        if !(0.25..=16.0).contains(&speed) || !speed.is_finite() {
            return Err(SimulationError::InvalidSpeed);
        }
        let run = self.run_mut(id)?;
        run.speed = speed;
        Self::log(run, "control", format!("Speed changed to {speed}x"), 0);
        Ok(run.clone())
    }

    fn run_mut(&mut self, id: &str) -> Result<&mut SimulationRun, SimulationError> {
        self.runs
            .get_mut(id)
            .and_then(|r| r.run.as_mut())
            .ok_or(SimulationError::NotFound)
    }

    fn transition(
        &mut self,
        id: &str,
        operation: &'static str,
        allowed: &[RunStatus],
        target: RunStatus,
    ) -> Result<SimulationRun, SimulationError> {
        let run = self.run_mut(id)?;
        if !allowed.contains(&run.status) {
            return Err(SimulationError::InvalidTransition {
                operation,
                status: run.status,
            });
        }
        run.status = target;
        Self::log(run, "lifecycle", format!("Session {operation}ed"), 0);
        Ok(run.clone())
    }

    fn log(run: &mut SimulationRun, kind: &str, message: String, score_delta: i64) {
        run.audit.push(AuditEntry {
            sequence: run.audit.len() as u64 + 1,
            tick: run.tick,
            kind: kind.into(),
            message,
            score_delta,
        });
    }

    fn checksum(run: &SimulationRun) -> u64 {
        run.seed.rotate_left((run.tick % 64) as u32)
            ^ run.tick.wrapping_mul(0x9E37_79B9)
            ^ u64::from_ne_bytes(run.score.to_ne_bytes())
    }
}

impl SimulationEngine for InMemorySimulationEngine {
    fn create_run(&mut self, scenario_id: String, seed: u64) -> SimulationRun {
        let mut run = SimulationRun {
            id: Uuid::new_v4().to_string(),
            scenario_id,
            seed,
            tick: 0,
            status: RunStatus::Ready,
            speed: 1.0,
            score: 0,
            queued_actions: 0,
            audit: vec![],
            snapshots: vec![],
        };
        Self::log(&mut run, "lifecycle", "Session created".into(), 0);
        self.runs.insert(
            run.id.clone(),
            Runtime {
                run: Some(run.clone()),
                ..Runtime::default()
            },
        );
        run
    }
    fn get_run(&self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.runs
            .get(id)
            .and_then(|r| r.run.clone())
            .ok_or(SimulationError::NotFound)
    }
    fn start(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.transition(id, "start", &[RunStatus::Ready], RunStatus::Running)
    }
    fn pause(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.transition(id, "paus", &[RunStatus::Running], RunStatus::Paused)
    }
    fn resume(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.transition(id, "resum", &[RunStatus::Paused], RunStatus::Running)
    }
    fn complete(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        self.transition(
            id,
            "complet",
            &[RunStatus::Running, RunStatus::Paused],
            RunStatus::Completed,
        )
    }

    fn step(&mut self, id: &str) -> Result<SimulationRun, SimulationError> {
        let runtime = self.runs.get_mut(id).ok_or(SimulationError::NotFound)?;
        let run = runtime.run.as_mut().ok_or(SimulationError::NotFound)?;
        if run.status != RunStatus::Running {
            return Err(SimulationError::InvalidTransition {
                operation: "step",
                status: run.status,
            });
        }
        run.tick = run.tick.saturating_add(1);
        while let Some(action) = runtime.queue.pop_front() {
            let rejection = runtime.rules.iter().find_map(|rule| {
                if rule.action_type != action.action_type {
                    return None;
                }
                let value = rule
                    .required_parameter
                    .as_ref()
                    .and_then(|key| action.parameters.get(key))
                    .and_then(Value::as_f64);
                rule.minimum
                    .filter(|minimum| value.is_none_or(|actual| actual < *minimum))
                    .map(|minimum| (rule, format!("parameter must be at least {minimum}")))
            });
            if let Some((rule, reason)) = rejection {
                run.score -= rule.penalty.abs();
                Self::log(
                    run,
                    "action-rejected",
                    format!("{}: {reason}", action.action_type),
                    -rule.penalty.abs(),
                );
            } else {
                Self::log(
                    run,
                    "action-executed",
                    format!("{} → {}", action.action_type, action.target),
                    0,
                );
            }
        }
        run.queued_actions = 0;
        let due_events: Vec<_> = runtime
            .events
            .iter()
            .filter(|event| event.at_tick == run.tick)
            .cloned()
            .collect();
        for event in due_events {
            let roll = ((run.seed ^ run.tick.wrapping_mul(1_103_515_245) ^ stable_hash(&event.id))
                % 100) as u8;
            if event
                .probability
                .is_none_or(|probability| roll < probability)
            {
                run.score += event.score_delta;
                Self::log(run, "event", event.title.clone(), event.score_delta);
            }
        }
        let snapshot = Snapshot {
            tick: run.tick,
            score: run.score,
            checksum: Self::checksum(run),
        };
        run.snapshots.push(snapshot);
        Ok(run.clone())
    }
}

fn stable_hash(value: &str) -> u64 {
    value
        .bytes()
        .fold(14_695_981_039_346_656_037, |hash, byte| {
            (hash ^ u64::from(byte)).wrapping_mul(1_099_511_628_211)
        })
}

#[must_use]
pub fn default_action(participant_id: &str, action_type: &str, target: &str) -> Action {
    Action {
        id: Uuid::new_v4().to_string(),
        participant_id: participant_id.into(),
        action_type: action_type.into(),
        target: target.into(),
        parameters: json!({}),
        submitted_tick: 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn configured(seed: u64) -> (InMemorySimulationEngine, String) {
        let mut engine = InMemorySimulationEngine::default();
        let run = engine.create_run("scenario-1".into(), seed);
        engine
            .configure(
                &run.id,
                vec![],
                vec![ScheduledEvent {
                    id: "outage".into(),
                    at_tick: 2,
                    title: "Provider outage".into(),
                    score_delta: -5,
                    probability: Some(75),
                }],
            )
            .unwrap();
        engine.start(&run.id).unwrap();
        (engine, run.id)
    }

    #[test]
    fn lifecycle_actions_events_and_snapshots_work() {
        let (mut engine, id) = configured(42);
        engine
            .queue_action(&id, default_action("ada", "notify", "team"))
            .unwrap();
        let tick = engine.step(&id).unwrap();
        assert_eq!(tick.tick, 1);
        assert_eq!(tick.audit.last().unwrap().kind, "action-executed");
        assert_eq!(engine.pause(&id).unwrap().status, RunStatus::Paused);
        assert_eq!(engine.resume(&id).unwrap().status, RunStatus::Running);
        assert_eq!(engine.step(&id).unwrap().snapshots.len(), 2);
        assert_eq!(engine.complete(&id).unwrap().status, RunStatus::Completed);
    }

    #[test]
    fn identical_inputs_are_deterministic() {
        let (mut first, first_id) = configured(99);
        let (mut second, second_id) = configured(99);
        for _ in 0..3 {
            first.step(&first_id).unwrap();
            second.step(&second_id).unwrap();
        }
        let a = first.get_run(&first_id).unwrap();
        let b = second.get_run(&second_id).unwrap();
        assert_eq!(a.score, b.score);
        assert_eq!(a.snapshots, b.snapshots);
    }

    #[test]
    fn rule_rejections_are_audited_and_penalized() {
        let mut engine = InMemorySimulationEngine::default();
        let run = engine.create_run("scenario".into(), 7);
        engine
            .configure(
                &run.id,
                vec![Rule {
                    id: "approval".into(),
                    action_type: "transfer".into(),
                    required_parameter: Some("approvals".into()),
                    minimum: Some(2.0),
                    penalty: 10,
                }],
                vec![],
            )
            .unwrap();
        engine.start(&run.id).unwrap();
        let mut action = default_action("operator", "transfer", "reserve");
        action.parameters = json!({"approvals": 1});
        engine.queue_action(&run.id, action).unwrap();
        let state = engine.step(&run.id).unwrap();
        assert_eq!(state.score, -10);
        assert_eq!(state.audit.last().unwrap().kind, "action-rejected");
    }

    #[test]
    fn invalid_transitions_and_speeds_are_rejected() {
        let mut engine = InMemorySimulationEngine::default();
        let run = engine.create_run("scenario".into(), 1);
        assert!(matches!(
            engine.step(&run.id),
            Err(SimulationError::InvalidTransition { .. })
        ));
        assert_eq!(
            engine.set_speed(&run.id, 100.0),
            Err(SimulationError::InvalidSpeed)
        );
    }
}
