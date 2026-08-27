# Repo Preview Lab

A small workspace for opening the public reference projects beside RiskMulate without mixing their dependencies into the main app.

## Included projects

| Alias | Repository | Port |
| --- | --- | ---: |
| `factory` | `wenxingjun/threejs-factory-demo` | 4101 |
| `fps` | `mohsenheydari/three-fps` | 4102 |
| `twin` | `KelvinW918/digital-twin-threejs` | 4103 |
| `apex` | `Kyzerer/APEX-HAZARD-VR-TRAINING` | 4104 |
| `launcher` | Local preview launcher | 4000 |

## Codespaces

When creating a Codespace from this branch, select the **RiskMulate Repo Preview Lab** dev-container configuration.

The container clones the reference repositories and installs the npm dependencies used by the two package-based projects. On container start, the launcher and all four previews are started on their assigned ports.

Open port `4000` to see the launcher.

## Local use

Requirements: Git, Node.js 20+ and npm.

```bash
bash tools/repo-preview-lab/setup.sh
bash tools/repo-preview-lab/start-all.sh
```

Then open:

```text
http://localhost:4000
```

Stop everything with:

```bash
bash tools/repo-preview-lab/stop-all.sh
```

Check process state with:

```bash
bash tools/repo-preview-lab/status.sh
```

Run one project by itself with:

```bash
bash tools/repo-preview-lab/preview.sh factory
bash tools/repo-preview-lab/preview.sh fps
bash tools/repo-preview-lab/preview.sh twin
bash tools/repo-preview-lab/preview.sh apex
```

The cloned repositories, logs and PID files stay inside this tool directory and are ignored by Git. The RiskMulate application itself is not modified by the preview processes.
