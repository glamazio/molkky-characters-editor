"""Author a KayKit-native disappointment motion using Defeat's timing."""
import bpy
import os
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = os.path.join(ROOT, 'confronto-avatar-3d', 'modelli', 'kaykit2', 'personaggi', 'Mannequin_Medium.glb')
OUT = os.path.join(ROOT, 'confronto-avatar-3d', 'modelli', 'kaykit2', 'animazioni-custom', 'Delusione_Defeat_Medium.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=TARGET)
armature = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 0, 60
scene.render.fps = 24

def empty(name):
    bpy.ops.object.empty_add(type='PLAIN_AXES')
    item = bpy.context.object
    item.name = name
    return item

left, right = empty('IK_Left'), empty('IK_Right')

# Defeat: arms rise at F20, hold/shake around F30, return by F55.
# x is side-to-side; negative y sits just in front of the face.
targets = {
    left: [(0, (.78, .02, .83)), (16, (.78, .02, .83)), (24, (.25, -.24, 1.35)), (42, (.25, -.24, 1.35)), (55, (.78, .02, .83)), (60, (.78, .02, .83))],
    right: [(0, (-.78, .02, .83)), (16, (-.78, .02, .83)), (21, (-.25, -.24, 1.35)), (42, (-.25, -.24, 1.35)), (55, (-.78, .02, .83)), (60, (-.78, .02, .83))],
}
for target, keys in targets.items():
    for frame, location in keys:
        target.location = location
        target.keyframe_insert(data_path='location', frame=frame)

for side, target in (('l', left), ('r', right)):
    constraint = armature.pose.bones[f'hand.{side}'].constraints.new('IK')
    constraint.target = target
    constraint.chain_count = 3
    constraint.use_stretch = False

# The torso yields a little and the head lowers/shakes, following Defeat's
# landmarks while remaining expressed in KayKit's own axes.
for bone_name, keys in {
    'chest': [(0, 0), (16, -13), (42, -13), (55, 0), (60, 0)],
    'head': [(0, 0), (18, 8), (24, -8), (30, 8), (36, -8), (42, 0), (60, 0)],
}.items():
    pose = armature.pose.bones[bone_name]
    pose.rotation_mode = 'XYZ'
    for frame, degrees in keys:
        pose.rotation_euler = (math.radians(degrees), 0, 0)
        pose.keyframe_insert(data_path='rotation_euler', frame=frame)

# Bake evaluated IK transforms so the GLB contains no Blender constraints.
bpy.context.view_layer.objects.active = armature
armature.select_set(True)
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.nla.bake(frame_start=0, frame_end=60, step=1, only_selected=False,
                 visual_keying=True, clear_constraints=True,
                 use_current_action=True, bake_types={'POSE'})
bpy.ops.object.mode_set(mode='OBJECT')
action = armature.animation_data.action
action.name = 'Delusione_Defeat'

# Empties only served baking and must not be delivered.
for item in (left, right):
    bpy.data.objects.remove(item, do_unlink=True)

for obj in bpy.context.selected_objects:
    obj.select_set(False)
armature.select_set(True)
for obj in scene.objects:
    if obj.type == 'MESH' and obj.find_armature() == armature:
        obj.select_set(True)
bpy.context.view_layer.objects.active = armature
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True,
                          export_animations=True, export_frame_range=True,
                          export_force_sampling=True)
print('EXPORTED', OUT)
