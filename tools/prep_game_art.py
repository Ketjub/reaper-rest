# Turns the Unity renders (game: .\Tools\unity.ps1 -Method CandleLiars.EditorTools.WebsiteShots.All)
# into website files: magenta background cut out, a dark outline around the Reaper.
# Run: python -I tools\prep_game_art.py
from pathlib import Path
from PIL import Image

SRC = Path(r"C:\Users\Ali\TheReaperRest\Screenshots\Website")
OUT = Path(__file__).resolve().parent.parent / "assets" / "img"
OUTLINE = (12, 4, 10, 255)


def is_key(p):
    r, g, b = p[:3]
    return r > 200 and b > 200 and g < 60


def cut(im, outline=False):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    solid = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if is_key(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
            else:
                solid[y][x] = True
    if outline:
        for y in range(h):
            for x in range(w):
                if solid[y][x]:
                    continue
                if any(0 <= x + dx < w and 0 <= y + dy < h and solid[y + dy][x + dx]
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    px[x, y] = OUTLINE
    return im


# hero layers
far = Image.open(SRC / "hero_far.png").convert("RGB")
far.save(OUT / "hero_far.webp", "WEBP", lossless=True)
for n in ("mid", "near"):
    cut(Image.open(SRC / f"hero_{n}.png")).save(OUT / f"hero_{n}.webp", "WEBP", lossless=True)

# share picture (Open Graph)
Image.open(SRC / "hero_full.png").convert("RGB").resize((1200, 675), Image.NEAREST).save(OUT / "og.jpg", quality=85)

# the Reaper: one sprite sheet, frames in this order (main.js uses the same order)
frames = ["lookm60", "lookm30", "look0", "look30", "look60", "warn", "aim"]
ims = [cut(Image.open(SRC / f"reaper_{f}.png"), outline=True) for f in frames]
w, h = ims[0].size
sheet = Image.new("RGBA", (w * len(ims), h), (0, 0, 0, 0))
for i, im in enumerate(ims):
    sheet.paste(im, (i * w, 0))
sheet.save(OUT / "reaper_sheet.png", optimize=True)
print("frames", len(ims), "size", w, h, "->", OUT / "reaper_sheet.png")

# check: the 3 layers on top of each other
comp = far.convert("RGBA")
for n in ("mid", "near"):
    comp.alpha_composite(Image.open(OUT / f"hero_{n}.webp").convert("RGBA"))
comp.convert("RGB").save(Path(__file__).resolve().parent.parent / "shots" / "check_hero_layers.png")
