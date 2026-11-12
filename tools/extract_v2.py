"""Découpe les planches du 11/11/2026 (chefs combattants, nouveaux monstres, nouvelles cartes) en sprites de jeu.

Usage : python tools/extract_v2.py reference
Planches attendues : 6-chefs-combattants.jpg, 7-cartes.jpg, 8-monstres.jpg (1680 x 944).
Écrit dans public/assets/ et complète src/core/spriteAnchors.json (sans toucher aux autres ancres).
Après l'avoir lancé : vérifier chaque sprite à l'œil.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "public", "assets")

# nom: (planche, boîte dans la planche, hauteur cible en pixels de jeu)
SPRITES = {
    # Chefs combattants (costumes premium : une seule image, animée par code)
    "sprites/skins/skin_taureau": ("6-chefs-combattants", (95, 5, 612, 246), 54),
    "sprites/skins/skin_gorille": ("6-chefs-combattants", (95, 250, 522, 483), 52),
    "sprites/skins/skin_tigre": ("6-chefs-combattants", (85, 486, 548, 701), 50),
    "sprites/skins/skin_ours": ("6-chefs-combattants", (110, 702, 542, 936), 54),
    # Nouveaux monstres
    "sprites/enemies/ail": ("8-monstres", (100, 25, 292, 176), 28),
    "sprites/enemies/aubergine": ("8-monstres", (82, 180, 322, 332), 32),
    "sprites/enemies/mais": ("8-monstres", (90, 340, 262, 486), 30),
    "sprites/enemies/oignon": ("8-monstres", (95, 490, 256, 626), 26),
    "sprites/enemies/citrouille": ("8-monstres", (98, 626, 278, 776), 30),
    "sprites/enemies/hotdog": ("8-monstres", (72, 786, 252, 922), 26),
    "sprites/enemies/roi_fromage": ("8-monstres", (1004, 68, 1500, 536), 90),
    "sprites/enemies/cube_fromage": ("8-monstres", (1204, 568, 1318, 664), 18),
}

# Cartes : 4 panneaux verticaux séparés par des barres noires
MAPS = {"glaciere": (0, 412), "volcan": (425, 836), "bateau": (846, 1256), "bonbons": (1268, 1680)}


def cut(im, box):
    """Recadre et rend le fond blanc transparent (seulement le blanc relié au bord)."""
    crop = im.crop(box).convert("RGBA")
    a = np.asarray(crop).copy()
    rgb = a[..., :3].astype(int)
    bg = rgb.min(axis=2) > 232
    lab, _ = ndimage.label(bg)
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    border.discard(0)
    transparent = np.isin(lab, list(border))
    for _ in range(2):  # ronge le liseré clair laissé par la compression JPEG
        near = ndimage.binary_dilation(transparent)
        transparent |= near & ~transparent & (rgb.min(axis=2) > 190)
    lab2, n2 = ndimage.label(~transparent)
    if n2 > 1:  # supprime les petits éléments parasites (numéros, éclats isolés, voisins coupés)
        sizes = ndimage.sum(~transparent, lab2, range(1, n2 + 1))
        small = [i + 1 for i, sz in enumerate(sizes) if sz < 0.04 * sizes.max()]
        transparent |= np.isin(lab2, small)
    a[..., 3] = np.where(transparent, 0, 255)
    out = Image.fromarray(a)
    return out.crop(out.getbbox())


def shrink(img, h):
    w = max(1, round(img.width * h / img.height))
    a = np.asarray(img).astype(float)
    a[..., :3] *= a[..., 3:4] / 255  # alpha prémultiplié : pas de frange blanche
    small = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(float)
    alpha = small[..., 3:4]
    rgb = np.where(alpha > 0, small[..., :3] * 255 / np.maximum(alpha, 1), 0)
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), np.where(alpha > 110, 255, 0)]).astype(np.uint8))


sheets = {}
anchors = {}
for name, (sheet, box, h) in SPRITES.items():
    if sheet not in sheets:
        sheets[sheet] = Image.open(os.path.join(SRC, sheet + ".jpg")).convert("RGB")
    out = shrink(cut(sheets[sheet], box), h)
    path = os.path.join(OUT, name + ".png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path)
    # ancre = centre des pieds (pixels opaques du bas du sprite)
    al = np.asarray(out)[..., 3]
    xs = np.nonzero(al[int(al.shape[0] * 0.86):].any(axis=0))[0]
    anchors[os.path.basename(name)] = round(float(xs.min() + xs.max() + 1) / 2 / al.shape[1], 3)
    print(name, out.size)

im = Image.open(os.path.join(SRC, "7-cartes.jpg")).convert("RGB")
for name, (x0, x1) in MAPS.items():
    p = im.crop((x0, 0, x1, 944)).resize((360, 770), Image.LANCZOS).crop((0, 0, 360, 640))
    p.save(os.path.join(OUT, "maps", name + ".png"))
    print("maps/" + name, p.size)

apath = os.path.join(ROOT, "src", "core", "spriteAnchors.json")
with open(apath, encoding="utf-8") as f:
    allanchors = json.load(f)
allanchors.update(anchors)
with open(apath, "w", encoding="utf-8") as f:
    json.dump(allanchors, f, indent=2)
print("ancres ajoutées :", anchors)
