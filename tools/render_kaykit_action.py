"""Render a named animation from a KayKit GLB on the medium mannequin."""
import bpy
import os
import sys
from mathutils import Vector

character_path, animations_path, action_name, output_path, frame = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=character_path)
armature = next(item for item in bpy.context.scene.objects if item.type == 'ARMATURE')
bpy.ops.import_scene.gltf(filepath=animations_path)
action = next(item for item in bpy.data.actions if item.name == action_name)
armature.animation_data_create().action = action
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
    if obj.type == 'MESH' and obj.find_armature() == armature:
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
