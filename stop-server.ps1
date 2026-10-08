# Stops the local development web server started by start-server.ps1.
$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $PSScriptRoot '.server.pid'

if (-not (Test-Path $pidFile)) {
    Write-Host "No server is running (no .server.pid file)."
    return
}

$serverPid = [int](Get-Content $pidFile)
$process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
if ($process -and $process.ProcessName -like 'php*') {
    Stop-Process -Id $serverPid -Force
    Write-Host "Server stopped (PID $serverPid)."
} else {
    Write-Host "The server was not running."
}
Remove-Item $pidFile -Force
