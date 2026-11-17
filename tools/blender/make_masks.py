"""Fabrique, à partir de la carte peinte d'origine, le plan de la zone de terre (clairière) pour la scène Blender.
Entrée : reference/3d/clairiere-3d.jpg. Sortie : tools/blender/_work/clairiere_dirt.png (blanc = terre, noir = herbe).
Usage : python3 tools/blender/make_masks.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
OUT = os.path.join(os.path.dirname(__file__), "_work")
os.makedirs(OUT, exist_ok=True)

img = np.asarray(Image.open(os.path.join(ROOT, "reference/3d/clairiere-3d.jpg")).convert("RGB")).astype(float)
r, g, b = img[..., 0], img[..., 1], img[..., 2]
dirt = (r > 120) & (r > g * 1.12) & (r - b > 55)
dirt = ndi.binary_opening(dirt, iterations=3)
lab, n = ndi.label(dirt)
sizes = ndi.sum(dirt, lab, range(1, n + 1))
dirt = lab == (1 + int(np.argmax(sizes)))          # la grande zone de terre seulement (pas le bois du stand)
dirt[:225, :] = False                                # les troncs du haut ne sont pas de la terre
dirt = ndi.binary_opening(dirt, iterations=10)
dirt = ndi.binary_fill_holes(ndi.binary_closing(dirt, iterations=6))
# bord régulier : flou puis seuil, comme un contour dessiné à la main
dirt = ndi.gaussian_filter(dirt.astype(float), 7) > 0.5
m = Image.fromarray((dirt * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
m.save(os.path.join(OUT, "clairiere_dirt.png"))
print("terre :", round(dirt.mean() * 100), "% de l'image")

# traces circulaires dans la terre (comme sur la peinture) : carte de relief
from PIL import ImageDraw
t = Image.new("L", (1680, 948), 0)
d = ImageDraw.Draw(t)
for (cx, cy, rx, ry, a0, a1) in [(560, 520, 205, 190, 110, 290), (580, 520, 215, 200, 120, 280), (870, 470, 290, 230, 150, 330),
                                 (1030, 560, 280, 250, 300, 80), (1050, 560, 292, 262, 310, 70), (1270, 420, 150, 70, 180, 350)]:
    d.arc([cx - rx, cy - ry, cx + rx, cy + ry], a0, a1, fill=255, width=5)
t = t.filter(ImageFilter.GaussianBlur(2.2))
t.save(os.path.join(OUT, "clairiere_tracks.png"))
