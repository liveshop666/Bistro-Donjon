"""Petite vidéo de démonstration des mouvements d'un personnage (images rendues par chef.py -> mp4).
Usage : python3 tools/blender/compose_video.py <dossier_des_rendus> <chef> <decor.png> <sortie.mp4>
"""
import glob
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, WHO, BG, OUT = sys.argv[1:5]
W, H = 960, 540
FEET = (200, 326)      # pieds du personnage dans l'image rendue (400 x 400)
SCALE = 1.25
bg = Image.open(BG).convert("RGB")
bg = bg.resize((round(bg.width * H / bg.height * 1.0), H), Image.LANCZOS) if bg.height != H else bg
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)


def frames(name):
    return [Image.open(f).convert("RGBA") for f in sorted(glob.glob(os.path.join(SRC, f"{WHO}_{name}_[0-9][0-9].png")))]


segments = [("MARCHE", frames("marche"), 2, 3.0), ("COURSE", frames("course"), 3, 7.5), ("ATTAQUE A LA POELE", frames("attaque"), 2, 0.0)]
tmp = tempfile.mkdtemp()
n = 0
scroll = 0.0
for title, fr, reps, speed in segments:
    for _ in range(reps):
        for im in fr:
            x0 = int(scroll) % max(1, bg.width - W)
            canvas = bg.crop((x0, 0, x0 + W, H)).convert("RGBA")
            ch = im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)
            fx, fy = round(FEET[0] * SCALE), round(FEET[1] * SCALE)
            px, py = W // 2 - fx, 400 - fy
            sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(sh).ellipse((W // 2 - 70, 400 - 14, W // 2 + 70, 400 + 14), fill=(0, 0, 0, 120))
            canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
            canvas.alpha_composite(ch, (px, py))
            d = ImageDraw.Draw(canvas)
            d.rounded_rectangle((20, 18, 20 + d.textlength(title, font) + 30, 70), 12, fill=(12, 12, 24, 190))
            d.text((35, 24), title, font=font, fill=(255, 197, 51, 255))
            d.text((20, H - 34), "Bistro Donjon  -  chat chef en 3D, squelette + mouvements captures", font=small, fill=(255, 255, 255, 200))
            canvas.convert("RGB").save(os.path.join(tmp, f"{n:04d}.png"))
            n += 1
            scroll += speed
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "24", "-i", os.path.join(tmp, "%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", OUT], check=True)
print("video", n, "images", os.path.getsize(OUT) // 1024, "Ko")
