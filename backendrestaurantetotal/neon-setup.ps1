# Cria as tabelas do Restaurante Total no Neon (PostgreSQL) e popula o básico.
# Uso (dentro de backendrestaurantetotal):  powershell -ExecutionPolicy Bypass -File .\neon-setup.ps1
# A URL e a senha são pedidas sem aparecer na tela e não ficam salvas em arquivo.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:PYTHONUTF8 = '1'  # o gerador do Prisma no Windows precisa ler o schema em UTF-8

function Read-Secret($prompt) {
    $secure = Read-Host $prompt -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$url = Read-Secret 'Cole a DATABASE_URL do Neon (sem -pooler)'
if ($url -notmatch '^postgres(ql)?://') { throw 'Isso não parece uma URL do PostgreSQL.' }
if ($url -match '-pooler') { throw 'Use a URL DIRETA: desligue "Connection pooling" no Connect do Neon.' }
if ($url -notmatch 'sslmode=') { $url += ($(if ($url.Contains('?')) { '&' } else { '?' }) + 'sslmode=require') }

$adminPassword = Read-Secret 'Senha do admin do restaurante de exemplo (min. 6 caracteres)'
$platformPassword = Read-Secret 'Senha do SEU login da plataforma, usuario admin (min. 6 caracteres)'
if ($adminPassword.Length -lt 6 -or $platformPassword.Length -lt 6) { throw 'As senhas precisam ter pelo menos 6 caracteres.' }

$env:DATABASE_URL = $url
$env:ADMIN_PASSWORD = $adminPassword
$env:PLATFORM_ADMIN_PASSWORD = $platformPassword
$env:PATH = "$PSScriptRoot\.venv\Scripts;$env:PATH"

try {
    Write-Host "`n> Criando tabelas no Neon (migracoes)..." -ForegroundColor Green
    prisma migrate deploy
    if ($LASTEXITCODE) { throw 'prisma migrate deploy falhou.' }

    Write-Host "`n> Populando cardapio, mesas e admin..." -ForegroundColor Green
    python seed.py
    if ($LASTEXITCODE) { throw 'seed.py falhou.' }

    Write-Host "`nPronto! Veja as tabelas em Neon -> Tables." -ForegroundColor Green
}
finally {
    Remove-Item Env:DATABASE_URL, Env:ADMIN_PASSWORD, Env:PLATFORM_ADMIN_PASSWORD -ErrorAction SilentlyContinue
}
