$ErrorActionPreference = 'Stop'
$pluginRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $pluginRoot
$nodeCommand = Get-Command node.exe -ErrorAction Stop
if (-not (Test-Path -LiteralPath (Join-Path $pluginRoot 'node_modules\albatros\albatros-cli.cjs'))) {
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
New-Item -ItemType Directory -Path (Join-Path $pluginRoot '.local') -Force | Out-Null
function Start-LocalServer($port, $entry, $logName) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($listener) {
        try {
            $manifest = Invoke-RestMethod -Uri "http://localhost:$port/package.json" -TimeoutSec 3
            if ($manifest.name -ne 'nashepo.collision360') { throw 'Unexpected application' }
            return
        } catch { throw "Port $port is occupied by another application. Close that application and try again." }
    }
    Start-Process -FilePath $nodeCommand.Source -ArgumentList $entry -WorkingDirectory $pluginRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $pluginRoot ".local\$logName.log") -RedirectStandardError (Join-Path $pluginRoot ".local\$logName.error.log")
}
Start-LocalServer 9091 @('node_modules/albatros/albatros-cli.cjs','serve') 'plugin-server'
Start-LocalServer 4173 @('scripts/preview.mjs') 'preview-server'
foreach ($port in @(9091,4173)) {
    $ready = $false
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        try { $null=Invoke-WebRequest -Uri "http://localhost:$port/package.json" -UseBasicParsing -TimeoutSec 2; $ready=$true; break } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "Local server on port $port did not start. See .local logs." }
}
Start-Process 'http://localhost:4173/preview.html'
Start-Process 'https://360.topomatic.ru/?extensionDevelopmentPath=http%3A%2F%2Flocalhost%3A9091'
