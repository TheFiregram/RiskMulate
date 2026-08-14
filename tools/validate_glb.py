"""Small dependency-free validator for generated RiskMulate GLB assets."""

from __future__ import annotations

import json
import pathlib
import struct
import sys

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def validate(path_text: str) -> None:
    path = pathlib.Path(path_text)
    data = path.read_bytes()
    if len(data) < 20:
        raise ValueError(f"{path}: file is too small to be a GLB")

    magic, version, declared_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF":
        raise ValueError(f"{path}: invalid GLB magic {magic!r}")
    if version != 2:
        raise ValueError(f"{path}: expected GLB v2, got v{version}")
    if declared_length != len(data):
        raise ValueError(
            f"{path}: header length {declared_length} does not match file length {len(data)}"
        )

    offset = 12
    chunks: list[tuple[int, bytes]] = []
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError(f"{path}: truncated chunk header")
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        end = offset + chunk_length
        if end > len(data):
            raise ValueError(f"{path}: truncated chunk payload")
        chunks.append((chunk_type, data[offset:end]))
        offset = end

    if not chunks or chunks[0][0] != JSON_CHUNK:
        raise ValueError(f"{path}: first chunk is not glTF JSON")

    document = json.loads(chunks[0][1].decode("utf-8").rstrip(" \t\r\n\x00"))
    if document.get("asset", {}).get("version") != "2.0":
        raise ValueError(f"{path}: JSON asset.version is not 2.0")
    if not document.get("scenes"):
        raise ValueError(f"{path}: no scenes")
    if not document.get("nodes"):
        raise ValueError(f"{path}: no nodes")
    if not document.get("meshes"):
        raise ValueError(f"{path}: no meshes")
    if len(chunks) > 1 and chunks[1][0] != BIN_CHUNK:
        raise ValueError(f"{path}: second chunk is not binary data")

    print(
        f"GLB OK: {path} | {len(data) / 1024:.1f} KiB | "
        f"{len(document.get('nodes', []))} nodes | {len(document.get('meshes', []))} meshes"
    )


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python3 tools/validate_glb.py FILE.glb [FILE2.glb ...]")
    for file_name in sys.argv[1:]:
        validate(file_name)


if __name__ == "__main__":
    main()
