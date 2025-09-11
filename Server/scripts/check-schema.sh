#!/bin/bash

# Script to check the current database schema
# This helps diagnose schema mismatches

set -e

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found in parent directory"
    exit 1
fi

# Configuration
CONTAINER_NAME="pg-local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 MTG Database Schema Checker${NC}"

# Check if container is running
if ! docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Error: PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    echo "Please start the database with: docker compose up -d"
    exit 1
fi

echo -e "${BLUE}📊 Current Database Schema:${NC}"
echo ""

# Check if tables exist
echo -e "${YELLOW}Tables in database:${NC}"
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;"

echo ""

# Check game table structure if it exists
echo -e "${YELLOW}Game table structure:${NC}"
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'game' 
ORDER BY ordinal_position;" 2>/dev/null || echo "Game table does not exist"

echo ""

# Check for sequences (used by SERIAL columns)
echo -e "${YELLOW}Sequences in database:${NC}"
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "
SELECT sequence_name, start_value, increment_by, last_value
FROM information_schema.sequences
WHERE sequence_schema = 'public';" 2>/dev/null || echo "No sequences found"

echo ""

# Check game table constraints
echo -e "${YELLOW}Game table constraints:${NC}"
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'game' AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, kcu.column_name;" 2>/dev/null || echo "No constraints found for game table"

echo ""

# Check for any data in game table
echo -e "${YELLOW}Sample data from game table (if any):${NC}"
docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "
SELECT id, date, winner_id, turns, wincon 
FROM game 
LIMIT 5;" 2>/dev/null || echo "No data in game table or table doesn't exist"

echo -e "${GREEN}✅ Schema check completed!${NC}"