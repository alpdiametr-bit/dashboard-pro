# ===========================================================================
#  dashboard-pro — bitta buyruq bilan ishga tushirish
#  Ishlatish:  .\start.ps1            (build + run, brauzer ochiladi)
#              .\start.ps1 -Down      (to'xtatish)
#              .\start.ps1 -Logs      (loglarni kuzatish)
#              .\start.ps1 -NoBuild   (qayta build qilmasdan ko'tarish)
# ===========================================================================

param(
    [switch]$Down,      # konteynerlarni to'xtatish
    [switch]$Logs,      # loglarni ko'rsatish
    [switch]$NoBuild    # build qilmasdan ishga tushirish
)

$ErrorActionPreference = "Stop"

# ── Chiroyli yozuvlar uchun yordamchilar ──────────────────────────────────
function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  !   $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  X   $msg" -ForegroundColor Red }

# ── 1) docker.exe ni topish (PATH'da bo'lmasligi mumkin) ──────────────────
Write-Step "Docker tekshirilmoqda"

$docker = "docker"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $fallback = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    if (Test-Path $fallback) {
        $docker = $fallback
        Write-Warn "docker PATH'da yo'q — to'liq yo'l ishlatilmoqda"
    } else {
        Write-Err "Docker topilmadi. Docker Desktop o'rnatilganini tekshiring."
        exit 1
    }
}

# ── 2) Docker engine ishlayotganini tekshirish, kerak bo'lsa ishga tushirish ──
& $docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Docker engine ishlamayapti — Docker Desktop ishga tushirilmoqda..."
    $desktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $desktop) {
        Start-Process $desktop
    } else {
        Write-Err "Docker Desktop topilmadi. Uni qo'lda ishga tushiring."
        exit 1
    }

    # engine tayyor bo'lguncha kutish (maksimum ~3 daqiqa)
    Write-Host "  Docker engine yuklanmoqda" -NoNewline
    $ready = $false
    for ($i = 0; $i -lt 90; $i++) {
        Start-Sleep -Seconds 2
        & $docker info *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Write-Host "." -NoNewline
    }
    Write-Host ""
    if (-not $ready) {
        Write-Err "Docker engine vaqtida ishga tushmadi. Qayta urinib ko'ring."
        exit 1
    }
}
Write-Ok "Docker tayyor"

# ── 3) To'xtatish rejimi ──────────────────────────────────────────────────
if ($Down) {
    Write-Step "Konteynerlar to'xtatilmoqda"
    & $docker compose down
    Write-Ok "To'xtatildi"
    exit 0
}

# ── 4) Loglar rejimi ──────────────────────────────────────────────────────
if ($Logs) {
    Write-Step "Loglar (chiqish uchun Ctrl+C)"
    & $docker compose logs -f
    exit 0
}

# ── 5) Stack'ni ko'tarish ─────────────────────────────────────────────────
Write-Step "dashboard-pro ishga tushirilmoqda (birinchi build 1-3 daqiqa)"

if ($NoBuild) {
    & $docker compose up -d
} else {
    & $docker compose up -d --build
}

if ($LASTEXITCODE -ne 0) {
    Write-Err "Ishga tushirishda xatolik. Loglar: .\start.ps1 -Logs"
    exit 1
}

# ── 6) Yakuniy ma'lumot ───────────────────────────────────────────────────
Write-Step "Tayyor! Kirish nuqtalari"
Write-Host "  Sayt          " -NoNewline; Write-Host "http://localhost"        -ForegroundColor Green
Write-Host "  Prisma Studio " -NoNewline; Write-Host "http://localhost:5555"   -ForegroundColor Green
Write-Host "  MySQL         " -NoNewline; Write-Host "localhost:3307"          -ForegroundColor Green
Write-Host "  Admin         " -NoNewline; Write-Host "admin / admin123"        -ForegroundColor Green
Write-Host ""
Write-Host "  To'xtatish:   .\start.ps1 -Down"   -ForegroundColor DarkGray
Write-Host "  Loglar:       .\start.ps1 -Logs"   -ForegroundColor DarkGray

# brauzerni ochish
Start-Process "http://localhost"
