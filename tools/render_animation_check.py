"""Render selected frames from a GLB animation for visual QA."""
import bpy
import os
import sys
from mathutils import Vector

glb_path, output_dir = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)

armature = next(item for item in bpy.context.scene.objects if item.type == 'ARMATURE')
action = bpy.data.actions[0]
armature.animation_data_create().action = action
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 0, 60
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.studio_light = 'paint.sl'
scene.display.shading.background_type = 'WORLD'
scene.display.shading.background_color = (0.055, 0.07, 0.10)
scene.render.resolution_x, scene.render.resolution_y = 512, 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False

points = []
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
minimum = Vector(map(min, zip(*points)))
maximum = Vector(map(max, zip(*points)))
center = (minimum + maximum) / 2
extent = maximum - minimum

bpy.ops.object.camera_add(location=(4.8, -8.5, 3.5))
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = max(extent.x, extent.z) * 1.55
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = camera

os.makedirs(output_dir, exist_ok=True)
for frame in (0, 30, 60):
    scene.frame_set(frame)
    scene.render.filepath = os.path.join(output_dir, f'defeat-{frame:02d}.png')
    bpy.ops.render.render(write_still=True)
