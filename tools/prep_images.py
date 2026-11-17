# Copies game screenshots into the site as small .webp files (keeps the pixel look: no smoothing).
# Run: python -I tools\prep_images.py
from pathlib import Path
from PIL import Image

GAME = Path(r"C:\Users\Ali\TheReaperRest\Screenshots")
OUT = Path(__file__).resolve().parent.parent / "assets" / "img"

PICKS = {
    "tavern_hall": GAME / "Tavern" / "01_Spawn_Clean.png",
    "bar": GAME / "Tavern" / "02_Bar.png",
    "fireplace": GAME / "Tavern" / "03_Fireplace.png",
    "people": GAME / "Tavern" / "09_People.png",
    "blackjack": GAME / "Tavern" / "12_Blackjack.png",
    "roulette": GAME / "Tavern" / "15_Roulette_duel.png",
    "roulette_gun": GAME / "Tavern" / "16_Roulette_gun.png",
    "courtyard": GAME / "Courtyard" / "c00_reference_view.png",
    "gate": GAME / "Courtyard" / "c02_gate_close.png",
    "castle_above": GAME / "Courtyard" / "c08_from_above.png",
}

OUT.mkdir(parents=True, exist_ok=True)
for name, src in PICKS.items():
    im = Image.open(src).convert("RGB")
    if im.width > 1280:
        im = im.resize((1280, round(im.height * 1280 / im.width)), Image.NEAREST)
    im.save(OUT / f"{name}.webp", "WEBP", quality=82, method=6)
    print(name, im.size, (OUT / f"{name}.webp").stat().st_size // 1024, "KB")
