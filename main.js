// The Reaper's Rest — landing page
// 1) HERO: the real tavern hall from the game in 3 depth layers. Scrolling walks you into the hall
//    (the near layer grows fastest), the mouse moves the layers a little (depth).
// 2) THE REAPER: the bartender from the game stands behind his bar at the side of the screen.
//    He watches your mouse, says something about each part of the page, and if you poke him
//    3 times he does what he does in the game: glare, shotgun, BANG.
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hero = document.querySelector(".hero");
  const heroText = hero.querySelector(".hero-text");
  const layers = [...hero.querySelectorAll(".layer")];

  // for tools/shots.ps1 (full-page screenshots): ?heroh=900 fixes the hero height
  const params = new URLSearchParams(location.search);
  const heroH = parseInt(params.get("heroh"), 10);
  if (heroH > 300) hero.style.height = heroH + "px";

  // ================= HERO PARALLAX =================
  let mouseX = 0, mouseY = 0;          // -1 .. 1, for the hero layers
  function updateHero() {
    const y = window.scrollY, hh = hero.offsetHeight;
    if (y > hh * 1.2) return;
    const p = Math.min(1, y / hh);       // 0 at the top, 1 when the hero is gone
    for (const el of layers) {
      const zoom = 1 + parseFloat(el.dataset.zoom) * p;
      const lift = parseFloat(el.dataset.lift) * y;
      const sway = parseFloat(el.dataset.sway);
      el.style.transform =
        `translate3d(${(-mouseX * sway).toFixed(1)}px, ${(lift - mouseY * sway * 0.5).toFixed(1)}px, 0) scale(${zoom.toFixed(4)})`;
    }
    heroText.style.transform = `translate(-50%, ${(-y * 0.25).toFixed(1)}px)`;
    heroText.style.opacity = String(Math.max(0, 1 - y / (hh * 0.55)));
  }

  // dust floating in the candle light
  const dust = hero.querySelector(".dust");
  const dctx = dust.getContext("2d");
  const motes = [];
  let DW = 0, DH = 0;
  function sizeDust() {
    const P = Math.max(2, Math.round(hero.clientWidth / 480));
    DW = dust.width = Math.ceil(hero.clientWidth / P);
    DH = dust.height = Math.ceil(hero.clientHeight / P);
    motes.length = 0;
    for (let i = 0; i < DW * DH * 0.0009; i++) motes.push(newMote(true));
  }
  function newMote(anywhere) {
    return { x: Math.random() * DW, y: anywhere ? Math.random() * DH : DH + 2, v: 0.08 + Math.random() * 0.25, p: Math.random() * 6.28, warm: Math.random() < 0.6 };
  }
  let lastDust = 0;
  function drawDust(now) {
    if (now - lastDust < 66) return;   // ~15 fps, like an old game
    lastDust = now;
    dctx.clearRect(0, 0, DW, DH);
    for (const m of motes) {
      m.y -= m.v; m.x += Math.sin(now / 900 + m.p) * 0.15;
      if (m.y < -2) Object.assign(m, newMote(false));
      const a = 0.35 + 0.35 * Math.sin(now / 400 + m.p);
      dctx.fillStyle = m.warm ? `rgba(242,179,61,${a.toFixed(2)})` : `rgba(255,241,214,${(a * 0.6).toFixed(2)})`;
      dctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
    }
  }

  // ================= SCREENSHOTS + BAND PARALLAX =================
  const shots = [...document.querySelectorAll("[data-parallax]")];
  const band = document.querySelector("[data-band]");
  function updateShots() {
    const vh = window.innerHeight;
    for (const s of shots) {
      const r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      s.firstElementChild.style.transform = `translate3d(0, ${(p * r.height * parseFloat(s.dataset.parallax)).toFixed(1)}px, 0)`;
    }
    if (band) {
      const r = band.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        band.style.transform = `translate3d(0, ${(p * r.height * 0.35).toFixed(1)}px, 0)`;
      }
    }
  }

  // ================= THE REAPER =================
  const reaper = document.getElementById("reaper");
  const body = reaper.querySelector(".reaper-body");
  const say = reaper.querySelector(".reaper-say");
  const sayP = say.querySelector("p");
  const shotScreen = document.getElementById("shotScreen");
  const F = { lookm60: 0, lookm30: 1, look0: 2, look30: 3, look60: 4, warn: 5, aim: 6 };  // sprite sheet order

  // What he says about each part of the page (shown once per part, when you get there).
  const LINES = [
    [".intro", "Welcome, traveler. Wipe your boots."],
    [".feature:nth-of-type(1)", "Sit at the green table. The skeleton deals. I keep the gold."],
    [".feature:nth-of-type(2)", "Six chambers. One bullet. Pick a seat."],
    [".feature:nth-of-type(3)", "Out there they throw tomatoes. In here, you behave."],
    [".feature:nth-of-type(4)", "Bring friends. More guests, more rent."],
    [".band", "The rent is due at dawn. No exceptions."],
    [".teaser", "Fifteen seconds. Don't blink."],
    [".wip", "Yes, the tavern is still being built. Mind the dust."],
    [".dev", "One mortal built all of this. In Bahrain. I'm impressed."],
    [".footer", "Leaving already? Come back at night."],
  ];
  // The same lines as the game, when you poke him (TavernBuilder: the Reaper's TavernInteractable).
  const POKE = [
    "THE REAPER STARES AT YOU. HE IS NOT AMUSED.",
    "HIS BONY HAND MOVES TOWARD THE SHOTGUN.",
  ];

  let anger = 0, lastPoke = 0, busy = false, isUp = false, sayTimer = 0, look = F.look30;
  let hintShown = false;

  function setFrame(f) { reaper.style.setProperty("--frame", f); }
  function speak(html, ms = 3600) {
    sayP.innerHTML = html;
    say.classList.add("show");
    reaper.classList.add("talking");
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { say.classList.remove("show"); reaper.classList.remove("talking"); }, ms);
  }

  // head follows the mouse (5 frames: look60 = to the left of the screen ... lookm60 = to the right)
  function lookAtPoint(px) {
    if (busy || anger > 0) return;
    const r = body.getBoundingClientRect();
    const t = (px - (r.left + r.width * 0.5)) / Math.max(300, window.innerWidth * 0.35);
    const f = t < -0.75 ? F.look60 : t < -0.22 ? F.look30 : t < 0.22 ? F.look0 : t < 0.75 ? F.lookm30 : F.lookm60;
    if (f !== look) { look = f; setFrame(f); }
  }

  // up behind the bar once you leave the hero
  function updateReaper() {
    const show = window.scrollY > hero.offsetHeight * 0.55;
    if (show !== isUp) {
      isUp = show;
      reaper.classList.toggle("up", show);
      if (show && !hintShown) {
        hintShown = true;
        setTimeout(() => speak(`Evening. Don't touch the bartender.${finePointer ? '<span class="hint">(he means it)</span>' : ""}`, 4200), 750);
      }
    }
  }

  // talk when a part of the page comes into view
  const said = new Set();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting || !isUp || busy || anger > 0) continue;
      const line = e.target.dataset.reaperLine;
      if (said.has(line)) continue;
      said.add(line);
      speak(line);
      // without a mouse, he looks toward the text
      if (!finePointer) setFrame(look = F.look30);
    }
  }, { threshold: 0.45 });
  for (const [sel, line] of LINES) {
    const el = document.querySelector(sel);
    if (el) { el.dataset.reaperLine = line; io.observe(el); }
  }

  // poke him
  body.addEventListener("click", () => {
    if (busy) return;
    lastPoke = Date.now();
    anger++;
    if (anger === 1) {
      setFrame(look = F.look0);
      reaper.classList.add("angry");
      speak(`<span class="game">${POKE[0]}</span>`, 3200);
    } else if (anger === 2) {
      setFrame(F.warn);
      reaper.classList.add("angry", "angry2");
      speak(`<span class="game">${POKE[1]}</span><span class="hint">Last warning.</span>`, 3200);
    } else {
      shoot();
    }
  });

  function shoot() {
    busy = true;
    reaper.classList.remove("angry2");
    setFrame(F.aim);
    reaper.classList.add("aiming");
    speak(`<span class="game">"ORDER SOMETHING OR GET OUT."</span>`, 1400);
    setTimeout(() => {
      say.classList.remove("show");
      reaper.classList.add("bang");
      document.body.classList.add("hit");
      shotScreen.hidden = false;
      document.getElementById("getUp").focus({ preventScroll: true });
    }, reduceMotion ? 300 : 1100);
  }

  function getUp() {
    document.body.classList.remove("hit");
    shotScreen.hidden = true;
    reaper.classList.remove("bang", "aiming", "angry", "angry2");
    anger = 0; busy = false;
    setFrame(look = F.look30);
    setTimeout(() => speak("Now. Where were we?", 2600), 300);
  }
  document.getElementById("getUp").addEventListener("click", getUp);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !shotScreen.hidden) getUp(); });

  // anger goes away slowly (like the game)
  setInterval(() => {
    if (busy || anger === 0 || Date.now() - lastPoke < 9000) return;
    anger--;
    lastPoke = Date.now();
    reaper.classList.toggle("angry2", false);
    if (anger === 0) { reaper.classList.remove("angry"); setFrame(look = F.look30); }
    else setFrame(F.look0);
  }, 1000);

  // ================= EVENTS =================
  function onScroll() { if (!reduceMotion) { updateHero(); updateShots(); } updateReaper(); }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); }
  }, { passive: true });

  window.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    mouseX = e.clientX / window.innerWidth * 2 - 1;
    mouseY = e.clientY / window.innerHeight * 2 - 1;
    if (!reduceMotion && window.scrollY < hero.offsetHeight) updateHero();
    if (isUp) lookAtPoint(e.clientX);
  }, { passive: true });

  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { sizeDust(); onScroll(); }, 120); });

  function loop(now) {
    if (window.scrollY < hero.offsetHeight) drawDust(now);
    requestAnimationFrame(loop);
  }

  sizeDust();
  setFrame(look);
  onScroll();
  if (reduceMotion) drawDust(1000); else requestAnimationFrame(loop);

  const yr = document.getElementById("year");
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
