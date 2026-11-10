"""Détecte les sprites (composantes non blanches) d'une planche et produit une planche annotée.
Usage: python3 tools/detect.py <image> <out_png> [dilate]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def components(path, dilate=3, min_area=250):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(int)
    fg = a.min(axis=2) < 225
    if dilate:
        fg = ndimage.binary_dilation(fg, iterations=dilate)
    lab, _ = ndimage.label(fg)
    boxes = []
    for sl in ndimage.find_objects(lab):
        y, x = sl
        if (y.stop - y.start) * (x.stop - x.start) >= min_area:
            boxes.append((x.start, y.start, x.stop, y.stop))
    boxes.sort(key=lambda b: (b[1] // 60, b[0]))
    return im, boxes


if __name__ == "__main__":
    im, boxes = components(sys.argv[1], int(sys.argv[3]) if len(sys.argv) > 3 else 3)
    d = ImageDraw.Draw(im)
    for i, b in enumerate(boxes):
        d.rectangle(b, outline=(255, 0, 255))
        d.text((b[0] + 2, b[1] + 2), str(i), fill=(0, 0, 255))
        print(i, b)
    im.save(sys.argv[2])
