# Hidden (headless) Edge pictures of the page at chosen scroll places, with clicks, like a real visit.
# No window opens. Needs the local server: python -m http.server 8765 --directory C:\Users\Ali\reaper-rest-site
#   powershell -File tools\cdp_shots.ps1 [-Width 1440 -Height 900 -Prefix desktop]
param([int]$Width = 1440, [int]$Height = 900, [string]$Prefix = "desktop", [switch]$Mobile, [string]$Probe = "")
# -Probe "<js>" only loads the page and prints the result of that JavaScript (for checking things).

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$out = "C:\Users\Ali\reaper-rest-site\shots"
New-Item -ItemType Directory -Force $out | Out-Null
$port = 9333
$profile = Join-Path $env:TEMP "rr_cdp_profile"
$p = Start-Process $edge -ArgumentList @("--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio",
    "--remote-debugging-port=$port", "--user-data-dir=`"$profile`"", "--window-size=$Width,$Height", "about:blank") -PassThru
try {
    $ws = $null
    for ($i = 0; $i -lt 40 -and -not $ws; $i++) {
        Start-Sleep -Milliseconds 250
        try {
            $list = Invoke-RestMethod "http://127.0.0.1:$port/json"
            $ws = [string](@($list | ForEach-Object { $_ }) | Where-Object { $_.type -eq "page" } | Select-Object -First 1).webSocketDebuggerUrl
        } catch {}
    }
    if (-not $ws) { throw "no debugger" }
    $sock = New-Object System.Net.WebSockets.ClientWebSocket
    $sock.Options.KeepAliveInterval = [TimeSpan]::Zero
    $sock.ConnectAsync([Uri]$ws, [Threading.CancellationToken]::None).Wait()
    $script:id = 0
    function Send($method, $params) {
        $script:id++
        $msg = @{ id = $script:id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
        $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
        $sock.SendAsync([ArraySegment[byte]]$bytes, "Text", $true, [Threading.CancellationToken]::None).Wait()
        while ($true) {
            $ms = New-Object IO.MemoryStream
            do {
                $buf = New-Object byte[] 1048576
                $res = $sock.ReceiveAsync([ArraySegment[byte]]$buf, [Threading.CancellationToken]::None).Result
                $ms.Write($buf, 0, $res.Count)
            } while (-not $res.EndOfMessage)
            $obj = [Text.Encoding]::UTF8.GetString($ms.ToArray()) | ConvertFrom-Json
            if ($obj.id -eq $script:id) { return $obj }
        }
    }
    function Js($code) { (Send "Runtime.evaluate" @{ expression = $code; awaitPromise = $true; returnByValue = $true }).result.result.value }
    function Shot($name) {
        $r = Send "Page.captureScreenshot" @{ format = "png" }
        [IO.File]::WriteAllBytes((Join-Path $out "$Prefix`_$name.png"), [Convert]::FromBase64String($r.result.data))
        Write-Output "shot $Prefix`_$name"
    }
    function Wait($ms) { Start-Sleep -Milliseconds $ms }

    Send "Emulation.setDeviceMetricsOverride" @{ width = $Width; height = $Height; deviceScaleFactor = 1; mobile = [bool]$Mobile } | Out-Null
    if ($Mobile) { Send "Emulation.setTouchEmulationEnabled" @{ enabled = $true } | Out-Null }
    Send "Page.enable" @{} | Out-Null
    Send "Page.navigate" @{ url = "http://localhost:8765/?t=$(Get-Random)" } | Out-Null
    Wait 2500
    if ($Probe) { Write-Output (Js $Probe); Wait 1200; Shot "probe"; return }
    Shot "01_hero"
    # move the mouse a little (hero depth)
    Send "Input.dispatchMouseEvent" @{ type = "mouseMoved"; x = [int]($Width * 0.2); y = [int]($Height * 0.3) } | Out-Null
    Js "window.scrollTo(0, innerHeight * 0.45)" | Out-Null; Wait 700; Shot "02_walk_in"
    Js "window.scrollTo(0, document.querySelector('.intro').offsetTop - 40)" | Out-Null; Wait 2200; Shot "03_reaper_up"
    Js "document.querySelector('.feature:nth-of-type(2)').scrollIntoView({block:'center'})" | Out-Null; Wait 1500
    Send "Input.dispatchMouseEvent" @{ type = "mouseMoved"; x = [int]($Width * 0.3); y = [int]($Height * 0.5) } | Out-Null; Wait 300
    Shot "04_roulette_line"
    # poke him 3 times
    $c = Js "(() => { const r = document.querySelector('.reaper-body').getBoundingClientRect(); return [Math.round(r.left + r.width/2), Math.round(r.top + r.height*0.25)].join(','); })()"
    $x, $y = $c.Split(",") | ForEach-Object { [int]$_ }
    foreach ($n in 1..3) {
        Send "Input.dispatchMouseEvent" @{ type = "mousePressed"; x = $x; y = $y; button = "left"; clickCount = 1 } | Out-Null
        Send "Input.dispatchMouseEvent" @{ type = "mouseReleased"; x = $x; y = $y; button = "left"; clickCount = 1 } | Out-Null
        Wait 600; Shot "05_poke$n"
    }
    Wait 650; Shot "06_bang"
    Wait 1200; Shot "07_shot_screen"
    Js "document.getElementById('getUp').click()" | Out-Null; Wait 900
    Js "document.querySelector('.dev').scrollIntoView({block:'center'})" | Out-Null; Wait 1500; Shot "08_dev"
    $sock.Dispose()
} finally {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | Where-Object { $_.CommandLine -like "*rr_cdp_profile*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
