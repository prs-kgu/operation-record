@echo off
setlocal

:: スクリプトが存在するディレクトリに移動
cd /d %~dp0

echo --- Pulling latest changes ---
call git pull origin main

:: もし git pull が失敗したら中断する場合 (オプション)
if %errorlevel% neq 0 (
    echo Git pull failed.
    pause
    exit /b %errorlevel%
)

echo --- Installing dependencies ---
call npm install

echo --- Building project ---
call npm run build

echo --- Done! ---
pause