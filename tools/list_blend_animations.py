import bpy

print('FPS', bpy.context.scene.render.fps)
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        print('ARMATURE', obj.name, 'bones', len(obj.data.bones))
for action in bpy.data.actions:
    print(action.name, round(action.frame_range.x, 1), round(action.frame_range.y, 1))
