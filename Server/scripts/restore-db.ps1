# PowerShell wrapper for database restore script
# Runs the bash restore script from PowerShell

param(
    [string]$BackupFile = "",
    [switch]$Help
)

if ($Help) {
    Write-Host "MTG Database Restore Utility" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This script restores the PostgreSQL database from a backup file."
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\restore-db.ps1                           # Interactive mode"
    Write-Host "  .\restore-db.ps1 -BackupFile backup.sql    # Restore specific file"
    Write-Host "  .\restore-db.ps1 -BackupFile latest        # Restore latest backup"
    Write-Host ""
    Write-Host "Requirements:"
    Write-Host "- Docker must be running"
    Write-Host "- PostgreSQL container must be running (docker compose up -d)"
    Write-Host "- WSL or Git Bash must be available for bash script execution"
    exit 0
}

Write-Host "🔄 MTG Database Restore" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "restore-db.sh")) {
    Write-Host "❌ Error: restore-db.sh not found in current directory" -ForegroundColor Red
    Write-Host "Please run this script from the Server/scripts directory" -ForegroundColor Red
    exit 1
}

# Prepare arguments for bash script
$bashArgs = if ($BackupFile) { $BackupFile } else { "" }

# Try to run the bash script
try {
    if (Get-Command bash -ErrorAction SilentlyContinue) {
        if ($bashArgs) {
            bash ./restore-db.sh $bashArgs
        } else {
            bash ./restore-db.sh
        }
    } elseif (Get-Command wsl -ErrorAction SilentlyContinue) {
        if ($bashArgs) {
            wsl bash ./restore-db.sh $bashArgs
        } else {
            wsl bash ./restore-db.sh
        }
    } else {
        Write-Host "❌ Error: Neither bash nor WSL found" -ForegroundColor Red
        Write-Host "Please install Git Bash or WSL to run this script" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running restore script: $_" -ForegroundColor Red
    exit 1
}