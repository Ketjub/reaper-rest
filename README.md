# reaper-rest.net

Landing page for **The Reaper's Rest** (indie game, made in Bahrain, work in progress).

Plain HTML / CSS / JS. No build step.

- `index.html` – the page
- `style.css` – "Ember Tavern" style from the game (Lilita One font, dark red-brown panels, flat colored buttons)
- `main.js` – the hero parallax (the real tavern hall in 3 depth layers: scrolling walks you in) and THE REAPER:
  the bartender from the game stands behind his bar at the side, watches the mouse, talks about each part of the page,
  and if you poke him 3 times: glare, shotgun, BANG (like in the game)
- `assets/img` – game screenshots (.webp), made by `python -I tools\prep_images.py` from the game's Screenshots folder
- `assets/img/hero_*.webp`, `reaper_sheet.png`, `og.jpg` – rendered from the game by Unity:
  in the game folder run `.\Tools\unity.ps1 -Method CandleLiars.EditorTools.WebsiteShots.All -Log website`,
  then `python -I tools\prep_game_art.py` here (cuts out the magenta background, makes the Reaper sprite sheet)
- `tools\cdp_shots.ps1` – pictures of the page with hidden Edge (scrolls, pokes the Reaper) into `shots\`
- `assets/video/teaser.mp4` – the 15 s reel
- `CNAME` – custom domain for GitHub Pages (reaper-rest.net)

## Look at it on your PC

```
python -m http.server 8765 --directory .
```

Then open http://localhost:8765

## Put it online (GitHub Pages)

1. Make a GitHub repo and push this folder.
2. Repo Settings -> Pages -> Deploy from branch `main`, folder `/`.
3. At your domain seller, point `reaper-rest.net` to GitHub Pages
   (A records 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 and a CNAME `www` -> `<user>.github.io`).
