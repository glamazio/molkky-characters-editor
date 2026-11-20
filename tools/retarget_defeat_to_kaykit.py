"""Retarget Quaternius Defeat's local bone deltas to a KayKit medium rig.

This is intentionally a reference retarget: it preserves the source action's timing
and quaternion deltas, while starting from KayKit's actual Idle_A pose.
"""
import bpy
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets_originali', 'Ultimate Animated Character Pack - Nov 2019-20261115T150614Z-1-001', 'Ultimate Animated Character Pack - Nov 2019', 'Blends', 'BaseCharacter.blend')
TARGET = os.path.join(ROOT, 'confronto-avatar-3d', 'modelli', 'kaykit2', 'personaggi', 'Mannequin_Medium.glb')
IDLE = os.path.join(ROOT, 'confronto-avatar-3d', 'modelli', 'kaykit2', 'animazioni', 'Rig_Medium_General.glb')
OUT = os.path.join(ROOT, 'confronto-avatar-3d', 'modelli', 'kaykit2', 'animazioni-custom', 'Delusione_Defeat_Medium.glb')

mapping = {
    'Body': 'spine', 'Torso': 'chest', 'Head': 'head',
    'UpperArm.L': 'upperarm.l', 'UpperArm.R': 'upperarm.r',
    'LowerArm.L': 'lowerarm.l', 'LowerArm.R': 'lowerarm.r',
}

bpy.ops.wm.open_mainfile(filepath=SOURCE)
source_armature = bpy.data.objects['CharacterArmature']
source_action = bpy.data.actions['Defeat']
source_armature.animation_data_create().action = source_action

# Capture the Defeat pose values relative to its first frame.
bpy.context.scene.frame_set(0)
source_base = {name: source_armature.pose.bones[name].rotation_quaternion.copy() for name in mapping}
source_samples = {}
for frame in range(61):
    bpy.context.scene.frame_set(frame)
    source_samples[frame] = {name: source_armature.pose.bones[name].rotation_quaternion.copy() @ source_base[name].inverted() for name in mapping}

bpy.ops.import_scene.gltf(filepath=TARGET)
target_armature = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE' and obj.name.startswith('Rig_Medium'))
bpy.ops.import_scene.gltf(filepath=IDLE)
idle_action = next(action for action in bpy.data.actions if action.name == 'Idle_A')
target_armature.animation_data_create().action = idle_action
bpy.context.scene.frame_set(0)
target_base = {target: target_armature.pose.bones[target].rotation_quaternion.copy() for target in mapping.values()}

# A quaternion is expressed in its bone's local axes.  Quaternius and KayKit
# use different rest-axis conventions, so convert the delta through their
# respective rest orientations before applying it to the KayKit idle pose.
axis_conversion = {}
for source_name, target_name in mapping.items():
    source_rest = source_armature.data.bones[source_name].matrix_local.to_quaternion()
    target_rest = target_armature.data.bones[target_name].matrix_local.to_quaternion()
    axis_conversion[source_name] = target_rest.inverted() @ source_rest

# Bake every source frame: no guessed Euler axes, only source quaternion deltas.
# Blender 5 stores action curves behind slots; keyframe_insert works across its action APIs.
target_armature.animation_data.action = None
for source_name, target_name in mapping.items():
    pose = target_armature.pose.bones[target_name]
    pose.rotation_mode = 'QUATERNION'
    for frame in range(61):
        conversion = axis_conversion[source_name]
        delta = conversion @ source_samples[frame][source_name] @ conversion.inverted()
        pose.rotation_quaternion = target_base[target_name] @ delta
        pose.keyframe_insert(data_path='rotation_quaternion', frame=frame)
target_action = target_armature.animation_data.action
target_action.name = 'Delusione_Defeat'

# The source action lasts 60 frames.  The imported KayKit scene keeps its
# previous 1--21 preview range, which would silently crop the exported motion.
bpy.context.scene.frame_start = 0
bpy.context.scene.frame_end = 60
target_armature.animation_data.action = target_action

# The character and its Idle clip are imported as a convenient way to get the
# real KayKit bind/idle pose.  They must not leak into the deliverable: retain
# only the generated action before the glTF exporter enumerates animations.
for action in list(bpy.data.actions):
    if action != target_action:
        bpy.data.actions.remove(action)

# Export only the visible target character and its armature.
for obj in bpy.context.selected_objects:
    obj.select_set(False)
target_armature.select_set(True)
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.find_armature() == target_armature:
        obj.select_set(True)
bpy.context.view_layer.objects.active = target_armature
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.context.scene.render.fps = 24
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_frame_range=True, export_force_sampling=True)
print('EXPORTED', OUT)
