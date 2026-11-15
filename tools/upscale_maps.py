"""Agrandit les maps 3D 2 fois (super-résolution EDSR, OpenCV) pour qu'elles restent nettes sur les écrans fins.
Entrée : public/assets/maps/wide3d_<monde>.jpg (1680 x 944). Sortie : public/assets/maps/hd3d_<monde>.jpg (3360 x 1888).
Usage : python3 tools/upscale_maps.py <chemin/vers/EDSR_x2.pb>  (modèle : github.com/Saafke/EDSR_Tensorflow)
"""
import os
import sys

import cv2

ROOT = os.path.join(os.path.dirname(__file__), "..")
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(sys.argv[1])
sr.setModel("edsr", 2)
for w in ["clairiere", "marche", "taverne", "cantine", "glaciere", "volcan", "bateau", "bonbons"]:
    src = os.path.join(ROOT, "public", "assets", "maps", f"wide3d_{w}.jpg")
    out = os.path.join(ROOT, "public", "assets", "maps", f"hd3d_{w}.jpg")
    if os.path.exists(out):
        continue
    img = cv2.imread(src)
    big = sr.upsample(img)
    cv2.imwrite(out, big, [cv2.IMWRITE_JPEG_QUALITY, 86])
    print(w, big.shape, flush=True)
