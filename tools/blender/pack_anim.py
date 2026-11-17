"""Assemble les images rendues par chef.py en planches (WebP, fond transparent) pour le jeu.

Pour un chef : toutes les images sont rognées avec la MÊME boîte (les pieds restent au même endroit d'une image à l'autre),
réduites, rangées en grille (une planche par animation) dans public/assets/anim3d/, et les mesures sont écrites dans
src/core/anim3d.ts (taille d'une image, point des pieds, échelle d'affichage).

Usage : python3 tools/blender/pack_anim.py <dossier_des_rendus> <chef> [hauteur_affichée_en_unités_du_jeu]
"""
import glob
import json
import math
import os
import re
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SRC, WHO = sys.argv[1], sys.argv[2]
DISPLAY_H = float(sys.argv[3]) if len(sys.argv) > 3 else 44.0   # hauteur du personnage à l'écran, en unités du jeu
OUT = os.path.join(ROOT, "public", "assets", "anim3d")
OUT_TS = os.path.join(ROOT, "src", "core", "anim3d.json")
SHRINK = 0.62          # 512 px rendus -> taille livrée (poids du jeu) ; reste très net : le personnage fait ~220 px de haut
FEET = (256, 393)      # point des pieds dans l'image rendue (cible de la caméra : voir chef.py)
os.makedirs(OUT, exist_ok=True)

files = sorted(glob.glob(os.path.join(SRC, f"{WHO}_*_[0-9][0-9].png")))
anims = {}
for f in files:
    m = re.match(rf"{WHO}_(\w+)_(\d+)\.png", os.path.basename(f))
    anims.setdefault(m.group(1), []).append(f)
# boîte commune : union des zones non transparentes de toutes les images
x0 = y0 = 10**9
x1 = y1 = 0
for fs in anims.values():
    for f in fs:
        bb = Image.open(f).convert("RGBA").getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if bb:
            x0, y0, x1, y1 = min(x0, bb[0]), min(y0, bb[1]), max(x1, bb[2]), max(y1, bb[3])
pad = 6
x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(512, x1 + pad), min(512, y1 + pad)
cw, ch = x1 - x0, y1 - y0
fw, fh = round(cw * SHRINK), round(ch * SHRINK)
info = {}
for name, fs in anims.items():
    n = len(fs)
    cols = 4 if n > 4 else n
    rows = math.ceil(n / cols)
    sheet = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(fs):
        im = Image.open(f).convert("RGBA").crop((x0, y0, x1, y1)).resize((fw, fh), Image.LANCZOS)
        sheet.alpha_composite(im, ((i % cols) * fw, (i // cols) * fh))
    sheet.save(os.path.join(OUT, f"{WHO}_{name}.webp"), quality=92, method=6)
    info[name] = {"frames": n, "cols": cols}
# hauteur utile du personnage (de la pointe de la toque aux pieds) pour régler l'échelle d'affichage
body_h = (FEET[1] - y0) * SHRINK
meta = {"w": fw, "h": fh, "ox": round((FEET[0] - x0) * SHRINK, 1), "oy": round((FEET[1] - y0) * SHRINK, 1),
        "scale": round(DISPLAY_H / body_h, 5), "anims": info}
data = json.load(open(OUT_TS)) if os.path.exists(OUT_TS) else {}
data[WHO] = meta
json.dump(data, open(OUT_TS, "w"), indent=1)
print(WHO, "image", (fw, fh), "pieds", (meta["ox"], meta["oy"]), "échelle", meta["scale"], {k: v["frames"] for k, v in info.items()})
