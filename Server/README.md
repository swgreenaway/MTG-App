## Setup
1. Install Latest Version of [Node](https://nodejs.org/en/download)
2. Install Express 
```bash
npm install express
```
3. Start Node using watch mode for live updating:
```bash
node --watch-path=./src src/server.mjs
```

## Database Management

### Starting the Database
```bash
# Start PostgreSQL and PgAdmin containers
docker compose up -d

# Check container status
docker ps
```

### Database Backup and Restore

The MTG app includes convenient scripts for backing up and restoring your PostgreSQL database.

#### Creating Backups

**Using Bash (Linux/Mac/WSL):**
```bash
cd Server/scripts
./backup-db.sh
```

**Using PowerShell (Windows):**
```powershell
cd Server/scripts
./backup-db.ps1
```

**Features:**
- Creates timestamped backup files (`mtg_backup_YYYYMMDD_HHMMSS.sql`)
- Automatically cleans up old backups (keeps last 10)
- Includes complete database structure and data
- Stored in `Server/src/db/backups/` directory

#### Restoring from Backups

**Using Bash (Linux/Mac/WSL):**
```bash
cd Server/scripts
./restore-db.sh                    # Interactive mode
./restore-db.sh latest             # Restore latest backup
./restore-db.sh backup_file.sql    # Restore specific backup
```

**Using PowerShell (Windows):**
```powershell
cd Server/scripts
./restore-db.ps1                                    # Interactive mode
./restore-db.ps1 -BackupFile latest                 # Restore latest backup
./restore-db.ps1 -BackupFile backup_file.sql        # Restore specific backup
```

**Features:**
- Interactive backup selection
- Automatic backup file validation
- Safety confirmation prompts
- Complete database replacement
- Supports latest backup shortcut

#### Backup File Management

Backup files are stored in `Server/src/db/backups/` and follow this naming convention:
```
mtg_backup_20231215_143022.sql
```

The backup script automatically:
- Creates the backup directory if it doesn't exist
- Keeps the 10 most recent backups
- Removes older backups to save disk space

#### Requirements

- Docker must be running
- PostgreSQL container must be running (`docker compose up -d`)
- For Windows: WSL or Git Bash for script execution

#### Troubleshooting

**Container not running:**
```bash
docker compose up -d
```

**Permission issues (Linux/Mac):**
```bash
chmod +x scripts/*.sh
```

**WSL not available (Windows):**
Install Git Bash or Windows Subsystem for Linux (WSL)

### Database Migrations

For schema changes, migration scripts are available in `src/db/migrations/`.

**Running Migrations:**

**Using Bash (Linux/Mac/WSL):**
```bash
cd Server/scripts
./run-migration.sh migration_file.sql
```

**Using PowerShell (Windows):**
```powershell
cd Server/scripts
./run-migration.ps1 migration_file.sql
```

**Example - Allow null turn counts:**
```bash
./run-migration.sh alter_game_turns_nullable.sql
```

This migration allows games to be submitted without turn count information, which is useful when turn counts weren't tracked during gameplay.

## Azure Functions Layout

Function definitions live under `Server/src/functions/<functionName>/` and must include:
- `function.json` for bindings and routing.
- `index.mjs` as the handler entrypoint.

The deployment build step (`npm run build`) stages the Azure Functions structure into the package root (`Server/`). It mirrors:
- `src/functions/*` to `Server/<functionName>/`
- `src/controllers`, `src/services`, and `src/db` to `Server/` so handlers can resolve their imports.

If you add or rename a function, make sure it follows the folder layout above so the build step can stage it correctly.
