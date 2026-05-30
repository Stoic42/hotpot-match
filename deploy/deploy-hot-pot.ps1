# Deploy hotpot-party to https://hot-pot.ton-ton.fun
# Usage: .\deploy\deploy-hot-pot.ps1
$ErrorActionPreference = "Stop"
$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Key = if ($env:HOTPOT_DEPLOY_KEY) { $env:HOTPOT_DEPLOY_KEY } else { "$env:USERPROFILE\.ssh\id_ed25519_tonton" }
$HostAddr = if ($env:HOTPOT_DEPLOY_HOST) { $env:HOTPOT_DEPLOY_HOST } else { "ubuntu@82.157.123.207" }
$Staging = Join-Path $env:TEMP "hotpot-party-deploy"
$Tar = Join-Path $env:TEMP "hotpot-party-deploy.tgz"

Set-Location $Repo
Write-Host "==> npm run build"
if (-not (Test-Path "node_modules")) { npm ci }
npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "==> stage standalone"
if (Test-Path $Staging) { Remove-Item -Recurse -Force $Staging }
New-Item -ItemType Directory -Path $Staging | Out-Null
Copy-Item -Recurse ".next\standalone\*" $Staging
New-Item -ItemType Directory -Force -Path (Join-Path $Staging ".next") | Out-Null
Copy-Item -Recurse ".next\static" (Join-Path $Staging ".next\static")
if (Test-Path "public") { Copy-Item -Recurse "public" (Join-Path $Staging "public") }
if (-not (Test-Path ".env")) { throw ".env missing — need DATABASE_URL" }
Copy-Item ".env" (Join-Path $Staging ".env")
Copy-Item "deploy\ecosystem.config.cjs" (Join-Path $Staging "ecosystem.config.cjs")

if (Test-Path $Tar) { Remove-Item $Tar }
tar -czf $Tar -C $Staging .
if ($LASTEXITCODE -ne 0) { throw "tar failed" }

Write-Host "==> upload"
scp -i $Key $Tar "${HostAddr}:/tmp/hotpot-party-deploy.tgz"
scp -i $Key (Join-Path $Repo "deploy\nginx-hot-pot.conf") "${HostAddr}:/tmp/nginx-hot-pot.conf"
scp -i $Key (Join-Path $Repo "deploy\remote-install.sh") "${HostAddr}:/tmp/remote-install.sh"

Write-Host "==> remote install"
ssh -i $Key $HostAddr "chmod +x /tmp/remote-install.sh && bash /tmp/remote-install.sh"

Write-Host "==> Done: https://hot-pot.ton-ton.fun"
