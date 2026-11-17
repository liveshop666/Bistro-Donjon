"""Agrandit 2 fois les personnages, monstres et costumes 3D (super-résolution EDSR, OpenCV) pour qu'ils restent nets
sur un grand écran d'ordinateur (le Taureau ne faisait que 340 px de haut pour 470 px affichés : flou).
Entrée/sortie : public/assets/sprites3d/*.png, remplacés sur place. Un fichier hd.json note ce qui est déjà agrandi :
on peut relancer sans risque (rien n'est agrandi deux fois). Après un nouveau `python3 tools/extract_3d.py`, relancer ce script.
Les couleurs des bords transparents sont étalées avant l'agrandissement (sinon un liseré sombre apparaît autour du personnage).
Usage : python3 tools/upscale_sprites.py <chemin/vers/EDSR_x2.pb>  (modèle : github.com/Saafke/EDSR_Tensorflow)
Penser à garder ART_RES (src/core/constants.ts) = 6 x le nombre d'agrandissements (12 une fois agrandi).
"""
import glob
import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
DIR = os.path.join(ROOT, "public", "assets", "sprites3d")
MARK = os.path.join(DIR, "hd.json")

sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(sys.argv[1])
sr.setModel("edsr", 2)

done = json.load(open(MARK)) if os.path.exists(MARK) else {}
for path in sorted(glob.glob(os.path.join(DIR, "*.png"))):
    name = os.path.basename(path)
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if img is None or img.ndim < 3 or img.shape[2] != 4:
        continue
    h, w = img.shape[:2]
    if done.get(name) == [w, h]:
        continue  # déjà agrandi
    bgr, a = img[:, :, :3], img[:, :, 3]
    # étale les couleurs sur une bande autour du personnage (pas de liseré sombre)
    band = cv2.dilate((a > 0).astype(np.uint8), np.ones((9, 9), np.uint8)) & (a == 0).astype(np.uint8)
    bgr = cv2.inpaint(bgr, band * 255, 4, cv2.INPAINT_TELEA)
    big = sr.upsample(bgr)
    abig = sr.upsample(cv2.merge([a, a, a]))[:, :, 0]
    out = np.dstack([big, abig])
    cv2.imwrite(path, out, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    done[name] = [out.shape[1], out.shape[0]]
    json.dump(done, open(MARK, "w"))
    print(name, (w, h), "->", (out.shape[1], out.shape[0]), flush=True)
