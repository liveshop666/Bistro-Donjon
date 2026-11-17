"""Installe une carte rendue par Blender dans le jeu : les quatre tailles utilisées (partie, partie en haute définition, menu portrait, vignette).
Usage : python3 tools/blender/install_map.py <rendu_3360x1888.png> <monde>
"""
import os
import sys

from PIL import Image

SRC, WORLD = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "assets", "maps")
im = Image.open(SRC).convert("RGB")
hd = im.resize((3360, 1888), Image.LANCZOS)
hd.save(os.path.join(OUT, f"hd3d_{WORLD}.jpg"), quality=88)
wide = hd.resize((1680, 944), Image.LANCZOS)
wide.save(os.path.join(OUT, f"wide3d_{WORLD}.jpg"), quality=90)
wide.resize((512, 288), Image.LANCZOS).save(os.path.join(OUT, f"thumb3d_{WORLD}.jpg"), quality=88)
wide.crop((840 - 265, 0, 840 + 266, 944)).resize((360, 640), Image.LANCZOS).save(os.path.join(OUT, f"port3d_{WORLD}.jpg"), quality=88)
print("carte installée :", WORLD)
