"""Génère l'icône du jeu (Play Store 512 px + icônes et écrans de démarrage Android).
Usage: python3 tools/make_icons.py   (après tools/extract.py et `npx cap add android`)
"""
import glob
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
BG, RING, DARK = (242, 160, 61), (232, 100, 42), (27, 27, 43)

chef = Image.open(os.path.join(ROOT, "public", "assets", "sprites", "chefs", "moustachu.png")).convert("RGBA")

# Logo officiel choisi par Rudy le 14/11 (chat cuisinier + Roi Tomate) : s'il est là, c'est lui qui fait les icônes.
LOGO_SRC = os.path.join(ROOT, "reference", "logo.jpg")
NIGHT = (4, 2, 15)  # le noir du cadre du logo


def clean_logo():
    """Le logo arrive en carré arrondi sur fond blanc : les coins blancs deviennent noirs, on obtient un carré plein."""
    im = Image.open(LOGO_SRC).convert("RGB")
    w, h = im.size
    filled = im.copy()
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(filled, (x, y), (255, 0, 255), thresh=90)
    # zone des coins (couleur témoin), élargie de quelques pixels pour effacer le liseré gris du bord
    # pixels changés par le remplissage = les coins (on ne touche à rien d'autre, ni aux flammes rouges)
    mask = Image.eval(ImageChops.difference(filled, im).convert("L"), lambda v: 255 if v > 0 else 0)
    mask = mask.filter(ImageFilter.MaxFilter(7))
    im.paste(Image.new("RGB", (w, h), NIGHT), (0, 0), mask)
    return im


LOGO = clean_logo() if os.path.exists(LOGO_SRC) else None
if LOGO is not None:
    BG = NIGHT


def sprite(width):
    """Le chef agrandi en pixels nets (facteur entier le plus proche)."""
    k = max(1, round(width / chef.width))
    return chef.resize((chef.width * k, chef.height * k), Image.NEAREST)


def icon(size, shape="square", fg_only=False):
    if LOGO is not None:
        return logo_icon(size, shape, fg_only)
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


def logo_icon(size, shape="square", fg_only=False):
    """Icône tirée du logo. Avant-plan Android adaptatif : logo réduit dans la zone toujours visible (66 %)."""
    if fg_only:
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        k = round(size * 0.66)
        im.paste(LOGO.resize((k, k), Image.LANCZOS).convert("RGBA"), ((size - k) // 2, (size - k) // 2))
        return im
    im = LOGO.resize((size, size), Image.LANCZOS).convert("RGBA")
    if shape == "round":
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
        im.putalpha(mask)
    return im


os.makedirs(os.path.join(ROOT, "store"), exist_ok=True)
icon(512).convert("RGB").save(os.path.join(ROOT, "store", "icon-512.png"))
icon(192).save(os.path.join(ROOT, "public", "icon-192.png"))
icon(512).save(os.path.join(ROOT, "public", "icon-512.png"))
if LOGO is not None:
    LOGO.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "public", "logo.png"))  # écran de chargement du jeu

if os.path.isdir(RES):
    for f in glob.glob(os.path.join(RES, "mipmap-*", "*.png")):
        size = Image.open(f).size[0]
        name = os.path.basename(f)
        (icon(size, fg_only=True) if "foreground" in name else icon(size, "round" if "round" in name else "square")).save(f)
    with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w") as fh:
        fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n' % ("#%02X%02X%02X" % BG))
    for f in glob.glob(os.path.join(RES, "drawable*", "splash.png")):
        w, h = Image.open(f).size
        im = Image.new("RGB", (w, h), NIGHT if LOGO is not None else DARK)
        s = icon(max(48, min(w, h) * 11 // 20), "square") if LOGO is not None else icon(max(48, min(w, h) // 3), "round")
        im.paste(s, ((w - s.width) // 2, (h - s.height) // 2), s)
        im.save(f)
print("icones generees")
