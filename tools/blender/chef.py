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
SIZE = int(argv[3]) if len(argv) > 3 else 512
os.makedirs(OUT, exist_ok=True)

TILT = 22   # hauteur de la caméra au-dessus de l'horizon : le personnage est vu presque de face, comme dans les dessins
YAW = 30    # il regarde vers la droite de l'image, un peu vers nous
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
    if bump:
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
head = [ball(HC, 0.40, FUR, scale=(1.18, 0.92, 0.86), seg=36)]
head.append(ball(HC + Vector((0, -0.25, -0.12)), 0.20, LIGHT, scale=(1.25, 0.8, 0.8)))     # museau et menton clairs
head.append(ball(HC + Vector((0, -0.335, -0.075)), 0.042, mat("nez", (0.45, 0.22, 0.12), 0.4), scale=(1.2, 0.7, 0.8), seg=14))
head.append(ball(HC + Vector((0, -0.31, -0.16)), 0.05, mat("langue", (0.95, 0.45, 0.50), 0.5), scale=(1.2, 0.6, 0.8), seg=14))
WHITE = mat("blanc", (0.97, 0.95, 0.90), 0.2)
IRIS = mat("iris", SPEC["eye"], 0.2)
GLINT = mat("reflet", (1, 1, 1), 0.1)
WHISK = mat("moustache", (0.98, 0.95, 0.88), 0.6)
for sx in (-1, 1):
    # joues touffues : trois pointes vers l'extérieur
    for k, (dz, ang) in enumerate(((0.0, 60), (-0.07, 90), (-0.14, 120))):
        head.append(cone(HC + Vector((sx * 0.43, -0.08, -0.04 + dz)), 0.07, 0.0, 0.16, FUR, rot=(0, math.radians(sx * ang), 0), verts=14))
    # oreilles : grandes et pointues, intérieur rose
    head.append(cone(HC + Vector((sx * 0.36, 0.02, 0.27)), 0.19, 0.02, 0.36, FUR, rot=(0, math.radians(sx * 28), 0), verts=28))
    head.append(cone(HC + Vector((sx * 0.355, -0.07, 0.25)), 0.12, 0.015, 0.28, PINK, rot=(math.radians(-8), math.radians(sx * 28), 0), verts=24))
    # yeux : grands, ambrés, sourcils froncés
    head.append(ball(HC + Vector((sx * 0.17, -0.31, 0.06)), 0.115, WHITE, scale=(1.0, 0.45, 1.05)))
    head.append(ball(HC + Vector((sx * 0.165, -0.345, 0.05)), 0.085, IRIS, scale=(1.0, 0.45, 1.1)))
    head.append(ball(HC + Vector((sx * 0.165, -0.375, 0.05)), 0.045, DARK, scale=(1.0, 0.4, 1.1)))
    head.append(ball(HC + Vector((sx * 0.145, -0.39, 0.085)), 0.02, GLINT, seg=10))
    bpy.ops.mesh.primitive_cube_add(size=1, location=HC + Vector((sx * 0.17, -0.34, 0.2)), rotation=(0, math.radians(-sx * 24), 0))
    br = bpy.context.object
    br.scale = (0.17, 0.05, 0.045)
    br.data.materials.append(BROW)
    head.append(smooth(br))
    for k, ang in enumerate((-14, 0, 14)):  # moustaches
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.006, depth=0.26, location=HC + Vector((sx * 0.30, -0.32, -0.10 + k * 0.025)),
                                            rotation=(math.radians(ang), math.radians(90), math.radians(sx * -10)))
        w_ = bpy.context.object
        w_.data.materials.append(WHISK)
        head.append(w_)
# toque : bandeau et gros dôme gonflé
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
sc.cycles.samples = 24 if MODE in ("apercu", "video") else 40
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
a = math.radians(90 - TILT)
bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = "ORTHO"
cam.data.ortho_scale = 2.5
cam.rotation_euler = (a, 0, 0)
cam.location = (0, -30 * math.sin(a), 0.85 + 30 * math.cos(a))
cam.data.clip_end = 100
sc.camera = cam
bpy.context.view_layer.update()

todo = {"marche": ANIMS["marche"]} if MODE == "apercu" else ({k: ANIMS[k] for k in ("marche", "course", "attaque")} if MODE == "video" else ANIMS)
for key, act_name in todo.items():
    act = bpy.data.actions[act_name]
    rig.animation_data.action = act
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    frames = [f0 + (f1 - f0) // 3] if MODE == "apercu" else list(range(f0, f1 + (0 if key in ("idle", "marche", "course") else 1)))
    for i, fr in enumerate(frames):
        sc.frame_set(fr)
        sc.render.filepath = os.path.join(OUT, f"{WHO}_{key}_{i:02d}.png")
        bpy.ops.render.render(write_still=True)
    print("ANIM", key, act_name, f0, f1, len(frames), flush=True)
print("CHEF OK", WHO)
