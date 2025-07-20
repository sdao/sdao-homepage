import bpy

depsgraph = bpy.context.evaluated_depsgraph_get()
obj_eval = bpy.context.scene.objects['Mesh'].evaluated_get(depsgraph)
data = obj_eval.data

with open("./squiggle.txt", "wt") as f:
    for poly in data.polygons:
        for vtx in poly.vertices:
            pos = data.attributes["position"].data[vtx].vector
            path_color = data.attributes["path_color"].data[vtx].color
            f.write(f"{pos[0]:.6f}, {pos[1]:.6f}, {pos[2]:.6f}, 1, {path_color[0]:.6f}, 1,\n")
