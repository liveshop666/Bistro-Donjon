"""Images des menus tirées du MÊME modèle 3D que dans le jeu (Rudy : « quand je clique, je retrouve le même bonhomme »).
Entrée : le rendu de face d'un chef (`chef.py -- <dossier> <chef> face 2560`). Sortie dans public/assets/sprites3d/ :
  rig_<chef>_hd.png       : le chef en pied (grande image du menu, petits portraits du menu paysage) ;
  rig_<chef>_portrait.png : tête et épaules, carré (menu portrait, règles, Mon compte, duel).
Usage : python3 tools/blender/make_menu_images.py <rendu_face.png> <chef>
"""
import os
import sys

from PIL import Image

SRC, WHO = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "assets", "sprites3d")
im = Image.open(SRC).convert("RGBA")
x0, y0, x1, y1 = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
body = im.crop((x0 - 4, y0 - 4, x1 + 4, y1 + 4))
k = 640 / body.height                                     # grande image : 640 px de haut (nette dans le menu)
body.resize((round(body.width * k), 640), Image.LANCZOS).save(os.path.join(OUT, f"rig_{WHO}_hd.png"))
w, h = body.size
side = int(min(w, h * 0.50))                              # visage et bas de la toque : carré centré à 38 % de la hauteur
cx, cy = w // 2, int(h * 0.38)
por = body.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((256, 256), Image.LANCZOS)
por.save(os.path.join(OUT, f"rig_{WHO}_portrait.png"))
print(WHO, "images de menu :", (round(body.width * k), 640), "et portrait 256 x 256")
