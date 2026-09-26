# Builds the realistic furniture models with bpy and exports one GLB per model to public/models.
# run: python3 tools/blender/furniture.py            (needs `pip install bpy`, Python 3.11)
#
# Conventions (match the three.js side, src/view/models.ts and src/view/horror.ts):
#  - everything below is written in three.js coordinates: x right, y up, z towards the viewer; metres
#  - a model's origin is the bottom-centre of its back side and it faces +z
#  - moving parts are separate named nodes whose origin is the hinge / slide origin
#    (wardrobe: doorL, doorR; drawers and desk: drawer; trunk: lid; door: leaf)
#  - materials are only named slots (oak, oak_dark, brass, iron, shadow); the game swaps in the PBR textures,
#    so UVs are laid out in world units: 1 UV = TILE metres of texture
import math
import os
import random

import bpy  # noqa: E402  (bpy must be imported before bmesh/mathutils)
import bmesh
from mathutils import Matrix, Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'models')
TILE = 0.6
COLORS = {
    'oak': (0.25, 0.15, 0.08, 1), 'oak_dark': (0.12, 0.07, 0.04, 1), 'brass': (0.6, 0.45, 0.2, 1),
    'iron': (0.15, 0.12, 0.1, 1), 'shadow': (0.02, 0.015, 0.01, 1),
}
rnd = random.Random(7)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.diffuse_color = COLORS[name]
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = COLORS[name]
            bsdf.inputs['Roughness'].default_value = 0.7
            bsdf.inputs['Metallic'].default_value = 1.0 if name in ('brass', 'iron') else 0.0
    return m


def b(v):
    """three.js (x, y, z) -> Blender (x, -z, y)"""
    return Vector((v[0], -v[2], v[1]))


def world_uv(obj, grain=None):
    """Box-project UVs in metres (1 UV = TILE m). Wood grain runs along the object's longest axis."""
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.verify()
    dims = obj.dimensions
    long_axis = grain if grain is not None else max(range(3), key=lambda i: dims[i])
    off = (rnd.random() * 5, rnd.random() * 5)
    for f in bm.faces:
        n = f.normal
        a = max(range(3), key=lambda i: abs(n[i]))  # projection axis
        plane = [i for i in range(3) if i != a]
        # U follows the grain if the grain lies in this face, else the larger of the two remaining axes
        if long_axis in plane:
            u_ax = long_axis
        else:
            u_ax = max(plane, key=lambda i: dims[i])
        v_ax = plane[0] if plane[1] == u_ax else plane[1]
        for l in f.loops:
            co = l.vert.co
            l[uv].uv = (co[u_ax] / TILE + off[0], co[v_ax] / TILE + off[1])
    bm.to_mesh(me)
    bm.free()


def finish(obj, mat, bevel=0.006, segs=2, parent=None, uv=True, grain=None):
    obj.data.materials.append(material(mat))
    if bevel > 0:
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = segs
        mod.limit_method = 'ANGLE'
        mod.harden_normals = True
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier='bevel')
    for p in obj.data.polygons:
        p.use_smooth = True
    if uv:
        world_uv(obj, grain)
    if parent is not None:
        obj.parent = parent
    return obj


def cube(name, size, center, mat, parent=None, bevel=0.006, segs=2, grain=None):
    """Box of `size` (three.js w, h, d) centred at `center` (three.js coords, relative to `parent`)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    sx, sy, sz = size
    for v in bm.verts:
        v.co = Vector((v.co.x * sx, -v.co.z * sz, v.co.y * sy)) + b(center)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    return finish(obj, mat, min(bevel, min(size) * 0.3), segs, parent, grain=grain)


def lathe(name, profile, center, mat, parent=None, seg=20, axis='y'):
    """Solid of revolution: profile = [(radius, height), ...] bottom to top, around the vertical axis."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        ring = [bm.verts.new((r * math.cos(a), r * math.sin(a), h)) for r, h in profile]
        verts.append(ring)
    for i in range(seg):
        r0, r1 = verts[i], verts[(i + 1) % seg]
        for j in range(len(profile) - 1):
            bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
    bot = bm.verts.new((0, 0, profile[0][1]))
    top = bm.verts.new((0, 0, profile[-1][1]))
    for i in range(seg):
        r0, r1 = verts[i], verts[(i + 1) % seg]
        bm.faces.new((r1[0], r0[0], bot))
        bm.faces.new((r0[-1], r1[-1], top))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if axis == 'z':  # lying along three.js z (knobs pointing out of a front)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, 'X'))
    for v in bm.verts:
        v.co += b(center)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    return finish(obj, mat, 0, parent=parent, grain=2)


def empty(name, at=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    e.location = b(at)
    bpy.context.collection.objects.link(e)
    if parent is not None:
        e.parent = parent
    return e


def knob(name, at, parent, r=0.022):
    return lathe(name, [(0.012, 0), (0.008, 0.012), (r * 0.9, 0.022), (r, 0.032), (r * 0.6, 0.042), (0.001, 0.045)], at, 'brass', parent, 14, 'z')


def ring_pull(name, at, parent):
    """Brass back plate + hanging bail handle for a drawer."""
    x, y, z = at
    cube(f'{name}_plate', (0.1, 0.035, 0.006), (x, y, z + 0.003), 'brass', parent, 0.002)
    cube(f'{name}_bail', (0.085, 0.01, 0.012), (x, y - 0.022, z + 0.02), 'brass', parent, 0.003)
    for s in (-1, 1):
        cube(f'{name}_post{s}', (0.01, 0.01, 0.022), (x + s * 0.04, y, z + 0.011), 'brass', parent, 0.002)


def keyhole(name, at, parent):
    x, y, z = at
    cube(f'{name}_esc', (0.03, 0.05, 0.004), (x, y, z + 0.002), 'brass', parent, 0.0015)
    cube(f'{name}_hole', (0.007, 0.018, 0.002), (x, y - 0.004, z + 0.0045), 'shadow', parent, 0)


def panel(name, w, h, center, parent, mat='oak', frame=0.07, depth=0.025, raised=True):
    """Frame-and-panel board (door leaf, side, drawer front) centred at `center`, front face at z + depth/2."""
    x, y, z = center
    cube(f'{name}_stileL', (frame, h, depth), (x - w / 2 + frame / 2, y, z), mat, parent, grain=2)
    cube(f'{name}_stileR', (frame, h, depth), (x + w / 2 - frame / 2, y, z), mat, parent, grain=2)
    cube(f'{name}_railT', (w - 2 * frame, frame, depth), (x, y + h / 2 - frame / 2, z), mat, parent, grain=0)
    cube(f'{name}_railB', (w - 2 * frame, frame * 1.2, depth), (x, y - h / 2 + frame * 0.6, z), mat, parent, grain=0)
    iw, ih = w - 2 * frame, h - frame * 2.2
    cy = y - frame * 0.1
    cube(f'{name}_panel', (iw + 0.01, ih + 0.01, depth * 0.45), (x, cy, z - depth * 0.15), mat, parent, 0.003, grain=2)
    if raised:  # raised field with bevelled edges
        f = cube(f'{name}_field', (iw - 0.05, ih - 0.05, depth * 0.35), (x, cy, z), mat, parent, 0.02, 3, grain=2)
        return f
    return None


def export(root, name):
    bpy.ops.object.select_all(action='DESELECT')

    def sel(o):
        o.select_set(True)
        for c in o.children:
            sel(c)

    sel(root)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_texcoords=True, export_normals=True, export_materials='EXPORT', export_animations=False,
    )
    print(f'{name}.glb: {os.path.getsize(path) // 1024} KB')


# ---------------------------------------------------------------- models

def wardrobe():
    """Victorian wardrobe 1.1 x 1.9 x 0.5 with two panelled doors, turned columns and a cornice."""
    reset()
    root = empty('wardrobe')
    W, H, D = 1.1, 1.9, 0.5
    # carcass
    cube('back', (W - 0.04, H - 0.14, 0.02), (0, H / 2, 0.01), 'oak_dark', root)
    cube('interior', (W - 0.08, H - 0.28, 0.005), (0, H / 2 + 0.02, 0.024), 'shadow', root, 0)
    for s in (-1, 1):
        panel(f'side{s}', D - 0.04, H - 0.2, (s * (W / 2 - 0.012), H / 2 + 0.02, D / 2), root, depth=0.024)
        # the side panel is built facing +z; turn it to face outwards
        for o in [o for o in bpy.data.objects if o.name.startswith(f'side{s}_')]:
            me = o.data
            for v in me.vertices:
                p = v.co.copy()  # blender coords: x, -z3, y3 ; rotate about vertical around the panel centre
                cx, cz = s * (W / 2 - 0.012), D / 2
                x3, z3 = p.x - cx, -p.y - cz
                nx, nz = (-z3 * s, x3 * s)
                v.co.x, v.co.y = cx + nx, -(cz + nz)
            me.update()
    cube('base', (W + 0.04, 0.12, D + 0.03), (0, 0.06, D / 2 + 0.005), 'oak', root, 0.01, grain=0)
    cube('plinth', (W + 0.06, 0.03, D + 0.05), (0, 0.135, D / 2 + 0.01), 'oak_dark', root, 0.01, grain=0)
    cube('bottom', (W - 0.04, 0.03, D - 0.04), (0, 0.15, D / 2), 'oak_dark', root, grain=0)
    cube('shelf', (W - 0.08, 0.025, D - 0.08), (0, 0.95, D / 2 - 0.02), 'oak_dark', root, grain=0)
    cube('rail', (W - 0.08, 0.025, 0.025), (0, 1.55, D / 2 - 0.05), 'brass', root, 0.005, grain=0)
    cube('top', (W - 0.04, 0.03, D - 0.04), (0, H - 0.1, D / 2), 'oak_dark', root, grain=0)
    # cornice: stacked mouldings
    for i, (dh, grow) in enumerate([(0.05, 0.0), (0.03, 0.03), (0.025, 0.06), (0.04, 0.08)]):
        y = H - 0.12 + sum(x[0] for x in [(0.05, 0), (0.03, 0), (0.025, 0), (0.04, 0)][:i]) + dh / 2
        cube(f'cornice{i}', (W + grow * 2, dh, D + grow), (0, y, D / 2 + grow / 2), 'oak' if i % 2 == 0 else 'oak_dark', root, 0.012, 3, grain=0)
    # turned columns on the front corners
    prof = [(0.03, 0), (0.03, 0.06), (0.022, 0.08), (0.02, 0.2), (0.026, 0.26), (0.02, 0.32), (0.019, 1.2),
            (0.025, 1.26), (0.019, 1.32), (0.019, 1.45), (0.028, 1.5), (0.028, 1.55)]
    for s in (-1, 1):
        lathe(f'column{s}', prof, (s * (W / 2 - 0.015), 0.15, D + 0.005), 'oak', root)
    # doors: hinge at the outer edge, front of the carcass
    for s, name in ((-1, 'doorL'), (1, 'doorR')):
        h = empty(name, (s * 0.52, 0.16, D + 0.005), root)
        dw = 0.5
        panel(f'{name}_p', dw, 1.58, (-s * dw / 2, 0.79, 0.0125), h, depth=0.025)
        # second, upper panel division rail
        cube(f'{name}_mid', (dw - 0.14, 0.06, 0.025), (-s * dw / 2, 1.02, 0.0125), 'oak', h, grain=0)
        if s < 0:
            keyhole(f'{name}_key', (-s * (dw - 0.04), 0.85, 0.025), h)
        knob(f'{name}_knob', (-s * (dw - 0.04), 0.76, 0.025), h, 0.016)
    export(root, 'wardrobe')


def drawers():
    """Chest of drawers 1.0 x 0.9 x 0.5: two fixed drawers below and an opening top drawer named 'drawer'."""
    reset()
    root = empty('drawers')
    W, H, D = 1.0, 0.9, 0.5
    cube('back', (W - 0.04, H - 0.1, 0.02), (0, H / 2 + 0.03, 0.01), 'oak_dark', root)
    for s in (-1, 1):
        cube(f'side{s}', (0.03, H - 0.08, D), (s * (W / 2 - 0.015), H / 2 + 0.02, D / 2), 'oak', root, grain=1)
        cube(f'foot{s}', (0.07, 0.07, 0.07), (s * (W / 2 - 0.05), 0.035, D - 0.05), 'oak_dark', root, 0.012)
        cube(f'footb{s}', (0.07, 0.07, 0.07), (s * (W / 2 - 0.05), 0.035, 0.05), 'oak_dark', root, 0.012)
    cube('plinth', (W, 0.06, D + 0.01), (0, 0.09, D / 2), 'oak', root, 0.012, 3, grain=0)
    cube('top', (W + 0.05, 0.035, D + 0.04), (0, H - 0.0175, D / 2 + 0.01), 'oak', root, 0.012, 3, grain=0)
    cube('top_edge', (W + 0.03, 0.02, D + 0.02), (0, H - 0.045, D / 2 + 0.005), 'oak_dark', root, 0.008, grain=0)
    # frame rails between drawers
    for y in (0.12, 0.395, 0.62, 0.845):
        cube(f'rail{y}', (W - 0.06, 0.025, 0.02), (0, y, D - 0.01), 'oak_dark', root, grain=0)
    for i, y in enumerate((0.26, 0.51)):
        cube(f'front{i}', (W - 0.08, 0.235, 0.022), (0, y, D - 0.005), 'oak', root, 0.008, 3, grain=0)
        ring_pull(f'pull{i}a', (-0.25, y + 0.02, D + 0.006), root)
        ring_pull(f'pull{i}b', (0.25, y + 0.02, D + 0.006), root)
    # opening drawer: a real box with a floor so things can lie inside
    dr = empty('drawer', (0, 0, 0), root)
    y0 = 0.64
    cube('dr_front', (W - 0.08, 0.2, 0.022), (0, y0 + 0.1, D - 0.005), 'oak', dr, 0.008, 3, grain=0)
    cube('dr_floor', (W - 0.14, 0.012, D - 0.06), (0, y0 + 0.02, D / 2 - 0.005), 'oak_dark', dr, 0.002, grain=0)
    cube('dr_back', (W - 0.14, 0.16, 0.015), (0, y0 + 0.09, 0.03), 'oak_dark', dr, grain=0)
    for s in (-1, 1):
        cube(f'dr_side{s}', (0.015, 0.16, D - 0.06), (s * (W / 2 - 0.075), y0 + 0.09, D / 2 - 0.005), 'oak_dark', dr, grain=2)
    ring_pull('dr_pull_a', (-0.25, y0 + 0.12, D + 0.006), dr)
    ring_pull('dr_pull_b', (0.25, y0 + 0.12, D + 0.006), dr)
    keyhole('dr_key', (0, y0 + 0.1, D + 0.006), dr)
    export(root, 'drawers')


def trunk():
    """Iron-strapped wooden trunk 0.9 x 0.55 x 0.5 with a hinged lid named 'lid' (hinge at the back top)."""
    reset()
    root = empty('trunk')
    W, H, D = 0.9, 0.48, 0.5
    # plank walls
    for i in range(3):
        y = 0.02 + i * 0.155 + 0.0775
        cube(f'front{i}', (W, 0.15, 0.03), (0, y, D - 0.015), 'oak', root, 0.008, 3, grain=0)
        cube(f'back{i}', (W, 0.15, 0.03), (0, y, 0.015), 'oak', root, 0.008, 3, grain=0)
        for s in (-1, 1):
            cube(f'side{i}{s}', (0.03, 0.15, D - 0.06), (s * (W / 2 - 0.015), y, D / 2), 'oak', root, 0.008, 3, grain=2)
    cube('floor', (W - 0.06, 0.02, D - 0.06), (0, 0.03, D / 2), 'oak_dark', root, 0.002)
    cube('inside', (W - 0.07, 0.4, D - 0.07), (0, 0.24, D / 2), 'shadow', root, 0)  # dark lining seen from above
    # iron corner guards and straps
    for s in (-1, 1):
        cube(f'strap{s}', (0.05, H + 0.01, 0.008), (s * 0.28, H / 2, D + 0.004), 'iron', root, 0.003)
        cube(f'strapb{s}', (0.05, H + 0.01, 0.008), (s * 0.28, H / 2, -0.004), 'iron', root, 0.003)
        for z in (0.0, D):
            cube(f'corner{s}{z}', (0.06, H, 0.06), (s * (W / 2 - 0.02), H / 2, z + (0.02 if z == 0 else -0.02)), 'iron', root, 0.006)
        cube(f'handle{s}', (0.01, 0.03, 0.14), (s * (W / 2 + 0.012), 0.33, D / 2), 'iron', root, 0.004)
    cube('bottom_band', (W + 0.01, 0.03, D + 0.01), (0, 0.015, D / 2), 'iron', root, 0.004)
    # lid: slightly domed, hinge at the back top edge; it extends towards +z
    lid = empty('lid', (0, H, 0.0), root)
    cube('lid_board', (W + 0.02, 0.05, D + 0.02), (0, 0.025, D / 2), 'oak', lid, 0.012, 3, grain=0)
    cube('lid_dome', (W, 0.05, D - 0.04), (0, 0.07, D / 2), 'oak', lid, 0.025, 4, grain=0)
    cube('lid_band', (W + 0.03, 0.025, D + 0.03), (0, 0.012, D / 2), 'iron', lid, 0.004)
    for s in (-1, 1):
        cube(f'lid_strap{s}', (0.05, 0.1, D + 0.03), (s * 0.28, 0.05, D / 2), 'iron', lid, 0.006)
    # hasp hanging over the front
    cube('hasp', (0.06, 0.09, 0.012), (0, -0.03, D + 0.018), 'iron', lid, 0.003)
    cube('hasp_loop', (0.03, 0.03, 0.02), (0, -0.06, D + 0.028), 'iron', lid, 0.004)
    export(root, 'trunk')


def desk():
    """Writing desk 1.1 x 0.8 x 0.65 on turned legs with a pedestal drawer named 'drawer' on the right."""
    reset()
    root = empty('desk')
    W, D = 1.1, 0.65
    cube('top', (W + 0.04, 0.04, D + 0.04), (0, 0.76, D / 2 + 0.005), 'oak', root, 0.012, 3, grain=0)
    cube('top_edge', (W, 0.025, D), (0, 0.73, D / 2), 'oak_dark', root, 0.006, grain=0)
    cube('apron', (W - 0.08, 0.1, 0.02), (0, 0.67, D - 0.03), 'oak', root, 0.006, grain=0)
    cube('apron_back', (W - 0.08, 0.1, 0.02), (0, 0.67, 0.04), 'oak', root, 0.006, grain=0)
    leg = [(0.028, 0), (0.02, 0.03), (0.022, 0.1), (0.017, 0.4), (0.026, 0.5), (0.02, 0.56), (0.03, 0.6), (0.03, 0.72)]
    for x in (-0.5, 0.5):
        for z in (0.05, D - 0.05):
            lathe(f'leg{x}{z}', leg, (x, 0, z), 'oak_dark', root)
    # pedestal housing the drawer
    cube('ped_l', (0.02, 0.2, D - 0.06), (0.05, 0.62, D / 2), 'oak', root, grain=2)
    cube('ped_b', (0.46, 0.02, D - 0.06), (0.27, 0.52, D / 2), 'oak_dark', root, grain=0)
    dr = empty('drawer', (0, 0, 0), root)
    cube('dr_front', (0.42, 0.15, 0.022), (0.27, 0.635, D - 0.02), 'oak', dr, 0.008, 3, grain=0)
    cube('dr_floor', (0.38, 0.01, D - 0.1), (0.27, 0.57, D / 2 - 0.02), 'oak_dark', dr, 0.002, grain=0)
    for s in (-1, 1):
        cube(f'dr_side{s}', (0.012, 0.11, D - 0.1), (0.27 + s * 0.19, 0.62, D / 2 - 0.02), 'oak_dark', dr, grain=2)
    cube('dr_back', (0.38, 0.11, 0.012), (0.27, 0.62, 0.08), 'oak_dark', dr, grain=0)
    knob('dr_knob', (0.27, 0.635, D - 0.009), dr, 0.018)
    keyhole('dr_key', (0.27, 0.68, D - 0.009), dr)
    # clutter: blotter and an ink pot
    cube('blotter', (0.4, 0.006, 0.3), (-0.2, 0.783, 0.35), 'oak_dark', root, 0.002)
    lathe('inkpot', [(0.03, 0), (0.035, 0.02), (0.03, 0.05), (0.012, 0.06), (0.012, 0.075)], (0.1, 0.78, 0.2), 'iron', root, 14)
    export(root, 'desk')


def door():
    """Six-panel house door 1.1 x 2.25 in a moulded frame; leaf named 'leaf' hinged at x = -0.56."""
    reset()
    root = empty('door')
    # frame (architrave)
    for s in (-1, 1):
        cube(f'jamb{s}', (0.12, 2.42, 0.1), (s * 0.63, 1.21, 0.03), 'oak_dark', root, 0.01, 3, grain=1)
        cube(f'arch{s}', (0.03, 2.42, 0.12), (s * 0.68, 1.21, 0.04), 'oak', root, 0.008, grain=1)
    cube('head', (1.42, 0.14, 0.1), (0, 2.35, 0.03), 'oak_dark', root, 0.01, 3, grain=0)
    cube('head_cap', (1.5, 0.04, 0.14), (0, 2.44, 0.045), 'oak', root, 0.012, 3, grain=0)
    cube('gap', (1.14, 2.3, 0.02), (0, 1.15, 0.005), 'shadow', root, 0)
    leaf = empty('leaf', (-0.56, 0, 0.05), root)
    LW, LH, T = 1.12, 2.28, 0.06
    cx = LW / 2
    fr = 0.12
    cube('stileL', (fr, LH, T), (cx - LW / 2 + fr / 2, LH / 2, 0), 'oak', leaf, grain=1)
    cube('stileR', (fr, LH, T), (cx + LW / 2 - fr / 2, LH / 2, 0), 'oak', leaf, grain=1)
    cube('muntin', (0.1, LH - 0.3, T), (cx, LH / 2, 0), 'oak', leaf, grain=1)
    for y, h in ((0.1, 0.2), (0.95, 0.16), (1.6, 0.14), (LH - 0.07, 0.14)):
        cube(f'rail{y}', (LW - 2 * fr, h, T), (cx, y, 0), 'oak', leaf, grain=0)
    # panels between rails, both columns
    rows = ((0.2, 0.87), (1.03, 1.53), (1.67, 2.14))
    for i, (y0, y1) in enumerate(rows):
        for j, px in enumerate((cx - 0.245, cx + 0.245)):
            pw = 0.39
            cube(f'pan{i}{j}', (pw + 0.01, y1 - y0 + 0.01, T * 0.4), (px, (y0 + y1) / 2, -0.006), 'oak', leaf, 0.003, grain=1)
            cube(f'fld{i}{j}', (pw - 0.07, y1 - y0 - 0.07, T * 0.35), (px, (y0 + y1) / 2, 0.004), 'oak', leaf, 0.025, 3, grain=1)
    # hardware
    cube('plate', (0.06, 0.22, 0.008), (LW - 0.08, 1.05, T / 2 + 0.004), 'brass', leaf, 0.003)
    knob('knob', (LW - 0.08, 1.08, T / 2 + 0.008), leaf, 0.028)
    cube('hole', (0.008, 0.022, 0.002), (LW - 0.08, 0.99, T / 2 + 0.009), 'shadow', leaf, 0)
    for y in (0.3, 1.95):
        cube(f'hinge{y}', (0.025, 0.12, 0.012), (0.01, y, T / 2 + 0.006), 'iron', leaf, 0.003)
    export(root, 'door')


def frame():
    """Gilded picture frame 0.62 x 0.8 (opening 0.48 x 0.66) centred at y = 0.34, back at z = 0; the game puts
    the painting at z = 0.022 behind the lip. Built by sweeping a moulding profile around the rectangle."""
    reset()
    root = empty('frame')
    W, H, cy = 0.62, 0.8, 0.34
    # (inset from the outer edge, z) from the back outer corner over the moulding to the inner lip
    prof = [(0, 0), (0, 0.022), (0.006, 0.03), (0.014, 0.034), (0.022, 0.045), (0.03, 0.05), (0.04, 0.047),
            (0.046, 0.038), (0.052, 0.036), (0.058, 0.03), (0.064, 0.026), (0.07, 0.02), (0.07, 0.012), (0.065, 0.012)]
    me = bpy.data.meshes.new('frame_moulding')
    bm = bmesh.new()
    loops = []
    for d, z in prof:
        hw, hh = W / 2 - d, H / 2 - d
        loops.append([bm.verts.new(b((x, cy + y, z))) for x, y in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh))])
    for a, c in zip(loops, loops[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((a[i], a[j], c[j], c[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new('frame_moulding', me)
    bpy.context.collection.objects.link(obj)
    finish(obj, 'brass', 0, parent=root)
    cube('backing', (W - 0.1, H - 0.1, 0.01), (0, cy, 0.008), 'oak_dark', root, 0)
    export(root, 'frame')


if __name__ == '__main__':
    for f in (wardrobe, drawers, trunk, desk, door, frame):
        f()
