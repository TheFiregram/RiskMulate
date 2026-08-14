"""RiskMulate Blender -> GLB export helper.

Usage inside Blender:
  blender --background facility.blend --python tools/blender/export_riskmulate_glb.py -- \
    --output apps/game-lite/assets/production/process-tanks.glb

Objects in collections beginning with ``DEV_`` are excluded. Objects beginning
with ``COLLIDER_`` are exported as named meshes for future physics extraction.
"""

from __future__ import annotations

import argparse
import pathlib
import sys

import bpy


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--mobile", action="store_true")
    return parser.parse_args(argv)


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def remove_development_collections() -> None:
    for collection in list(bpy.data.collections):
        if collection.name.startswith("DEV_"):
            for obj in list(collection.objects):
                bpy.data.objects.remove(obj, do_unlink=True)


def apply_transforms() -> None:
    bpy.ops.object.select_all(action="DESELECT")
    candidates = [obj for obj in bpy.context.scene.objects if obj.type in {"MESH", "EMPTY", "ARMATURE"}]
    for obj in candidates:
        if obj.type == "MESH":
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            obj.select_set(False)


def add_mobile_decimation() -> None:
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.name.startswith("COLLIDER_"):
            continue
        if len(obj.data.polygons) < 1200:
            continue
        modifier = obj.modifiers.new(name="RM_MOBILE_DECIMATE", type="DECIMATE")
        modifier.ratio = 0.52 if len(obj.data.polygons) > 8000 else 0.68
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)


def export_glb(output: pathlib.Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_colors=True,
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_frame_range=True,
        export_skins=True,
        export_morph=True,
    )


def main() -> None:
    args = parse_args()
    configure_scene()
    remove_development_collections()
    apply_transforms()
    if args.mobile:
        add_mobile_decimation()
    export_glb(pathlib.Path(args.output).resolve())
    print(f"RiskMulate GLB exported: {args.output}")


if __name__ == "__main__":
    main()
