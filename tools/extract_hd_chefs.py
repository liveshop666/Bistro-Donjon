"""Découpe les grands dessins des 3 chefs (planche reference/2.jpg) en haute définition, fond transparent.

Usage : python tools/extract_hd_chefs.py
Écrit public/assets/sprites/chefs/hd_<chef>.png (chef en pied) et hdp_<chef>.png (portrait).
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "reference", "2.jpg")
OUT = os.path.join(ROOT, "public", "assets", "sprites", "chefs")

# zones (x0, y0, x1, y1) sur la planche 1408 x 768
FULL = {"moustachu": (30, 25, 360, 270), "shiba": (25, 280, 350, 505), "noisette": (35, 520, 270, 740)}
PORTRAIT = {"moustachu": (552, 42, 711, 221), "shiba": (552, 298, 711, 467), "noisette": (552, 539, 701, 721)}


def cut_out(img: Image.Image) -> Image.Image:
    """Rend transparent le fond blanc relié aux bords, et recadre au plus juste."""
    a = np.asarray(img.convert("RGB")).astype(int)
    white = (a.min(axis=2) > 225) & (a.max(axis=2) - a.min(axis=2) < 25)
    lab, _ = ndimage.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # garder seulement le plus gros morceau (le chef), pas les numéros ni les miettes
    fg_lab, n = ndimage.label(~bg)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(fg_lab), fg_lab, range(1, n + 1))
        keep = 1 + int(np.argmax(sizes))
        big = sizes.max()
        mask = np.isin(fg_lab, [i + 1 for i, s in enumerate(sizes) if s > big * 0.04])
    else:
        mask = ~bg
    rgba = np.dstack([a, (mask * 255)]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    return out.crop(out.getbbox())


sheet = Image.open(SHEET)
for chef, box in FULL.items():
    cut_out(sheet.crop(box)).save(os.path.join(OUT, f"hd_{chef}.png"))
for chef, box in PORTRAIT.items():
    sheet.crop(box).save(os.path.join(OUT, f"hdp_{chef}.png"))
print("ok :", ", ".join(f"hd_{c}" for c in FULL))
