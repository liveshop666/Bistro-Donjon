"""Découpe les planches de personnages 3D (fond transparent, reference/3d/) en sprites du jeu (public/assets/sprites3d/).
Chaque personnage prend 2 fois la hauteur de son ancien sprite pixel : le jeu l'affiche à moitié, donc net.
Méthode : les n plus gros morceaux sont les corps ; chaque petit morceau (arme détachée, éclair) va au corps le plus proche.
Usage : python3 tools/extract_3d.py
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), "..")
SP = os.path.join(ROOT, "public", "assets", "sprites")
OUT = os.path.join(ROOT, "public", "assets", "sprites3d")
# planche -> personnages de gauche à droite : (fichier 3D, ancien sprite pixel dont on reprend la hauteur)
SHEETS = {
    "personnages-3d.png": [("moustachu", "chefs/moustachu_i0"), ("tomate", "enemies/tomate"), ("champi", "enemies/champi"),
                           ("gelee", "enemies/gelee_1"), ("piment", "enemies/piment"), ("roi_tomate", "enemies/roi_tomate")],
    "chefs-3d.png": [("shiba", "chefs/shiba_i0"), ("noisette", "chefs/noisette_i0"), ("skin_taureau", "skins/skin_taureau"),
                     ("skin_ours", "skins/skin_ours"), ("skin_gorille", "skins/skin_gorille"), ("skin_tigre", "skins/skin_tigre")],
    "monstres-3d.png": [("ail", "enemies/ail"), ("aubergine", "enemies/aubergine"), ("mais", "enemies/mais"), ("oignon", "enemies/oignon"),
                        ("citrouille", "enemies/citrouille"), ("hotdog", "enemies/hotdog"), ("cube_fromage", "enemies/cube_fromage"),
                        ("roi_fromage", "enemies/roi_fromage")],
}
os.makedirs(OUT, exist_ok=True)
for sheet, order in SHEETS.items():
    im = Image.open(os.path.join(ROOT, "reference", "3d", sheet)).convert("RGBA")
    rgba = np.array(im)
    alpha = rgba[:, :, 3] > 40
    lab, k = ndimage.label(alpha)
    ids = np.arange(1, k + 1)
    sizes = ndimage.sum(alpha, lab, ids)
    cents = ndimage.center_of_mass(alpha, lab, ids)
    n = len(order)
    # deux personnages qui se touchent (arme contre arme) forment un seul morceau trop large : on le coupe en deux
    # à la colonne la moins remplie du milieu
    boxes = ndimage.find_objects(lab)
    big = sorted(ids[np.argsort(sizes)[::-1][:n]], key=lambda i: cents[i - 1][1])
    widths = [boxes[i - 1][1].stop - boxes[i - 1][1].start for i in big]
    med = float(np.median(widths))
    for i, w in zip(list(big), widths):
        if w > 1.6 * med and len(big) <= n:
            sl = boxes[i - 1]
            sub = lab[sl] == i
            colsum = sub.sum(axis=0)
            lo, hi = int(w * 0.3), int(w * 0.7)
            cut = sl[1].start + lo + int(np.argmin(colsum[lo:hi]))
            k += 1
            region = lab[:, cut:] == i
            lab[:, cut:][region] = k
            ids = np.arange(1, k + 1)
            sizes = ndimage.sum(alpha, lab, ids)
            cents = ndimage.center_of_mass(alpha, lab, ids)
            big = None
            break
    n = len(order)
    bodies = sorted(ids[np.argsort(sizes)[::-1][:n]], key=lambda i: cents[i - 1][1])
    owner = {}
    for i in ids:
        if sizes[i - 1] < 30:
            continue  # poussière
        cy, cx = cents[i - 1]
        owner[i] = min(range(n), key=lambda b: abs(cents[bodies[b] - 1][1] - cx) + 0.3 * abs(cents[bodies[b] - 1][0] - cy))
    for b, (name, pixel) in enumerate(order):
        mine = [i for i, o in owner.items() if o == b]
        m = np.isin(lab, mine)
        ys, xs = np.nonzero(m)
        out = rgba.copy()
        out[:, :, 3] = np.where(m, rgba[:, :, 3], 0)
        crop = Image.fromarray(out).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        th = Image.open(os.path.join(SP, pixel + ".png")).height * 2
        crop = crop.resize((max(1, round(crop.width * th / crop.height)), th), Image.LANCZOS)
        crop.save(os.path.join(OUT, name + ".png"))
        print(sheet, name, crop.size)
