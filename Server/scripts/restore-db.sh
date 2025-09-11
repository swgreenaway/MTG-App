#!/bin/bash

# Database restore script for MTG App PostgreSQL database
# Restores database from a backup file

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

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage: $0 [backup_file]${NC}"
    echo ""
    echo "Options:"
    echo "  backup_file    Path to backup file (optional - will prompt if not provided)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Interactive mode"
    echo "  $0 mtg_backup_20231215_143022.sql   # Restore specific backup"
    echo "  $0 latest                           # Restore latest backup"
}

# Function to list available backups
list_backups() {
    echo -e "${YELLOW}📁 Available backups:${NC}"
    if ls "${BACKUP_DIR}"/mtg_backup_*.sql 1> /dev/null 2>&1; then
        ls -lt "${BACKUP_DIR}"/mtg_backup_*.sql | awk '{print NR". "$9" ("$6" "$7" "$8")"}' | sed "s|${BACKUP_DIR}/||g"
    else
        echo -e "${RED}No backup files found in ${BACKUP_DIR}${NC}"
        return 1
    fi
}

# Function to get latest backup
get_latest_backup() {
    ls -t "${BACKUP_DIR}"/mtg_backup_*.sql 2>/dev/null | head -1
}

echo -e "${YELLOW}🔄 MTG Database Restore Utility${NC}"

# Check if container is running
if ! docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Error: PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    echo "Please start the database with: docker compose up -d"
    exit 1
fi

# Handle command line arguments
BACKUP_FILE=""
if [ $# -eq 1 ]; then
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    elif [ "$1" = "latest" ]; then
        BACKUP_FILE=$(get_latest_backup)
        if [ -z "$BACKUP_FILE" ]; then
            echo -e "${RED}❌ No backup files found${NC}"
            exit 1
        fi
        echo -e "${GREEN}📦 Using latest backup: $(basename "$BACKUP_FILE")${NC}"
    else
        # Check if file exists (with or without path)
        if [ -f "$1" ]; then
            BACKUP_FILE="$1"
        elif [ -f "${BACKUP_DIR}/$1" ]; then
            BACKUP_FILE="${BACKUP_DIR}/$1"
        else
            echo -e "${RED}❌ Backup file not found: $1${NC}"
            exit 1
        fi
    fi
elif [ $# -gt 1 ]; then
    echo -e "${RED}❌ Too many arguments${NC}"
    show_usage
    exit 1
fi

# Interactive mode if no file specified
if [ -z "$BACKUP_FILE" ]; then
    if ! list_backups; then
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}Enter backup number, filename, or 'latest':${NC}"
    read -r selection
    
    if [ "$selection" = "latest" ]; then
        BACKUP_FILE=$(get_latest_backup)
    elif [[ "$selection" =~ ^[0-9]+$ ]]; then
        # User selected by number
        BACKUP_FILE=$(ls -lt "${BACKUP_DIR}"/mtg_backup_*.sql | awk "NR==$selection {print \$9}")
    else
        # User entered filename
        if [ -f "${BACKUP_DIR}/$selection" ]; then
            BACKUP_FILE="${BACKUP_DIR}/$selection"
        else
            echo -e "${RED}❌ Invalid selection: $selection${NC}"
            exit 1
        fi
    fi
fi

# Verify backup file exists and is readable
if [ ! -f "$BACKUP_FILE" ] || [ ! -r "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Cannot read backup file: $BACKUP_FILE${NC}"
    exit 1
fi

# Show confirmation
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will completely replace the current database!${NC}"
echo -e "${BLUE}📁 Backup file: $(basename "$BACKUP_FILE")${NC}"
echo -e "${BLUE}📏 File size: $(du -h "$BACKUP_FILE" | cut -f1)${NC}"
echo ""
echo -e "${RED}Do you want to continue? (yes/no):${NC}"
read -r confirmation

if [ "$confirmation" != "yes" ] && [ "$confirmation" != "y" ]; then
    echo -e "${YELLOW}❌ Restore cancelled${NC}"
    exit 0
fi

# Perform the restore
echo -e "${YELLOW}🔄 Starting database restore...${NC}"

# Copy backup file to container (if not already there)
CONTAINER_BACKUP_PATH="/backups/$(basename "$BACKUP_FILE")"
echo -e "${YELLOW}📋 Copying backup to container...${NC}"
docker cp "$BACKUP_FILE" "${CONTAINER_NAME}:${CONTAINER_BACKUP_PATH}"

# Restore database
echo -e "${YELLOW}📥 Restoring database...${NC}"
docker exec -i "${CONTAINER_NAME}" psql \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -f "${CONTAINER_BACKUP_PATH}"

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database restore completed successfully!${NC}"
    echo -e "${GREEN}📊 Restored from: $(basename "$BACKUP_FILE")${NC}"
    
    # Clean up temporary file in container
    docker exec "${CONTAINER_NAME}" rm -f "${CONTAINER_BACKUP_PATH}"
    
    echo -e "${GREEN}🎉 Restore process completed!${NC}"
else
    echo -e "${RED}❌ Database restore failed!${NC}"
    exit 1
fi