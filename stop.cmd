@echo off
REM ===========================================================================
REM  dashboard-pro - to'xtatish (stop)
REM  Ishlatish: stop.cmd ustiga 2 marta bos yoki terminalda: stop.cmd
REM ===========================================================================
setlocal

cd /d "%~dp0"

REM -- docker.exe ni topish (PATH'da bo'lmasligi mumkin) --
set "DOCKER=docker"
where docker >nul 2>&1
if errorlevel 1 (
    if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
        set "DOCKER=C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    ) else (
        echo  X  Docker topilmadi.
        pause
        exit /b 1
    )
)

echo.
echo ==^> Konteynerlar to'xtatilmoqda
"%DOCKER%" compose down
if errorlevel 1 (
    echo  X  To'xtatishda xatolik.
    pause
    exit /b 1
)

echo  OK  To'xtatildi

endlocal
