use std::sync::Mutex;

use riskmulator_simulation_engine::{InMemorySimulationEngine, SimulationEngine, SimulationRun};
use riskmulator_studio_core::{
    Database, NewScenario, NewUser, NewWorkspace, Scenario, User, Workspace,
};
use tauri::{Manager, State};

struct AppState {
    database: Database,
    simulations: Mutex<InMemorySimulationEngine>,
}

type CommandResult<T> = Result<T, String>;

fn message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[tauri::command]
fn create_user(state: State<'_, AppState>, input: NewUser) -> CommandResult<User> {
    state.database.create_user(input).map_err(message)
}

#[tauri::command]
fn list_users(state: State<'_, AppState>) -> CommandResult<Vec<User>> {
    state.database.list_users().map_err(message)
}

#[tauri::command]
fn update_user(state: State<'_, AppState>, id: String, input: NewUser) -> CommandResult<User> {
    state.database.update_user(&id, input).map_err(message)
}

#[tauri::command]
fn delete_user(state: State<'_, AppState>, id: String) -> CommandResult<()> {
    state.database.delete_user(&id).map_err(message)
}

#[tauri::command]
fn create_workspace(state: State<'_, AppState>, input: NewWorkspace) -> CommandResult<Workspace> {
    state.database.create_workspace(input).map_err(message)
}

#[tauri::command]
fn list_workspaces(state: State<'_, AppState>, owner_id: String) -> CommandResult<Vec<Workspace>> {
    state.database.list_workspaces(&owner_id).map_err(message)
}

#[tauri::command]
fn update_workspace(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> CommandResult<Workspace> {
    state.database.update_workspace(&id, name).map_err(message)
}

#[tauri::command]
fn delete_workspace(state: State<'_, AppState>, id: String) -> CommandResult<()> {
    state.database.delete_workspace(&id).map_err(message)
}

#[tauri::command]
fn create_scenario(state: State<'_, AppState>, input: NewScenario) -> CommandResult<Scenario> {
    state.database.create_scenario(input).map_err(message)
}

#[tauri::command]
fn list_scenarios(
    state: State<'_, AppState>,
    workspace_id: String,
) -> CommandResult<Vec<Scenario>> {
    state
        .database
        .list_scenarios(&workspace_id)
        .map_err(message)
}

#[tauri::command]
fn update_scenario(
    state: State<'_, AppState>,
    id: String,
    input: NewScenario,
) -> CommandResult<Scenario> {
    state.database.update_scenario(&id, input).map_err(message)
}

#[tauri::command]
fn delete_scenario(state: State<'_, AppState>, id: String) -> CommandResult<()> {
    state.database.delete_scenario(&id).map_err(message)
}

#[tauri::command]
fn start_simulation(
    state: State<'_, AppState>,
    scenario_id: String,
    seed: u64,
) -> CommandResult<SimulationRun> {
    let mut engine = state
        .simulations
        .lock()
        .map_err(|_| "simulation engine lock is unavailable".to_owned())?;
    let run = engine.create_run(scenario_id, seed);
    engine.start(&run.id).map_err(message)
}

/// Starts the desktop composition root.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir().map_err(message)?;
            std::fs::create_dir_all(&data_dir).map_err(message)?;
            let database =
                Database::open(data_dir.join("riskmulator-studio.sqlite3")).map_err(message)?;
            app.manage(AppState {
                database,
                simulations: Mutex::new(InMemorySimulationEngine::default()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_user,
            list_users,
            update_user,
            delete_user,
            create_workspace,
            list_workspaces,
            update_workspace,
            delete_workspace,
            create_scenario,
            list_scenarios,
            update_scenario,
            delete_scenario,
            start_simulation,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run RiskMulator Studio");
}
