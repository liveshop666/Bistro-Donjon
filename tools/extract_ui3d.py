"""Découpe les éléments d'interface de l'image de référence 3D choisie par Rudy (reference/3d/reference-rudy.jpg)
en images du jeu (public/assets/ui3d/) : bouton d'attaque, bouton des flammes, pommeau du joystick, coeur,
chrono, pièce et pause. Chaque image est enregistrée à 2 fois sa taille d'affichage (le jeu l'affiche à moitié).
Usage : python3 tools/extract_ui3d.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = Image.open(os.path.join(ROOT, "reference", "3d", "reference-rudy.jpg")).convert("RGBA")
OUT = os.path.join(ROOT, "public", "assets", "ui3d")
os.makedirs(OUT, exist_ok=True)


def disc(cx, cy, r, size, name):
    """Disque découpé (bord adouci) puis réduit à size x size."""
    k = 4
    crop = SRC.crop((cx - r, cy - r, cx + r, cy + r)).resize((2 * r * k, 2 * r * k), Image.LANCZOS)
    m = Image.new("L", crop.size, 0)
    ImageDraw.Draw(m).ellipse((1, 1, crop.width - 2, crop.height - 2), fill=255)
    crop.putalpha(m)
    crop.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))


def rounded(cx, cy, w, h, rad, size_w, name):
    k = 4
    crop = SRC.crop((cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2)).resize((w * k, h * k), Image.LANCZOS)
    m = Image.new("L", crop.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((1, 1, crop.width - 2, crop.height - 2), radius=rad * k, fill=255)
    crop.putalpha(m)
    crop.resize((size_w, round(size_w * h / w)), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))


def heart(cx, cy, r, size):
    """Coeur plein : on garde les pixels rouges/orangés (et leur reflet), le fond sombre devient transparent."""
    crop = SRC.crop((cx - r, cy - r, cx + r, cy + r))
    a = np.array(crop).astype(int)
    red, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mask = ((red > 120) & (red > g + 40)) | ((red > 200) & (g > 150))
    m = Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    crop.putalpha(m)
    full = crop.resize((size, size), Image.LANCZOS)
    full.save(os.path.join(OUT, "coeur.png"))
    # coeur vide : même forme, gris foncé
    arr = np.array(full)
    gray = (arr[:, :, :3].mean(axis=2) * 0.25 + 30).astype("uint8")
    empty = np.dstack([gray, gray, gray + 4, arr[:, :, 3]])
    Image.fromarray(empty.astype("uint8")).save(os.path.join(OUT, "coeur_vide.png"))


disc(1430, 770, 110, 220, "btn_attaque")   # bouton rouge à l'épée, avec son anneau sombre
disc(1562, 635, 84, 168, "btn_feu")        # bouton orange aux flammes
disc(232, 740, 57, 114, "joy_pommeau")      # pommeau gris du joystick
disc(785, 62, 31, 62, "chrono")
disc(1382, 62, 31, 62, "piece")
rounded(1613, 61, 72, 72, 16, 72, "pause")
heart(70, 60, 34, 68)
print("interface 3D découpée dans", OUT)
