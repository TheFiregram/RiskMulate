#!/usr/bin/env bash
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$LAB_DIR/.pids"
TARGETS=(launcher factory fps twin apex)

for target in "${TARGETS[@]}"; do
  pid_file="$PID_DIR/$target.pid"

  if [ -f "$pid_file" ]; then
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      printf "%-8s running  pid=%s\n" "$target" "$pid"
      continue
    fi
  fi

  printf "%-8s stopped\n" "$target"
done
