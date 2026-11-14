"""Découpe la planche de personnages 3D (reference/3d/personnages-3d.png, fond transparent) en sprites du jeu.
Chaque personnage est réduit à 2 fois la hauteur de son ancien sprite pixel (le jeu l'affiche à moitié : net).
Usage : python3 tools/extract_3d.py
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "public", "assets", "sprites3d")
# ordre de gauche à droite sur la planche -> nom du sprite, hauteur affichée en jeu (pixels de page)
ORDER = [("moustachu", 46), ("tomate", 22), ("champi", 30), ("gelee", 24), ("piment", 28), ("roi_tomate", 84)]

im = Image.open(os.path.join(ROOT, "reference", "3d", "personnages-3d.png")).convert("RGBA")
alpha = np.array(im)[:, :, 3] > 40
lab, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=6))
boxes = [s for s in ndimage.find_objects(lab) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 4000]
boxes.sort(key=lambda s: s[1].start)
assert len(boxes) == len(ORDER), f"{len(boxes)} personnages trouvés au lieu de {len(ORDER)}"
os.makedirs(OUT, exist_ok=True)
for (name, h), s in zip(ORDER, boxes):
    crop = im.crop((s[1].start, s[0].start, s[1].stop, s[0].stop))
    th = h * 2
    crop = crop.resize((max(1, round(crop.width * th / crop.height)), th), Image.LANCZOS)
    crop.save(os.path.join(OUT, name + ".png"))
    print(name, crop.size)
