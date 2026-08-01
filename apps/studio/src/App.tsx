import { type FormEvent, useCallback, useEffect, useState } from "react";
import { studioApi, type Scenario, type SimulationRun, type User, type Workspace } from "./api";

interface NameFormProps {
  label: string;
  value: string;
  submitLabel: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel?: () => void;
}

function NameForm({ label, value, submitLabel, onChange, onSubmit, onCancel }: NameFormProps) {
  return (
    <form className="inline-form" onSubmit={onSubmit}>
      <label>
        <span>{label}</span>
        <input
          required
          maxLength={120}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button type="submit">{submitLabel}</button>
      {onCancel && (
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [userName, setUserName] = useState("");
  const [editingUser, setEditingUser] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [editingWorkspace, setEditingWorkspace] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [scenarioConfig, setScenarioConfig] = useState(
    '{\n  "durationTicks": 30,\n  "objectives": []\n}',
  );
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [error, setError] = useState("");

  const execute = useCallback(async (action: () => Promise<void>) => {
    setError("");
    try {
      await action();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const result = await studioApi.listUsers();
    setUsers(result);
    setSelectedUser((current) =>
      result.some(({ id }) => id === current) ? current : (result[0]?.id ?? ""),
    );
  }, []);

  const loadWorkspaces = useCallback(async () => {
    if (!selectedUser) {
      setWorkspaces([]);
      setSelectedWorkspace("");
      return;
    }
    const result = await studioApi.listWorkspaces(selectedUser);
    setWorkspaces(result);
    setSelectedWorkspace((current) =>
      result.some(({ id }) => id === current) ? current : (result[0]?.id ?? ""),
    );
  }, [selectedUser]);

  const loadScenarios = useCallback(async () => {
    if (!selectedWorkspace) {
      setScenarios([]);
      return;
    }
    setScenarios(await studioApi.listScenarios(selectedWorkspace));
  }, [selectedWorkspace]);

  useEffect(() => {
    void execute(loadUsers);
  }, [execute, loadUsers]);
  useEffect(() => {
    void execute(loadWorkspaces);
  }, [execute, loadWorkspaces]);
  useEffect(() => {
    void execute(loadScenarios);
  }, [execute, loadScenarios]);

  const saveUser = (event: FormEvent) => {
    event.preventDefault();
    void execute(async () => {
      if (editingUser) await studioApi.updateUser(editingUser, userName);
      else await studioApi.createUser(userName);
      setUserName("");
      setEditingUser("");
      await loadUsers();
    });
  };

  const saveWorkspace = (event: FormEvent) => {
    event.preventDefault();
    void execute(async () => {
      if (editingWorkspace) await studioApi.updateWorkspace(editingWorkspace, workspaceName);
      else await studioApi.createWorkspace(selectedUser, workspaceName);
      setWorkspaceName("");
      setEditingWorkspace("");
      await loadWorkspaces();
    });
  };

  const saveScenario = (event: FormEvent) => {
    event.preventDefault();
    void execute(async () => {
      const configuration = JSON.parse(scenarioConfig) as Record<string, unknown>;
      if (editingScenario)
        await studioApi.updateScenario(
          editingScenario,
          scenarioName,
          scenarioDescription,
          configuration,
        );
      else
        await studioApi.createScenario(
          selectedWorkspace,
          scenarioName,
          scenarioDescription,
          configuration,
        );
      setScenarioName("");
      setScenarioDescription("");
      setEditingScenario(null);
      setScenarioConfig('{\n  "durationTicks": 30,\n  "objectives": []\n}');
      await loadScenarios();
    });
  };

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">Offline simulation workspace</p>
        <h1>RiskMulator Studio</h1>
        <p>Local milestone workspace. Data never leaves this device.</p>
        <div className="safety">
          <strong>Sandbox mode</strong>
          <span>Network disabled · deterministic execution · local audit trail</span>
        </div>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <section aria-labelledby="users-heading">
        <div className="section-heading">
          <div>
            <span>01</span>
            <h2 id="users-heading">Users</h2>
          </div>
        </div>
        <NameForm
          label="Display name"
          value={userName}
          onChange={setUserName}
          onSubmit={saveUser}
          submitLabel={editingUser ? "Save user" : "Add user"}
          onCancel={
            editingUser
              ? () => {
                  setEditingUser("");
                  setUserName("");
                }
              : undefined
          }
        />
        <div className="cards">
          {users.map((user) => (
            <article className={selectedUser === user.id ? "selected" : ""} key={user.id}>
              <button className="card-title" onClick={() => setSelectedUser(user.id)}>
                {user.displayName}
              </button>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setEditingUser(user.id);
                    setUserName(user.displayName);
                  }}
                >
                  Edit
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    void execute(async () => {
                      await studioApi.deleteUser(user.id);
                      await loadUsers();
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!users.length && <p className="empty">Add a local user profile to begin.</p>}
        </div>
      </section>

      <section aria-labelledby="workspaces-heading">
        <div className="section-heading">
          <div>
            <span>02</span>
            <h2 id="workspaces-heading">Workspaces</h2>
          </div>
        </div>
        {selectedUser ? (
          <>
            <NameForm
              label="Workspace name"
              value={workspaceName}
              onChange={setWorkspaceName}
              onSubmit={saveWorkspace}
              submitLabel={editingWorkspace ? "Save workspace" : "Create workspace"}
              onCancel={
                editingWorkspace
                  ? () => {
                      setEditingWorkspace("");
                      setWorkspaceName("");
                    }
                  : undefined
              }
            />
            <div className="cards">
              {workspaces.map((workspace) => (
                <article
                  className={selectedWorkspace === workspace.id ? "selected" : ""}
                  key={workspace.id}
                >
                  <button className="card-title" onClick={() => setSelectedWorkspace(workspace.id)}>
                    {workspace.name}
                  </button>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditingWorkspace(workspace.id);
                        setWorkspaceName(workspace.name);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        void execute(async () => {
                          await studioApi.deleteWorkspace(workspace.id);
                          await loadWorkspaces();
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="empty">Select a user first.</p>
        )}
      </section>

      <section aria-labelledby="scenarios-heading">
        <div className="section-heading">
          <div>
            <span>03</span>
            <h2 id="scenarios-heading">Scenarios</h2>
          </div>
        </div>
        {selectedWorkspace ? (
          <>
            <form className="scenario-form" onSubmit={saveScenario}>
              <label>
                <span>Name</span>
                <input
                  required
                  maxLength={120}
                  value={scenarioName}
                  onChange={(event) => setScenarioName(event.target.value)}
                />
              </label>
              <label className="config-field">
                <span>Scenario configuration (JSON)</span>
                <textarea
                  value={scenarioConfig}
                  onChange={(event) => setScenarioConfig(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  maxLength={2000}
                  value={scenarioDescription}
                  onChange={(event) => setScenarioDescription(event.target.value)}
                />
              </label>
              <button type="submit">{editingScenario ? "Save scenario" : "Create scenario"}</button>
              {editingScenario && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingScenario(null);
                    setScenarioName("");
                    setScenarioDescription("");
                  }}
                >
                  Cancel
                </button>
              )}
            </form>
            <div className="cards">
              {scenarios.map((scenario) => (
                <article key={scenario.id}>
                  <h3>{scenario.name}</h3>
                  <p>{scenario.description || "No description"}</p>
                  <div className="actions">
                    <button
                      onClick={() =>
                        void execute(async () =>
                          setRun(
                            await studioApi.startSimulation(
                              selectedWorkspace,
                              scenario.id,
                              Date.now() % 1_000_000,
                            ),
                          ),
                        )
                      }
                    >
                      Start simulation
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditingScenario(scenario);
                        setScenarioName(scenario.name);
                        setScenarioDescription(scenario.description);
                        setScenarioConfig(JSON.stringify(scenario.configuration, null, 2));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        void execute(async () => {
                          await studioApi.deleteScenario(scenario.id);
                          await loadScenarios();
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="empty">Select a workspace first.</p>
        )}
      </section>
      {run && (
        <aside className="run" aria-live="polite">
          <div>
            <strong>Live simulation</strong>
            <button className="close" aria-label="Close session panel" onClick={() => setRun(null)}>
              ×
            </button>
          </div>
          <span>
            Seed {run.seed} · Tick {run.tick} · Score {run.score} · {run.status}
          </span>
          <div className="run-controls">
            {run.status === "running" && (
              <button
                onClick={() =>
                  void execute(async () =>
                    setRun(await studioApi.pauseSimulation(selectedWorkspace, run.id)),
                  )
                }
              >
                Pause
              </button>
            )}
            {run.status === "paused" && (
              <button
                onClick={() =>
                  void execute(async () =>
                    setRun(await studioApi.resumeSimulation(selectedWorkspace, run.id)),
                  )
                }
              >
                Resume
              </button>
            )}
            {run.status === "running" && (
              <button
                className="secondary"
                onClick={() =>
                  void execute(async () =>
                    setRun(await studioApi.stepSimulation(selectedWorkspace, run.id)),
                  )
                }
              >
                Advance tick
              </button>
            )}
            {(run.status === "running" || run.status === "paused") && (
              <button
                className="danger"
                onClick={() =>
                  void execute(async () =>
                    setRun(await studioApi.completeSimulation(selectedWorkspace, run.id)),
                  )
                }
              >
                End session
              </button>
            )}
          </div>
          <ol className="audit">
            {run.audit
              .slice(-4)
              .reverse()
              .map((entry) => (
                <li key={entry.sequence}>
                  <span>T{entry.tick}</span>
                  {entry.message}
                </li>
              ))}
          </ol>
        </aside>
      )}
    </main>
  );
}
