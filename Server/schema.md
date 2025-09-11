-- ======================
-- NEW MTG GAME SCHEMA
-- ======================

-- Game sessions
CREATE TABLE game (
  id         SERIAL PRIMARY KEY,
  date       DATE    NOT NULL,
  winner_id  INTEGER NULL,       -- FK to player
  turns      INTEGER NULL,       -- Can be null if not recorded
  wincon     TEXT    NULL
);

-- Players (catalog of unique people)
CREATE TABLE player (
  player_id   SERIAL PRIMARY KEY,
  player_name TEXT NOT NULL
);

-- Participation: which player sat in which game seat
CREATE TABLE player_game (
  game_id    INTEGER NOT NULL,
  player_id  INTEGER NOT NULL,
  turn_order INTEGER NOT NULL,
  PRIMARY KEY (game_id, player_id),
  UNIQUE (game_id, turn_order),
  FOREIGN KEY (game_id)   REFERENCES game(id)   ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE RESTRICT
);

-- Commander catalog
CREATE TABLE commander (
  id              SERIAL PRIMARY KEY,
  commander_name  TEXT NOT NULL,
  image           TEXT NULL
);

-- Color identity (normalized)
CREATE TABLE commander_color (
  commander_id INTEGER NOT NULL,
  color_code   TEXT    NOT NULL CHECK (color_code IN ('W','U','B','R','G','C')),
  PRIMARY KEY (commander_id, color_code),
  FOREIGN KEY (commander_id) REFERENCES commander(id) ON DELETE CASCADE
);

-- Seat → Commander mapping (supports partners, backgrounds, companions)
CREATE TABLE player_game_commander (
  game_id      INTEGER NOT NULL,
  player_id    INTEGER NOT NULL,
  commander_id INTEGER NOT NULL,
  is_primary   BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (game_id, player_id, commander_id),
  FOREIGN KEY (game_id, player_id) REFERENCES player_game(game_id, player_id) ON DELETE CASCADE,
  FOREIGN KEY (commander_id)       REFERENCES commander(id)                  ON DELETE RESTRICT
);

-- Helpful indexes
CREATE INDEX idx_pg_game       ON player_game(game_id);
CREATE INDEX idx_pg_player     ON player_game(player_id);
CREATE INDEX idx_pgc_commander ON player_game_commander(commander_id);
CREATE INDEX idx_cc_color      ON commander_color(color_code);

-- Ensure one primary per participant
CREATE UNIQUE INDEX uq_pgc_one_primary
  ON player_game_commander (game_id, player_id)
  WHERE is_primary;
