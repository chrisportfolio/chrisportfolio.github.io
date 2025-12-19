import bpy
import bmesh
import mathutils
from mathutils.kdtree import KDTree

def bridge_and_smooth_meshes(obj, target_loop_size=210):
    # Ensure we are in Edit Mode with BMesh
    mesh = obj.data
    bm = bmesh.from_edit_mesh(mesh)
    bm.verts.ensure_lookup_table()

    # 1. IDENTIFY BOUNDARY LOOPS
    # Select non-manifold edges (the boundaries)
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_non_manifold()
    
    selected_verts = [v for v in bm.verts if v.select]
    
    # Separate vertices into head and body loops based on vertex count
    # (Simulated logic based on your provided workflow)
    body_loop = []
    face_loop = []
    
    # ... [Logic to sort loops by length goes here] ...
    # For this snippet, we assume body_loop and face_loop are identified

    # 2. SPATIAL MATCHING VIA KDTREE
    # We use a KDTree to find the closest body vertex for every face vertex
    kd = KDTree(len(body_loop))
    for i, vert in enumerate(body_loop):
        kd.insert(vert.co.copy(), i)
    kd.balance()

    print(f"Stitching {len(face_loop)} vertices to body...")

    # Create new edges to bridge the gap
    for v_face in face_loop:
        co, index, dist = kd.find(v_face.co)
        v_body = body_loop[index]
        
        # Avoid creating duplicate edges
        if not bm.edges.get((v_face, v_body)):
            bm.edges.new((v_face, v_body))

    # 3. PROXIMITY-BASED SEAM SMOOTHING
    # A custom smoothing pass to ensure the transition looks natural
    all_bridge_verts = set(body_loop + face_loop)
    
    for _ in range(3):  # 3 Iterations of smoothing
        for v in all_bridge_verts:
            # Calculate average position of neighbors (Laplacian)
            neighbor_avg = mathutils.Vector((0, 0, 0))
            for edge in v.link_edges:
                neighbor_avg += edge.other_vert(v).co
            
            if len(v.link_edges) > 0:
                # Interpolate current position with neighbor average
                v.co = v.co.lerp(neighbor_avg / len(v.link_edges), 0.5)

    # Finalize changes
    bmesh.update_edit_mesh(mesh)
    print("Mesh integration complete.")

# Usage
if bpy.context.active_object:
    bridge_and_smooth_meshes(bpy.context.active_object)