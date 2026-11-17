# Takes screenshots of the landing page with hidden (headless) Edge. No window opens.
# Needs the local server: python -m http.server 8765 --directory C:\Users\Ali\reaper-rest-site
# Makes a full-page picture, then cuts it into parts (tools\cut_shots.py).
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$out = "C:\Users\Ali\reaper-rest-site\shots"
New-Item -ItemType Directory -Force $out | Out-Null
$jobs = @(
  @{ name = "full_desktop"; url = "http://localhost:8765/?heroh=900"; size = "1440,7000" }
)
# (phone size: headless Edge can not go below ~500px wide, so check phones in a real browser)
foreach ($j in $jobs) {
  $file = Join-Path $out ($j.name + ".png")
  $profile = Join-Path $env:TEMP ("rr_shot_" + $j.name)
  & $edge --headless=new --disable-gpu --hide-scrollbars --mute-audio --user-data-dir="$profile" `
    --window-size=$($j.size) --virtual-time-budget=4000 --screenshot="$file" $j.url | Out-Null
  Write-Output "$($j.name): $(Test-Path $file)"
}
python -I C:\Users\Ali\reaper-rest-site\tools\cut_shots.py
