#!/usr/bin/env bash
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS_DIR="$LAB_DIR/repos"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "Usage: $0 {launcher|factory|fps|twin|apex}"
  exit 1
fi

case "$TARGET" in
  launcher)
    exec npx --yes http-server "$LAB_DIR/launcher" -a 0.0.0.0 -p 4000 -c-1
    ;;
  factory)
    cd "$REPOS_DIR/threejs-factory-demo"
    exec npm run dev -- --port 4101 --strictPort
    ;;
  fps)
    cd "$REPOS_DIR/three-fps"
    exec npm start -- --host 0.0.0.0 --port 4102
    ;;
  twin)
    exec npx --yes http-server "$REPOS_DIR/digital-twin-threejs" -a 0.0.0.0 -p 4103 -c-1
    ;;
  apex)
    exec npx --yes http-server "$REPOS_DIR/APEX-HAZARD-VR-TRAINING" -a 0.0.0.0 -p 4104 -c-1
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: $0 {launcher|factory|fps|twin|apex}"
    exit 1
    ;;
esac
