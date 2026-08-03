import os
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), "images", "Common Badges")
BACKUP = SRC + "_backup"

def opaque_bbox(img, threshold=8):
    alpha = img.getchannel("A")
    return alpha.getbbox()

for name in sorted(os.listdir(SRC)):
    if not name.lower().endswith(".webp"):
        continue
    path = os.path.join(SRC, name)
    img = Image.open(path).convert("RGBA")
    bbox = opaque_bbox(img)
    if bbox is None:
        print(f"{name}: fully transparent, skipping")
        continue
    orig_size = img.size
    cropped = img.crop(bbox)
    cropped.save(path, "WEBP", lossless=True, quality=100, method=6)
    print(f"{name}: {orig_size[0]}x{orig_size[1]} -> {cropped.size[0]}x{cropped.size[1]} (bbox {bbox})")
