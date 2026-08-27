#!/usr/bin/env bash
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$LAB_DIR/.pids"

if [ ! -d "$PID_DIR" ]; then
  echo "No preview processes recorded."
  exit 0
fi

for pid_file in "$PID_DIR"/*.pid; do
  [ -e "$pid_file" ] || continue
  pid="$(cat "$pid_file")"
  name="$(basename "$pid_file" .pid)"

  if kill -0 "$pid" 2>/dev/null; then
    echo "[stop] $name ($pid)"
    kill "$pid" 2>/dev/null || true
  fi

  rm -f "$pid_file"
done
