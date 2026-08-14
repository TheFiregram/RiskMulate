"""Generate RiskMulate's production electrical-panel and rear service-yard module."""

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


def material(name, color, metallic, roughness, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[key].default_value = (*emission, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 1.4
    return mat


def add_box(name, size, position, mat, bevel=0.0, rotation_z=0.0):
    w, h, d = size
    bpy.ops.mesh.primitive_cube_add(size=1, location=world_to_blender(*position))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (w, d, h)
    obj.rotation_euler[2] = rotation_z
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


def cabinet(prefix, x, center_y, z, width, height, depth, mats, warning=False, mobile=False):
    add_box(prefix, (width, height, depth), (x, center_y, z), mats["cabinet"], bevel=0.025)
    add_box(
        f"{prefix}_DOOR",
        (width * 0.92, height * 0.93, 0.025),
        (x, center_y, z + depth / 2 + 0.014),
        mats["door"],
        bevel=0.012,
    )
    for side in (-1, 1):
        add_box(
            f"{prefix}_HINGE_{side}",
            (0.026, height * 0.76, 0.03),
            (x + side * width * 0.42, center_y, z + depth / 2 + 0.032),
            mats["hardware"],
            bevel=0.005,
        )
    add_box(
        f"{prefix}_LATCH",
        (0.12, 0.052, 0.045),
        (x + width * 0.30, center_y, z + depth / 2 + 0.047),
        mats["hardware"],
        bevel=0.008,
    )
    if warning:
        add_box(
            f"{prefix}_WARNING",
            (min(0.30, width * 0.36), min(0.26, height * 0.20), 0.018),
            (x, center_y + height * 0.16, z + depth / 2 + 0.052),
            mats["yellow"],
            bevel=0.008,
        )
        if not mobile:
            add_box(
                f"{prefix}_WARNING_MARK",
                (0.035, 0.13, 0.012),
                (x, center_y + height * 0.16, z + depth / 2 + 0.066),
                mats["black"],
                bevel=0.004,
            )
    collider = add_box(
        f"COLLIDER_{prefix}",
        (width * 1.02, height * 1.02, depth * 1.05),
        (x, center_y, z),
        mats["collider"],
    )
    collider.display_type = "WIRE"


def bollard(prefix, x, z, mats, mobile=False):
    add_box(f"{prefix}_BASE", (0.19, 0.026, 0.19), (x, 0.013, z), mats["dark"], bevel=0.006)
    add_cylinder(f"{prefix}_POST", 0.055, 0.78, (x, 0.415, z), mats["yellow"], segments=12 if mobile else 20)
    add_cylinder(f"{prefix}_CAP", 0.059, 0.04, (x, 0.815, z), mats["dark"], segments=12 if mobile else 20)


def drain(prefix, x, z, mats, mobile=False):
    add_box(f"{prefix}_CHANNEL", (1.25, 0.045, 0.28), (x, 0.023, z), mats["concrete_dark"], bevel=0.008)
    add_box(f"{prefix}_GRATE", (1.16, 0.025, 0.20), (x, 0.060, z), mats["dark"], bevel=0.006)
    spacing = 0.20 if mobile else 0.10
    ix = -0.5
    index = 0
    while ix <= 0.5:
        add_box(f"{prefix}_BAR_{index}", (0.025, 0.018, 0.18), (x + ix, 0.080, z), mats["steel"], bevel=0.003)
        index += 1
        ix += spacing


def wheel_stop(prefix, x, z, mats):
    add_box(f"{prefix}_BASE", (1.7, 0.11, 0.20), (x, 0.055, z), mats["concrete"], bevel=0.035, rotation_z=math.pi / 2)
    add_box(f"{prefix}_TOP", (1.52, 0.055, 0.14), (x, 0.138, z), mats["concrete"], bevel=0.025, rotation_z=math.pi / 2)


def cable_reel(prefix, x, z, mats, mobile=False):
    seg = 16 if mobile else 28
    add_cylinder(f"{prefix}_AXLE", 0.045, 0.62, (x, 0.38, z), mats["dark"], axis="x", segments=12)
    for side, dx in (("L", -0.265), ("R", 0.265)):
        add_cylinder(f"{prefix}_{side}_FLANGE", 0.40, 0.065, (x + dx, 0.38, z), mats["wood"], axis="x", segments=seg)
    add_cylinder(f"{prefix}_CABLE", 0.255, 0.46, (x, 0.38, z), mats["cable"], axis="x", segments=seg)


def pallet_conduit(prefix, x, z, mats, mobile=False):
    board_count = 4 if mobile else 6
    for i in range(board_count):
        dz = (i - (board_count - 1) / 2) * 0.115
        add_box(f"{prefix}_BOARD_{i}", (1.05, 0.045, 0.09), (x, 0.13, z + dz), mats["wood"], bevel=0.008)
    for px in (-0.42, 0, 0.42):
        add_box(f"{prefix}_BLOCK_{px}", (0.10, 0.10, 0.72), (x + px, 0.06, z), mats["wood_dark"], bevel=0.008)
    conduits = (-0.30, -0.10, 0.10, 0.30) if not mobile else (-0.22, 0, 0.22)
    for idx, dz in enumerate(conduits):
        add_cylinder(f"{prefix}_CONDUIT_{idx}", 0.028, 0.92, (x, 0.24 + (idx % 2) * 0.07, z + dz), mats["steel"], axis="x", segments=10)


def build_area(mobile=False):
    mats = {
        "cabinet": material("RM_electrical_cabinet", (0.38, 0.41, 0.40), 0.58, 0.56),
        "door": material("RM_electrical_door", (0.27, 0.30, 0.29), 0.62, 0.48),
        "hardware": material("RM_electrical_hardware", (0.08, 0.09, 0.09), 0.78, 0.34),
        "steel": material("RM_service_steel", (0.30, 0.34, 0.35), 0.66, 0.46),
        "dark": material("RM_service_dark", (0.09, 0.11, 0.11), 0.74, 0.48),
        "yellow": material("RM_safety_yellow", (0.75, 0.57, 0.08), 0.10, 0.70),
        "black": material("RM_warning_black", (0.03, 0.035, 0.035), 0.02, 0.88),
        "concrete": material("RM_service_concrete", (0.45, 0.44, 0.41), 0.02, 0.94),
        "concrete_dark": material("RM_service_concrete_dark", (0.25, 0.25, 0.23), 0.02, 0.97),
        "wood": material("RM_pallet_wood", (0.36, 0.22, 0.11), 0.01, 0.92),
        "wood_dark": material("RM_pallet_wood_dark", (0.20, 0.11, 0.055), 0.01, 0.96),
        "cable": material("RM_black_cable", (0.025, 0.03, 0.03), 0.01, 0.94),
        "slab": material("RM_service_slab", (0.31, 0.31, 0.29), 0.01, 0.98),
        "collider": material("RM_collider_proxy", (0.12, 0.75, 0.25), 0.0, 1.0),
    }

    base_x, base_y, base_z = 10.7, 1.82, 6.64
    cabinet("EP_A", base_x - 1.08, base_y + 0.06, base_z, 0.72, 1.05, 0.24, mats, mobile=mobile)
    cabinet("EP_B", base_x - 0.20, base_y + 0.03, base_z, 0.62, 1.18, 0.25, mats, mobile=mobile)
    cabinet("EP_C", base_x + 0.82, base_y + 0.18, base_z, 0.94, 1.55, 0.31, mats, warning=True, mobile=mobile)
    cabinet("EP_JB", base_x + 0.10, base_y - 0.76, base_z, 0.44, 0.42, 0.20, mats, mobile=mobile)

    conduit_xs = (-1.28, -0.96, -0.36, -0.04, 0.58, 0.86, 1.06)
    for index, dx in enumerate(conduit_xs):
        add_cylinder(f"EP_CONDUIT_{index}", 0.025, 1.26, (base_x + dx, base_y - 1.08, base_z + 0.03), mats["steel"], segments=10)
    add_cylinder("EP_CONDUIT_BUS", 0.03, 2.55, (base_x - 0.05, base_y - 1.68, base_z + 0.03), mats["steel"], axis="x", segments=10)
    add_cylinder("EP_CABLE_ROUTE", 0.024, 1.72, (base_x - 0.18, base_y + 0.86, base_z - 0.03), mats["cable"], axis="x", segments=10)

    # Rear service yard uses the same coordinates as the current procedural pack.
    add_box("SY_SLAB", (9.0, 0.020, 6.8), (base_x, 0.020, base_z + 3.6), mats["slab"], bevel=0.015)
    add_box("SY_CLEAR_BORDER_N", (3.65, 0.012, 0.05), (base_x, 0.034, base_z + 0.20), mats["yellow"])
    add_box("SY_CLEAR_BORDER_S", (3.65, 0.012, 0.05), (base_x, 0.034, base_z + 1.90), mats["yellow"])
    add_box("SY_CLEAR_BORDER_W", (0.05, 0.012, 1.70), (base_x - 1.825, 0.034, base_z + 1.05), mats["yellow"])
    add_box("SY_CLEAR_BORDER_E", (0.05, 0.012, 1.70), (base_x + 1.825, 0.034, base_z + 1.05), mats["yellow"])
    if not mobile:
        for idx, dx in enumerate((-1.05, -0.35, 0.35, 1.05)):
            add_box(f"SY_CLEAR_HATCH_{idx}", (0.04, 0.010, 1.28), (base_x + dx, 0.040, base_z + 1.05), mats["yellow"], rotation_z=math.pi / 4)

    bollard("SY_BOLLARD_L", base_x - 1.68, base_z + 1.15, mats, mobile)
    bollard("SY_BOLLARD_R", base_x + 1.68, base_z + 1.15, mats, mobile)
    wheel_stop("SY_STOP_L", base_x - 3.0, base_z + 3.9, mats)
    wheel_stop("SY_STOP_R", base_x + 3.0, base_z + 3.9, mats)
    add_box("SY_UTILITY_COVER", (0.84, 0.055, 0.60), (base_x + 0.55, 0.064, base_z + 3.8), mats["steel"], bevel=0.015)
    for idx in range(-2, 3):
        drain(f"SY_DRAIN_{idx + 2}", base_x + idx * 1.18, base_z + 5.25, mats, mobile)
    cable_reel("SY_REEL", base_x - 2.55, base_z + 6.0, mats, mobile)
    pallet_conduit("SY_PALLET", base_x + 2.45, base_z + 5.95, mats, mobile)


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
    build_area(args.mobile)
    export_glb(pathlib.Path(args.output).resolve())
    print(f"Generated {'mobile' if args.mobile else 'desktop'} electrical area: {args.output}")


if __name__ == "__main__":
    main()
