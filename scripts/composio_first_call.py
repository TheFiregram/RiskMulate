#!/usr/bin/env python3
"""
Minimal Composio Platform first-call for RiskMulate.

- Loads COMPOSIO_API_KEY from .env.local (never commit secrets)
- Creates a user-scoped session with the GitHub toolkit
- Ensures a GitHub connection (prints Connect Link if needed)
- Executes a safe read-only tool discovered at runtime

Usage:
  python3 scripts/composio_first_call.py
  python3 scripts/composio_first_call.py --wait-seconds 180
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env_local() -> None:
    path = ROOT / ".env.local"
    if not path.exists():
        print("Missing .env.local — copy .env.example and set COMPOSIO_API_KEY.", file=sys.stderr)
        sys.exit(1)
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def main() -> int:
    parser = argparse.ArgumentParser(description="Composio first real tool call (GitHub)")
    parser.add_argument("--wait-seconds", type=int, default=120, help="Seconds to wait for OAuth")
    parser.add_argument("--user-id", default=None, help="Stable app user id for the session")
    args = parser.parse_args()

    load_env_local()
    if not os.environ.get("COMPOSIO_API_KEY"):
        print("COMPOSIO_API_KEY is not set.", file=sys.stderr)
        return 1

    from composio import Composio

    user_id = args.user_id or os.environ.get("COMPOSIO_USER_ID") or "riskmulate-demo-user"
    composio = Composio()
    session = composio.create(user_id=user_id, toolkits=["github"])
    print(f"session_id={session.session_id}")
    print(f"user_id={user_id}")

    # Discover tools at runtime — do not hardcode unless confirmed by search.
    search = session.search(query="list repositories for the authenticated GitHub user")
    payload = search.model_dump() if hasattr(search, "model_dump") else {}
    results = payload.get("results") or []
    primary = []
    if results:
        primary = results[0].get("primary_tool_slugs") or []
    tool_slug = primary[0] if primary else "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER"
    print(f"discovered_tool={tool_slug}")

    try:
        result = session.execute(
            tool_slug=tool_slug,
            arguments={"per_page": 5, "page": 1, "sort": "updated"},
        )
    except Exception as first_err:
        # No active connection — issue Connect Link and wait.
        auth = session.authorize("github")
        print("\n=== Connect GitHub (required once) ===")
        print(f"Open this URL, approve access, then return here:\n{auth.redirect_url}\n")
        print(f"connection_id={auth.id} status={auth.status}")
        print(f"Waiting up to {args.wait_seconds}s for ACTIVE connection…")
        try:
            auth.wait_for_connection(timeout=args.wait_seconds)
        except Exception as wait_err:
            print(f"Still not connected: {wait_err}", file=sys.stderr)
            print("Re-run this script after completing the Connect Link.", file=sys.stderr)
            print(f"first_error={first_err}")
            return 2

        result = session.execute(
            tool_slug=tool_slug,
            arguments={"per_page": 5, "page": 1, "sort": "updated"},
        )

    data = result.model_dump() if hasattr(result, "model_dump") else result
    # Prefer a compact summary; full dump for debugging.
    print("\n=== Tool result (summary) ===")
    print(json.dumps(data, indent=2, default=str)[:4000])

    # Extract log / request id if present
    for key in ("log_id", "request_id", "id"):
        if isinstance(data, dict) and data.get(key):
            print(f"{key}={data[key]}")
            break

    print("\nOK — first real Composio tool call completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
