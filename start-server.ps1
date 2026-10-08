# Starts the local development web server for this site.
#
#   .\start-server.ps1            -> http://localhost:8080/
#   .\start-server.ps1 -Port 9000
#
# The server only listens on 127.0.0.1, so it is reachable from this computer
# only. It runs hidden in the background until you run .\stop-server.ps1 (or
# log out / restart). It is NOT configured to start with Windows.
param(
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$root    = $PSScriptRoot
$pidFile = Join-Path $root '.server.pid'
$logFile = Join-Path $root '.server.log'
$url     = "http://localhost:$Port/"

function Find-Php {
    $cmd = Get-Command php -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    # winget installs PHP per user; a shell opened before the install does not have it on PATH yet
    $found = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages') -Directory -Filter 'PHP.PHP*' -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName 'php.exe' } |
        Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($found) { return $found }
    throw "PHP was not found. Install it with: winget install --id PHP.PHP.8.4 --source winget"
}

# already running?
if (Test-Path $pidFile) {
    $existing = Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue
    if ($existing -and $existing.ProcessName -like 'php*') {
        Write-Host "Server is already running: $url (PID $($existing.Id))"
        return
    }
    Remove-Item $pidFile -Force
}

# something else using the port?
$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    throw "Port $Port is already in use by another program. Try: .\start-server.ps1 -Port 9000"
}

$php = Find-Php
$process = Start-Process -FilePath $php `
    -ArgumentList @('-S', "127.0.0.1:$Port", '-t', "`"$root`"") `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $root '.server.out.log') `
    -RedirectStandardError $logFile `
    -PassThru
Set-Content -Path $pidFile -Value $process.Id

# Wait until it answers. Probe 127.0.0.1 directly: Windows PowerShell tries IPv6
# for "localhost" first, and the server only listens on IPv4.
$probe = "http://127.0.0.1:$Port/"
$ready = $false
for ($i = 0; $i -lt 25 -and -not $ready; $i++) {
    Start-Sleep -Milliseconds 200
    if ($process.HasExited) { break }
    try {
        Invoke-WebRequest -Uri $probe -UseBasicParsing -TimeoutSec 2 | Out-Null
        $ready = $true
    } catch {
        # a 404 is still an answer; only a connection failure means "not up yet"
        if ($_.Exception.Response) { $ready = $true }
    }
}

if (-not $ready) {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    throw "The server did not start. See $logFile"
}

Write-Host "Server started: $url (PID $($process.Id))"
Write-Host "Music sheet:    ${url}pages/musicsheet/"
Write-Host "Stop it with:   .\stop-server.ps1"
