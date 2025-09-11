# MTG‑App API Contract

This contract documents the public endpoints exposed by the **MTG‑App** server. The API uses Express and communicates over JSON. All paths below are relative to the /api/v1 base route.

**Note**: Many statistics endpoints support both collection queries (all items) and specific item queries using path parameters (e.g., `/stats/players/win-rate` vs `/stats/players/win-rate/:name`).

## Base URL

/api/v1

## Endpoints Overview

| Endpoint | Method | Description |
| --- | --- | --- |
| /games | POST | Create a new game and its player records |
| /stats/most-played | GET | Top eight commanders (last 30 days) |
| /stats/commanders/win-rate | GET | Overall win rates per commander |
| /stats/commanders/win-rate/:name | GET | Win rates for commanders used by specific player |
| /stats/players/win-rate | GET | Win rates per player |
| /stats/players/win-rate/:name | GET | Win rates for specific player by name |
| /stats/colors/frequency | GET | Color seat share percentage across all games |
| /stats/colors/frequency/:name | GET | Color seat share percentage for specific player |
| /stats/game-feed | GET | Recent games feed with participant details |
| /stats/game-feed/:name | GET | Recent games feed for specific player |
| /stats/players/head-to-head/:name | GET | Head-to-head statistics for player vs all opponents |
| /stats/players/head-to-head/:name?vs=player2 | GET | Head-to-head statistics between two specific players |
| /stats/total-games | GET | Total number of games recorded |
| /stats/avg-game-length | GET | Average game length in turns across all games |
| /cards/details/:name | GET | Card details from Scryfall API |

## POST /api/v1/games – Create a game

Creates a new game entry and inserts all participating players. The request body must contain:
```json
{  
"date": "YYYY-MM-DD", // date string of when the game occurred  
"turns": 10, // integer count of turns taken  
"wincon": "combat damage", // win condition description  
"winner": "Alice", // name of the player who won (must match one of the players)  
"players": [{  

    "name": "Alice", // player's name  
    "commander": "Atraxa", // commander's name (nullable)  
    "turnOrder": 1 // first-turn order  
    },  
    {  
    "name": "Bob",  
    "commander": "Muldrotha",  
    "turnOrder": 2  
}]  
}
```
- The server requires at least two players and validates that date, turns (must be integer) and wincon are present. Invalid payloads return 400 Bad Request with { "error": "Invalid payload" }.
- All commanders referenced are ensured to exist in the commanders table via Scryfall lookups.
- After inserting players, the server matches the winner name to the inserted players; if found, it updates winner_player_id, winner_name and commander_name on the game record.

### Response

On success the API returns:
```json
{  
"gameId": 42, // generated game identifier  
"playersInserted": 2, // number of players inserted  
"winnerSet": true // true if winner name matched a player  
}
```

- 201 Created is returned when the game is created successfully.
- Errors: 400 Bad Request for invalid payloads; 500 Internal Server Error when an unexpected error occurs.

## GET /api/v1/stats/most-played

Returns the top eight commanders with the highest number of games played in the last 30 days. Each result contains:

- commander_name: the commander's name.
- image: URL to an image of the commander.
- games_played: number of games in which the commander appeared.

Example response:

```json  
[
  { "commander_name": "Atraxa", "image": "https://…", "games_played": 5 },  
  { "commander_name": "Muldrotha", "image": "https://…", "games_played": 4 }  
]
```

Errors: 500 Internal Server Error if the database query fails.

## GET /api/v1/stats/commanders/win-rate

Returns commander win statistics. Can be called in two ways:

- **All commanders** (GET /api/v1/stats/commanders/win-rate): Returns all commanders with their total wins, games played, and win rates.
- **Player's commanders** (GET /api/v1/stats/commanders/win-rate/:name): Returns win statistics for all commanders used by a specific player.

Each object includes:
- commander_name: the commander's name
- wins: number of games won with that commander 
- games: total number of games played with that commander
- win_rate: percentage win rate (rounded to 2 decimal places)

### Examples

**All commanders:**
```json
[
  { "commander_name": "Atraxa", "wins": 2, "games": 5, "win_rate": 40.00 },
  { "commander_name": "Muldrotha", "wins": 1, "games": 4, "win_rate": 25.00 }
]
```

**Player's commanders:**
```json
[
  { "commander_name": "Atraxa", "wins": 1, "games": 3, "win_rate": 33.33 },
  { "commander_name": "Teysa", "wins": 1, "games": 2, "win_rate": 50.00 }
]
```

**Errors:**
- 404 Not Found: Player not found (when using :name parameter)
- 500 Internal Server Error: Query failure

## GET /api/v1/stats/players/win-rate

Returns win statistics for players. Can be called in two ways:

- **All players** (GET /api/v1/stats/players/win-rate): Returns all players sorted by win count, excludes players with "Guest" in their name.
- **Single player** (GET /api/v1/stats/players/win-rate/:name): Returns statistics for only that player.

Each result contains:
- player_name: player's name
- wins: total games won
- games: total games played
- win_rate: percentage of games won, rounded to two decimals

### Examples

**All players:**
```json
[
  { "player_name": "Alice", "wins": 2, "games": 5, "win_rate": 40.0 },  
  { "player_name": "Bob", "wins": 1, "games": 4, "win_rate": 25.0 }  
]
```

**Single player:**
```json
[
  { "player_name": "Alice", "wins": 2, "games": 5, "win_rate": 40.0 }
]
```

**Errors:**
- 500 Internal Server Error: Query failure

## GET /api/v1/stats/colors/frequency

Returns the seat share percentage for each color identity. Can be called in two ways:

- **All games** (GET /api/v1/stats/colors/frequency): Returns color seat share across all games (global seat share per game).
- **Player's games** (GET /api/v1/stats/colors/frequency/:name): Returns color presence percentage for a specific player's games.

The colors follow Magic: the Gathering color codes W, U, B, R, G. Each result has:
- color: the color letter (W, U, B, R, G)
- share: decimal representation of seat share (0.0 - 1.0)
- pct: percentage representation (0.0 - 100.0)
- total_games: number of games analyzed
- avg_players_per_game: average number of players per game (null for player-specific queries)

### Examples

**Global seat share (all games):**
```json
[
  { "color": "W", "share": 0.324, "pct": 32.40, "total_games": 45, "avg_players_per_game": 3.8 },
  { "color": "U", "share": 0.287, "pct": 28.70, "total_games": 45, "avg_players_per_game": 3.8 },
  { "color": "B", "share": 0.203, "pct": 20.30, "total_games": 45, "avg_players_per_game": 3.8 },
  { "color": "R", "share": 0.156, "pct": 15.60, "total_games": 45, "avg_players_per_game": 3.8 },
  { "color": "G", "share": 0.298, "pct": 29.80, "total_games": 45, "avg_players_per_game": 3.8 }
]
```

**Player's color presence:**
```json
[
  { "color": "W", "share": 0.667, "pct": 66.67, "total_games": 12, "avg_players_per_game": null },
  { "color": "U", "share": 0.0, "pct": 0.0, "total_games": 12, "avg_players_per_game": null },
  { "color": "B", "share": 0.333, "pct": 33.33, "total_games": 12, "avg_players_per_game": null },
  { "color": "R", "share": 0.0, "pct": 0.0, "total_games": 12, "avg_players_per_game": null },
  { "color": "G", "share": 0.250, "pct": 25.0, "total_games": 12, "avg_players_per_game": null }
]
```

**Errors:**
- 404 Not Found: Player not found or no games for this player (when using :name parameter)
- 500 Internal Server Error: Query failure

## GET /api/v1/stats/total-games

Returns the total number of games recorded in the database.

### Response

Returns a simple JSON object with the total count:

```json
{
  "total_games": 156
}
```

**Errors:**
- 500 Internal Server Error: Query failure

## GET /api/v1/stats/avg-game-length

Returns the average game length in turns across all games in the database. Only includes games with turn counts greater than 0.

### Response

Returns detailed statistics about game length:

```json
{
  "avg_turns": 8.7,
  "games_with_turns": 142,
  "total_games": 156
}
```

- **avg_turns**: Average number of turns per game (rounded to 1 decimal place)
- **games_with_turns**: Number of games that have turn data (turns > 0)
- **total_games**: Total number of games in the database

**Errors:**
- 500 Internal Server Error: Query failure

## GET /api/v1/stats/game-feed

Returns recent game data with participant details. Can be called in two ways:

- **All recent games** (GET /api/v1/stats/game-feed): Returns the 20 most recent games.
- **Player's games** (GET /api/v1/stats/game-feed/:name): Returns recent games where the specified player participated.

Each result contains:
- game_id: unique game identifier
- date: game date
- turns: number of turns in the game
- wincon: win condition description
- winner_name: name of the winning player
- participants: array of all players in the game with details:
  - player_id: unique player identifier
  - player_name: player's name
  - commander_name: commander used
  - turn_order: playing order
  - is_winner: boolean indicating if this player won

### Examples

```json
[
  {
    "game_id": 42,
    "date": "2024-01-15",
    "turns": 8,
    "wincon": "combat damage",
    "winner_name": "Alice",
    "participants": [
      {
        "player_id": 1,
        "player_name": "Alice",
        "commander_name": "Atraxa",
        "turn_order": 1,
        "is_winner": true
      },
      {
        "player_id": 2,
        "player_name": "Bob",
        "commander_name": "Muldrotha",
        "turn_order": 2,
        "is_winner": false
      }
    ]
  }
]
```

**Errors:**
- 404 Not Found: No games found for player (when using :name parameter)
- 500 Internal Server Error: Query failure

## GET /api/v1/stats/players/head-to-head/:name

Returns head-to-head statistics for a player. Can be called in two ways:

- **All opponents** (GET /api/v1/stats/players/head-to-head/:name): Returns statistics against all opponents.
- **Specific matchup** (GET /api/v1/stats/players/head-to-head/:name?vs=player2): Returns detailed statistics between two specific players including recent game history.

### All Opponents Response

Each result contains:
- opponent: opponent's name
- games_played: total games between the players
- wins: games won by the queried player
- losses: games won by the opponent
- win_rate: percentage win rate for the queried player
- last_played: date of most recent game between the players

```json
[
  {
    "opponent": "Bob",
    "games_played": 5,
    "wins": 2,
    "losses": 3,
    "win_rate": 40.00,
    "last_played": "2024-01-15"
  }
]
```

### Specific Matchup Response

Returns detailed statistics plus recent games:
- player1: queried player's name
- player2: opponent's name
- total_games: total games between the players
- player1_wins: games won by player1
- player2_wins: games won by player2
- player1_win_rate: win percentage for player1
- recent_games: array of recent games between the players (same format as game-feed)

```json
[
  {
    "player1": "Alice",
    "player2": "Bob",
    "total_games": 5,
    "player1_wins": 2,
    "player2_wins": 3,
    "player1_win_rate": 40.00,
    "recent_games": [...]
  }
]
```

**Errors:**
- 400 Bad Request: Player name is required
- 404 Not Found: No games found between these players (specific matchup only)
- 500 Internal Server Error: Query failure

## GET /api/v1/cards/details/:name

Returns card details from the Scryfall API for the specified card name. Uses fuzzy search to find the best match.

### Parameters

- name: Card name to search for (URL encoded)

### Response

Returns the full card object from Scryfall API containing all card details including:
- name: card's name
- mana_cost: mana cost string
- type_line: card type
- oracle_text: card text
- power/toughness: creature stats (if applicable)
- image_uris: card images
- color_identity: color identity array
- And many other Scryfall properties

**Errors:**
- 400 Bad Request: Card name is required
- 404 Not Found: Card not found in Scryfall database
- 500 Internal Server Error: Failed to fetch card details

## Error Handling Summary

- **400 Bad Request** – Invalid POST payload for /games (missing fields or wrong types) or missing required parameters
- **404 Not Found** – Player/card not found, or no games found matching criteria
- **500 Internal Server Error** – Database or unexpected server error

Use this contract when integrating with the MTG‑App server to ensure correct request formatting and response handling.