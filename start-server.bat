@echo off
REM Quick Start Script for COMTRADE Viewer
REM This script starts a local web server

echo.
echo =====================================================
echo   COMTRADE Viewer - Starting Development Server
echo =====================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Found Node.js - Starting server...
    echo.
    node server.js
) else (
    echo Node.js not found. Trying Python...
    echo.
    where python >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo Found Python - Starting server on port 8000...
        echo.
        echo Open browser: http://localhost:8000
        echo Press Ctrl+C to stop
        echo.
        python -m http.server 8000
    ) else (
        echo.
        echo ERROR: Neither Node.js nor Python found!
        echo.
        echo Please install one of:
        echo   - Node.js from https://nodejs.org
        echo   - Python from https://python.org
        echo.
        pause
    )
)
