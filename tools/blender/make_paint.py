"""Fabrique les images de peinture utilisées par chef.py : la tête (visage, oreilles, toque) et le plastron (foulard, tablier) d'un personnage,
recadrés dans sa peinture d'origine (public/assets/sprites3d/<chef>.png) et dont les couleurs sont étalées au-delà du contour.
Sortie : tools/blender/_work/<chef>_tete.png et <chef>_plastron.png (dossier ignoré par git : à refaire avec cette commande).
Usage : python3 tools/blender/make_paint.py moustachu
Les zones (en pixels de la peinture agrandie, 440 x 552 pour Moustachu) sont dans ZONES ; pour un autre chef, ajouter une entrée.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUT = os.path.join(os.path.dirname(__file__), "_work")
os.makedirs(OUT, exist_ok=True)
ZONES = {
    # tête : (x0, y0, x1, y1) ; plastron : (x0, y0, x1, y1)
    "moustachu": dict(tete=(60, 0, 355, 330), plastron=(112, 332, 308, 485)),
}


def bleed(img, keep_alpha):
    """Étale les couleurs des pixels opaques sur les pixels transparents (pas de liseré sombre). keep_alpha : garde la transparence d'origine."""
    a = np.asarray(img, float)
    opaque = a[..., 3] > 40
    idx = ndi.distance_transform_edt(~opaque, return_distances=False, return_indices=True)
    rgb = a[..., :3][idx[0], idx[1]]
    alpha = a[..., 3] if keep_alpha else np.full(opaque.shape, 255.0)
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8))


who = sys.argv[1] if len(sys.argv) > 1 else "moustachu"
src = Image.open(os.path.join(ROOT, "public", "assets", "sprites3d", f"{who}.png")).convert("RGBA")
z = ZONES[who]
bleed(src.crop(z["tete"]), keep_alpha=False).save(os.path.join(OUT, f"{who}_tete.png"))
crop = src.crop(z["plastron"])
w, h = crop.size
mask = Image.new("L", (w, h), 0)
ImageDraw.Draw(mask).polygon([(34, 0), (w - 34, 0), (w - 14, 70), (w - 22, h), (22, h), (14, 70)], fill=255)   # le plastron seulement (pas les bras ni la poêle)
mask = mask.filter(ImageFilter.GaussianBlur(4))
alpha = np.minimum(np.asarray(crop.getchannel("A"), float), np.asarray(mask, float)).astype(np.uint8)
crop.putalpha(Image.fromarray(alpha))
bleed(crop, keep_alpha=True).save(os.path.join(OUT, f"{who}_plastron.png"))
print("peintures faites pour", who)
