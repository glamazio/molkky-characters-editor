import bpy
import sys

name = sys.argv[sys.argv.index('--') + 1]
action = bpy.data.actions[name]
print('ACTION', action.name, tuple(action.frame_range))
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                points = [(round(point.co.x, 3), round(point.co.y, 4)) for point in curve.keyframe_points]
                print(curve.data_path, curve.array_index, points)
