"""Generate RiskMulate's first production process-tank asset cluster.

Run with Blender in background mode:

  blender --background --python tools/blender/generate_process_tanks.py -- \
    --output apps/game-lite/assets/production/process-tanks.glb

Add ``--mobile`` for the reduced-geometry variant.
"""

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


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0


def material(name: str, color, metallic: float, roughness: float):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def world_to_blender(x: float, y: float, z: float):
    # RiskMulate/Three.js is Y-up. Blender is Z-up; glTF export converts axes.
    return (x, -z, y)


def apply_bevel(obj, width: float, segments: int = 2) -> None:
    if width <= 0:
        return
    modifier = obj.modifiers.new("RM_BEVEL", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"


def add_cylinder(name, radius, depth, position, mat, vertices=48, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    apply_bevel(obj, bevel, 2)
    return obj


def add_box(name, size, position, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    apply_bevel(obj, bevel, 2)
    return obj


def add_torus(name, major_radius, minor_radius, position, mat, major_segments, minor_segments=8):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=position,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_beam(name, start, end, radius, mat, vertices=10):
    sx, sy, sz = start
    ex, ey, ez = end
    dx, dy, dz = ex - sx, ey - sy, ez - sz
    length = math.sqrt(dx * dx + dy * dy + dz * dz)
    midpoint = ((sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2)
    obj = add_cylinder(name, radius, length, midpoint, mat, vertices=vertices)
    direction = mathutils.Vector((dx, dy, dz)).normalized()
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = mathutils.Vector((0, 0, 1)).rotation_difference(direction)
    return obj


def build_tank(prefix, x, risk_z, radius, height, mats, mobile=False):
    segments = 28 if mobile else 64
    rail_segments = 18 if mobile else 32
    bx, by, _ = world_to_blender(x, 0, risk_z)

    add_cylinder(
        f"{prefix}_FOUNDATION",
        radius * 1.10,
        0.18,
        world_to_blender(x, 0.09, risk_z),
        mats["concrete"],
        vertices=segments,
        bevel=0.035,
    )
    add_cylinder(
        f"{prefix}_SHELL",
        radius,
        height,
        world_to_blender(x, height / 2, risk_z),
        mats["steel"],
        vertices=segments,
        bevel=0.025,
    )

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=12 if mobile else 20,
        location=world_to_blender(x, height, risk_z),
    )
    roof = bpy.context.object
    roof.name = f"{prefix}_DOME"
    roof.scale = (radius, radius, radius * 0.62)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    roof.data.materials.append(mats["steel"])
    bpy.ops.object.shade_smooth()

    for index, fraction in enumerate((0.18, 0.42, 0.66, 0.88)):
        add_torus(
            f"{prefix}_WELD_BAND_{index}",
            radius + 0.035,
            0.045,
            world_to_blender(x, height * fraction, risk_z),
            mats["dark"],
            rail_segments,
            6,
        )

    platform_y = height * 0.72
    add_torus(
        f"{prefix}_PLATFORM",
        radius + 0.34,
        0.13,
        world_to_blender(x, platform_y, risk_z),
        mats["dark"],
        rail_segments,
        7,
    )
    add_torus(
        f"{prefix}_TOP_RAIL",
        radius + 0.43,
        0.028,
        world_to_blender(x, platform_y + 0.82, risk_z),
        mats["yellow"],
        rail_segments,
        6,
    )
    add_torus(
        f"{prefix}_MID_RAIL",
        radius + 0.43,
        0.022,
        world_to_blender(x, platform_y + 0.42, risk_z),
        mats["yellow"],
        rail_segments,
        6,
    )

    post_count = 10 if mobile else 16
    for index in range(post_count):
        angle = (index / post_count) * math.tau
        px = x + math.cos(angle) * (radius + 0.43)
        pz = risk_z + math.sin(angle) * (radius + 0.43)
        add_cylinder(
            f"{prefix}_RAIL_POST_{index}",
            0.025,
            0.84,
            world_to_blender(px, platform_y + 0.42, pz),
            mats["yellow"],
            vertices=8,
        )

    ladder_z = risk_z + radius + 0.24
    for side, dx in (("L", -0.24), ("R", 0.24)):
        add_cylinder(
            f"{prefix}_LADDER_{side}",
            0.034,
            height - 0.55,
            world_to_blender(x + dx, (height - 0.55) / 2 + 0.25, ladder_z),
            mats["dark"],
            vertices=8,
        )

    rung_step = 0.46 if mobile else 0.34
    rung = 0
    rung_y = 0.62
    while rung_y < height - 0.15:
        # Blender cube is cheaper than rotating dozens of tiny cylinders.
        add_box(
            f"{prefix}_LADDER_RUNG_{rung}",
            (0.48, 0.035, 0.035),
            world_to_blender(x, rung_y, ladder_z),
            mats["dark"],
            bevel=0.008,
        )
        rung += 1
        rung_y += rung_step

    add_cylinder(
        f"{prefix}_TOP_NOZZLE",
        0.16,
        0.72,
        world_to_blender(x, height + 0.55, risk_z),
        mats["dark"],
        vertices=16,
        bevel=0.018,
    )
    add_cylinder(
        f"{prefix}_VENT_CAP",
        0.27,
        0.12,
        world_to_blender(x, height + 0.94, risk_z),
        mats["dark"],
        vertices=18,
        bevel=0.016,
    )

    add_box(
        f"{prefix}_LABEL",
        (1.18, 0.04, 0.55),
        world_to_blender(x, height * 0.5, risk_z + radius + 0.035),
        mats["label"],
        bevel=0.018,
    )
    add_box(
        f"{prefix}_LABEL_STRIPE",
        (1.02, 0.045, 0.09),
        world_to_blender(x, height * 0.5 + 0.13, risk_z + radius + 0.06),
        mats["yellow"],
        bevel=0.01,
    )

    if not mobile:
        for index, (dx, yy, width, streak_height) in enumerate((
            (-0.72, height * 0.62, 0.10, 1.5),
            (0.48, height * 0.36, 0.08, 1.0),
            (0.82, height * 0.76, 0.06, 0.76),
        )):
            add_box(
                f"{prefix}_WEATHERING_{index}",
                (width, 0.02, streak_height),
                world_to_blender(x + dx, yy, risk_z + radius + 0.055),
                mats["rust"],
            )

    collider = add_cylinder(
        f"COLLIDER_{prefix}",
        radius * 1.03,
        height,
        world_to_blender(x, height / 2, risk_z),
        mats["collider"],
        vertices=12,
    )
    collider.display_type = "WIRE"


def build_scene(mobile=False):
    mats = {
        "steel": material("RM_weathered_steel", (0.48, 0.53, 0.55), 0.62, 0.48),
        "dark": material("RM_dark_steel", (0.12, 0.15, 0.16), 0.72, 0.42),
        "yellow": material("RM_safety_yellow", (0.78, 0.55, 0.06), 0.12, 0.68),
        "concrete": material("RM_concrete", (0.34, 0.36, 0.35), 0.02, 0.94),
        "rust": material("RM_weathering", (0.28, 0.11, 0.05), 0.04, 0.92),
        "label": material("RM_service_label", (0.82, 0.80, 0.68), 0.0, 0.86),
        "collider": material("RM_collider_proxy", (0.3, 0.8, 0.3), 0.0, 1.0),
    }
    build_tank("T101", -15, -12, 2.8, 6.2, mats, mobile)
    build_tank("T102", -8.3, -13.5, 2.2, 5.1, mats, mobile)
    build_tank("T103", 14.5, -13, 3.1, 7.3, mats, mobile)


def export_glb(output: pathlib.Path) -> None:
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
        export_animations=False,
    )


def main() -> None:
    global mathutils
    import mathutils

    args = parse_args()
    reset_scene()
    build_scene(args.mobile)
    export_glb(pathlib.Path(args.output).resolve())
    print(f"Generated {'mobile' if args.mobile else 'desktop'} process tanks: {args.output}")


if __name__ == "__main__":
    main()
