"""Finition de l'image rendue : vignette sombre sur les bords, chaleur et contraste (comme la peinture d'origine).
Usage : python3 tools/blender/finish.py <entrée.png> <sortie.png|jpg>
"""
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32) / 255.0
h, w = img.shape[:2]
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
d = np.sqrt(((xx / w - 0.5) / 0.62) ** 2 + ((yy / h - 0.52) / 0.62) ** 2)
vig = 1.0 - 0.55 * np.clip(d - 0.55, 0, 1) ** 1.6
img *= vig[..., None]
img = img * np.array([1.06, 1.0, 0.90], dtype=np.float32)            # lumière chaude
img = np.clip(img, 0, 1) ** 0.95
img = 0.5 + (img - 0.5) * 1.10                                       # un peu de contraste
out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
out.save(sys.argv[2], quality=92) if sys.argv[2].lower().endswith((".jpg", ".jpeg")) else out.save(sys.argv[2])
