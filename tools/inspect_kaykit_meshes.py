import bpy
import sys

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    verts = [obj.matrix_world @ vert.co for vert in obj.data.vertices]
    if not verts:
        continue
    low = tuple(round(min(v[i] for v in verts), 3) for i in range(3))
    high = tuple(round(max(v[i] for v in verts), 3) for i in range(3))
    print(obj.name, low, high)
