# PowerShell wrapper for database backup script
# Runs the bash backup script from PowerShell

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "MTG Database Backup Utility" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This script creates a timestamped backup of the PostgreSQL database."
    Write-Host ""
    Write-Host "Usage: .\backup-db.ps1"
    Write-Host ""
    Write-Host "Requirements:"
    Write-Host "- Docker must be running"
    Write-Host "- PostgreSQL container must be running (docker compose up -d)"
    Write-Host "- WSL or Git Bash must be available for bash script execution"
    exit 0
}

Write-Host "🗂️  MTG Database Backup" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "backup-db.sh")) {
    Write-Host "❌ Error: backup-db.sh not found in current directory" -ForegroundColor Red
    Write-Host "Please run this script from the Server/scripts directory" -ForegroundColor Red
    exit 1
}

# Try to run the bash script
try {
    if (Get-Command bash -ErrorAction SilentlyContinue) {
        bash ./backup-db.sh
    } elseif (Get-Command wsl -ErrorAction SilentlyContinue) {
        wsl bash ./backup-db.sh
    } else {
        Write-Host "❌ Error: Neither bash nor WSL found" -ForegroundColor Red
        Write-Host "Please install Git Bash or WSL to run this script" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running backup script: $_" -ForegroundColor Red
    exit 1
}