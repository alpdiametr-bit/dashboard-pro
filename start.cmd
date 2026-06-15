@echo off
REM ===========================================================================
REM  dashboard-pro - ishga tushirish (start)
REM  Ishlatish: start.cmd ustiga 2 marta bos yoki terminalda: start.cmd
REM ===========================================================================
setlocal

cd /d "%~dp0"

REM -- docker.exe ni topish (PATH'da bo'lmasligi mumkin) --
set "DOCKER=docker"
where docker >nul 2>&1
if errorlevel 1 (
    if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
        set "DOCKER=C:\Program Files\Docker\Docker\resources\bin\docker.exe"
        echo  !  docker PATH'da yo'q - to'liq yo'l ishlatilmoqda
    ) else (
        echo  X  Docker topilmadi. Docker Desktop o'rnatilganini tekshiring.
        pause
        exit /b 1
    )
)

REM -- Docker engine ishlayotganini tekshirish --
echo.
echo ==^> Docker tekshirilmoqda
"%DOCKER%" info >nul 2>&1
if errorlevel 1 (
    echo  !  Docker engine ishlamayapti - Docker Desktop ishga tushirilmoqda...
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    ) else (
        echo  X  Docker Desktop topilmadi. Uni qo'lda ishga tushiring.
        pause
        exit /b 1
    )

    echo  Docker engine yuklanmoqda...
    set /a TRIES=0
    :waitloop
    timeout /t 2 /nobreak >nul
    "%DOCKER%" info >nul 2>&1
    if not errorlevel 1 goto ready
    set /a TRIES+=1
    if %TRIES% geq 90 (
        echo  X  Docker engine vaqtida ishga tushmadi. Qayta urinib ko'ring.
        pause
        exit /b 1
    )
    goto waitloop
)
:ready
echo  OK  Docker tayyor

REM -- Stack'ni ko'tarish --
echo.
echo ==^> dashboard-pro ishga tushirilmoqda (birinchi build 1-3 daqiqa)
"%DOCKER%" compose up -d --build
if errorlevel 1 (
    echo  X  Ishga tushirishda xatolik. Loglar uchun: "%DOCKER%" compose logs -f
    pause
    exit /b 1
)

echo.
echo ==^> Tayyor! Kirish nuqtalari
echo  Sayt           http://localhost
echo  Prisma Studio  http://localhost:5555
echo  MySQL          localhost:3307
echo  Admin          admin / admin123
echo.
echo  To'xtatish:    stop.cmd

REM -- brauzerni ochish --
start "" "http://localhost"

endlocal
