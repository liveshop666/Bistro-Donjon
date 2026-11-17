"""Vidéo de démonstration : la carte entière (vue de haut) avec le petit personnage à sa vraie taille de jeu, qui marche, court et attaque,
et une loupe en gros plan dans un coin.
Usage : python3 tools/blender/compose_video.py <dossier_des_rendus> <chef> <carte.png> <sortie.mp4>
Les images rendues (chef.py) font 640 x 640, à 3 pixels par pixel de carte ; le point des pieds est en (320, 388).
"""
import glob
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, WHO, MAP, OUT = sys.argv[1:5]
DENS = 3
FEET = (320, 388)
OW, OH = 1280, 720
bg = Image.open(MAP).convert("RGB")                       # 1680 x 944
K = OW / bg.width                                         # carte -> vidéo
bg = bg.resize((OW, round(bg.height * K)), Image.LANCZOS).crop((0, 0, OW, OH))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)


def load(key):
    return [Image.open(f).convert("RGBA") for f in sorted(glob.glob(os.path.join(SRC, f"{WHO}_{key}_[0-9][0-9][0-9].png")))]


walk, run, atk = load("marche"), load("course"), load("attaque")
# trajet : marche de gauche à droite, course en diagonale, attaque sur place (positions en pixels de la carte)
segs = [("MARCHE", walk, (330, 560), (760, 560)), ("COURSE (SPRINT)", run, (760, 560), (1380, 470)), ("ATTAQUE A LA POELE", atk, (1380, 470), (1380, 470))]
tmp = tempfile.mkdtemp()
n = 0
for title, fr, p0, p1 in segs:
    N = len(fr)
    for i, im in enumerate(fr):
        t = i / max(1, N - 1)
        mx, my = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t       # position des pieds sur la carte
        canvas = bg.copy().convert("RGBA")
        sprite = im.resize((round(im.width * K / DENS), round(im.height * K / DENS)), Image.LANCZOS)
        fx, fy = FEET[0] * K / DENS, FEET[1] * K / DENS
        X, Y = round(mx * K - fx), round(my * K - fy)
        sh = Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse((mx * K - 20, my * K - 5, mx * K + 20, my * K + 5), fill=(0, 0, 0, 120))
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(3)))
        canvas.alpha_composite(sprite, (X, Y))
        # loupe : le même personnage en gros plan (image rendue native, recadrée)
        crop = im.crop((FEET[0] - 110, FEET[1] - 200, FEET[0] + 110, FEET[1] + 40)).resize((330, 360), Image.LANCZOS)
        box = Image.new("RGBA", (330, 360), (20, 24, 34, 255))
        box.alpha_composite(crop)
        canvas.alpha_composite(box, (OW - 350, 20))
        d = ImageDraw.Draw(canvas)
        d.rectangle((OW - 350, 20, OW - 20, 380), outline=(255, 197, 51, 255), width=3)
        d.rounded_rectangle((20, 18, 20 + d.textlength(title, font) + 30, 70), 12, fill=(12, 12, 24, 190))
        d.text((35, 24), title, font=font, fill=(255, 197, 51, 255))
        d.text((20, OH - 34), "Bistro Donjon - chat chef en 3D a la taille du jeu, squelette + mouvements captures", font=small, fill=(255, 255, 255, 220))
        canvas.convert("RGB").save(os.path.join(tmp, f"{n:04d}.png"))
        n += 1
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(tmp, "%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", OUT], check=True)
print("video", n, "images", os.path.getsize(OUT) // 1024, "Ko")
