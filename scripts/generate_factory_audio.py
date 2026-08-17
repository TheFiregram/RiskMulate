#!/usr/bin/env python3
"""
Generate RiskMulate factory VO clips via Composio → ElevenLabs TTS.

Requires:
  - COMPOSIO_API_KEY in .env.local
  - Active ElevenLabs connection for user riskmulate-demo-user
    (script prints a Connect Link if missing)

Writes:
  apps/game-lite/assets/audio/guidance/{id}.mp3

Usage:
  python3 scripts/generate_factory_audio.py
  python3 scripts/generate_factory_audio.py --wait-seconds 180
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "apps" / "game-lite" / "assets" / "audio" / "guidance"

# Keep in sync with apps/game-lite/focus-guidance.js GUIDANCE[].voice
CLIPS = [
    ("spawn-orient", "Site identity is behind you. Turn around, read the RiskMulate board, then enter the plant."),
    ("enter-plant", "Walk toward the orange process piping. Look for wet staining at flange joints."),
    ("inspect-flange", "Inspect the leaking flange. Record evidence, then apply the field fix at the equipment."),
    ("broaden-walkdown", "Continue the walkdown. Check supports, electrical entry, the drain route, access path, and temporary connections."),
    ("temp-hose-prompt", "Temporary transfer hoses introduce disconnect risk under pressure. Inspect and secure them before startup."),
    ("rear-egress-prompt", "Check the rear gate egress. One cleared path is not enough if a second route remains blocked."),
    ("multipath-access-followup", "Plant-side access is controlled, but residual emergency access risk stays open while rear egress is blocked."),
    ("monitor-review", "Untreated findings escalate over time. Monitor and review is continuous."),
    ("start-brief", "Welcome to Northbridge Filtration Works. Maintain safe output through the disruption window. Inspect before you fix. Six risk pathways are live."),
]

# Rachel — common ElevenLabs stock voice
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
DEFAULT_MODEL = "eleven_multilingual_v2"


def load_env_local() -> None:
    path = ROOT / ".env.local"
    if not path.exists():
        print("Missing .env.local with COMPOSIO_API_KEY", file=sys.stderr)
        sys.exit(1)
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def extract_audio_url(payload: dict) -> str | None:
    """Pull presigned S3/file URL from Composio ElevenLabs response shapes."""
    if not isinstance(payload, dict):
        return None
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    file_info = data.get("file") if isinstance(data, dict) else None
    if isinstance(file_info, dict):
        for key in ("s3url", "s3_url", "url", "file_url"):
            if file_info.get(key):
                return str(file_info[key])
    for key in ("s3url", "url", "audio_url", "file_url"):
        if isinstance(data, dict) and data.get(key):
            return str(data[key])
    results = payload.get("results") or data.get("results") if isinstance(data, dict) else None
    if isinstance(results, list) and results:
        return extract_audio_url(results[0] if isinstance(results[0], dict) else {})
    return None


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "RiskMulate-audio-gen/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wait-seconds", type=int, default=120)
    parser.add_argument("--voice-id", default=DEFAULT_VOICE_ID)
    parser.add_argument("--model-id", default=DEFAULT_MODEL)
    parser.add_argument("--only", nargs="*", help="Optional subset of clip ids")
    args = parser.parse_args()

    load_env_local()
    from composio import Composio

    user_id = os.environ.get("COMPOSIO_USER_ID") or "riskmulate-demo-user"
    composio = Composio()
    session = composio.create(user_id=user_id, toolkits=["elevenlabs"])
    print(f"session_id={session.session_id}")

    try:
        session.execute(
            tool_slug="ELEVENLABS_TEXT_TO_SPEECH",
            arguments={
                "voice_id": args.voice_id,
                "model_id": args.model_id,
                "text": "RiskMulate audio probe.",
                "output_format": "mp3_44100_128",
            },
        )
        print("elevenlabs_connection=ACTIVE")
    except Exception as err:
        auth = session.authorize("elevenlabs")
        print("\n=== Connect ElevenLabs (required once) ===")
        print(auth.redirect_url)
        print(f"connection_id={auth.id}")
        print(f"Waiting up to {args.wait_seconds}s…")
        try:
            auth.wait_for_connection(timeout=args.wait_seconds)
        except Exception as wait_err:
            print(f"Not connected: {wait_err}", file=sys.stderr)
            print(f"probe_error={err}")
            return 2
        print("elevenlabs_connection=ACTIVE")

    clips = CLIPS
    if args.only:
        allow = set(args.only)
        clips = [c for c in CLIPS if c[0] in allow]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    for clip_id, text in clips:
        dest = OUT_DIR / f"{clip_id}.mp3"
        print(f"generating {clip_id}…")
        try:
            result = session.execute(
                tool_slug="ELEVENLABS_TEXT_TO_SPEECH",
                arguments={
                    "voice_id": args.voice_id,
                    "model_id": args.model_id,
                    "text": text,
                    "output_format": "mp3_44100_128",
                },
            )
            payload = result.model_dump() if hasattr(result, "model_dump") else {}
            url = extract_audio_url(payload)
            if not url:
                print(f"  no url in response for {clip_id}")
                print(json.dumps(payload, indent=2, default=str)[:800])
                continue
            download(url, dest)
            size = dest.stat().st_size
            print(f"  wrote {dest.relative_to(ROOT)} ({size} bytes)")
            ok += 1
        except Exception as e:
            print(f"  FAIL {clip_id}: {type(e).__name__}: {e}")

    print(f"\ndone {ok}/{len(clips)} clips → {OUT_DIR.relative_to(ROOT)}")
    return 0 if ok == len(clips) else 1


if __name__ == "__main__":
    raise SystemExit(main())
