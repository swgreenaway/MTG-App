# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Client (React + Vite)
- **Development**: `cd Client && npm run dev`
- **Build**: `cd Client && npm run build`
- **Lint**: `cd Client && npm run lint`
- **Preview**: `cd Client && npm run preview`

### Server (Express.js)
- **Development**: `cd Server/src && node --watch-path=./ server.mjs`
- **Dependencies**: Express server requires PostgreSQL database running

### Database (PostgreSQL + Docker)
- **Start services**: `cd Server && docker compose up -d`
- **Access PostgreSQL shell**: `docker exec -it pg-local psql -U dev -d appdb`
- **PgAdmin**: Available on configured port after docker compose up

### Full Stack Development
Use the PowerShell script `dev.ps1` to start all services:
- **Standard**: `./dev.ps1` (starts Docker, API server, and Vite dev server)
- **With PSQL**: `./dev.ps1 -WithPsql` (also opens PostgreSQL shell)

## Database Schema Architecture

The application uses a normalized PostgreSQL schema designed to track Magic: The Gathering multiplayer games:

### Core Tables
- **`game`**: Game sessions with winner tracking, turns, and win conditions
- **`player`**: Catalog of unique players across all games
- **`player_game`**: Junction table linking players to specific games with turn order
- **`commander`**: Commander card catalog populated via Scryfall API
- **`commander_color`**: Normalized color identity storage (W, U, B, R, G, C)
- **`player_game_commander`**: Maps commanders to game seats (supports partners/backgrounds)

### Key Schema Features
- Supports multiple commanders per player (partners, backgrounds, companions)
- Normalized color identity for efficient querying
- Referential integrity with cascade/restrict policies
- Optimized indexes for common query patterns

Full schema definition available in `Server/schema.md`.

## Architecture Overview

### Client Architecture (React)
- **Framework**: React 19 with Vite build system and SWC compiler
- **Routing**: React Router DOM v7 for SPA navigation  
- **State Management**: Context API via `GameMetaProvider` for cross-component game metadata
- **Styling**: CSS modules with component-specific stylesheets co-located with components
- **Pages**: Hero (landing), AddGameForm, Metrics, PlayerPage, GameFeedPage
- **Data Flow**: Context provider fetches player/commander/color statistics on mount and shares across app

### Server Architecture (Express.js)
- **Framework**: Express.js v5 with ES modules (.mjs extensions throughout)
- **Database**: PostgreSQL with `pg` connection pooling via `pool.mjs`
- **API Structure**: RESTful API at `/api/v1` base path, fully documented in `API-Contract.md`
- **Layered Architecture**: 
  - Routes (`routes/`) → Controllers (`controllers/`) → Services (`services/`) → Database
  - Transaction support via `tx.mjs` for complex operations
- **External Integration**: Scryfall API integration for Magic card data

### Service Layer Details
- **`gameService.mjs`**: Game creation, player management, winner assignment
- **`commanderService.mjs`**: Commander validation and database management
- **`scryfallService.mjs`**: Magic card data fetching and caching from Scryfall API

### API Design Patterns
All statistics endpoints support dual access patterns:
- Collection queries: `/stats/players/win-rate` (all players)
- Specific queries: `/stats/players/win-rate/:name` (single player)

Critical endpoints handle complex aggregations:
- Head-to-head matchup statistics with game history
- Color identity frequency analysis
- Recent game feeds with full participant details

Reference API-Contract.md for detailed route information.

## Development Notes

### Database Development
- Schema changes require updating both `Server/schema.md` and migration scripts
- All controllers updated to use new normalized schema (as of recent schema migration)
- Statistics queries leverage PostgreSQL window functions and CTEs for complex aggregations

### Client-Server Integration
- Client uses `GameMetaProvider` context to cache statistics on app startup
- API calls expect specific JSON formats documented in `API-Contract.md`
- Error handling follows consistent 400/404/500 HTTP status patterns

### File Structure Patterns
- **Client**: Pages in `/src/pages/`, reusable components in `/src/components/` with co-located CSS
- **Server**: Controllers handle HTTP concerns, services contain business logic, database layer handles data access
- **Configuration**: Docker Compose manages PostgreSQL with health checks and admin interface

### Technology Stack
- **Frontend**: React 19, Vite 7, React Router DOM 7, ESLint 9
- **Backend**: Express.js 5, node-postgres (pg) 8, ES modules
- **Database**: PostgreSQL 16 with Docker containerization
- **Development**: PowerShell automation script for multi-service startup