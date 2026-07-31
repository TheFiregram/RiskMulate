use std::{
    path::Path,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;
use uuid::Uuid;

use crate::{NewScenario, NewUser, NewWorkspace, Scenario, User, Workspace};

/// Errors returned by the local application store.
#[derive(Debug, Error)]
pub enum StoreError {
    #[error("{field} must not be empty")]
    EmptyField { field: &'static str },
    #[error("scenario configuration must be a JSON object")]
    InvalidConfiguration,
    #[error("record not found")]
    NotFound,
    #[error("the local database lock is unavailable")]
    LockUnavailable,
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("configuration serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Thread-safe access to the on-device SQLite database.
pub struct Database {
    connection: Mutex<Connection>,
}

impl Database {
    /// Opens a database file and applies all local migrations.
    pub fn open(path: impl AsRef<Path>) -> Result<Self, StoreError> {
        let connection = Connection::open(path)?;
        Self::from_connection(connection)
    }

    /// Creates an isolated in-memory database for tests.
    pub fn in_memory() -> Result<Self, StoreError> {
        Self::from_connection(Connection::open_in_memory()?)
    }

    fn from_connection(connection: Connection) -> Result<Self, StoreError> {
        connection.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;
             CREATE TABLE IF NOT EXISTS schema_migrations (
               version INTEGER PRIMARY KEY,
               applied_at INTEGER NOT NULL
             );",
        )?;
        let database = Self {
            connection: Mutex::new(connection),
        };
        database.migrate()?;
        Ok(database)
    }

    fn migrate(&self) -> Result<(), StoreError> {
        let mut connection = self
            .connection
            .lock()
            .map_err(|_| StoreError::LockUnavailable)?;
        let transaction = connection.transaction()?;
        let applied = transaction
            .query_row(
                "SELECT version FROM schema_migrations WHERE version = 1",
                [],
                |row| row.get::<_, i64>(0),
            )
            .optional()?;
        if applied.is_none() {
            transaction.execute_batch(
                "CREATE TABLE users (
                   id TEXT PRIMARY KEY,
                   display_name TEXT NOT NULL CHECK(length(trim(display_name)) > 0),
                   created_at INTEGER NOT NULL,
                   updated_at INTEGER NOT NULL
                 );
                 CREATE TABLE workspaces (
                   id TEXT PRIMARY KEY,
                   owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                   name TEXT NOT NULL CHECK(length(trim(name)) > 0),
                   created_at INTEGER NOT NULL,
                   updated_at INTEGER NOT NULL
                 );
                 CREATE INDEX workspaces_owner_idx ON workspaces(owner_id);
                 CREATE TABLE scenarios (
                   id TEXT PRIMARY KEY,
                   workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                   name TEXT NOT NULL CHECK(length(trim(name)) > 0),
                   description TEXT NOT NULL DEFAULT '',
                   configuration TEXT NOT NULL CHECK(json_valid(configuration)),
                   created_at INTEGER NOT NULL,
                   updated_at INTEGER NOT NULL
                 );
                 CREATE INDEX scenarios_workspace_idx ON scenarios(workspace_id);",
            )?;
            transaction.execute(
                "INSERT INTO schema_migrations(version, applied_at) VALUES (1, ?1)",
                [now()],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    /// Creates a local user profile.
    pub fn create_user(&self, input: NewUser) -> Result<User, StoreError> {
        let display_name = required("display name", input.display_name)?;
        let timestamp = now();
        let user = User {
            id: Uuid::new_v4().to_string(),
            display_name,
            created_at: timestamp,
            updated_at: timestamp,
        };
        self.connection()?.execute(
            "INSERT INTO users(id, display_name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            params![user.id, user.display_name, user.created_at, user.updated_at],
        )?;
        Ok(user)
    }

    /// Lists all local user profiles in stable display order.
    pub fn list_users(&self) -> Result<Vec<User>, StoreError> {
        let connection = self.connection()?;
        let mut statement = connection.prepare(
            "SELECT id, display_name, created_at, updated_at FROM users ORDER BY display_name COLLATE NOCASE, id",
        )?;
        let rows = statement.query_map([], user_from_row)?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// Updates a local user's display name.
    pub fn update_user(&self, id: &str, input: NewUser) -> Result<User, StoreError> {
        let display_name = required("display name", input.display_name)?;
        let updated_at = now();
        changed(self.connection()?.execute(
            "UPDATE users SET display_name = ?1, updated_at = ?2 WHERE id = ?3",
            params![display_name, updated_at, id],
        )?)?;
        self.get_user(id)
    }

    /// Deletes a user and cascades to that user's workspaces and scenarios.
    pub fn delete_user(&self, id: &str) -> Result<(), StoreError> {
        changed(
            self.connection()?
                .execute("DELETE FROM users WHERE id = ?1", [id])?,
        )
    }

    fn get_user(&self, id: &str) -> Result<User, StoreError> {
        self.connection()?
            .query_row(
                "SELECT id, display_name, created_at, updated_at FROM users WHERE id = ?1",
                [id],
                user_from_row,
            )
            .optional()?
            .ok_or(StoreError::NotFound)
    }

    /// Creates a workspace for an existing user.
    pub fn create_workspace(&self, input: NewWorkspace) -> Result<Workspace, StoreError> {
        let name = required("workspace name", input.name)?;
        let timestamp = now();
        let workspace = Workspace {
            id: Uuid::new_v4().to_string(),
            owner_id: input.owner_id,
            name,
            created_at: timestamp,
            updated_at: timestamp,
        };
        self.connection()?.execute(
            "INSERT INTO workspaces(id, owner_id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![workspace.id, workspace.owner_id, workspace.name, workspace.created_at, workspace.updated_at],
        )?;
        Ok(workspace)
    }

    /// Lists a user's workspaces.
    pub fn list_workspaces(&self, owner_id: &str) -> Result<Vec<Workspace>, StoreError> {
        let connection = self.connection()?;
        let mut statement = connection.prepare(
            "SELECT id, owner_id, name, created_at, updated_at FROM workspaces WHERE owner_id = ?1 ORDER BY name COLLATE NOCASE, id",
        )?;
        let rows = statement.query_map([owner_id], workspace_from_row)?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// Renames a workspace.
    pub fn update_workspace(&self, id: &str, name: String) -> Result<Workspace, StoreError> {
        let name = required("workspace name", name)?;
        changed(self.connection()?.execute(
            "UPDATE workspaces SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now(), id],
        )?)?;
        self.get_workspace(id)
    }

    /// Deletes a workspace and its scenarios.
    pub fn delete_workspace(&self, id: &str) -> Result<(), StoreError> {
        changed(
            self.connection()?
                .execute("DELETE FROM workspaces WHERE id = ?1", [id])?,
        )
    }

    fn get_workspace(&self, id: &str) -> Result<Workspace, StoreError> {
        self.connection()?
            .query_row(
                "SELECT id, owner_id, name, created_at, updated_at FROM workspaces WHERE id = ?1",
                [id],
                workspace_from_row,
            )
            .optional()?
            .ok_or(StoreError::NotFound)
    }

    /// Creates a configurable scenario in a workspace.
    pub fn create_scenario(&self, input: NewScenario) -> Result<Scenario, StoreError> {
        let name = required("scenario name", input.name)?;
        validate_configuration(&input.configuration)?;
        let timestamp = now();
        let scenario = Scenario {
            id: Uuid::new_v4().to_string(),
            workspace_id: input.workspace_id,
            name,
            description: input.description.trim().to_owned(),
            configuration: input.configuration,
            created_at: timestamp,
            updated_at: timestamp,
        };
        let configuration = serde_json::to_string(&scenario.configuration)?;
        self.connection()?.execute(
            "INSERT INTO scenarios(id, workspace_id, name, description, configuration, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![scenario.id, scenario.workspace_id, scenario.name, scenario.description, configuration, scenario.created_at, scenario.updated_at],
        )?;
        Ok(scenario)
    }

    /// Lists scenarios in a workspace.
    pub fn list_scenarios(&self, workspace_id: &str) -> Result<Vec<Scenario>, StoreError> {
        let connection = self.connection()?;
        let mut statement = connection.prepare(
            "SELECT id, workspace_id, name, description, configuration, created_at, updated_at FROM scenarios WHERE workspace_id = ?1 ORDER BY name COLLATE NOCASE, id",
        )?;
        let rows = statement.query_map([workspace_id], scenario_from_row)?;
        rows.map(|row| row.map_err(StoreError::from)).collect()
    }

    /// Updates an existing scenario.
    pub fn update_scenario(&self, id: &str, input: NewScenario) -> Result<Scenario, StoreError> {
        let name = required("scenario name", input.name)?;
        validate_configuration(&input.configuration)?;
        let configuration = serde_json::to_string(&input.configuration)?;
        changed(self.connection()?.execute(
            "UPDATE scenarios SET workspace_id = ?1, name = ?2, description = ?3, configuration = ?4, updated_at = ?5 WHERE id = ?6",
            params![input.workspace_id, name, input.description.trim(), configuration, now(), id],
        )?)?;
        self.get_scenario(id)
    }

    /// Deletes a scenario.
    pub fn delete_scenario(&self, id: &str) -> Result<(), StoreError> {
        changed(
            self.connection()?
                .execute("DELETE FROM scenarios WHERE id = ?1", [id])?,
        )
    }

    fn get_scenario(&self, id: &str) -> Result<Scenario, StoreError> {
        self.connection()?.query_row(
            "SELECT id, workspace_id, name, description, configuration, created_at, updated_at FROM scenarios WHERE id = ?1",
            [id], scenario_from_row,
        ).optional()?.ok_or(StoreError::NotFound)
    }

    fn connection(&self) -> Result<std::sync::MutexGuard<'_, Connection>, StoreError> {
        self.connection
            .lock()
            .map_err(|_| StoreError::LockUnavailable)
    }
}

fn required(field: &'static str, value: String) -> Result<String, StoreError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        Err(StoreError::EmptyField { field })
    } else {
        Ok(value)
    }
}

fn validate_configuration(value: &serde_json::Value) -> Result<(), StoreError> {
    if value.is_object() {
        Ok(())
    } else {
        Err(StoreError::InvalidConfiguration)
    }
}

fn changed(count: usize) -> Result<(), StoreError> {
    if count == 0 {
        Err(StoreError::NotFound)
    } else {
        Ok(())
    }
}

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .try_into()
        .unwrap_or(i64::MAX)
}

fn user_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<User> {
    Ok(User {
        id: row.get(0)?,
        display_name: row.get(1)?,
        created_at: row.get(2)?,
        updated_at: row.get(3)?,
    })
}

fn workspace_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Workspace> {
    Ok(Workspace {
        id: row.get(0)?,
        owner_id: row.get(1)?,
        name: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn scenario_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Scenario> {
    let configuration: String = row.get(4)?;
    let configuration = serde_json::from_str(&configuration).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(error))
    })?;
    Ok(Scenario {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        configuration,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;
    use tempfile::tempdir;

    use super::{Database, StoreError};
    use crate::{NewScenario, NewUser, NewWorkspace};

    #[test]
    fn user_workspace_and_scenario_crud_round_trip() {
        let database = Database::in_memory().unwrap();
        let user = database
            .create_user(NewUser {
                display_name: " Ada ".into(),
            })
            .unwrap();
        assert_eq!(database.list_users().unwrap()[0].display_name, "Ada");

        let workspace = database
            .create_workspace(NewWorkspace {
                owner_id: user.id,
                name: "Training".into(),
            })
            .unwrap();
        let scenario = database
            .create_scenario(NewScenario {
                workspace_id: workspace.id.clone(),
                name: "Payment outage".into(),
                description: "Synthetic exercise".into(),
                configuration: json!({ "seed": 42 }),
            })
            .unwrap();
        assert_eq!(
            database.list_scenarios(&workspace.id).unwrap(),
            vec![scenario.clone()]
        );

        let updated = database
            .update_scenario(
                &scenario.id,
                NewScenario {
                    workspace_id: workspace.id.clone(),
                    name: "Updated outage".into(),
                    description: String::new(),
                    configuration: json!({}),
                },
            )
            .unwrap();
        assert_eq!(updated.name, "Updated outage");
        database.delete_scenario(&scenario.id).unwrap();
        assert!(database.list_scenarios(&workspace.id).unwrap().is_empty());
    }

    #[test]
    fn rejects_empty_names_and_non_object_configuration() {
        let database = Database::in_memory().unwrap();
        assert!(matches!(
            database.create_user(NewUser {
                display_name: "  ".into()
            }),
            Err(StoreError::EmptyField { .. })
        ));
        let user = database
            .create_user(NewUser {
                display_name: "User".into(),
            })
            .unwrap();
        let workspace = database
            .create_workspace(NewWorkspace {
                owner_id: user.id,
                name: "Workspace".into(),
            })
            .unwrap();
        assert!(matches!(
            database.create_scenario(NewScenario {
                workspace_id: workspace.id,
                name: "Scenario".into(),
                description: String::new(),
                configuration: json!([]),
            }),
            Err(StoreError::InvalidConfiguration)
        ));
    }

    #[test]
    fn data_persists_after_reopening_the_database() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("studio.sqlite3");
        let database = Database::open(&path).unwrap();
        database
            .create_user(NewUser {
                display_name: "Persistent".into(),
            })
            .unwrap();
        drop(database);
        assert_eq!(Database::open(path).unwrap().list_users().unwrap().len(), 1);
    }

    #[test]
    fn deleting_a_user_cascades_to_owned_records() {
        let database = Database::in_memory().unwrap();
        let user = database
            .create_user(NewUser {
                display_name: "Owner".into(),
            })
            .unwrap();
        let workspace = database
            .create_workspace(NewWorkspace {
                owner_id: user.id.clone(),
                name: "Workspace".into(),
            })
            .unwrap();
        database
            .create_scenario(NewScenario {
                workspace_id: workspace.id.clone(),
                name: "Scenario".into(),
                description: String::new(),
                configuration: json!({}),
            })
            .unwrap();
        database.delete_user(&user.id).unwrap();
        assert!(database.list_workspaces(&user.id).unwrap().is_empty());
        assert!(database.list_scenarios(&workspace.id).unwrap().is_empty());
    }
}
