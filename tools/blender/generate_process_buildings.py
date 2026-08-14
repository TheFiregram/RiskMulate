"""Generate the two Northbridge process/operations buildings as production GLB assets."""

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


def material(name, color, metallic, roughness, transmission=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    elif "Transmission" in bsdf.inputs:
        bsdf.inputs["Transmission"].default_value = transmission
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.surface_render_method = "DITHERED" if hasattr(mat, "surface_render_method") else "DITHERED"
    return mat


def add_box(name, size, position, mat, bevel=0.0):
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
    return obj


def add_cylinder(name, radius, length, position, mat, axis="y", segments=16):
    rotation = (0, 0, 0)
    if axis == "x":
        rotation = (0, math.pi / 2, 0)
    elif axis == "z":
        rotation = (math.pi / 2, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segments,
        radius=radius,
        depth=length,
        location=world_to_blender(*position),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def add_window_bank(prefix, x, center_y, front_z, width, mats, mobile=False):
    frame_h = 2.32
    frame_w = min(4.45, width * 0.54)
    add_box(f"{prefix}_WINDOW_FRAME", (frame_w + 0.14, frame_h + 0.14, 0.08), (x, center_y, front_z), mats["trim"], bevel=0.015)
    add_box(f"{prefix}_WINDOW_GLASS", (frame_w, frame_h, 0.045), (x, center_y, front_z - 0.055), mats["glass"], bevel=0.008)
    mullions = (-frame_w * 0.25, 0, frame_w * 0.25) if not mobile else (0,)
    for idx, offset in enumerate(mullions):
        add_box(f"{prefix}_MULLION_{idx}", (0.055, frame_h, 0.06), (x + offset, center_y, front_z - 0.085), mats["trim"], bevel=0.006)
    add_box(f"{prefix}_SILL", (frame_w + 0.24, 0.10, 0.22), (x, center_y - frame_h / 2 - 0.08, front_z - 0.02), mats["plinth"], bevel=0.012)


def add_louver(prefix, x, y, z, width, height, mats, mobile=False):
    add_box(f"{prefix}_FRAME", (width + 0.10, height + 0.10, 0.08), (x, y, z), mats["trim"], bevel=0.012)
    slats = 5 if mobile else 9
    for idx in range(slats):
        yy = y - height / 2 + (idx + 0.5) * height / slats
        add_box(f"{prefix}_SLAT_{idx}", (width, 0.045, 0.09), (x, yy, z - 0.055), mats["dark"], bevel=0.004)


def add_service_door(prefix, x, y, z, mats, mobile=False):
    add_box(f"{prefix}_FRAME", (1.30, 2.35, 0.10), (x, y, z), mats["trim"], bevel=0.014)
    add_box(f"{prefix}_DOOR", (1.16, 2.20, 0.065), (x, y, z - 0.065), mats["door"], bevel=0.012)
    add_box(f"{prefix}_HANDLE", (0.16, 0.035, 0.05), (x + 0.38, y, z - 0.105), mats["dark"], bevel=0.005)
    if not mobile:
        add_box(f"{prefix}_KICK", (0.90, 0.25, 0.025), (x, y - 0.82, z - 0.11), mats["dark"], bevel=0.005)


def add_roof_equipment(prefix, x, z, width, depth, roof_y, mats, mobile=False):
    units = ((-width * 0.22, -0.55, 1.0), (width * 0.20, 0.85, 0.82))
    if mobile:
        units = units[:1]
    for idx, (dx, dz, scale) in enumerate(units):
        add_box(f"{prefix}_VENT_BASE_{idx}", (0.82 * scale, 0.16, 0.82 * scale), (x + dx, roof_y + 0.10, z + dz), mats["plinth"], bevel=0.025)
        add_cylinder(f"{prefix}_VENT_{idx}", 0.18 * scale, 0.90 * scale, (x + dx, roof_y + 0.62, z + dz), mats["dark"], segments=12 if mobile else 20)
        add_cylinder(f"{prefix}_VENT_CAP_{idx}", 0.31 * scale, 0.09, (x + dx, roof_y + 1.10 * scale, z + dz), mats["trim"], segments=14 if mobile else 24)


def add_wall_service_detail(prefix, x, z, half_w, half_d, height, mats, mobile=False):
    side_x = x + half_w + 0.11
    add_box(f"{prefix}_SERVICE_BOX", (0.70, 0.55, 0.18), (side_x, 1.05, z - half_d * 0.18), mats["trim"], bevel=0.012)
    add_box(f"{prefix}_SERVICE_LABEL", (0.23, 0.12, 0.20), (side_x + 0.01, 1.18, z - half_d * 0.18), mats["yellow"], bevel=0.006)
    conduit_zs = (z - half_d * 0.28, z + half_d * 0.03)
    for idx, cz in enumerate(conduit_zs):
        add_cylinder(f"{prefix}_CONDUIT_{idx}", 0.035, 0.88, (side_x + 0.28, 0.46, cz), mats["yellow"], segments=8)
    if not mobile:
        add_box(f"{prefix}_CONDUIT_BUS", (0.06, 0.06, depth_between(conduit_zs) + 0.10), (side_x + 0.28, 0.86, sum(conduit_zs) / 2), mats["yellow"], bevel=0.005)


def depth_between(values):
    return abs(values[1] - values[0])


def build_one(prefix, x, z, width, depth, height, mats, mobile=False):
    half_w = width / 2
    half_d = depth / 2
    wall = 0.24

    # Four separate wall shells make corners and service details read better under shadows.
    add_box(f"{prefix}_FRONT", (width, height, wall), (x, height / 2, z - half_d), mats["facade"], bevel=0.025)
    add_box(f"{prefix}_BACK", (width, height, wall), (x, height / 2, z + half_d), mats["facade"], bevel=0.025)
    add_box(f"{prefix}_LEFT", (wall, height, depth), (x - half_w, height / 2, z), mats["facade"], bevel=0.025)
    add_box(f"{prefix}_RIGHT", (wall, height, depth), (x + half_w, height / 2, z), mats["facade"], bevel=0.025)

    # Plinth and dark eaves give the shell readable industrial scale.
    add_box(f"{prefix}_PLINTH_FRONT", (width + 0.08, 0.22, 0.30), (x, 0.11, z - half_d), mats["plinth"], bevel=0.015)
    add_box(f"{prefix}_PLINTH_BACK", (width + 0.08, 0.22, 0.30), (x, 0.11, z + half_d), mats["plinth"], bevel=0.015)
    add_box(f"{prefix}_ROOF", (width + 0.70, 0.20, depth + 0.70), (x, height + 0.12, z), mats["roof"], bevel=0.035)
    for idx, (px, pz, sx, sz) in enumerate((
        (x, z - half_d - 0.22, width + 0.42, 0.12),
        (x, z + half_d + 0.22, width + 0.42, 0.12),
        (x - half_w - 0.22, z, 0.12, depth + 0.32),
        (x + half_w + 0.22, z, 0.12, depth + 0.32),
    )):
        add_box(f"{prefix}_EAVE_{idx}", (sx, 0.22, sz), (px, height + 0.36, pz), mats["trim"], bevel=0.012)

    add_window_bank(prefix, x, 2.05, z - half_d - 0.16, width, mats, mobile)
    add_service_door(f"{prefix}_DOOR", x - half_w - 0.16, 1.18, z - depth * 0.12, mats, mobile)
    add_louver(f"{prefix}_LOUVER", x + half_w + 0.16, 1.15, z + depth * 0.12, 1.10, 0.88, mats, mobile)

    # Rear horizontal louver strip and roof equipment.
    add_box(f"{prefix}_REAR_VENT_FRAME", (width * 0.64, 0.14, 0.30), (x, 3.35, z + half_d + 0.18), mats["trim"], bevel=0.01)
    slat_count = 6 if mobile else max(8, int(width / 0.72))
    for idx in range(slat_count):
        offset = -width * 0.28 + idx * (width * 0.56 / max(1, slat_count - 1))
        add_box(f"{prefix}_REAR_VENT_{idx}", (0.055, 0.22, 0.36), (x + offset, 3.25, z + half_d + 0.20), mats["dark"], bevel=0.004)

    add_roof_equipment(prefix, x, z, width, depth, height + 0.34, mats, mobile)
    add_wall_service_detail(prefix, x, z, half_w, half_d, height, mats, mobile)


def build_scene(mobile=False):
    mats = {
        "facade": material("RM_facade_block", (0.52, 0.52, 0.49), 0.03, 0.91),
        "trim": material("RM_building_trim", (0.10, 0.13, 0.14), 0.54, 0.52),
        "plinth": material("RM_building_plinth", (0.35, 0.34, 0.31), 0.02, 0.94),
        "roof": material("RM_building_roof", (0.12, 0.15, 0.16), 0.66, 0.46),
        "glass": material("RM_industrial_glass", (0.19, 0.31, 0.36), 0.06, 0.18, transmission=0.18),
        "door": material("RM_service_door", (0.21, 0.25, 0.26), 0.50, 0.58),
        "dark": material("RM_building_dark", (0.07, 0.085, 0.09), 0.62, 0.52),
        "yellow": material("RM_building_safety_yellow", (0.73, 0.54, 0.07), 0.14, 0.68),
    }
    build_one("PROCESS", 10.5, 2.5, 9.0, 8.0, 4.6, mats, mobile)
    build_one("OPS", -11.0, 4.4, 10.0, 6.5, 4.1, mats, mobile)


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
        export_animations=False,
    )


def main():
    args = parse_args()
    reset_scene()
    build_scene(args.mobile)
    export_glb(pathlib.Path(args.output).resolve())
    print(f"Generated {'mobile' if args.mobile else 'desktop'} process buildings: {args.output}")


if __name__ == "__main__":
    main()
