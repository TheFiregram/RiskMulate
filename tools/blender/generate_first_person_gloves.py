"""Generate animated first-person industrial glove/sleeve GLBs for RiskMulate."""

from __future__ import annotations

import argparse
import math
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


def world_to_blender(x: float, y: float, z: float):
    return (x, -z, y)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.scene.render.fps = 30
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 40


def material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def parent_keep_local(obj, parent):
    obj.parent = parent
    return obj


def add_empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.location = world_to_blender(*location)
    if parent:
        parent_keep_local(obj, parent)
    return obj


def add_box(name, size, position, mat, parent, bevel=0.015):
    w, h, d = size
    bpy.ops.mesh.primitive_cube_add(size=1, location=world_to_blender(*position))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (w, d, h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("RM_BEVEL", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
    parent_keep_local(obj, parent)
    return obj


def add_sphere(name, radius, position, scale, mat, parent, segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=radius,
        location=world_to_blender(*position),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0], scale[2], scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    parent_keep_local(obj, parent)
    return obj


def add_cylinder(name, radius, length, position, mat, parent, axis="z", segments=12, taper=1.0):
    rotation = (0, 0, 0)
    if axis == "x":
        rotation = (0, math.pi / 2, 0)
    elif axis == "z":
        rotation = (math.pi / 2, 0, 0)
    bpy.ops.mesh.primitive_cone_add(
        vertices=segments,
        radius1=radius,
        radius2=radius * taper,
        depth=length,
        location=world_to_blender(*position),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    parent_keep_local(obj, parent)
    return obj


def build_arm(root, side, mats, mobile=False):
    prefix = "L" if side < 0 else "R"
    arm = add_empty(f"{prefix}_ARM_RIG", root, (side * 0.225, -0.015, 0.015))
    segments = 10 if mobile else 16
    rings = 8 if mobile else 12

    add_cylinder(f"{prefix}_SLEEVE", 0.145, 0.56, (0, -0.30, -0.47), mats["sleeve"], arm, segments=segments, taper=0.82)
    add_cylinder(f"{prefix}_SLEEVE_DARK", 0.118, 0.24, (0, -0.255, -0.73), mats["sleeve_dark"], arm, segments=segments, taper=0.9)
    add_cylinder(f"{prefix}_CUFF", 0.128, 0.085, (0, -0.235, -0.84), mats["cuff"], arm, segments=segments)
    add_cylinder(f"{prefix}_REFLECTIVE", 0.132, 0.025, (0, -0.235, -0.80), mats["reflective"], arm, segments=segments)

    add_sphere(f"{prefix}_PALM", 0.12, (0, -0.205, -0.92), (0.92, 0.64, 1.20), mats["glove"], arm, segments, rings)
    add_box(f"{prefix}_KNUCKLE", (0.17, 0.028, 0.075), (0, -0.148, -0.94), mats["knuckle"], arm, bevel=0.012)

    for index in range(4):
        x = -0.058 + index * 0.039
        length = 0.102 if index in (0, 3) else 0.118
        add_cylinder(
            f"{prefix}_FINGER_{index}",
            0.0185,
            length,
            (x, -0.20, -1.015),
            mats["glove"],
            arm,
            segments=8 if mobile else 10,
            taper=0.82,
        )
        add_sphere(
            f"{prefix}_FINGERTIP_{index}",
            0.018,
            (x, -0.20, -1.015 - length * 0.48),
            (1.0, 1.0, 1.0),
            mats["glove"],
            arm,
            8 if mobile else 10,
            6 if mobile else 8,
        )

    thumb_x = side * 0.108
    thumb = add_cylinder(
        f"{prefix}_THUMB",
        0.023,
        0.112,
        (thumb_x, -0.22, -0.94),
        mats["glove"],
        arm,
        axis="z",
        segments=8 if mobile else 10,
        taper=0.86,
    )
    thumb.rotation_euler.z = side * 0.42
    thumb.rotation_euler.y = side * -0.14
    add_sphere(
        f"{prefix}_THUMB_TIP",
        0.022,
        (side * 0.137, -0.225, -0.985),
        (1.0, 1.0, 1.0),
        mats["glove"],
        arm,
        8 if mobile else 10,
        6 if mobile else 8,
    )

    return arm


def add_action(obj, clip_name, keys):
    base_location = obj.location.copy()
    base_rotation = obj.rotation_euler.copy()
    obj.animation_data_create()
    action = bpy.data.actions.new(f"{clip_name}_{obj.name}")
    obj.animation_data.action = action

    for frame, location_delta, rotation_delta in keys:
        obj.location = (
            base_location.x + location_delta[0],
            base_location.y + location_delta[1],
            base_location.z + location_delta[2],
        )
        obj.rotation_euler = (
            base_rotation.x + rotation_delta[0],
            base_rotation.y + rotation_delta[1],
            base_rotation.z + rotation_delta[2],
        )
        obj.keyframe_insert(data_path="location", frame=frame)
        obj.keyframe_insert(data_path="rotation_euler", frame=frame)

    track = obj.animation_data.nla_tracks.new()
    track.name = clip_name
    strip = track.strips.new(clip_name, 1, action)
    strip.action_frame_start = 1
    strip.action_frame_end = max(frame for frame, _, _ in keys)
    obj.animation_data.action = None
    obj.location = base_location
    obj.rotation_euler = base_rotation


def add_animation_clips(root, left, right):
    add_action(root, "Idle", [
        (1, (0, 0, 0), (0, 0, 0)),
        (20, (0, 0, 0.006), (0.006, 0, 0.004)),
        (40, (0, 0, 0), (0, 0, 0)),
    ])
    add_action(left, "Idle", [
        (1, (0, 0, 0), (0, 0, 0.01)),
        (20, (0, 0, 0), (0.012, 0, -0.012)),
        (40, (0, 0, 0), (0, 0, 0.01)),
    ])
    add_action(right, "Idle", [
        (1, (0, 0, 0), (0, 0, -0.01)),
        (20, (0, 0, 0), (-0.012, 0, 0.012)),
        (40, (0, 0, 0), (0, 0, -0.01)),
    ])

    add_action(left, "Walk", [
        (1, (0, 0, 0), (0.10, 0, 0.03)),
        (10, (0, 0.015, 0), (-0.10, 0, -0.03)),
        (20, (0, 0, 0), (0.10, 0, 0.03)),
    ])
    add_action(right, "Walk", [
        (1, (0, 0, 0), (-0.10, 0, -0.03)),
        (10, (0, -0.015, 0), (0.10, 0, 0.03)),
        (20, (0, 0, 0), (-0.10, 0, -0.03)),
    ])

    add_action(right, "Interact", [
        (1, (0, 0, 0), (0, 0, 0)),
        (7, (0, 0.13, 0.045), (-0.13, 0, -0.05)),
        (14, (0, 0, 0), (0, 0, 0)),
    ])


def build_scene(mobile=False):
    mats = {
        "sleeve": material("RM_fp_sleeve", (0.18, 0.23, 0.25), 0.06, 0.88),
        "sleeve_dark": material("RM_fp_sleeve_dark", (0.10, 0.13, 0.14), 0.08, 0.9),
        "cuff": material("RM_fp_cuff", (0.045, 0.06, 0.065), 0.05, 0.86),
        "glove": material("RM_fp_glove", (0.025, 0.035, 0.04), 0.02, 0.68),
        "knuckle": material("RM_fp_knuckle", (0.10, 0.13, 0.14), 0.18, 0.52),
        "reflective": material("RM_fp_reflective", (0.72, 0.49, 0.055), 0.14, 0.58),
    }
    root = add_empty("FP_RIG")
    left = build_arm(root, -1, mats, mobile)
    right = build_arm(root, 1, mats, mobile)
    add_animation_clips(root, left, right)


def export_glb(output: pathlib.Path):
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_nla_strips=True,
        export_force_sampling=True,
    )


def main():
    args = parse_args()
    reset_scene()
    build_scene(args.mobile)
    export_glb(pathlib.Path(args.output).resolve())
    print(f"Generated {'mobile' if args.mobile else 'desktop'} first-person gloves: {args.output}")


if __name__ == "__main__":
    main()
