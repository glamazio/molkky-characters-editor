"""Render Quaternius Defeat at a reference frame for comparison."""
import bpy
import os
import sys
from mathutils import Vector

blend_path, output_path, frame = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=blend_path)
armature = bpy.data.objects['CharacterArmature']
armature.animation_data_create().action = bpy.data.actions['Defeat']
scene = bpy.context.scene
scene.frame_set(int(frame))
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.studio_light = 'paint.sl'
scene.display.shading.background_type = 'WORLD'
scene.display.shading.background_color = (0.055, 0.07, 0.10)
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
points = []
for obj in scene.objects:
    if obj.type == 'MESH':
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
minimum, maximum = Vector(map(min, zip(*points))), Vector(map(max, zip(*points)))
center, extent = (minimum + maximum) / 2, maximum - minimum
bpy.ops.object.camera_add(location=(4.8, -8.5, 3.5))
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = max(extent.x, extent.z) * 1.55
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = camera
scene.render.filepath = output_path
bpy.ops.render.render(write_still=True)
