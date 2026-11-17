"""Personnage en 3D aux proportions de dessin animé (grosse tête, corps court), monté sur le squelette libre de Quaternius (CC0).

Le squelette humain de la bibliothèque (53 os, 46 animations de capture de mouvement : marche, course, attaque, coup reçu, mort...)
est raccourci aux proportions du personnage (jambes courtes, bras courts) ; les animations s'y appliquent telles quelles.
Le corps est fabriqué par code (formes arrondies accrochées aux os) pour ressembler au personnage dessiné d'origine.

Usage (Blender comme module Python) :
    python3 -I tools/blender/chef.py -- <dossier_sortie> <chef> <apercu|toutes> [taille_image]
Sortie : <dossier>/<chef>_<animation>_<NN>.png (fond transparent)
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

UAL = os.environ.get("UAL_GLTF", "/home/user/j-ponzo/gltf-universal-animation-library/glTF/AnimationLibrary_Godot_Standard.gltf")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "/tmp/chef_out"
WHO = argv[1] if len(argv) > 1 else "moustachu"
MODE = argv[2] if len(argv) > 2 else "apercu"
SIZE = int(argv[3]) if len(argv) > 3 else 640
os.makedirs(OUT, exist_ok=True)

TILT = 30   # hauteur de la caméra au-dessus de l'horizon : plus basse que la carte (60 degrés) pour que le visage reste lisible
YAW = 30    # il regarde vers la droite de l'image, un peu vers nous
DENS = 3        # pixels rendus par pixel de la carte (la carte : 100 px par unité) : le personnage reste net même zoomé
CHAR_SCALE = 0.31   # taille du personnage par rapport à la carte : environ 56 px de haut sur la carte de 1680 px (comme dans le jeu)
ANIMS = {"idle": "Idle_Loop", "marche": "Walk_Loop", "course": "Jog_Fwd_Loop", "attaque": "Sword_Attack", "touche": "Hit_Chest", "mort": "Death01"}

SPECS = {
    "moustachu": dict(fur=(0.80, 0.30, 0.04), light=(0.95, 0.66, 0.38), apron=(0.93, 0.82, 0.62), scarf=(0.80, 0.10, 0.08),
                      hat=(0.97, 0.92, 0.80), ear_in=(0.95, 0.55, 0.60), eye=(0.55, 0.28, 0.05), tail_tip=(0.98, 0.92, 0.80)),
}
SPEC = SPECS[WHO]


# ------------------------------------------------------------------ outils
def mat(name, color, rough=0.7, bump=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    if bump:  # fourrure : reflet duveteux, lumière qui traverse un peu le poil, grain fin
        b.inputs["Sheen Weight"].default_value = 0.7
        b.inputs["Sheen Roughness"].default_value = 0.35
        b.inputs["Subsurface Weight"].default_value = 0.18
        b.inputs["Subsurface Radius"].default_value = (0.6, 0.25, 0.1)
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = 260
        n.inputs["Detail"].default_value = 4
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        nt.links.new(n.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def ball(loc, r, m, scale=(1, 1, 1), seg=28):
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


def capsule(p0, p1, r0, r1, m):
    """Membre arrondi entre deux points (cylindre conique + deux boules)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    mid = (p0 + p1) / 2
    rot = d.to_track_quat("Z", "Y").to_euler()
    return [cone(mid, r0, r1, d.length, m, rot=rot, verts=28), ball(p0, r0, m, seg=20), ball(p1, r1, m, seg=20)]


def attach(objs, rig, bone):
    """Accroche les objets à un os (ils gardent leur place)."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    rig.data.bones.active = rig.data.bones[bone]
    bpy.ops.object.parent_set(type="BONE", keep_transform=True)


# ------------------------------------------------------------------ squelette aux proportions du personnage
bpy.ops.wm.read_factory_settings(use_empty=True)
import addon_utils

addon_utils.enable("io_scene_gltf2")
bpy.ops.import_scene.gltf(filepath=UAL)
rig = bpy.data.objects["Rig"]
for n in ("Mannequin", "Icosphere"):
    if n in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[n])
rig.animation_data_create()

Z_MAP = [(0, 0), (0.104, 0.07), (0.53, 0.20), (0.93, 0.38), (1.0, 0.42), (1.315, 0.60), (1.441, 0.68), (1.488, 0.72), (1.569, 0.76), (1.651, 0.80), (3.0, 1.2)]


def mz(z):
    for (a, b), (c, d) in zip(Z_MAP, Z_MAP[1:]):
        if z <= c:
            return b + (d - b) * (z - a) / (c - a)
    return z


def mp(p, name):
    x, y, z = p
    ax = abs(x)
    leg = any(k in name for k in ("thigh", "shin", "foot", "toe"))
    if ax > 0.19 and not leg:
        x = math.copysign(0.19 + (ax - 0.19) * 0.52, x)   # bras courts
    if leg:
        x *= 1.55                                           # jambes plus écartées
    return Vector((x, y * 0.85, mz(z)))


bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
for eb in rig.data.edit_bones:
    h, t = eb.head.copy(), eb.tail.copy()
    eb.head, eb.tail = mp(h, eb.name), mp(t, eb.name)
bpy.ops.object.mode_set(mode="OBJECT")


def JOINT(n, end="head"):
    return Vector(getattr(rig.data.bones[n], end + "_local"))


LOC_K = 0.5   # les déplacements du bassin dans les animations sont réduits comme les jambes
for act in bpy.data.actions:
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    if fc.data_path.endswith(".location"):
                        for kp in fc.keyframe_points:
                            kp.co.y *= LOC_K
                            kp.handle_left.y *= LOC_K
                            kp.handle_right.y *= LOC_K
                        fc.update()

FUR = mat("fourrure", SPEC["fur"], 0.9, bump=0.18)
LIGHT = mat("poil_clair", SPEC["light"], 0.9, bump=0.15)
APRON = mat("tablier", SPEC["apron"], 0.85)
SCARF = mat("foulard", SPEC["scarf"], 0.7)
HAT = mat("toque", SPEC["hat"], 0.8)
PINK = mat("rose", SPEC["ear_in"], 0.7)
DARK = mat("sombre", (0.10, 0.05, 0.03), 0.4)
BROW = mat("sourcil", [c * 0.55 for c in SPEC["fur"]], 0.8)

# ------------------------------------------------------------------ corps (formes arrondies accrochées aux os)
attach([ball((0, 0, 0.40), 0.23, FUR, scale=(1.05, 0.95, 0.85))], rig, "DEF-hips")
torso = [ball((0, 0, 0.56), 0.28, FUR, scale=(1.0, 0.85, 1.0)), ball((0, -0.12, 0.52), 0.21, LIGHT, scale=(1.0, 0.7, 1.05))]
attach(torso, rig, "DEF-spine.002")
# tablier : plaque arrondie devant le ventre, bord bas festonné
apron = [ball((0, -0.20, 0.47), 0.21, APRON, scale=(1.0, 0.16, 1.0))]
for i in range(5):
    apron.append(ball((-0.16 + i * 0.08, -0.215, 0.29), 0.055, APRON, scale=(1, 0.3, 1)))
attach(apron, rig, "DEF-spine.001")
# foulard rouge + nœud
scarf = []
bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.06, location=(0, -0.01, 0.73))
t = bpy.context.object
t.scale = (1.15, 0.95, 0.8)
t.data.materials.append(SCARF)
scarf.append(smooth(t))
for sx in (-1, 1):
    scarf.append(ball((sx * 0.07, -0.19, 0.70), 0.065, SCARF, scale=(1.3, 0.7, 1.0)))
    scarf.append(cone((sx * 0.09, -0.20, 0.62), 0.055, 0.015, 0.16, SCARF, rot=(math.radians(-8), 0, math.radians(sx * 12))))
scarf.append(ball((0, -0.205, 0.70), 0.045, SCARF))
attach(scarf, rig, "DEF-spine.003")

# bras : fourrure orange, patte arrondie à trois doigts
for s in ("L", "R"):
    ua, fa, ha = JOINT(f"DEF-upper_arm.{s}"), JOINT(f"DEF-forearm.{s}"), JOINT(f"DEF-hand.{s}")
    fa_e = JOINT(f"DEF-forearm.{s}", "tail")
    attach(capsule(ua, fa, 0.085, 0.075, FUR), rig, f"DEF-upper_arm.{s}")
    attach(capsule(fa, fa_e, 0.075, 0.07, FUR), rig, f"DEF-forearm.{s}")
    paw = [ball(ha, 0.105, FUR, scale=(1.1, 1.0, 1.0))]
    for k in (-1, 0, 1):
        paw.append(ball(ha + Vector((math.copysign(0.07, ha.x), -0.045, 0.04 * k)), 0.04, LIGHT, seg=14))
    attach(paw, rig, f"DEF-hand.{s}")
# jambes : cuisses, mollets, grands pieds ronds avec orteils
for s in ("L", "R"):
    th, sh, ft = JOINT(f"DEF-thigh.{s}"), JOINT(f"DEF-shin.{s}"), JOINT(f"DEF-foot.{s}")
    sh_e = JOINT(f"DEF-shin.{s}", "tail")
    attach(capsule(th, sh, 0.12, 0.10, FUR), rig, f"DEF-thigh.{s}")
    attach(capsule(sh, sh_e, 0.10, 0.09, FUR), rig, f"DEF-shin.{s}")
    foot = [ball(Vector((ft.x, ft.y - 0.07, 0.055)), 0.13, FUR, scale=(0.95, 1.4, 0.62))]
    for k in (-1, 0, 1):
        foot.append(ball(Vector((ft.x + 0.055 * k, ft.y - 0.20, 0.045)), 0.04, LIGHT, scale=(1, 1, 0.85), seg=14))
    attach(foot, rig, f"DEF-foot.{s}")
# queue : orange, bout crème, qui remonte
tail = []
path = [(0.15, 0.36), (0.25, 0.33), (0.36, 0.35), (0.44, 0.42), (0.48, 0.52), (0.47, 0.62), (0.43, 0.70), (0.38, 0.76)]
for i, (y, z) in enumerate(path):
    tail.append(ball((0, y, z), 0.085 - i * 0.003, FUR, scale=(1, 1.1, 1.1), seg=18))
tail.append(ball((0, 0.36, 0.80), 0.075, mat("bout_queue", SPEC["tail_tip"], 0.85), seg=18))
attach(tail, rig, "DEF-hips")

# ------------------------------------------------------------------ tête : grande, ronde, joues touffues, grandes oreilles, grands yeux
HC = Vector((0, 0.0, 1.07))
head = [ball(HC, 0.40, FUR, scale=(1.18, 0.92, 0.86), seg=40)]
head.append(ball(HC + Vector((0, -0.25, -0.12)), 0.20, LIGHT, scale=(1.25, 0.8, 0.8)))     # museau et menton clairs
for sx in (-1, 1):
    head.append(ball(HC + Vector((sx * 0.085, -0.285, -0.105)), 0.085, LIGHT, scale=(1.0, 0.75, 0.85)))   # coussinets des moustaches
head.append(ball(HC + Vector((0, -0.335, -0.075)), 0.045, mat("nez", (0.55, 0.24, 0.14), 0.35), scale=(1.25, 0.7, 0.8), seg=16))
head.append(ball(HC + Vector((0, -0.322, -0.115)), 0.03, mat("nez_bas", (0.20, 0.09, 0.06), 0.4), scale=(0.5, 0.5, 1.4), seg=10))
# bouche ouverte : ligne sombre en cœur, langue rose
head.append(ball(HC + Vector((0, -0.318, -0.185)), 0.065, mat("bouche", (0.28, 0.07, 0.07), 0.5), scale=(1.5, 0.55, 0.8), seg=16))
head.append(ball(HC + Vector((0, -0.340, -0.205)), 0.048, mat("langue", (0.97, 0.45, 0.52), 0.45), scale=(1.2, 0.55, 0.75), seg=14))
WHITE = mat("blanc", (0.97, 0.95, 0.90), 0.2)
IRIS = mat("iris", SPEC["eye"], 0.2)
GLINT = mat("reflet", (1, 1, 1), 0.1)
WHISK = mat("moustache", (0.99, 0.96, 0.90), 0.6)
STRIPE = mat("rayure", [c * 0.45 for c in SPEC["fur"]], 0.9)
for sx in (-1, 1):
    # joues touffues : deux rangs de houppes vers l'extérieur et vers le bas
    for k, (dz, ang, ln) in enumerate(((0.04, 45, 0.20), (-0.02, 65, 0.22), (-0.09, 85, 0.20), (-0.02, 55, 0.17), (-0.06, 60, 0.18))):
        head.append(cone(HC + Vector((sx * (0.45 - 0.03 * (k == 4)), -0.07 - 0.04 * (k == 4), -0.02 + dz)), 0.075, 0.0, ln, FUR, rot=(0, math.radians(sx * ang), 0), verts=14))
    # oreilles : grandes et pointues, intérieur rose, houppes de poils
    head.append(cone(HC + Vector((sx * 0.36, 0.02, 0.27)), 0.19, 0.02, 0.36, FUR, rot=(0, math.radians(sx * 28), 0), verts=28))
    head.append(cone(HC + Vector((sx * 0.355, -0.07, 0.25)), 0.125, 0.015, 0.29, PINK, rot=(math.radians(-8), math.radians(sx * 28), 0), verts=24))
    for k in range(3):
        head.append(cone(HC + Vector((sx * (0.31 + 0.025 * k), -0.09, 0.15 + 0.045 * k)), 0.022, 0.0, 0.10, LIGHT, rot=(math.radians(-70), math.radians(sx * (20 + 8 * k)), 0), verts=8))
    # yeux : grands, ambrés, avec reflets, paupières du haut baissées (regard décidé), sourcils épais froncés
    head.append(ball(HC + Vector((sx * 0.17, -0.31, 0.06)), 0.12, WHITE, scale=(1.0, 0.45, 1.05)))
    head.append(ball(HC + Vector((sx * 0.165, -0.348, 0.05)), 0.09, IRIS, scale=(1.0, 0.45, 1.1)))
    head.append(ball(HC + Vector((sx * 0.165, -0.38, 0.05)), 0.048, DARK, scale=(1.0, 0.4, 1.1)))
    head.append(ball(HC + Vector((sx * 0.14, -0.395, 0.09)), 0.022, GLINT, seg=10))
    head.append(ball(HC + Vector((sx * 0.19, -0.395, 0.02)), 0.011, GLINT, seg=8))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.125, location=HC + Vector((sx * 0.17, -0.322, 0.145)), segments=24, ring_count=12)
    lid = bpy.context.object                      # paupière : coque de fourrure sur le haut de l'œil, inclinée vers le nez
    lid.scale = (1.0, 0.40, 0.36)
    lid.rotation_euler = (0, math.radians(-sx * 18), 0)
    lid.data.materials.append(FUR)
    head.append(smooth(lid))
    for k in range(3):                            # sourcil : trois poils épais inclinés
        bpy.ops.mesh.primitive_cube_add(size=1, location=HC + Vector((sx * (0.12 + 0.05 * k), -0.335, 0.20 - 0.012 * k * -sx * 0 + 0.018 * k)), rotation=(0, math.radians(-sx * (30 - 6 * k)), 0))
        br = bpy.context.object
        br.scale = (0.11, 0.045, 0.04)
        br.data.materials.append(BROW)
        head.append(smooth(br))
    for k, ang in enumerate((-16, 0, 16)):        # moustaches fines et longues
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0055, depth=0.30, location=HC + Vector((sx * 0.30, -0.31, -0.10 + k * 0.03)),
                                            rotation=(math.radians(ang), math.radians(90), math.radians(sx * -12)))
        w_ = bpy.context.object
        w_.data.materials.append(WHISK)
        head.append(w_)
# rayures du front (tabby) visibles sous la toque
for k, dx in enumerate((-0.10, 0, 0.10)):
    head.append(ball(HC + Vector((dx, -0.30, 0.25)), 0.03, STRIPE, scale=(0.5, 0.4, 2.0), seg=10))
# houppe de poils crème sous le foulard (poitrail)
for k in range(5):
    head.append(cone(HC + Vector((-0.12 + 0.06 * k, -0.28, -0.36)), 0.05, 0.0, 0.14, LIGHT, rot=(math.radians(160), 0, 0), verts=8))
# toque : bandeau plissé et gros dôme gonflé
head.append(cone(HC + Vector((0, 0.0, 0.34)), 0.27, 0.26, 0.20, HAT, verts=36))
for (dx, dy, dz, r) in ((0, 0, 0.62, 0.26), (0.15, 0.04, 0.60, 0.18), (-0.15, 0.04, 0.60, 0.18), (0, 0.1, 0.62, 0.16), (0, -0.07, 0.64, 0.18)):
    head.append(ball(HC + Vector((dx, dy, dz)), r, HAT, seg=24))
attach(head, rig, "DEF-head")

# poêle dans la patte droite
iron = mat("fer", (0.07, 0.07, 0.075), 0.35)
iron.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.8
hr = JOINT("DEF-hand.R")
pan = []
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.19, depth=0.05, location=hr + Vector((-0.34, 0, 0)))
pn = bpy.context.object
pn.data.materials.append(iron)
pan.append(smooth(pn))
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.03, depth=0.26, location=hr + Vector((-0.10, 0, 0)), rotation=(0, math.radians(90), 0))
hd = bpy.context.object
hd.data.materials.append(mat("manche", (0.30, 0.16, 0.07), 0.7))
pan.append(smooth(hd))
attach(pan, rig, "DEF-hand.R")

# ------------------------------------------------------------------ rendu
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 20 if MODE in ("apercu", "video") else 40
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = SIZE
sc.view_settings.view_transform = "Standard"
wd = bpy.data.worlds.new("w")
sc.world = wd
wd.use_nodes = True
wd.node_tree.nodes["Background"].inputs["Color"].default_value = (0.70, 0.72, 0.78, 1)
wd.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.45
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.rotation_euler = (math.radians(55), math.radians(15), math.radians(-35))
sun.data.energy = 2.0
sun.data.color = (1.0, 0.92, 0.80)
sun.data.angle = math.radians(8)
bpy.ops.object.light_add(type="AREA", location=(-2.0, -3.0, 1.8))
fl = bpy.context.object
fl.data.energy = 50
fl.data.size = 3
fl.rotation_euler = (math.radians(75), 0, math.radians(-35))

pivot = bpy.data.objects.new("pivot", None)
bpy.context.collection.objects.link(pivot)
rig.parent = pivot
for o in bpy.data.objects:
    if o.parent is None and o.type == "MESH":
        o.parent = pivot
pivot.rotation_euler = (0, 0, math.radians(YAW))
pivot.scale = (CHAR_SCALE, CHAR_SCALE, CHAR_SCALE)
a = math.radians(90 - TILT)
bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = "ORTHO"
cam.data.ortho_scale = SIZE * 0.01 / DENS
cam.rotation_euler = (a, 0, 0)
TARGET_Z = 0.26
cam.location = (0, -30 * math.sin(a), TARGET_Z + 30 * math.cos(a))
cam.data.clip_end = 100
sc.camera = cam
bpy.context.view_layer.update()

FPS = 30   # images par seconde de la vidéo (les mouvements enregistrés sont à 24 : Blender calcule les images intermédiaires)
# (clé, action, nombre de cycles) pour la vidéo ; la course utilise le sprint (cycle court = rapide)
VIDEO = [("marche", "Walk_Loop", 2), ("course", "Sprint_Loop", 4), ("attaque", "Sword_Attack", 1)]
if MODE == "apercu":
    todo = [("marche", "Walk_Loop", 1)]
elif MODE == "video":
    todo = VIDEO
else:
    todo = [(k, ANIMS[k], 1) for k in ANIMS]
print("PIEDS", SIZE / 2, SIZE / 2 + TARGET_Z * math.cos(math.radians(TILT)) / (0.01 / DENS), flush=True)
for key, act_name, cycles in todo:
    act = bpy.data.actions[act_name]
    rig.animation_data.action = act
    f0, f1 = act.frame_range
    per_cycle = max(1, round((f1 - f0) / 24 * FPS))       # images vidéo pour un cycle
    n = per_cycle * cycles
    if MODE == "apercu":
        n = 1
    for i in range(n):
        fr = f0 + ((i % per_cycle) / per_cycle) * (f1 - f0) if key in ("marche", "course", "idle") else f0 + (i / max(1, per_cycle - 1)) * (f1 - f0)
        if key not in ("marche", "course", "idle"):
            fr = f0 + min(1.0, (i % per_cycle) / max(1, per_cycle - 1)) * (f1 - f0)
        sc.frame_set(int(fr), subframe=fr - int(fr))
        sc.render.filepath = os.path.join(OUT, f"{WHO}_{key}_{i:03d}.png")
        bpy.ops.render.render(write_still=True)
    print("ANIM", key, act_name, round(f0), round(f1), n, flush=True)
print("CHEF OK", WHO)
