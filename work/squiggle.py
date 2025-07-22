import bpy

depsgraph = bpy.context.evaluated_depsgraph_get()
obj_eval = bpy.context.scene.objects['Mesh'].evaluated_get(depsgraph)
data = obj_eval.data

with open("./squiggle.txt", "wt") as f:
    for i in range(len(data.attributes["position"].data)):
        pos = data.attributes["position"].data[i].vector
        path_color = data.attributes["path_color"].data[i].color
        f.write(f"{pos[0]:.6f}, {pos[1]:.6f}, {pos[2]:.6f}, 1, {path_color[0]:.6f}, 1,\n")

with open("./squiggle_idx.txt", "wt") as f:
    for poly in data.polygons:
        for vtx in poly.vertices:
            f.write(f"{vtx}, ")
        f.write("\n")