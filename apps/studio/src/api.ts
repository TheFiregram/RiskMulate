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
  createScenario: (workspaceId: string, name: string, description: string) =>
    invoke<Scenario>("create_scenario", {
      input: { workspaceId, name, description, configuration: {} },
    }),
  updateScenario: (scenario: Scenario, name: string, description: string) =>
    invoke<Scenario>("update_scenario", {
      id: scenario.id,
      input: {
        workspaceId: scenario.workspaceId,
        name,
        description,
        configuration: scenario.configuration,
      },
    }),
  deleteScenario: (id: string) => invoke<void>("delete_scenario", { id }),
  startSimulation: (scenarioId: string, seed: number) =>
    invoke<SimulationRun>("start_simulation", { scenarioId, seed }),
};
