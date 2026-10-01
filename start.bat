@echo off
chcp 65001 >nul
title QazLife — Запуск проекта
color 0A

echo.
echo  ██████╗  █████╗ ███████╗██╗     ██╗███████╗███████╗
echo  ██╔═══██╗██╔══██╗╚══███╔╝██║     ██║██╔════╝██╔════╝
echo  ██║   ██║███████║  ███╔╝ ██║     ██║█████╗  █████╗
echo  ██║▄▄ ██║██╔══██║ ███╔╝  ██║     ██║██╔══╝  ██╔══╝
echo  ╚██████╔╝██║  ██║███████╗███████╗██║██║     ███████╗
echo   ╚══▀▀═╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝╚═╝     ╚══════╝
echo.
echo  Full-Stack: Node.js + PostgreSQL
echo  ════════════════════════════════════════════════════════
echo.

:: ─────────────────────────────────────────
:: ШАГИ:
::  1. Проверка Node.js
::  2. Проверка PostgreSQL
::  3. Создание .env (если нет)
::  4. npm install
::  5. Создание БД + schema
::  6. Запуск сервера
::  7. Открытие frontend
:: ─────────────────────────────────────────

set "PGUSER=postgres"
set "PGPASSWORD=postgres"
set "PGHOST=localhost"
set "PGPORT=5432"
set "DBNAME=qazlife"
set "PORT=3000"

:: ─── 1. Проверка Node.js ─────────────────
echo  [1/6] Проверка Node.js...
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo  [ОШИБКА] Node.js не найден!
    echo  Скачайте и установите: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo         OK — Node.js %NODE_VER%

:: ─── 2. Проверка PostgreSQL ──────────────
echo  [2/6] Проверка PostgreSQL...
where psql >nul 2>&1
if errorlevel 1 (
    :: Попробуем найти psql в стандартных папках
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
        set "PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin"
    ) else if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        set "PATH=%PATH%;C:\Program Files\PostgreSQL\16\bin"
    ) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
        set "PATH=%PATH%;C:\Program Files\PostgreSQL\15\bin"
    ) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
        set "PATH=%PATH%;C:\Program Files\PostgreSQL\14\bin"
    ) else (
        color 0C
        echo.
        echo  [ОШИБКА] PostgreSQL не найден!
        echo  Скачайте и установите: https://www.postgresql.org/download/windows/
        echo  После установки перезапустите start.bat
        echo.
        pause
        exit /b 1
    )
)
echo         OK — psql найден

:: ─── 3. Создание .env ────────────────────
echo  [3/6] Настройка окружения (.env)...
if not exist ".env" (
    echo # QazLife — автоматически создан start.bat > .env
    echo PORT=%PORT% >> .env
    echo NODE_ENV=development >> .env
    echo DATABASE_URL=postgresql://%PGUSER%:%PGPASSWORD%@%PGHOST%:%PGPORT%/%DBNAME% >> .env
    echo JWT_SECRET=qazlife_super_secret_jwt_key_change_in_production_2024 >> .env
    echo JWT_EXPIRES_IN=7d >> .env
    echo FRONTEND_URL=http://localhost:5500 >> .env
    echo RATE_LIMIT_WINDOW_MS=900000 >> .env
    echo RATE_LIMIT_MAX=100 >> .env
    echo AUTH_RATE_LIMIT_MAX=10 >> .env
    echo         .env создан с настройками по умолчанию
    echo.
    echo  ════════════════════════════════════════════════════════
    echo   ВАЖНО: Проверьте пароль PostgreSQL в файле .env
    echo   Если ваш пароль не "postgres" — отредактируйте .env:
    echo   DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/qazlife
    echo  ════════════════════════════════════════════════════════
    echo.
    echo  Нажмите любую клавишу после проверки .env...
    pause >nul
) else (
    echo         OK — .env уже существует
)

:: ─── 4. npm install ──────────────────────
echo  [4/6] Установка зависимостей npm...
if not exist "node_modules" (
    echo         Устанавливаем пакеты (может занять 1-2 минуты)...
    call npm install --silent
    if errorlevel 1 (
        color 0C
        echo  [ОШИБКА] npm install завершился с ошибкой!
        pause
        exit /b 1
    )
    echo         OK — зависимости установлены
) else (
    echo         OK — node_modules уже существует (пропускаем)
)

:: ─── 5. БД: создание + schema ────────────
echo  [5/6] Настройка базы данных PostgreSQL...

:: Проверяем подключение к PostgreSQL
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -c "\q" postgres >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo  [ОШИБКА] Не удалось подключиться к PostgreSQL!
    echo  Убедитесь что:
    echo    1. Сервис PostgreSQL запущен (services.msc)
    echo    2. Пользователь: %PGUSER%, Пароль: %PGPASSWORD%
    echo    3. Порт: %PGPORT%
    echo.
    echo  Для смены пароля — отредактируйте .env и start.bat (строки PGPASSWORD и PGUSER)
    echo.
    pause
    exit /b 1
)

:: Создаём базу данных (если не существует)
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -tc "SELECT 1 FROM pg_database WHERE datname='%DBNAME%'" postgres | findstr /C:"1" >nul 2>&1
if errorlevel 1 (
    echo         Создаём базу данных '%DBNAME%'...
    psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -c "CREATE DATABASE %DBNAME%;" postgres >nul 2>&1
    echo         OK — база данных создана
) else (
    echo         OK — база данных '%DBNAME%' уже существует
)

:: Применяем schema.sql
echo         Применяем schema.sql...
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %DBNAME% -f schema.sql >nul 2>&1
if errorlevel 1 (
    echo  [ПРЕДУПРЕЖДЕНИЕ] schema.sql вернул ошибку (возможно таблицы уже существуют — это нормально)
) else (
    echo         OK — схема применена
)

:: ─── 6. Запуск сервера ───────────────────
echo  [6/6] Запуск backend сервера...
echo         Сервер запускается в отдельном окне...
start "QazLife — Backend Server" cmd /k "color 0B && echo. && echo  QazLife Backend — http://localhost:%PORT% && echo  Нажмите Ctrl+C для остановки && echo. && node server.js"
timeout /t 3 /nobreak >nul

:: ─── 7. Открытие frontend ────────────────
echo.
echo  ════════════════════════════════════════════════════════
echo   Открываем frontend в браузере...
echo  ════════════════════════════════════════════════════════
echo.

if exist "index.html" (
    start "" "index.html"
    echo         OK — index.html открыт в браузере
) else if exist "public\index.html" (
    start "" "public\index.html"
    echo         OK — public\index.html открыт в браузере
) else (
    echo  [ИНФО] index.html не найден, открываем API...
    start "" "http://localhost:%PORT%"
)

echo.
echo  ════════════════════════════════════════════════════════
echo.
echo   Проект запущен!
echo.
echo   Backend API:  http://localhost:%PORT%
echo   Health check: http://localhost:%PORT%/health
echo.
echo   Для остановки сервера — закройте окно "QazLife — Backend Server"
echo.
echo  ════════════════════════════════════════════════════════
echo.
pause
