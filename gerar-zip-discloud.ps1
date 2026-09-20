$destino = Join-Path $PSScriptRoot "discloud-deploy.zip"
if (Test-Path $destino) { Remove-Item $destino -Force }

$itens = @(
    "bot.js",
    "package.json",
    "package-lock.json",
    ".env",
    "discloud.config",
    "dados.json",
    "avatar.jpg",
    "sistema"
)

$arquivosCompletos = $itens | ForEach-Object { Join-Path $PSScriptRoot $_ } | Where-Object { Test-Path $_ }

Compress-Archive -Path $arquivosCompletos -DestinationPath $destino -Force
Write-Output "✅ Arquivo gerado com sucesso em: $destino"
