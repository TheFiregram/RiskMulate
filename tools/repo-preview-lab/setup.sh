#!/usr/bin/env bash
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS_DIR="$LAB_DIR/repos"

mkdir -p "$REPOS_DIR"

clone_repo() {
  local url="$1"
  local dir="$2"
  local branch="$3"

  if [ -d "$REPOS_DIR/$dir/.git" ]; then
    echo "[skip] $dir already cloned"
    return
  fi

  echo "[clone] $dir"
  git clone --depth 1 --branch "$branch" "$url" "$REPOS_DIR/$dir"
}

clone_repo "https://github.com/wenxingjun/threejs-factory-demo.git" "threejs-factory-demo" "main"
clone_repo "https://github.com/mohsenheydari/three-fps.git" "three-fps" "master"
clone_repo "https://github.com/KelvinW918/digital-twin-threejs.git" "digital-twin-threejs" "main"
clone_repo "https://github.com/Kyzerer/APEX-HAZARD-VR-TRAINING.git" "APEX-HAZARD-VR-TRAINING" "main"

if [ ! -d "$REPOS_DIR/threejs-factory-demo/node_modules" ]; then
  echo "[install] threejs-factory-demo"
  (cd "$REPOS_DIR/threejs-factory-demo" && npm install)
fi

if [ ! -d "$REPOS_DIR/three-fps/node_modules" ]; then
  echo "[install] three-fps"
  (cd "$REPOS_DIR/three-fps" && npm install --legacy-peer-deps)
fi

echo "Repo Preview Lab setup complete."
