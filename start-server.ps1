# Quick Start Script for COMTRADE Viewer (PowerShell)
# 
# Usage: .\start-server.ps1
#

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗"
Write-Host "║     COMTRADE Viewer - Starting Development Server        ║"
Write-Host "╚════════════════════════════════════════════════════════════╝"
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Found Node.js ($nodeVersion)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Starting server with Node.js..." -ForegroundColor Cyan
        Write-Host ""
        & node server.js
        exit
    }
}
catch {
    # Node.js not found, try Python
}

# Check if Python is installed
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Found Python ($pythonVersion)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Starting server with Python..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Open browser: http://localhost:8000" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        python -m http.server 8000
        exit
    }
}
catch {
    # Python not found
}

# Neither found
Write-Host ""
Write-Host "❌ ERROR: Neither Node.js nor Python found!" -ForegroundColor Red
Write-Host ""
Write-Host "Please install one of the following:" -ForegroundColor Yellow
Write-Host "  • Node.js from https://nodejs.org" -ForegroundColor Yellow
Write-Host "  • Python from https://python.org" -ForegroundColor Yellow
Write-Host ""
Write-Host "After installation, try again:" -ForegroundColor Cyan
Write-Host "  .\start-server.ps1" -ForegroundColor Cyan
Write-Host ""
