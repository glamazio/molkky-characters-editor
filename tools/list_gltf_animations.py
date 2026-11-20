import bpy
import sys

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
for action in bpy.data.actions:
    print(action.name, round(action.frame_range.x, 1), round(action.frame_range.y, 1))
