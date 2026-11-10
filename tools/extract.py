"""Découpe les planches de référence en sprites de jeu (fond transparent, mise à l'échelle).

Usage: python3 tools/extract.py <dossier_des_planches>
Les planches attendues sont 1.jpg (animations chat + ennemis), 2.jpg (chefs + bestiaire),
3.jpg (4 mondes), 4.jpg (UI). Les sprites sont écrits dans public/assets/.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from detect import components  # noqa: E402

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")

# nom: (planche, index de composante OU boîte explicite, hauteur cible px, mode de fond, ancre x source ou None)
SPRITES = {
    # Chefs
    "sprites/chefs/moustachu": (2, 0, 46, "white", 145),
    "sprites/chefs/shiba": (2, 11, 46, "white", 145),
    "sprites/chefs/noisette": (2, 29, 46, "white", 150),
    "sprites/chefs/portrait_moustachu": (2, (549, 39, 716, 227), 48, "none", None),
    "sprites/chefs/portrait_shiba": (2, (550, 295, 716, 470), 48, "none", None),
    "sprites/chefs/portrait_noisette": (2, (550, 536, 706, 727), 48, "none", None),
    # Ennemis
    "sprites/enemies/champi": (2, 16, 30, "white", 880),
    "sprites/enemies/tomate": (1, 21, 22, "white", None),
    "sprites/enemies/gelee": (2, 38, 24, "white", None),
    "sprites/enemies/piment": (2, 46, 28, "white", 1160),
    "sprites/enemies/roi_tomate": (2, 5, 84, "white", 1048),
    # UI
    "ui/marmite": (4, 0, 44, "white", None),
    "ui/coeur": (4, 53, 12, "white", None),
    "ui/piece": (4, 11, 12, "white", None),
    "ui/bouton_ultime": (4, 45, 60, "white", None),
    "ui/ing_tomate": (4, (272, 82, 326, 134), 16, "corner", None),
    "ui/ing_champignon": (4, (424, 82, 482, 138), 16, "corner", None),
    "ui/ing_sucre": (4, (565, 532, 609, 580), 16, "white", None),
    "ui/ing_piment": (4, (748, 528, 795, 580), 16, "white", None),
    "ui/ico_poele": (4, 22, 24, "none", None),
    "ui/ico_couteaux": (4, 32, 24, "none", None),
    "ui/ico_bouclier": (4, 29, 24, "none", None),
    "ui/ico_tornade": (4, 30, 24, "none", None),
    "ui/ico_epees": (4, 21, 24, "none", None),
    "ui/ico_etoile": (4, 27, 24, "none", None),
    "ui/ico_sac": (4, 26, 24, "none", None),
    "ui/ico_coeur": (4, 33, 24, "none", None),
    "ui/ico_engrenage": (4, 24, 24, "none", None),
    "ui/ico_rouleau": (4, 31, 24, "none", None),
}

_cache = {}


def sheet(n):
    if n not in _cache:
        _cache[n] = components(os.path.join(SRC, f"{n}.jpg"), 2)
    return _cache[n]


def cut(im, box, mode):
    crop = im.crop(box).convert("RGBA")
    a = np.asarray(crop).copy()
    rgb = a[..., :3].astype(int)
    if mode == "white":
        bg = rgb.min(axis=2) > 232
    elif mode == "corner":
        key = rgb[1, 1]
        bg = np.abs(rgb - key).sum(axis=2) < 70
    else:
        return crop
    lab, _ = ndimage.label(bg)
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    border.discard(0)
    transparent = np.isin(lab, list(border))
    # ronge le liseré clair laissé par la compression JPEG
    for _ in range(2):
        near = ndimage.binary_dilation(transparent)
        halo = near & ~transparent & (rgb.min(axis=2) > 190 if mode == "white" else np.abs(rgb - key).sum(axis=2) < 110)
        transparent |= halo
    # supprime les petits éléments parasites (numéros de planche, éclats isolés)
    lab2, n2 = ndimage.label(~transparent)
    if n2 > 1:
        sizes = ndimage.sum(~transparent, lab2, range(1, n2 + 1))
        small = [i + 1 for i, sz in enumerate(sizes) if sz < 0.04 * sizes.max()]
        transparent |= np.isin(lab2, small)
    a[..., 3] = np.where(transparent, 0, 255)
    out = Image.fromarray(a)
    return out.crop(out.getbbox())


def shrink(img, h):
    w = max(1, round(img.width * h / img.height))
    # alpha prémultiplié pour éviter les franges blanches
    a = np.asarray(img).astype(float)
    a[..., :3] *= a[..., 3:4] / 255
    small = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(float)
    alpha = small[..., 3:4]
    rgb = np.where(alpha > 0, small[..., :3] * 255 / np.maximum(alpha, 1), 0)
    out = np.dstack([np.clip(rgb, 0, 255), np.where(alpha > 110, 255, 0)]).astype(np.uint8)
    return Image.fromarray(out)


anchors = {}
for name, (n, ref, h, mode, ax) in SPRITES.items():
    im, boxes = sheet(n)
    box = boxes[ref] if isinstance(ref, int) else ref
    full = cut(im, box, mode)
    out = shrink(full, h)
    path = os.path.join(OUT, name + ".png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path)
    key = os.path.basename(name)
    if ax is not None:
        anchors[key] = round(min(0.9, max(0.1, (ax - box[0]) / (box[2] - box[0]))), 3)
    print(name, out.size)

# Décors : 4 panneaux verticaux -> 360x640
im3 = Image.open(os.path.join(SRC, "3.jpg")).convert("RGB")
panels = {"clairiere": (0, 346), "marche": (351, 704), "taverne": (709, 1058), "cantine": (1062, 1408)}
os.makedirs(os.path.join(OUT, "maps"), exist_ok=True)
for name, (x0, x1) in panels.items():
    p = im3.crop((x0, 0, x1, 768)).resize((360, 700), Image.LANCZOS).crop((0, 0, 360, 640))
    p.save(os.path.join(OUT, "maps", name + ".png"))
    print("maps/" + name, p.size)

with open(os.path.join(os.path.dirname(__file__), "..", "src", "core", "spriteAnchors.json"), "w") as f:
    json.dump(anchors, f, indent=2)
