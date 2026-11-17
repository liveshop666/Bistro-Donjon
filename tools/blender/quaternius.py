"""Chargeur des modèles 3D libres « Ultimate Stylized Nature » (Quaternius, CC0) pour les scènes Blender.

Les modèles ne sont PAS dans le dépôt du jeu : ils sont lus depuis un dossier (variable QUAT_DIR, ou le dossier par défaut
ci-dessous). Ce sont des fichiers de données (FBX + images) : rien n'est exécuté, on les ouvre dans Blender.
Les images finales du jeu sont des rendus de ces modèles (c'est ce qui est publié).

Usage dans une scène :
    import quaternius as Q
    Q.place("PineTree_1", x, y, height=4.0, rot=1.2)      # copie du modèle posée à (x, y), haute de 4 unités
"""
import math
import os
import re

import bpy

DEFAULT = "/home/user/walterpalladino/godot-quaternius-ultimate-stylized-nature/ultimate-stylized-nature/sources"
ROOT = os.environ.get("QUAT_DIR", DEFAULT)
FBX = os.path.join(ROOT, "FBX")
TEX = os.path.join(ROOT, "Textures")
# matériaux dont le dessin est une feuille découpée (transparence « tout ou rien » à 0,5, comme dans le pack d'origine)
CUTOUT = ("Leaves", "Flowers", "Petals", "Bush_Leaves")
# teinte par matériau (multiplie la couleur du dessin) : forêt plus sombre et plus verte, comme la peinture de Rudy
TINT = {"PineTree_Leaves": (0.55, 0.82, 0.55), "NormalTree_Leaves": (0.85, 0.95, 0.85), "Bush_Leaves": (0.85, 0.95, 0.85)}
_protos = {}
_texcache = {}


def _fix_material(m):
    base = re.sub(r"\.\d+$", "", m.name)
    base = {"Rock": "Rocks"}.get(base, base)
    path = os.path.join(TEX, base + ".png")
    if not os.path.exists(path):
        return
    img = _texcache.get(path) or bpy.data.images.load(path)
    _texcache[path] = img
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = 0.85
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img
    t.interpolation = "Smart"
    tint = TINT.get(base)
    if tint:
        mx = nt.nodes.new("ShaderNodeMix")
        mx.data_type = "RGBA"
        mx.blend_type = "MULTIPLY"
        mx.inputs[0].default_value = 1.0
        mx.inputs[7].default_value = (*tint, 1)
        nt.links.new(t.outputs["Color"], mx.inputs[6])
        nt.links.new(mx.outputs[2], b.inputs["Base Color"])
    else:
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    if any(k in base for k in CUTOUT):
        cut = nt.nodes.new("ShaderNodeMath")
        cut.operation = "GREATER_THAN"
        cut.inputs[1].default_value = 0.5
        nt.links.new(t.outputs["Alpha"], cut.inputs[0])
        nt.links.new(cut.outputs[0], b.inputs["Alpha"])
        m.blend_method = "CLIP" if hasattr(m, "blend_method") else None
        # les feuilles se voient des deux côtés : rien à régler dans Cycles (BSDF des deux faces)
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])


def load(name):
    """Importe un modèle une seule fois (caché, base posée à z = 0, centré), le garde pour les copies."""
    if name in _protos:
        return _protos[name]
    import addon_utils
    addon_utils.enable("io_scene_fbx")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(FBX, name + ".fbx"))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in meshes:  # les modèles viennent d'un moteur où « haut » = Y : un quart de tour pour les mettre debout
        o.rotation_euler.x -= math.pi / 2
    bpy.ops.object.select_all(action="DESELECT")
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for o in new:
        if o.type != "MESH":
            bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    proto = bpy.context.view_layer.objects.active
    proto.parent = None
    for m in proto.data.materials:
        if m:
            _fix_material(m)
    # origine : milieu du pied de l'arbre
    pts = [proto.matrix_world @ v.co for v in proto.data.vertices]
    zmin = min(p.z for p in pts)
    cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2
    cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
    h = max(p.z for p in pts) - zmin
    for v in proto.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= zmin
    proto.location = (0, 0, 0)
    proto.hide_render = True
    proto.hide_viewport = True
    _protos[name] = (proto, h)
    return _protos[name]


def place(name, x, y, z=0.0, height=None, scale=1.0, rot=0.0):
    """Pose une copie (même maillage) du modèle. height : hauteur voulue en unités ; sinon scale."""
    proto, h = load(name)
    o = proto.copy()
    bpy.context.collection.objects.link(o)
    o.hide_render = False
    o.hide_viewport = False
    s = (height / h) if height else scale
    o.scale = (s, s, s)
    o.location = (x, y, z)
    o.rotation_euler = (0, 0, rot)
    return o
