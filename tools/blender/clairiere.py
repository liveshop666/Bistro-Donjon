"""Clairière en vraie 3D (Blender) : même disposition que la carte peinte reference/3d/clairiere-3d.jpg.

Rend une image vue de dessus (caméra orthographique inclinée à 60 degrés) de 1680 x 944 pixels (ou plus).
Aucun modèle téléchargé : tout est construit ici, par code (sol, herbe, arbres, cuisine de camp, étal, troncs, rochers, fleurs).

Usage (Blender comme module Python, rien à installer sur le PC) :
    python3 tools/blender/make_masks.py                      (une fois : plan de la terre)
    <python avec bpy> tools/blender/clairiere.py -- <sortie.png> <échelle 1 = 1680 px> <échantillons>

Repère : 1 unité = 100 pixels de la peinture. P(px, py, z) place un objet à l'endroit (px, py) de la peinture, z = hauteur.
"""
import math
import os
import random
import sys

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "_work")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else os.path.join(WORK, "clairiere.png")
SCALE = float(argv[1]) if len(argv) > 1 else 0.5
SAMPLES = int(argv[2]) if len(argv) > 2 else 24

TILT = 60.0
SIN = math.sin(math.radians(TILT))
IW, IH = 1680, 948  # taille de la peinture d'origine
rnd = random.Random(7)


def P(px, py, z=0.0):
    """Point de la peinture (pixels) -> point du monde 3D."""
    return ((px - IW / 2) / 100.0, -(py - IH / 2) / (100.0 * SIN), z)


# --------------------------------------------------------------------------------------------- matériaux
def mat(name, color, rough=0.65, emit=None, emit_k=0.0, bump=0.0, bump_scale=30.0, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = emit_k
    if bump:
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = bump_scale
        n.inputs["Detail"].default_value = 6
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        nt.links.new(n.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def gradient_mat(name, low, high, zlo, zhi, rough=0.8, noise=0.35, bump=0.35, bump_scale=14.0):
    """Feuillage / bois : couleur qui passe du sombre (bas) au clair (haut) avec du bruit, vue dans le repère de l'objet."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = zlo
    mr.inputs["From Max"].default_value = zhi
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 5.0
    nz.inputs["Detail"].default_value = 4
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    nt.links.new(mr.outputs["Result"], add.inputs[0])
    sc = nt.nodes.new("ShaderNodeMath")
    sc.operation = "MULTIPLY_ADD"
    sc.inputs[1].default_value = noise
    sc.inputs[2].default_value = -noise / 2
    nt.links.new(nz.outputs["Fac"], sc.inputs[0])
    nt.links.new(sc.outputs[0], add.inputs[1])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*low, 1)
    ramp.color_ramp.elements[1].color = (*high, 1)
    nt.links.new(add.outputs[0], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    bn = nt.nodes.new("ShaderNodeTexNoise")
    bn.inputs["Scale"].default_value = bump_scale
    bn.inputs["Detail"].default_value = 8
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump
    nt.links.new(bn.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def put(obj, material, smooth=True):
    obj.data.materials.clear()
    obj.data.materials.append(material)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def cyl(loc, r, h, material, rot=(0, 0, 0), r2=None, verts=20):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    return put(bpy.context.object, material)


def box(loc, size, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    return put(o, material, smooth=False)


def sphere(loc, r, material, scale=(1, 1, 1), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.object
    o.scale = scale
    return put(o, material)


def lump(obj, strength=0.25, size=0.9, seed=1):
    """Surface irrégulière (feuillage, rochers) : modificateur de déplacement par bruit."""
    t = bpy.data.textures.new("lump%d" % seed, "CLOUDS")
    t.noise_scale = size
    t.noise_depth = 3
    d = obj.modifiers.new("lump", "DISPLACE")
    d.texture = t
    d.strength = strength
    d.mid_level = 0.45
    return obj


# --------------------------------------------------------------------------------------------- scène
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.render.resolution_x = int(IW * SCALE)
sc.render.resolution_y = int(944 * SCALE)
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
sc.view_settings.exposure = 0.0

# ciel / lumière d'ambiance : verte et chaude, comme la forêt de la peinture
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
bg = w.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.30, 0.42, 0.26, 1)
bg.inputs["Strength"].default_value = 0.7

# soleil bas et chaud, venant d'en haut à gauche, ombres douces
bpy.ops.object.light_add(type="SUN")
sun = bpy.context.object
sun.rotation_euler = (math.radians(42), math.radians(8), math.radians(-35))
sun.data.energy = 3.0
sun.data.color = (1.0, 0.82, 0.58)
sun.data.angle = math.radians(5)

# caméra orthographique inclinée de 60 degrés : 1 unité = 100 pixels de la peinture
bpy.ops.object.camera_add()
cam = bpy.context.object
a = math.radians(90 - TILT)
cam.rotation_euler = (a, 0, 0)
cam.location = (0, -40 * math.sin(a), 40 * math.cos(a))
cam.data.type = "ORTHO"
cam.data.ortho_scale = IW / 100.0
cam.data.clip_end = 200
sc.camera = cam

# ------------------------------------------------------------------ sol : terre / herbe (forme de la peinture)
GX, GY = IW / 100.0, IH / (100.0 * SIN)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
ground = bpy.context.object
ground.scale = (GX + 8, GY + 8, 1)
gm = bpy.data.materials.new("sol")
gm.use_nodes = True
nt = gm.node_tree
bsdf = nt.nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.92
def image_node(path, ext="EXTEND"):
    n = nt.nodes.new("ShaderNodeTexImage")
    n.image = bpy.data.images.load(path)
    n.image.colorspace_settings.name = "Non-Color"
    n.extension = ext
    n.interpolation = "Cubic"
    return n


# coordonnées du MONDE (position) -> cartes qui couvrent exactement la peinture
wc = nt.nodes.new("ShaderNodeNewGeometry")
mp2 = nt.nodes.new("ShaderNodeMapping")
mp2.inputs["Location"].default_value = (0.5, 0.5, 0)
mp2.inputs["Scale"].default_value = (1 / GX, 1 / GY, 1)
nt.links.new(wc.outputs["Position"], mp2.inputs["Vector"])
dirt = image_node(os.path.join(WORK, "clairiere_dirt.png"))
tracks = image_node(os.path.join(WORK, "clairiere_tracks.png"))
nt.links.new(mp2.outputs["Vector"], dirt.inputs["Vector"])
nt.links.new(mp2.outputs["Vector"], tracks.inputs["Vector"])

# bord de la terre irrégulier : on ajoute du bruit à la carte avant de trancher
edge_noise = nt.nodes.new("ShaderNodeTexNoise")
edge_noise.inputs["Scale"].default_value = 18
edge_noise.inputs["Detail"].default_value = 8
nt.links.new(wc.outputs["Position"], edge_noise.inputs["Vector"])
ev = nt.nodes.new("ShaderNodeMath")
ev.operation = "MULTIPLY_ADD"
ev.inputs[1].default_value = 0.35
ev.inputs[2].default_value = -0.175
nt.links.new(edge_noise.outputs["Fac"], ev.inputs[0])
es = nt.nodes.new("ShaderNodeMath")
es.operation = "ADD"
nt.links.new(dirt.outputs["Color"], es.inputs[0])  # canal rouge de la carte = 0..1
nt.links.new(ev.outputs[0], es.inputs[1])
cut = nt.nodes.new("ShaderNodeMapRange")
cut.inputs["From Min"].default_value = 0.42
cut.inputs["From Max"].default_value = 0.58
nt.links.new(es.outputs[0], cut.inputs["Value"])


def ramp2(c0, c1, fac_out, scale, detail=6, in_node=None):
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = detail
    nt.links.new(wc.outputs["Position"], nz.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].color = (*c0, 1)
    r.color_ramp.elements[1].color = (*c1, 1)
    nt.links.new(nz.outputs["Fac"], r.inputs["Fac"])
    return r


dirt_col = ramp2((0.30, 0.125, 0.035), (0.52, 0.25, 0.085), None, 3.5)
dirt_fine = ramp2((0.78, 0.78, 0.78), (1.22, 1.15, 1.08), None, 90, 3)
dirt_big = ramp2((0.80, 0.78, 0.76), (1.15, 1.10, 1.05), None, 1.1, 3)
grass_col = ramp2((0.07, 0.17, 0.03), (0.22, 0.40, 0.07), None, 7)
dm = nt.nodes.new("ShaderNodeMix")
dm.data_type = "RGBA"
dm.blend_type = "MULTIPLY"
dm.inputs[0].default_value = 1.0
nt.links.new(dirt_col.outputs["Color"], dm.inputs[6])
nt.links.new(dirt_fine.outputs["Color"], dm.inputs[7])
dm2 = nt.nodes.new("ShaderNodeMix")
dm2.data_type = "RGBA"
dm2.blend_type = "MULTIPLY"
dm2.inputs[0].default_value = 1.0
nt.links.new(dm.outputs[2], dm2.inputs[6])
nt.links.new(dirt_big.outputs["Color"], dm2.inputs[7])
fin = nt.nodes.new("ShaderNodeMix")
fin.data_type = "RGBA"
nt.links.new(cut.outputs["Result"], fin.inputs[0])
nt.links.new(grass_col.outputs["Color"], fin.inputs[6])
nt.links.new(dm2.outputs[2], fin.inputs[7])
nt.links.new(fin.outputs[2], bsdf.inputs["Base Color"])
# relief : grain de terre + traces de roues
gb = nt.nodes.new("ShaderNodeTexNoise")
gb.inputs["Scale"].default_value = 140
gb.inputs["Detail"].default_value = 5
nt.links.new(wc.outputs["Position"], gb.inputs["Vector"])
hsum = nt.nodes.new("ShaderNodeMath")
hsum.operation = "SUBTRACT"
nt.links.new(gb.outputs["Fac"], hsum.inputs[0])
tr = nt.nodes.new("ShaderNodeMath")
tr.operation = "MULTIPLY"
tr.inputs[1].default_value = 4.0
nt.links.new(tracks.outputs["Color"], tr.inputs[0])
nt.links.new(tr.outputs[0], hsum.inputs[1])
bmp = nt.nodes.new("ShaderNodeBump")
bmp.inputs["Strength"].default_value = 0.6
nt.links.new(hsum.outputs[0], bmp.inputs["Height"])
nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
put(ground, gm, smooth=False)

# ------------------------------------------------------------------ herbe : des milliers de brins sur la zone d'herbe
mask = bpy.data.images["clairiere_dirt.png"]
mw, mh = mask.size
buf = np.zeros(mw * mh * 4, dtype=np.float32)
mask.pixels.foreach_get(buf)
mpx = buf.reshape(mh, mw, 4)[:, :, 0]


def dirt_at(px, py):
    x = int(min(max(px, 0), IW - 1) * (mw / IW))
    y = int((1 - min(max(py, 0), IH - 1) / IH) * (mh - 1))
    return mpx[y, x]


nrng = np.random.RandomState(3)
blade_pts = []
N = 85000
for _ in range(N):
    px, py = nrng.uniform(-60, IW + 60), nrng.uniform(-60, IH + 60)
    if dirt_at(px, py) < 0.30 or (nrng.rand() < 0.04 and dirt_at(px, py) < 0.7):
        blade_pts.append((px, py))
verts, faces, cols = [], [], []
for (px, py) in blade_pts:
    x, y, _z = P(px, py)
    hgt = nrng.uniform(0.09, 0.22)
    wid = nrng.uniform(0.020, 0.04)
    ang = nrng.uniform(0, math.tau)
    lean = nrng.uniform(0.0, 0.07)
    dx, dy = math.cos(ang), math.sin(ang)
    i = len(verts)
    verts += [(x - dx * wid, y - dy * wid, 0.0), (x + dx * wid, y + dy * wid, 0.0), (x + dy * lean, y - dx * lean, hgt)]
    faces.append((i, i + 1, i + 2))
    g = nrng.uniform(0.75, 1.15)
    cols += [(0.05 * g, 0.12 * g, 0.02 * g), (0.05 * g, 0.12 * g, 0.02 * g), (0.30 * g, 0.50 * g, 0.10 * g)]
me = bpy.data.meshes.new("herbe")
me.from_pydata(verts, [], faces)
me.update()
ca = me.color_attributes.new("c", "FLOAT_COLOR", "POINT")
for i, c in enumerate(cols):
    ca.data[i].color = (*c, 1)
grass_obj = bpy.data.objects.new("herbe", me)
bpy.context.collection.objects.link(grass_obj)
gmat = bpy.data.materials.new("brin")
gmat.use_nodes = True
gn = gmat.node_tree
at = gn.nodes.new("ShaderNodeAttribute")
at.attribute_name = "c"
gb2 = gn.nodes["Principled BSDF"]
gb2.inputs["Roughness"].default_value = 0.8
gn.links.new(at.outputs["Color"], gb2.inputs["Base Color"])
grass_obj.data.materials.append(gmat)

# ------------------------------------------------------------------ matériaux communs
BARK = gradient_mat("ecorce", (0.12, 0.06, 0.03), (0.34, 0.19, 0.09), 0, 4, noise=0.5, bump=0.8, bump_scale=18)
WOOD = mat("bois", (0.42, 0.22, 0.09), 0.7, bump=0.4, bump_scale=60)
WOOD_D = mat("bois_sombre", (0.26, 0.12, 0.05), 0.7, bump=0.4, bump_scale=60)
IRON = mat("fer", (0.05, 0.05, 0.055), 0.45, metal=0.8)
STONE = mat("pierre", (0.26, 0.22, 0.18), 0.9, bump=0.7, bump_scale=12)
DIRT_STONE = mat("caillou", (0.17, 0.11, 0.07), 0.9, bump=0.5, bump_scale=15)
CREAM = mat("creme", (0.86, 0.72, 0.50), 0.8)
BROWNS = mat("rayure", (0.62, 0.34, 0.12), 0.8)


def pine(px, py, h=4.2, r=1.15, seed=0):
    rr = random.Random(seed)
    x, y, _ = P(px, py)
    cyl((x, y, 0.5), 0.14, 1.0, BARK)
    lm = gradient_mat("pin%d" % seed, (0.02, 0.10, 0.04), (0.10, 0.30, 0.08), 0.6, h, noise=0.45, bump=0.6, bump_scale=22)
    n = 5
    for i in range(n):
        z0 = 0.7 + i * (h - 1.0) / n
        rad = r * (1.0 - i / n * 0.8) * rr.uniform(0.92, 1.08)
        depth = (h - 1.0) / n * 1.9
        bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=rad, radius2=0.02, depth=depth, location=(x, y, z0 + depth / 2))
        o = bpy.context.object
        for k, v in enumerate(o.data.vertices):
            if v.co.z < -depth / 2 + 0.01 and (abs(v.co.x) + abs(v.co.y)) > 0.01:  # bord bas : dents irrégulières
                f = 1.18 if k % 2 else 0.88
                v.co.x *= f
                v.co.y *= f
                v.co.z += rr.uniform(-0.12, 0.05)
        put(o, lm)
        lump(o, 0.07, 0.35, seed + i)
        o.rotation_euler = (0, 0, rr.uniform(0, 6.28))
    return


def oak(px, py, s=1.0, seed=0, trunk=1.6):
    rr = random.Random(seed)
    x, y, _ = P(px, py)
    cyl((x, y, trunk / 2 * s), (0.30 if trunk < 3 else 0.5) * s, trunk * s, BARK, r2=0.2 * s)
    for k in range(3):  # grosses branches
        ang = rr.uniform(0, 6.28)
        cyl((x + math.cos(ang) * 0.35 * s, y + math.sin(ang) * 0.35 * s, (trunk + 0.1) * s), 0.09 * s, 1.1 * s, BARK,
            rot=(math.radians(rr.uniform(20, 35)) * math.sin(ang), -math.radians(rr.uniform(20, 35)) * math.cos(ang), 0))
    fm = gradient_mat("feuille%d" % seed, (0.03, 0.14, 0.04), (0.20, 0.42, 0.09), trunk * s, (trunk + 2.8) * s, noise=0.55, bump=0.9, bump_scale=14)
    for k in range(7):
        ox, oy = rr.uniform(-0.9, 0.9) * s, rr.uniform(-0.7, 0.7) * s
        oz = (trunk + 1.1 + rr.uniform(-0.3, 1.0)) * s
        o = sphere((x + ox, y + oy, oz), rr.uniform(0.75, 1.0) * s, fm, seg=28)
        lump(o, 0.32 * s, 0.7, seed * 10 + k)


def log(px, py, length=3.0, rot_deg=0.0, r=0.34):
    x, y, _ = P(px, py)
    z = r
    o = cyl((x, y, z), r, length, BARK, rot=(0, math.radians(90), math.radians(rot_deg)), verts=24)
    # bouts : disque clair avec cernes
    for sgn in (-1, 1):
        ex = x + sgn * math.cos(math.radians(rot_deg)) * length / 2
        ey = y + sgn * math.sin(math.radians(rot_deg)) * length / 2
        cm = mat("cerne", (0.62, 0.42, 0.22), 0.8)
        nt2 = cm.node_tree
        wv = nt2.nodes.new("ShaderNodeTexWave")
        wv.wave_type = "RINGS"
        wv.inputs["Scale"].default_value = 3.5
        wv.inputs["Distortion"].default_value = 1.5
        tcc = nt2.nodes.new("ShaderNodeTexCoord")
        nt2.links.new(tcc.outputs["Object"], wv.inputs["Vector"])
        rp = nt2.nodes.new("ShaderNodeValToRGB")
        rp.color_ramp.elements[0].color = (0.78, 0.55, 0.30, 1)
        rp.color_ramp.elements[1].color = (0.48, 0.28, 0.12, 1)
        nt2.links.new(wv.outputs["Fac"], rp.inputs["Fac"])
        nt2.links.new(rp.outputs["Color"], nt2.nodes["Principled BSDF"].inputs["Base Color"])
        cyl((ex, ey, z), r * 0.97, 0.03, cm, rot=(0, math.radians(90), math.radians(rot_deg)), verts=24)


def rock(px, py, s=0.45, seed=0):
    x, y, _ = P(px, py)
    o = sphere((x, y, s * 0.4), s, STONE, scale=(1.2, 1.0, 0.7), seg=16)
    lump(o, 0.18 * s * 2, 0.6, 500 + seed)


def flowers(px, py, n=7, col=(0.95, 0.55, 0.65)):
    x0, y0, _ = P(px, py)
    leaf = mat("feuillef", (0.08, 0.28, 0.05), 0.8)
    fl = mat("fleur", col, 0.6, emit=col, emit_k=0.15)
    for _ in range(n):
        x, y = x0 + rnd.uniform(-0.3, 0.3), y0 + rnd.uniform(-0.2, 0.2)
        sphere((x, y, 0.07), 0.12, leaf, scale=(1.3, 1.3, 0.5), seg=10)
        sphere((x, y, 0.20), 0.055, fl, seg=10)


# ------------------------------------------------------------------ arbres du pourtour (positions de la peinture)
for i, (px, py, h) in enumerate([(55, 135, 4.4), (215, 85, 4.0), (10, 330, 3.8), (70, 690, 3.9), (120, 805, 4.2), (250, 935, 3.4),
                                 (470, 935, 3.0), (1270, 930, 2.9), (1640, 640, 4.0), (1655, 480, 3.6), (1610, 60, 4.0),
                                 (25, 470, 3.5), (1650, 830, 3.3), (700, 960, 2.8), (60, 25, 3.6)]):
    pine(px, py, h=h, r=0.85, seed=i + 1)
# arbres feuillus du pourtour (petits) et grands troncs de la forêt du haut (feuillage hors cadre)
for i, (px, py, s_) in enumerate([(1215, 150, 0.62), (1615, 255, 0.66), (25, 585, 0.6), (1555, 885, 0.6), (95, 285, 0.36), (118, 372, 0.32),
                                  (1480, 795, 0.34)]):
    oak(px, py, s=s_, seed=i + 20)
for i, (px, py) in enumerate([(430, 70), (590, 55), (1075, 40), (1385, 85), (1525, 120), (300, 40), (850, 20)]):
    oak(px, py, s=0.85, seed=i + 40, trunk=4.6)

# ------------------------------------------------------------------ cuisine de camp : trépied, marmite, feu, tabouret
for (px, py) in [(552, 175), (668, 175)]:
    x, y, _ = P(px, py)
    cyl((x, y, 1.1), 0.07, 2.2, WOOD_D, rot=(math.radians(-6), 0, 0))
bx, by, _ = P(610, 175)
cyl((bx, by, 2.15), 0.06, 1.35, WOOD_D, rot=(0, math.radians(90), 0))
px_, py_, _ = P(608, 182)
for dx in (-0.12, 0.12):  # chaînes
    cyl((px_ + dx, py_, 1.85), 0.012, 0.6, IRON)
pot = sphere((px_, py_, 1.35), 0.55, IRON, scale=(1, 1, 0.8))
cyl((px_, py_, 1.58), 0.50, 0.04, IRON)
soup = mat("soupe", (0.9, 0.38, 0.05), 0.4, emit=(1.0, 0.45, 0.05), emit_k=1.2)
cyl((px_, py_, 1.60), 0.44, 0.02, soup)
bpy.ops.mesh.primitive_torus_add(major_radius=0.52, minor_radius=0.05, location=(px_, py_, 1.58))
put(bpy.context.object, IRON)
# feu + pierres
fx, fy, _ = P(603, 192)
flame = mat("flamme", (1, 0.45, 0.08), 0.5, emit=(1.0, 0.42, 0.05), emit_k=3.5)
core = mat("coeur", (1, 0.8, 0.3), 0.5, emit=(1.0, 0.75, 0.25), emit_k=5)
cyl((fx, fy, 0.35), 0.28, 0.7, flame, r2=0.02, verts=14)
cyl((fx, fy, 0.25), 0.15, 0.5, core, r2=0.02, verts=12)
bpy.ops.object.light_add(type="POINT", location=(fx, fy, 0.6))
bpy.context.object.data.energy = 220
bpy.context.object.data.color = (1.0, 0.55, 0.2)
bpy.context.object.data.shadow_soft_size = 0.3
for k in range(10):
    ang = k / 10 * math.tau
    rx, ry = fx + math.cos(ang) * 0.62, fy + math.sin(ang) * 0.48
    o = sphere((rx, ry, 0.12), 0.17, STONE, scale=(1.2, 1.0, 0.7), seg=12)
    lump(o, 0.05, 0.4, 600 + k)
# tabouret
sx, sy, _ = P(695, 187)
cyl((sx, sy, 0.5), 0.30, 0.08, WOOD)
for dx, dy in [(-0.2, -0.15), (0.2, -0.15), (-0.2, 0.15), (0.2, 0.15)]:
    cyl((sx + dx, sy + dy, 0.24), 0.04, 0.5, WOOD_D)

# ------------------------------------------------------------------ étal : comptoir, poteaux, auvent rayé, bols
cx0, cy0, _ = P(888, 198)
box((cx0, cy0, 0.55), (3.1, 0.75, 1.1), WOOD)                       # comptoir
box((cx0, cy0 - 0.39, 0.55), (3.1, 0.04, 1.0), WOOD_D)              # face avant sombre
box((cx0, cy0 + 0.02, 1.12), (3.2, 0.9, 0.08), WOOD)                # plateau
for k in range(10):                                                  # planches de la face avant
    box((cx0 - 1.4 + k * 0.31, cy0 - 0.42, 0.55), (0.02, 0.02, 1.0), WOOD_D)
for sx_ in (-1.5, 1.5):                                              # poteaux
    cyl((cx0 + sx_, cy0 + 0.62, 1.55), 0.07, 3.1, WOOD_D)
nstripes = 8
TA = math.radians(32)
for i in range(nstripes):                                            # auvent rayé : pente dont l'arrière est plus haut
    w_ = 3.3 / nstripes
    xx = cx0 - 1.65 + w_ * (i + 0.5)
    col = BROWNS if i % 2 == 0 else CREAM
    bpy.ops.mesh.primitive_plane_add(size=1, location=(xx, cy0 + 0.70, 2.62), rotation=(TA, 0, 0))
    pl = bpy.context.object
    pl.scale = (w_, 1.5, 1)
    put(pl, col, smooth=False)
    fy_ = cy0 + 0.70 - 0.75 * math.cos(TA)
    fz_ = 2.62 - 0.75 * math.sin(TA)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=w_ / 2, depth=0.03, location=(xx, fy_, fz_), rotation=(TA, 0, 0))
    put(bpy.context.object, col, smooth=False)
for dx in (-1.15, -0.95):                                            # bols empilés
    cyl((cx0 + dx, cy0 + 0.05, 1.22), 0.17, 0.1, CREAM)
cyl((cx0 + dx, cy0 + 0.05, 1.32), 0.15, 0.1, CREAM)
box((cx0 - 0.35, cy0, 1.18), (0.9, 0.5, 0.05), mat("planche", (0.55, 0.38, 0.2), 0.7))
for dx in (0.5, 0.95):
    sphere((cx0 + dx, cy0, 1.22), 0.17, mat("bolm", (0.45, 0.25, 0.1), 0.5), scale=(1, 1, 0.55))
# tonneau et caisses
tx, ty, _ = P(1068, 150)
bar = sphere((tx, ty, 0.55), 0.42, WOOD, scale=(1, 1, 1.25))
for zz in (0.25, 0.85):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.40, minor_radius=0.025, location=(tx, ty, zz))
    put(bpy.context.object, IRON)
for (px, py, s) in [(1090, 190, 0.7), (1118, 165, 0.55)]:
    x, y, _ = P(px, py)
    box((x, y, s / 2), (s, s, s), WOOD_D)
    for e in (-1, 1):
        box((x + e * s * 0.46, y, s / 2), (0.05, s * 1.02, s * 1.02), WOOD)

# ------------------------------------------------------------------ cailloux sur la terre
pr = random.Random(11)
for k in range(45):
    ppx, ppy = pr.uniform(220, 1500), pr.uniform(260, 880)
    if dirt_at(ppx, ppy) > 0.9:
        x, y, _ = P(ppx, ppy)
        o = sphere((x, y, 0.02), pr.uniform(0.04, 0.11), DIRT_STONE, scale=(1.3, 1.0, 0.5), seg=8)
        lump(o, 0.03, 0.3, 700 + k)

# ------------------------------------------------------------------ troncs, rochers, fleurs
log(315, 212, 3.0, -17)
log(1462, 268, 2.9, 38)
log(295, 828, 2.7, 22)
log(1125, 910, 2.8, -6)
rock(165, 722, 0.38, 1)
rock(1420, 805, 0.42, 2)
rock(820, 275, 0.13, 3)
rock(390, 320, 0.15, 4)
for (px, py, c) in [(175, 235, (0.95, 0.55, 0.65)), (218, 297, (0.95, 0.6, 0.7)), (300, 268, (0.98, 0.75, 0.8)), (1392, 178, (0.95, 0.6, 0.7)),
                    (1530, 372, (0.95, 0.5, 0.6)), (215, 760, (0.98, 0.85, 0.35)), (525, 880, (0.95, 0.55, 0.65)), (1590, 575, (0.95, 0.9, 0.9)),
                    (1320, 885, (0.98, 0.9, 0.9)), (1520, 730, (0.95, 0.55, 0.65)), (1360, 840, (0.98, 0.85, 0.4))]:
    flowers(px, py, 7, c)

sc.render.filepath = OUT
sc.render.image_settings.file_format = "PNG"
bpy.ops.render.render(write_still=True)
print("RENDU OK", OUT)
