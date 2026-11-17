"""Personnage chef en 3D, monté sur le squelette de la bibliothèque d'animations libre (Quaternius, CC0, 53 os, 46 animations).

Le corps vient du mannequin de la bibliothèque (la tête est retirée) ; la tête d'animal, la toque, le foulard, la queue et l'arme sont
fabriqués ici, par code, et accrochés aux os : toutes les animations de la bibliothèque s'appliquent donc.

Usage (Blender comme module Python) :
    python3 -I tools/blender/chef.py -- <dossier_sortie> <nom_du_chef> <images_par_animation> [apercu]
Sortie : <dossier>/<chef>_<animation>_<NN>.png (fond transparent, 512 x 512) et <dossier>/<chef>_<animation>_sheet.png
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Euler, Matrix, Vector

UAL = os.environ.get("UAL_GLTF", "/home/user/j-ponzo/gltf-universal-animation-library/glTF/AnimationLibrary_Godot_Standard.gltf")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "/tmp/chef_out"
WHO = argv[1] if len(argv) > 1 else "moustachu"
NFR = int(argv[2]) if len(argv) > 2 else 12
PREVIEW = len(argv) > 3 and argv[3] == "apercu"
TILT = 35   # hauteur de la caméra au-dessus de l'horizon (le personnage est debout, la carte est vue à 60 degrés)
YAW = 38    # le personnage regarde vers la droite de l'image, un peu vers nous
os.makedirs(OUT, exist_ok=True)

# animations utilisées dans le jeu -> action de la bibliothèque (début, fin éventuels)
ANIMS = {"idle": "Idle_Loop", "marche": "Walk_Loop", "course": "Jog_Fwd_Loop", "attaque": "Sword_Attack", "touche": "Hit_Chest", "mort": "Death01"}

SPECS = {
    # fourrure, ventre/museau, veste, foulard, pantalon, toque ?, oreilles, queue, arme
    "moustachu": dict(fur=(0.85, 0.38, 0.07), belly=(0.98, 0.90, 0.78), jacket=(0.96, 0.96, 0.94), scarf=(0.75, 0.08, 0.08), pants=(0.12, 0.16, 0.30),
                      stripes=True, ears="pointy", tail="long", hat=True, weapon="pan", eye=(0.25, 0.65, 0.20)),
}
SPEC = SPECS[WHO]


def mat(name, color, rough=0.6, emit=None, emit_k=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = emit_k
    return m


def fur_mat(name, color, stripes=False):
    m = mat(name, color, 0.85)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 220
    n.inputs["Detail"].default_value = 3
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.25
    nt.links.new(n.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    if stripes:  # rayures de chat tigré : bandes ondulées sombres
        tc = nt.nodes.new("ShaderNodeTexCoord")
        w = nt.nodes.new("ShaderNodeTexWave")
        w.wave_type = "BANDS"
        w.bands_direction = "X"
        w.inputs["Scale"].default_value = 5
        w.inputs["Distortion"].default_value = 4
        w.inputs["Detail"].default_value = 2
        nt.links.new(tc.outputs["Object"], w.inputs["Vector"])
        cr = nt.nodes.new("ShaderNodeValToRGB")
        cr.color_ramp.elements[0].position = 0.50
        cr.color_ramp.elements[0].color = (*[c * 0.45 for c in color], 1)
        cr.color_ramp.elements[1].position = 0.56
        cr.color_ramp.elements[1].color = (*color, 1)
        nt.links.new(w.outputs["Fac"], cr.inputs["Fac"])
        nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])
    return m


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def sphere(loc, r, m, scale=(1, 1, 1), seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.object
    o.scale = scale
    o.data.materials.append(m)
    return smooth(o)


def cone(loc, r1, r2, h, m, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.object
    o.data.materials.append(m)
    return smooth(o)


def parent_to_bone(objs, rig, bone):
    """Accroche les objets à un os (ils gardent leur place actuelle)."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    rig.data.bones.active = rig.data.bones[bone]
    bpy.ops.object.parent_set(type="BONE", keep_transform=True)


# ------------------------------------------------------------------ import du squelette et du mannequin
bpy.ops.wm.read_factory_settings(use_empty=True)
import addon_utils

addon_utils.enable("io_scene_gltf2")
bpy.ops.import_scene.gltf(filepath=UAL)
rig = bpy.data.objects["Rig"]
man = bpy.data.objects["Mannequin"]
if "Icosphere" in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects["Icosphere"])
rig.animation_data_create()

M_JACKET = mat("veste", SPEC["jacket"], 0.75)
M_FUR = fur_mat("fourrure", SPEC["fur"], SPEC["stripes"])
M_PANTS = mat("pantalon", SPEC["pants"], 0.8)
M_SHOES = mat("chaussures", (0.06, 0.05, 0.05), 0.5)
M_BELLY = mat("ventre", SPEC["belly"], 0.85)
M_SCARF = mat("foulard", SPEC["scarf"], 0.7)

# ------------------------------------------------------------------ mannequin : sans tête, matières par région
vg = {g.index: g.name for g in man.vertex_groups}


def region(name):
    n = name.replace("DEF-", "")
    if n.startswith(("f_", "thumb", "hand")):
        return 1  # pattes : fourrure
    if n.startswith(("foot", "toe")):
        return 3  # chaussures
    if n.startswith(("thigh", "shin", "hips")):
        return 2  # pantalon
    return 0  # veste (torse, épaules, bras)


me = man.data
me.materials.clear()
for m in (M_JACKET, M_FUR, M_PANTS, M_SHOES):
    me.materials.append(m)
dom = []
for v in me.vertices:
    best = max(v.groups, key=lambda g: g.weight) if v.groups else None
    dom.append(vg[best.group] if best else "DEF-hips")
bm = bmesh.new()
bm.from_mesh(me)
kill = []
for f in bm.faces:
    names = [dom[v.index] for v in f.verts]
    if sum(n in ("DEF-head", "DEF-neck") for n in names) >= 2:
        kill.append(f)
    else:
        from collections import Counter

        f.material_index = region(Counter(names).most_common(1)[0][0])
bmesh.ops.delete(bm, geom=kill, context="FACES")
bm.to_mesh(me)
bm.free()
smooth(man)

# ------------------------------------------------------------------ accessoires fabriqués par code (repère : le squelette au repos, face à -Y)
HEAD_Z = 1.67
head = []
hc = (0, -0.01, HEAD_Z + 0.04)
head.append(sphere(hc, 0.255, M_FUR, scale=(1.12, 0.98, 0.95)))                    # crâne
head.append(sphere((0, -0.19, HEAD_Z - 0.03), 0.105, M_BELLY, scale=(1.15, 0.8, 0.75)))   # museau
head.append(sphere((0, -0.275, HEAD_Z + 0.005), 0.032, mat("nez", (0.95, 0.5, 0.55), 0.4), scale=(1.2, 0.8, 0.8)))
eye_w, eye_b = mat("oeil", (0.98, 0.98, 0.95), 0.2), mat("pupille", (0.02, 0.02, 0.02), 0.2)
eye_c = mat("iris", SPEC["eye"], 0.2)
for sx in (-1, 1):
    head.append(sphere((sx * 0.105, -0.205, HEAD_Z + 0.085), 0.052, eye_w, scale=(1, 0.6, 1.1)))
    head.append(sphere((sx * 0.105, -0.238, HEAD_Z + 0.08), 0.031, eye_c, scale=(1, 0.5, 1.1)))
    head.append(sphere((sx * 0.105, -0.249, HEAD_Z + 0.08), 0.017, eye_b, scale=(1, 0.5, 1.1)))
    # sourcils froncés (air décidé)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * 0.105, -0.235, HEAD_Z + 0.15), rotation=(0, math.radians(-sx * 22), 0))
    br = bpy.context.object
    br.scale = (0.085, 0.02, 0.022)
    br.data.materials.append(mat("sourcil", [c * 0.45 for c in SPEC["fur"]], 0.8))
    head.append(br)
    # oreilles pointues + intérieur rose
    head.append(cone((sx * 0.155, 0.0, HEAD_Z + 0.27), 0.095, 0.01, 0.2, M_FUR, rot=(0, math.radians(sx * 12), 0)))
    head.append(cone((sx * 0.152, -0.025, HEAD_Z + 0.262), 0.06, 0.008, 0.15, mat("oreille", (0.95, 0.60, 0.65), 0.7), rot=(math.radians(-8), math.radians(sx * 12), 0)))
    # moustaches
    for k, ang in enumerate((-12, 0, 12)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.004, depth=0.17, location=(sx * 0.15, -0.235, HEAD_Z - 0.03 + k * 0.012),
                                            rotation=(math.radians(ang), math.radians(90), math.radians(sx * -8)))
        w = bpy.context.object
        w.data.materials.append(mat("moustache", (0.95, 0.95, 0.92), 0.6))
        head.append(w)
# toque de chef
if SPEC["hat"]:
    hat_m = mat("toque", (0.98, 0.98, 0.97), 0.7)
    head.append(cone((0, 0.0, HEAD_Z + 0.255), 0.17, 0.17, 0.09, hat_m))
    head.append(sphere((0, 0.0, HEAD_Z + 0.37), 0.20, hat_m, scale=(1.05, 1.0, 0.95), seg=24))
    head.append(sphere((0.09, 0.02, HEAD_Z + 0.43), 0.12, hat_m, seg=20))
    head.append(sphere((-0.09, 0.02, HEAD_Z + 0.42), 0.12, hat_m, seg=20))
BIG = 1.5   # grosse tête : proportions de dessin animé
for o in head:
    o.location = Vector(hc) + (o.location - Vector(hc)) * BIG
    o.scale = o.scale * BIG
parent_to_bone(head, rig, "DEF-head")

body = []
bpy.ops.mesh.primitive_torus_add(major_radius=0.14, minor_radius=0.05, location=(0, 0.0, 1.50))        # foulard rouge
sc = bpy.context.object
sc.scale = (1.15, 1.0, 0.8)
sc.data.materials.append(M_SCARF)
body.append(smooth(sc))
body.append(sphere((0.0, -0.1, 1.40), 0.055, M_SCARF, scale=(1.4, 0.8, 2.0), seg=16))                   # nœud
parent_to_bone(body, rig, "DEF-spine.003")
# tablier
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.115, 1.10))
ap = bpy.context.object
ap.scale = (0.30, 0.03, 0.34)
ap.data.materials.append(mat("tablier", (0.98, 0.98, 0.97), 0.8))
parent_to_bone([ap], rig, "DEF-spine.001")
# queue
tail_parts = []
path = [(0.13, 0.95), (0.20, 0.93), (0.28, 0.93), (0.35, 0.97), (0.40, 1.05), (0.43, 1.15), (0.43, 1.26), (0.41, 1.36), (0.38, 1.44)]
for i, (y, z) in enumerate(path):
    r = 0.075 - i * 0.004
    tail_parts.append(sphere((0.0, y, z), r, M_FUR if i < len(path) - 1 else M_BELLY, scale=(1, 1.15, 1.15), seg=16))
parent_to_bone(tail_parts, rig, "DEF-hips")

# arme : poêle dans la main droite (la main s'étend vers -X au repos ; on tient le manche, le disque au bout)
weapon = []
iron = mat("fer_poele", (0.05, 0.05, 0.055), 0.4)
iron.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.7
hx, hy, hz = -0.78, 0.065, 1.44
if SPEC["weapon"] == "pan":
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.19, depth=0.045, location=(hx - 0.34, hy, hz), rotation=(0, 0, 0))
    pan = bpy.context.object
    pan.data.materials.append(iron)
    weapon.append(smooth(pan))
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.022, depth=0.28, location=(hx - 0.06, hy, hz), rotation=(0, math.radians(90), 0))
    hd = bpy.context.object
    hd.data.materials.append(mat("manche", (0.30, 0.16, 0.07), 0.7))
    weapon.append(smooth(hd))
parent_to_bone(weapon, rig, "DEF-hand.R")

# ------------------------------------------------------------------ rendu
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 32 if not PREVIEW else 16
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 512
sc.view_settings.view_transform = "Standard"
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.62, 0.66, 0.72, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.9
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-40))
sun.data.energy = 3.2
sun.data.color = (1.0, 0.9, 0.75)
sun.data.angle = math.radians(6)
bpy.ops.object.light_add(type="AREA", location=(-2.5, -3, 2))
fill = bpy.context.object
fill.data.energy = 120
fill.data.size = 3
fill.rotation_euler = (math.radians(70), 0, math.radians(-40))

# l'ensemble tourne de 40 degrés : le personnage regarde vers la droite de l'image, un peu vers nous
pivot = bpy.data.objects.new("pivot", None)
bpy.context.collection.objects.link(pivot)
rig.parent = pivot
for o in bpy.data.objects:
    if o.parent is None and o.type in ("MESH",):
        o.parent = pivot
pivot.rotation_euler = (0, 0, math.radians(YAW))
a = math.radians(90 - TILT)
bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = "ORTHO"
cam.data.ortho_scale = 2.9
tx, ty, tz = 0, 0, 0.95
cam.rotation_euler = (a, 0, 0)
cam.location = (tx, ty - 30 * math.sin(a), tz + 30 * math.cos(a))
cam.data.clip_end = 100
sc.camera = cam
bpy.context.view_layer.update()


def render_frame(path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


todo = {"marche": ANIMS["marche"]} if PREVIEW else ANIMS
for key, act_name in todo.items():
    act = bpy.data.actions[act_name]
    rig.animation_data.action = act
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    n = 3 if PREVIEW else NFR
    for i in range(n):
        fr = f0 + round(i * (f1 - f0) / (n if key in ("idle", "marche", "course") else max(1, n - 1)))
        sc.frame_set(fr)
        render_frame(os.path.join(OUT, f"{WHO}_{key}_{i:02d}.png"))
    print("ANIM", key, act_name, f0, f1, n, flush=True)
print("CHEF OK", WHO)
