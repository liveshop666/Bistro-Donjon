"""Génère l'icône du jeu (Play Store 512 px + icônes et écrans de démarrage Android).
Usage: python3 tools/make_icons.py   (après tools/extract.py et `npx cap add android`)
"""
import glob
import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
BG, RING, DARK = (242, 160, 61), (232, 100, 42), (27, 27, 43)

chef = Image.open(os.path.join(ROOT, "public", "assets", "sprites", "chefs", "moustachu.png")).convert("RGBA")


def sprite(width):
    """Le chef agrandi en pixels nets (facteur entier le plus proche)."""
    k = max(1, round(width / chef.width))
    return chef.resize((chef.width * k, chef.height * k), Image.NEAREST)


def icon(size, shape="square", fg_only=False):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0) if fg_only else BG + (255,))
    d = ImageDraw.Draw(im)
    if not fg_only:
        m = round(size * 0.07)
        d.ellipse((m, m, size - m, size - m), fill=RING)
        d.ellipse((m * 2, m * 2, size - m * 2, size - m * 2), fill=BG)
    s = sprite(size * (0.5 if fg_only else 0.78))
    im.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    if shape == "round":
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
        im.putalpha(mask)
    return im


os.makedirs(os.path.join(ROOT, "store"), exist_ok=True)
icon(512).convert("RGB").save(os.path.join(ROOT, "store", "icon-512.png"))
icon(192).save(os.path.join(ROOT, "public", "icon-192.png"))

if os.path.isdir(RES):
    for f in glob.glob(os.path.join(RES, "mipmap-*", "*.png")):
        size = Image.open(f).size[0]
        name = os.path.basename(f)
        (icon(size, fg_only=True) if "foreground" in name else icon(size, "round" if "round" in name else "square")).save(f)
    with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w") as fh:
        fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F2A03D</color>\n</resources>\n')
    for f in glob.glob(os.path.join(RES, "drawable*", "splash.png")):
        w, h = Image.open(f).size
        im = Image.new("RGB", (w, h), DARK)
        s = icon(max(48, min(w, h) // 3), "round")
        im.paste(s, ((w - s.width) // 2, (h - s.height) // 2), s)
        im.save(f)
print("icones generees")
