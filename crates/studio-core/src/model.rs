use serde::{Deserialize, Serialize};

/// A local Studio user profile. Milestone 1 profiles do not contain credentials.
#[allow(missing_docs)]
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub display_name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Input used to create or update a user.
#[allow(missing_docs)]
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewUser {
    pub display_name: String,
}

/// An isolated container owned by a local user.
#[allow(missing_docs)]
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub owner_id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Input used to create or update a workspace.
#[allow(missing_docs)]
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewWorkspace {
    pub owner_id: String,
    pub name: String,
}

/// A configurable scenario stored entirely on the local device.
#[allow(missing_docs)]
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scenario {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: String,
    pub configuration: serde_json::Value,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Input used to create or update a scenario.
#[allow(missing_docs)]
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewScenario {
    pub workspace_id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_configuration")]
    pub configuration: serde_json::Value,
}

fn default_configuration() -> serde_json::Value {
    serde_json::json!({})
}
