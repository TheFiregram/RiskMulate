//! Local persistence and application services for RiskMulator Studio.

#![allow(clippy::missing_errors_doc)]

mod database;
mod model;

pub use database::{Database, StoreError};
pub use model::{NewScenario, NewUser, NewWorkspace, Scenario, User, Workspace};
