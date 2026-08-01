import { invoke } from "@tauri-apps/api/core";

export interface User {
  id: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Scenario {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  configuration: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SimulationRun {
  id: string;
  scenarioId: string;
  seed: number;
  tick: number;
  status: "ready" | "running" | "paused" | "completed";
  speed: number;
  score: number;
  queuedActions: number;
  audit: Array<{
    sequence: number;
    tick: number;
    kind: string;
    message: string;
    scoreDelta: number;
  }>;
  snapshots: Array<{ tick: number; score: number; checksum: number }>;
}

export interface SessionRecord {
  workspaceId: string;
  run: SimulationRun;
  updatedAt: number;
}

export const studioApi = {
  listUsers: () => invoke<User[]>("list_users"),
  createUser: (displayName: string) => invoke<User>("create_user", { input: { displayName } }),
  updateUser: (id: string, displayName: string) =>
    invoke<User>("update_user", { id, input: { displayName } }),
  deleteUser: (id: string) => invoke<void>("delete_user", { id }),
  listWorkspaces: (ownerId: string) => invoke<Workspace[]>("list_workspaces", { ownerId }),
  createWorkspace: (ownerId: string, name: string) =>
    invoke<Workspace>("create_workspace", { input: { ownerId, name } }),
  updateWorkspace: (id: string, name: string) =>
    invoke<Workspace>("update_workspace", { id, name }),
  deleteWorkspace: (id: string) => invoke<void>("delete_workspace", { id }),
  listScenarios: (workspaceId: string) => invoke<Scenario[]>("list_scenarios", { workspaceId }),
  createScenario: (
    workspaceId: string,
    name: string,
    description: string,
    configuration: Record<string, unknown>,
  ) =>
    invoke<Scenario>("create_scenario", {
      input: { workspaceId, name, description, configuration },
    }),
  updateScenario: (
    scenario: Scenario,
    name: string,
    description: string,
    configuration: Record<string, unknown>,
  ) =>
    invoke<Scenario>("update_scenario", {
      id: scenario.id,
      input: {
        workspaceId: scenario.workspaceId,
        name,
        description,
        configuration,
      },
    }),
  deleteScenario: (id: string) => invoke<void>("delete_scenario", { id }),
  startSimulation: (workspaceId: string, scenarioId: string, seed: number) =>
    invoke<SimulationRun>("start_simulation", { workspaceId, scenarioId, seed }),
  pauseSimulation: (workspaceId: string, id: string) =>
    invoke<SimulationRun>("pause_simulation", { workspaceId, id }),
  resumeSimulation: (workspaceId: string, id: string) =>
    invoke<SimulationRun>("resume_simulation", { workspaceId, id }),
  stepSimulation: (workspaceId: string, id: string) =>
    invoke<SimulationRun>("step_simulation", { workspaceId, id }),
  completeSimulation: (workspaceId: string, id: string) =>
    invoke<SimulationRun>("complete_simulation", { workspaceId, id }),
  listSessions: (workspaceId: string) => invoke<SessionRecord[]>("list_sessions", { workspaceId }),
};
