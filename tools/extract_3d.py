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
    "costumes-3d.png": [("skin_patissier", "skins/skin_patissier"), ("skin_chevalier", "skins/skin_chevalier"),
                        ("skin_samourai", "skins/skin_samourai"), ("skin_shiba_samourai", "skins/skin_shiba_samourai"),
                        ("skin_cyber", "skins/skin_cyber"), ("skin_astronaute", "skins/skin_astronaute")],
    # poses d'attaque (même hauteur que la pose normale du personnage) : <nom>_atk
    "attaques-chefs.png": [("moustachu_atk", "chefs/moustachu_i0"), ("noisette_atk", "chefs/noisette_i0"), ("shiba_atk", "chefs/shiba_i0"),
                           ("skin_taureau_atk", "skins/skin_taureau"), ("skin_ours_atk", "skins/skin_ours"), ("skin_gorille_atk", "skins/skin_gorille")],
    "attaques-costumes.png": [("skin_patissier_atk", "skins/skin_patissier"), ("skin_chevalier_atk", "skins/skin_chevalier"),
                              ("skin_samourai_atk", "skins/skin_samourai"), ("skin_shiba_samourai_atk", "skins/skin_shiba_samourai"),
                              ("skin_cyber_atk", "skins/skin_cyber"), ("skin_astronaute_atk", "skins/skin_astronaute")],
    "attaque-tigre.png": [("skin_tigre_atk", "skins/skin_tigre")],
    # poses de marche (en pleine foulée) : <nom>_mar
    "marche-chefs.png": [("moustachu_mar", "chefs/moustachu_i0"), ("noisette_mar", "chefs/noisette_i0"), ("shiba_mar", "chefs/shiba_i0"),
                         ("skin_taureau_mar", "skins/skin_taureau"), ("skin_ours_mar", "skins/skin_ours"), ("skin_gorille_mar", "skins/skin_gorille")],
    "marche-costumes.png": [("skin_patissier_mar", "skins/skin_patissier"), ("skin_chevalier_mar", "skins/skin_chevalier"),
                            ("skin_samourai_mar", "skins/skin_samourai"), ("skin_shiba_samourai_mar", "skins/skin_shiba_samourai"),
                            ("skin_cyber_mar", "skins/skin_cyber"), ("skin_astronaute_mar", "skins/skin_astronaute")],
    "marche-tigre.png": [("skin_tigre_mar", "skins/skin_tigre")],
    # objets de la cuisine et ingrédients : même taille que les dessins pixel (cadre max), dossier ui3d
    "cuisine-3d.png": [("marmite", "=42x46"), ("planche", "=36x24"), ("comptoir", "=48x30"), ("ing_tomate", "=18x18"),
                       ("ing_champignon", "=18x18"), ("ing_sucre", "=18x18"), ("ing_piment", "=18x18")],
}
# planches où les personnages se touchent (armes et effets qui se chevauchent) : colonnes coupées à la main (pixels)
CUTS = {
    "attaques-chefs.png": [0, 552, 975, 1292, 1745, 2205, 2720],
    "attaques-costumes.png": [0, 476, 914, 1315, 1794, 2200, 2720],
    "marche-chefs.png": [0, 443, 890, 1283, 1792, 2236, 2720],
    "marche-costumes.png": [0, 445, 950, 1300, 1795, 2245, 2720],
}


def save(crop, name, pixel):
    th = Image.open(os.path.join(SP, pixel + ".png")).height * 6  # 6 fois la taille pixel : net même sur un écran très fin
    crop = crop.resize((max(1, round(crop.width * th / crop.height)), th), Image.LANCZOS)
    crop.save(os.path.join(OUT, name + ".png"))
    print(name, crop.size)


os.makedirs(OUT, exist_ok=True)
for sheet, order in SHEETS.items():
    im = Image.open(os.path.join(ROOT, "reference", "3d", sheet)).convert("RGBA")
    if sheet in CUTS:
        a = np.array(im)[:, :, 3] > 40
        for (name, pixel), x0, x1 in zip(order, CUTS[sheet][:-1], CUTS[sheet][1:]):
            col = a[:, x0:x1].copy()
            lab, k = ndimage.label(col)
            if k > 1:  # retire les petits morceaux du voisin coupés au bord de la colonne
                sizes = ndimage.sum(col, lab, range(1, k + 1))
                for j, (sl, sz) in enumerate(zip(ndimage.find_objects(lab), sizes), 1):
                    if sz < sizes.max() * 0.06 and (sl[1].start == 0 or sl[1].stop == x1 - x0):
                        col[lab == j] = False
            ys, xs = np.nonzero(col)
            part = np.array(im)[:, x0:x1].copy()
            part[:, :, 3] = np.where(col, part[:, :, 3], 0)
            save(Image.fromarray(part).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)), name, pixel)
        continue
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
    # corps = les plus gros morceaux qui montent jusqu'à la hauteur des têtes (une flamme ou une arme détachée commence plus bas)
    boxes = ndimage.find_objects(lab)
    big = [i for i in ids if sizes[i - 1] > sizes.max() * 0.08]
    head = min(boxes[i - 1][0].start for i in big)
    tall = max(boxes[i - 1][0].stop - boxes[i - 1][0].start for i in big)
    cand = [i for i in big if boxes[i - 1][0].start < head + 0.3 * tall] or big
    pick = sorted(cand, key=lambda i: -sizes[i - 1])[:n]
    if len(pick) < n:  # pas assez de têtes repérées : on complète avec les plus gros morceaux restants
        pick += [i for i in sorted(ids, key=lambda i: -sizes[i - 1]) if i not in pick][: n - len(pick)]
    bodies = sorted(pick, key=lambda i: cents[i - 1][1])
    boxes = ndimage.find_objects(lab)
    owner = {}
    for i in ids:
        if sizes[i - 1] < 30:
            continue  # poussière
        cy, cx = cents[i - 1]
        # morceau détaché (arme, éclair) : au corps dont le bord est le plus proche (pas le centre : un corps large tirerait tout)
        def gap(b):
            sl = boxes[bodies[b] - 1]
            return max(sl[1].start - cx, 0, cx - sl[1].stop) + 0.3 * max(sl[0].start - cy, 0, cy - sl[0].stop)
        # un corps reste à lui-même ; à égalité de bord (cadres qui se chevauchent), le centre le plus proche gagne
        owner[i] = bodies.index(i) if i in bodies else min(range(n), key=lambda b: (gap(b), abs(cents[bodies[b] - 1][1] - cx)))
    for b, (name, pixel) in enumerate(order):
        mine = [i for i, o in owner.items() if o == b]
        m = np.isin(lab, mine)
        ys, xs = np.nonzero(m)
        out = rgba.copy()
        out[:, :, 3] = np.where(m, rgba[:, :, 3], 0)
        crop = Image.fromarray(out).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        if pixel.startswith("="):
            bw, bh = map(int, pixel[1:].split("x"))
            k = min(bw * 4 / crop.width, bh * 4 / crop.height, 1)  # 4 fois le cadre (sans dépasser l'image d'origine)
            crop = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
            crop.save(os.path.join(ROOT, "public", "assets", "ui3d", name + ".png"))
            print(sheet, name, crop.size)
            continue
        th = Image.open(os.path.join(SP, pixel + ".png")).height * 6  # 6 fois la taille pixel : net même sur un écran très fin
        crop = crop.resize((max(1, round(crop.width * th / crop.height)), th), Image.LANCZOS)
        crop.save(os.path.join(OUT, name + ".png"))
        print(sheet, name, crop.size)

# ---------- icônes (planche de 2 rangées de 6) : même cadre que les dessins pixel, enregistrées 2 fois plus grandes
ICONES = [["ico_couteaux", "ico_etoile", "ico_engrenage", "ico_sac", "ico_tornade", "ico_epees"],
          ["ico_coeur", "ico_bouclier", "plat", "tonneau", "boule_feu", "cadenas"]]
CADRE = {"plat": (18, 14), "tonneau": (18, 22), "boule_feu": (10, 10), "cadenas": (16, 18)}
im = Image.open(os.path.join(ROOT, "reference", "3d", "icones-3d.png")).convert("RGBA")
a = np.array(im)[:, :, 3] > 40
ys = np.nonzero(a.any(axis=1))[0]
mid = (ys[0] + ys[-1]) // 2
for r, row in enumerate(ICONES):
    band = a[ys[0]:mid] if r == 0 else a[mid:ys[-1] + 1]
    y0 = ys[0] if r == 0 else mid
    xs = np.nonzero(band.any(axis=0))[0]
    w = (xs[-1] - xs[0] + 1) / 6
    for c, name in enumerate(row):
        x0, x1 = int(xs[0] + c * w), int(xs[0] + (c + 1) * w)
        sub = band[:, x0:x1]
        yy, xx = np.nonzero(sub)
        crop = im.crop((x0 + xx.min(), y0 + yy.min(), x0 + xx.max() + 1, y0 + yy.max() + 1))
        bw, bh = CADRE.get(name, (24, 24))
        k = min(bw * 4 / crop.width, bh * 4 / crop.height, 1)
        crop = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
        crop.save(os.path.join(ROOT, "public", "assets", "ui3d", name + ".png"))
        print(name, crop.size)
