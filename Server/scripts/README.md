# Database Backup and Restore Scripts

This directory contains scripts for backing up and restoring the MTG application's PostgreSQL database.

## Files

### Bash Scripts (Linux/Mac/WSL)
- `backup-db.sh` - Creates timestamped database backups
- `restore-db.sh` - Restores database from backup files

### PowerShell Scripts (Windows)
- `backup-db.ps1` - PowerShell wrapper for backup-db.sh
- `restore-db.ps1` - PowerShell wrapper for restore-db.sh

## Quick Start

### Creating a Backup
```bash
# Linux/Mac/WSL
./backup-db.sh

# Windows PowerShell
./backup-db.ps1
```

### Restoring from Backup
```bash
# Linux/Mac/WSL
./restore-db.sh

# Windows PowerShell
./restore-db.ps1
```

## Features

### Backup Script
- ✅ Timestamped backup files (`mtg_backup_YYYYMMDD_HHMMSS.sql`)
- ✅ Automatic cleanup (keeps last 10 backups)
- ✅ Complete database dump with structure and data
- ✅ Progress indicators and colored output
- ✅ Error handling and validation

### Restore Script
- ✅ Interactive backup selection
- ✅ Support for "latest" backup shortcut
- ✅ Safety confirmation prompts
- ✅ File validation before restore
- ✅ Complete database replacement
- ✅ Automatic cleanup of temporary files

## Requirements

1. **Docker** must be running
2. **PostgreSQL container** must be running (`docker compose up -d`)
3. **Environment file** (`.env`) must exist in parent directory
4. **For Windows**: WSL or Git Bash for script execution

## Environment Variables Required

The scripts read from `../.env` file:
```env
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=your_db_name
```

## Backup File Location

Backups are stored in: `../src/db/backups/`

Example backup files:
```
mtg_backup_20231215_143022.sql
mtg_backup_20231215_150045.sql
mtg_backup_20231216_091530.sql
```

## Usage Examples

### Backup Examples
```bash
# Create backup (interactive)
./backup-db.sh

# PowerShell
./backup-db.ps1 -Help
```

### Restore Examples
```bash
# Interactive mode (shows available backups)
./restore-db.sh

# Restore latest backup
./restore-db.sh latest

# Restore specific backup
./restore-db.sh mtg_backup_20231215_143022.sql

# PowerShell equivalents
./restore-db.ps1
./restore-db.ps1 -BackupFile latest
./restore-db.ps1 -BackupFile mtg_backup_20231215_143022.sql
```

## Troubleshooting

### Container not running
```bash
docker compose up -d
docker ps  # Verify pg-local container is running
```

### Permission denied (Linux/Mac)
```bash
chmod +x *.sh
```

### Script not found (Windows)
- Install Git Bash or Windows Subsystem for Linux (WSL)
- Run from PowerShell with proper execution policy:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### Environment file missing
- Ensure `.env` file exists in `Server/` directory
- Verify it contains required PostgreSQL variables

## Safety Features

- Backup script validates container status before proceeding
- Restore script requires explicit confirmation before replacing database
- Failed backups are automatically cleaned up
- Scripts validate file existence and permissions
- Colored output for clear status indication

## Automation

These scripts can be integrated into:
- Cron jobs for scheduled backups
- CI/CD pipelines for database state management
- Development workflows for data preservation

Example cron job for daily backups:
```bash
0 2 * * * cd /path/to/mtg-app/Server/scripts && ./backup-db.sh
```