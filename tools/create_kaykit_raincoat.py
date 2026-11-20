"""Create low-poly, bone-attached KayKit raincoats and export them as GLB files."""
import bpy
import os
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'confronto-avatar-3d', 'modelli', 'kaykit2', 'accessori')


def clean():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = 0.78
    return mat


yellow = None
dark_yellow = None


def name(obj, bone, suffix):
    obj.name = f'Raincoat_{bone}_{suffix}'
    obj.data.name = obj.name
    obj.data.materials.append(dark_yellow if suffix.startswith(('Seam', 'Button', 'Cuff', 'PocketFlap', 'Drawstring')) else yellow)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def cube(bone, suffix, loc, scale, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        bevel_mod = obj.modifiers.new('Soft low-poly edges', 'BEVEL')
        bevel_mod.width = bevel
        bevel_mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=bevel_mod.name)
    return name(obj, bone, suffix)


def cone(bone, suffix, loc, radius_bottom, radius_top, depth, vertices=6, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius_bottom, radius2=radius_top, depth=depth, location=loc, rotation=rotation)
    return name(bpy.context.object, bone, suffix)


def sphere(bone, suffix, loc, radius):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=loc)
    return name(bpy.context.object, bone, suffix)


def make_variant(label, s):
    global yellow, dark_yellow
    clean()
    yellow = material('Raincoat yellow', (1.0, 0.67, 0.025))
    dark_yellow = material('Raincoat seams', (0.72, 0.37, 0.01))

    # Torso: a short, flared waterproof coat.  Its overlap makes it work over all body meshes.
    # Clearance is deliberately generous: KayKit torsos differ substantially between packs.
    cone('chest', 'Torso', (0, 0, 0.90 * s), 0.50 * s, 0.42 * s, 0.70 * s, vertices=6)
    cube('chest', 'Seam', (0, -0.435 * s, 0.92 * s), (0.025 * s, 0.025 * s, 0.57 * s), 0.008 * s)
    # The pockets and collar deliberately belong to the chest, keeping their positions in every animation.
    cube('chest', 'PocketL', (0.20 * s, -0.45 * s, 0.75 * s), (0.15 * s, 0.025 * s, 0.11 * s), 0.012 * s)
    cube('chest', 'PocketR', (-0.20 * s, -0.45 * s, 0.75 * s), (0.15 * s, 0.025 * s, 0.11 * s), 0.012 * s)
    cube('chest', 'PocketFlapL', (0.20 * s, -0.468 * s, 0.82 * s), (0.17 * s, 0.025 * s, 0.035 * s), 0.008 * s)
    cube('chest', 'PocketFlapR', (-0.20 * s, -0.468 * s, 0.82 * s), (0.17 * s, 0.025 * s, 0.035 * s), 0.008 * s)
    # Dark snap buttons and pocket flaps create readable detail without textures.
    for index, height in enumerate((1.11, 0.98, 0.85), 1):
        cone('chest', f'Button{index}', (0, -0.462 * s, height * s), 0.038 * s, 0.038 * s, 0.025 * s, vertices=8, rotation=(math.pi / 2, 0, 0))
    cone('chest', 'Collar', (0, 0, 1.22 * s), 0.38 * s, 0.32 * s, 0.12 * s, vertices=6)

    # Four independent sleeve sections follow the upper and lower arm bones precisely.
    for side, sign in [('l', 1), ('r', -1)]:
        cone(f'upperarm.{side}', 'Sleeve', (sign * 0.35 * s, 0, 1.105 * s), 0.205 * s, 0.18 * s, 0.34 * s, vertices=6, rotation=(0, math.pi / 2, 0))
        cone(f'lowerarm.{side}', 'Sleeve', (sign * 0.59 * s, 0, 1.105 * s), 0.18 * s, 0.15 * s, 0.33 * s, vertices=6, rotation=(0, math.pi / 2, 0))
        cone(f'lowerarm.{side}', 'Cuff', (sign * 0.74 * s, 0, 1.105 * s), 0.165 * s, 0.165 * s, 0.06 * s, vertices=6, rotation=(0, math.pi / 2, 0))

    # Hood folded at the back: it follows the chest instead of the head, so it never fights hats or helmets.
    cone('chest', 'HoodFold', (0, 0.47 * s, 1.18 * s), 0.34 * s, 0.26 * s, 0.30 * s, vertices=6)
    cube('chest', 'HoodFoldSeam', (0, 0.67 * s, 1.18 * s), (0.025 * s, 0.02 * s, 0.22 * s), 0.006 * s)
    for side, sign in [('L', 1), ('R', -1)]:
        cube('chest', f'Drawstring{side}', (sign * 0.18 * s, 0.63 * s, 1.08 * s), (0.018 * s, 0.018 * s, 0.16 * s), 0.005 * s)
        sphere('chest', f'DrawstringEnd{side}', (sign * 0.18 * s, 0.63 * s, 0.99 * s), 0.038 * s)

    # Keep transforms in world-space rest pose; the web viewer re-parents each piece to its named bone.
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.select_set(True)
            obj['kaykit_bone'] = obj.name.split('_')[1]
            obj['accessory'] = 'yellow-raincoat'
            obj['rig'] = label
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, f'impermeabile-giallo-{label}.blend'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'impermeabile-giallo-{label}.glb'), export_format='GLB', export_materials='EXPORT', export_apply=True)


make_variant('medium', 1.0)
make_variant('large', 2.70)
