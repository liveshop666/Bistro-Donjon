"""Télécharge des textures de sol photographiques (licence CC0) depuis Poly Haven pour les scènes Blender.
Sortie : tools/blender/_work/tex/<id>_diff.jpg, <id>_nor.jpg, <id>_rough.jpg (dossier ignoré par git : à refaire avec cette commande).
Il faut que l'environnement cloud autorise `dl.polyhaven.org` (et `api.polyhaven.com`).
Usage : python3 tools/blender/fetch_textures.py brown_mud_dry rocky_terrain_02 [résolution : 1k, 2k (défaut), 4k]
"""
import json
import os
import sys
import urllib.request


def get(url):
    """Poly Haven refuse l'identifiant par défaut de Python (403) : on se présente avec un nom de client générique."""
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "scene-tools/1.0"}), timeout=60).read()


OUT = os.path.join(os.path.dirname(__file__), "_work", "tex")
os.makedirs(OUT, exist_ok=True)
args = sys.argv[1:]
res = args.pop() if args and args[-1] in ("1k", "2k", "4k") else "2k"
for tid in args:
    files = json.loads(get(f"https://api.polyhaven.com/files/{tid}"))
    for key, suffix in (("Diffuse", "diff"), ("nor_gl", "nor"), ("Rough", "rough")):
        url = files[key][res]["jpg"]["url"]
        path = os.path.join(OUT, f"{tid}_{suffix}.jpg")
        with open(path, "wb") as f:
            f.write(get(url))
        print(tid, suffix, os.path.getsize(path) // 1024, "Ko")
