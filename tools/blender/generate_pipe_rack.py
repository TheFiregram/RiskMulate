"""Generate the Northbridge production pipe-rack GLB.

Run with Blender:
  blender --background --python tools/blender/generate_pipe_rack.py -- \
    --output apps/game-lite/assets/production/pipe-rack.glb

Use ``--mobile`` for the reduced variant.
"""

from __future__ import annotations

import argparse
import math
import pathlib
import sys

import bpy
import mathutils


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
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0


def world_to_blender(x: float, y: float, z: float):
    return (x, -z, y)


def material(name: str, color, metallic: float, roughness: float):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def add_box(name, risk_size, risk_position, mat, bevel=0.0):
    width, height, depth = risk_size
    bpy.ops.mesh.primitive_cube_add(size=1, location=world_to_blender(*risk_position))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (width, depth, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("RM_BEVEL", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
    return obj


def add_pipe_x(name, risk_position, length, radius, mat, vertices):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=length,
        location=world_to_blender(*risk_position),
        rotation=(0, math.pi / 2, 0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    bevel = obj.modifiers.new("RM_PIPE_EDGE", "BEVEL")
    bevel.width = min(0.018, radius * 0.08)
    bevel.segments = 2
    return obj


def add_ring_x(name, risk_position, major_radius, minor_radius, mat, major_segments, minor_segments=8):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=world_to_blender(*risk_position),
        rotation=(0, math.pi / 2, 0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_beam(name, risk_start, risk_end, radius, mat, vertices=8):
    start = mathutils.Vector(world_to_blender(*risk_start))
    end = mathutils.Vector(world_to_blender(*risk_end))
    direction = end - start
    length = direction.length
    midpoint = (start + end) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = mathutils.Vector((0, 0, 1)).rotation_difference(direction.normalized())
    obj.data.materials.append(mat)
    return obj


def add_support_frame(index, x, rack_z, mats, mobile):
    post_depths = (rack_z - 0.72, rack_z + 0.72)
    for side, z in enumerate(post_depths):
        add_box(
            f"PR_FRAME_{index}_POST_{side}",
            (0.24, 3.95, 0.24),
            (x, 1.975, z),
            mats["frame"],
            bevel=0.018,
        )
        add_box(
            f"PR_FRAME_{index}_BASE_{side}",
            (0.62, 0.12, 0.62),
            (x, 0.06, z),
            mats["base"],
            bevel=0.018,
        )
        if not mobile:
            for bolt_idx, (dx, dz) in enumerate(((-0.2, -0.2), (0.2, -0.2), (-0.2, 0.2), (0.2, 0.2))):
                bpy.ops.mesh.primitive_cylinder_add(
                    vertices=8,
                    radius=0.026,
                    depth=0.06,
                    location=world_to_blender(x + dx, 0.13, z + dz),
                )
                bolt = bpy.context.object
                bolt.name = f"PR_FRAME_{index}_ANCHOR_{side}_{bolt_idx}"
                bolt.data.materials.append(mats["dark"])

    for beam_index, y in enumerate((1.18, 1.78, 2.38, 2.94, 3.58)):
        add_box(
            f"PR_FRAME_{index}_CROSS_{beam_index}",
            (0.28, 0.10, 1.72),
            (x, y, rack_z),
            mats["dark"],
            bevel=0.012,
        )

    # Diagonal bracing makes the rack read as structural steel instead of stacked bars.
    if not mobile or index in (0, 2, 4):
        add_beam(
            f"PR_FRAME_{index}_BRACE_A",
            (x - 0.015, 0.45, rack_z - 0.70),
            (x - 0.015, 3.55, rack_z + 0.70),
            0.045,
            mats["brace"],
        )
        add_beam(
            f"PR_FRAME_{index}_BRACE_B",
            (x + 0.015, 0.45, rack_z + 0.70),
            (x + 0.015, 3.55, rack_z - 0.70),
            0.045,
            mats["brace"],
        )

    # Collider proxies remain simple compared with the visible steelwork.
    for side, z in enumerate(post_depths):
        collider = add_box(
            f"COLLIDER_PR_FRAME_{index}_{side}",
            (0.30, 3.9, 0.30),
            (x, 1.95, z),
            mats["collider"],
        )
        collider.display_type = "WIRE"


def build_pipe_rack(mobile=False):
    mats = {
        "frame": material("RM_rack_galvanized", (0.27, 0.31, 0.33), 0.72, 0.38),
        "base": material("RM_rack_base", (0.16, 0.19, 0.20), 0.76, 0.42),
        "dark": material("RM_rack_dark", (0.10, 0.12, 0.13), 0.74, 0.46),
        "brace": material("RM_rack_brace", (0.20, 0.23, 0.24), 0.68, 0.44),
        "pipe_a": material("RM_pipe_amber", (0.49, 0.22, 0.08), 0.42, 0.56),
        "pipe_b": material("RM_pipe_steel", (0.34, 0.39, 0.41), 0.66, 0.40),
        "pipe_c": material("RM_pipe_dark", (0.18, 0.23, 0.25), 0.58, 0.44),
        "yellow": material("RM_service_yellow", (0.76, 0.55, 0.06), 0.14, 0.64),
        "clamp": material("RM_pipe_clamp", (0.08, 0.09, 0.10), 0.82, 0.40),
        "tray": material("RM_cable_tray", (0.31, 0.34, 0.34), 0.76, 0.42),
        "collider": material("RM_collider_proxy", (0.16, 0.75, 0.24), 0.0, 1.0),
    }

    rack_z = -7.6
    pipe_vertices = 14 if mobile else 28
    ring_segments = 12 if mobile else 24
    lines = (
        ("L1", 1.46, 19.5, 0.14, rack_z + 0.48, mats["pipe_b"]),
        ("L2", 2.05, 22.0, 0.25, rack_z, mats["pipe_a"]),
        ("L3", 2.62, 20.5, 0.17, rack_z - 0.42, mats["pipe_c"]),
        ("L4", 3.20, 21.0, 0.23, rack_z, mats["pipe_b"]),
    )

    for name, y, length, radius, z, mat in lines:
        add_pipe_x(f"PR_{name}_TRUNK", (0, y, z), length, radius, mat, pipe_vertices)

    support_xs = (-8.5, -4.25, 0, 4.25, 8.5)
    for index, x in enumerate(support_xs):
        add_support_frame(index, x, rack_z, mats, mobile)
        for line_name, y, _, radius, z, _ in lines:
            add_ring_x(
                f"PR_{line_name}_CLAMP_{index}",
                (x, y, z),
                radius + 0.044,
                0.025,
                mats["clamp"],
                ring_segments,
                6,
            )

    # Longitudinal upper members and a service tray add depth from first-person angles.
    add_box("PR_TOP_BEAM_A", (19.2, 0.12, 0.18), (0, 4.02, rack_z - 0.70), mats["frame"], bevel=0.015)
    add_box("PR_TOP_BEAM_B", (19.2, 0.12, 0.18), (0, 4.02, rack_z + 0.70), mats["frame"], bevel=0.015)
    add_box("PR_CABLE_TRAY", (18.8, 0.08, 0.42), (0, 3.82, rack_z + 0.95), mats["tray"], bevel=0.01)

    rail_z = rack_z + 1.18
    add_box("PR_SERVICE_RAIL_TOP", (18.8, 0.05, 0.05), (0, 4.65, rail_z), mats["yellow"], bevel=0.01)
    add_box("PR_SERVICE_RAIL_MID", (18.8, 0.045, 0.045), (0, 4.28, rail_z), mats["yellow"], bevel=0.008)
    rail_spacing = 3.1 if mobile else 1.9
    x = -9.1
    rail_index = 0
    while x <= 9.1:
        add_box(
            f"PR_SERVICE_RAIL_POST_{rail_index}",
            (0.045, 0.82, 0.045),
            (x, 4.24, rail_z),
            mats["yellow"],
            bevel=0.007,
        )
        rail_index += 1
        x += rail_spacing

    for marker_index, x in enumerate((-6.2, -1.8, 2.6, 7.0)):
        add_box(
            f"PR_SERVICE_MARKER_{marker_index}",
            (0.34, 0.12, 0.035),
            (x, 2.05, rack_z - 0.27),
            mats["yellow"],
            bevel=0.008,
        )


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
    args = parse_args()
    reset_scene()
    build_pipe_rack(args.mobile)
    export_glb(pathlib.Path(args.output).resolve())
    print(f"Generated {'mobile' if args.mobile else 'desktop'} pipe rack: {args.output}")


if __name__ == "__main__":
    main()
