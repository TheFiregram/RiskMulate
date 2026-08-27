#!/usr/bin/env bash
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$LAB_DIR/.logs"
PID_DIR="$LAB_DIR/.pids"
TARGETS=(launcher factory fps twin apex)

mkdir -p "$LOG_DIR" "$PID_DIR"

bash "$LAB_DIR/setup.sh"

for target in "${TARGETS[@]}"; do
  pid_file="$PID_DIR/$target.pid"

  if [ -f "$pid_file" ]; then
    old_pid="$(cat "$pid_file")"
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "[running] $target ($old_pid)"
      continue
    fi
    rm -f "$pid_file"
  fi

  echo "[start] $target"
  nohup bash "$LAB_DIR/preview.sh" "$target" >"$LOG_DIR/$target.log" 2>&1 &
  echo $! > "$pid_file"
done

echo
echo "Launcher: http://localhost:4000"
echo "Factory:  http://localhost:4101"
echo "FPS:      http://localhost:4102"
echo "Twin:     http://localhost:4103"
echo "APEX:     http://localhost:4104"
