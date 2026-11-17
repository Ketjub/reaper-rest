# Cuts the full-page screenshots into screen-size parts and trims the empty bottom.
from pathlib import Path
from PIL import Image

SHOTS = Path(__file__).resolve().parent.parent / "shots"

def trim_bottom(im):
    # find the last row that is not plain page background (the footer is the end)
    px = im.convert("RGB").load()
    w, h = im.size
    for y in range(h - 1, 0, -1):
        if px[w // 2, y] != px[w // 2, h - 1]:
            return im.crop((0, 0, w, min(h, y + 2)))
    return im

for name, part_h in (("full_desktop", 900), ("full_phone", 844)):
    src = SHOTS / f"{name}.png"
    if not src.exists():
        continue
    im = trim_bottom(Image.open(src))
    im.save(src)
    kind = name.split("_")[1]
    n = 0
    for top in range(0, im.height, part_h):
        n += 1
        im.crop((0, top, im.width, min(im.height, top + part_h))).save(SHOTS / f"{kind}_{n:02d}.png")
    print(name, im.size, n, "parts")
