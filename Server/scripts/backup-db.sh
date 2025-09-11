#!/bin/bash

# Database backup script for MTG App PostgreSQL database
# Creates a timestamped backup file in the backups directory

set -e  # Exit on any error

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found in parent directory"
    exit 1
fi

# Configuration
CONTAINER_NAME="pg-local"
BACKUP_DIR="../src/db/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="mtg_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🗂️  Starting database backup...${NC}"

# Check if container is running
if ! docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Error: PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    echo "Please start the database with: docker compose up -d"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create database backup
echo -e "${YELLOW}📦 Creating backup: ${BACKUP_FILENAME}${NC}"

docker exec -t "${CONTAINER_NAME}" pg_dump \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --clean \
    --if-exists \
    --create \
    --verbose \
    > "${BACKUP_PATH}"

# Check if backup was successful
if [ $? -eq 0 ] && [ -s "${BACKUP_PATH}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo -e "${GREEN}📁 Location: ${BACKUP_PATH}${NC}"
    echo -e "${GREEN}📏 Size: ${BACKUP_SIZE}${NC}"
    
    # Keep only the last 10 backups
    echo -e "${YELLOW}🧹 Cleaning up old backups (keeping last 10)...${NC}"
    cd "${BACKUP_DIR}"
    ls -t mtg_backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm -f
    
    echo -e "${GREEN}🎉 Backup process completed!${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    rm -f "${BACKUP_PATH}"
    exit 1
fi