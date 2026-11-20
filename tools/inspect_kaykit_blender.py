import bpy
import sys

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)

for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        print('ARMATURE', obj.name)
        for bone in obj.data.bones:
            print('BONE', bone.name, tuple(round(v, 4) for v in bone.head_local), tuple(round(v, 4) for v in bone.tail_local))

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
points = [obj.matrix_world @ vertex.co for obj in mesh_objects for vertex in obj.data.vertices]
if points:
    print('BOUNDS', tuple(round(min(point[i] for point in points), 4) for i in range(3)), tuple(round(max(point[i] for point in points), 4) for i in range(3)))
