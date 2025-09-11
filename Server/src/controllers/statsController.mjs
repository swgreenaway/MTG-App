import { pool } from '../db/pool.mjs';

export async function getMostPlayed(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        c.commander_name,
        c.image,
        COUNT(*) AS games_played
      FROM player_game_commander pgc
      JOIN commander     c  ON c.id = pgc.commander_id
      JOIN player_game   pg ON pg.game_id = pgc.game_id AND pg.player_id = pgc.player_id
      JOIN game          g  ON g.id = pg.game_id
      WHERE g.date >= (CURRENT_DATE - INTERVAL '30 days')
        AND pgc.is_primary = TRUE
      GROUP BY c.commander_name, c.image
      ORDER BY games_played DESC, c.commander_name ASC
      LIMIT 8;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Query error', err);
    res.status(500).json({ error: 'Query failed' });
  }
}


export async function commanderWinRate(req, res) {
  try {
    const name = req.params.name?.trim();
    const values = [];

    let query = `
      SELECT
        c.commander_name,
        COUNT(*) FILTER (WHERE g.winner_id = pg.player_id)::int AS wins,
        COUNT(DISTINCT pg.game_id)::int AS games,
        ROUND(
          (COUNT(*) FILTER (WHERE g.winner_id = pg.player_id))::numeric
          / NULLIF(COUNT(DISTINCT pg.game_id), 0) * 100
        , 2) AS win_rate
      FROM player_game_commander pgc
      JOIN commander c ON c.id = pgc.commander_id
      JOIN player_game pg ON pg.game_id = pgc.game_id AND pg.player_id = pgc.player_id
      JOIN player p ON p.player_id = pg.player_id
      LEFT JOIN game g ON g.id = pg.game_id
      WHERE pgc.is_primary = TRUE
    `;

    if (name) {
      values.push(name);
      query += ` AND p.player_name = $1`; // use ILIKE $1 for case-insensitive
    }

    query += `
      GROUP BY c.commander_name
      ORDER BY wins DESC, games DESC
    `;

    const result = await pool.query(query, values);

    if (name) {
      // Return all commanders for that player; avoid dropping rows with [0]
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }
      return res.json(result.rows);
    }

    return res.json(result.rows);
  } catch (err) {
    console.error('Query error', err);
    return res.status(500).json({ error: 'Query failed' });
  }
}

export async function playerWinRate(req, res) {
  try {
    const name = req.params.name; // or req.params depending on how you call it

    let query = `
      SELECT
        p.player_name,
        COUNT(*) FILTER (WHERE g.winner_id = pg.player_id) AS wins,
        COUNT(*) AS games,
        ROUND(
          (COUNT(*) FILTER (WHERE g.winner_id = pg.player_id)::numeric / NULLIF(COUNT(*), 0)) * 100, 
          2
        ) AS win_rate
      FROM player p
      JOIN player_game pg ON pg.player_id = p.player_id
      JOIN game g ON g.id = pg.game_id
      WHERE p.player_name NOT LIKE '%Guest%'
    `;

    const values = [];

    if (name) {
      query += ` AND p.player_name = $1`;
      values.push(name);
    }

    query += `
      GROUP BY p.player_name
      ORDER BY wins DESC
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (err) {
    console.error('Query error', err);
    res.status(500).json({ error: 'Query failed' });
  }
};

export async function getColorFreq(req, res) {
  const nameRaw = req.params.name;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";

  try {
    if (!name) {
      // -------- GLOBAL SSPG (all seats, games weighted equally) --------
      const queryGlobal = `
        WITH colors AS (
          SELECT unnest(ARRAY['W','U','B','R','G']::text[]) AS color
        ),
        all_games AS (
          SELECT DISTINCT pg.game_id
          FROM player_game pg
        ),
        seats AS (
          SELECT ag.game_id, COUNT(DISTINCT pg.player_id) AS seats
          FROM all_games ag
          JOIN player_game pg ON pg.game_id = ag.game_id
          GROUP BY ag.game_id
        ),
        seats_with_color AS (
          SELECT DISTINCT ag.game_id, pg.player_id, cc.color_code
          FROM all_games ag
          JOIN player_game pg ON pg.game_id = ag.game_id
          JOIN player_game_commander pgc
               ON pgc.game_id = pg.game_id AND pgc.player_id = pg.player_id
          JOIN commander c ON c.id = pgc.commander_id
          JOIN commander_color cc ON cc.commander_id = c.id
          WHERE cc.color_code = ANY(ARRAY['W','U','B','R','G'])
        ),
        share_per_game AS (
          SELECT
            swc.game_id,
            swc.color_code,
            COUNT(DISTINCT swc.player_id)::float / s.seats AS share
          FROM seats_with_color swc
          JOIN seats s ON s.game_id = swc.game_id
          GROUP BY swc.game_id, swc.color_code, s.seats
        ),
        agg AS (
          SELECT color_code AS color, AVG(share) AS share
          FROM share_per_game
          GROUP BY color_code
        ),
        totals AS (
          SELECT
            COALESCE(COUNT(*)::int, 0) AS total_games,
            ROUND(COALESCE(AVG(seats), 0)::numeric, 2) AS avg_players_per_game
          FROM seats
        )
        SELECT
          c.color,
          ROUND(COALESCE(a.share, 0)::numeric, 6) AS share,
          ROUND((COALESCE(a.share, 0) * 100)::numeric, 2) AS pct,
          t.total_games,
          t.avg_players_per_game
        FROM colors c
        LEFT JOIN agg a ON a.color = c.color
        CROSS JOIN totals t
        ORDER BY array_position(ARRAY['W','U','B','R','G']::text[], c.color);
      `;

      const result = await pool.query(queryGlobal);
      return res.json(result.rows);
    }

    // -------- USER-SSPG (player’s own seat only, games weighted equally) --------
    const values = [name];
    const queryUser = `
      WITH colors AS (
        SELECT unnest(ARRAY['W','U','B','R','G']::text[]) AS color
      ),
      user_games AS (
        SELECT DISTINCT pg.game_id, pg.player_id
        FROM player p
        JOIN player_game pg ON pg.player_id = p.player_id
        WHERE p.player_name ILIKE $1
      ),
      -- union of the player's own commander colors per game
      user_color_per_game AS (
        SELECT DISTINCT ug.game_id, cc.color_code
        FROM user_games ug
        JOIN player_game_commander pgc
             ON pgc.game_id = ug.game_id AND pgc.player_id = ug.player_id
        JOIN commander c ON c.id = pgc.commander_id
        JOIN commander_color cc ON cc.commander_id = c.id
        WHERE cc.color_code = ANY(ARRAY['W','U','B','R','G'])
      ),
      totals AS (
        SELECT COALESCE(COUNT(*)::int, 0) AS total_games FROM user_games
      ),
      presence_per_game AS (
        SELECT
          ug.game_id,
          c.color,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM user_color_per_game ucp
              WHERE ucp.game_id = ug.game_id AND ucp.color_code = c.color
            )
            THEN 1.0 ELSE 0.0
          END AS present
        FROM user_games ug
        CROSS JOIN colors c
      ),
      agg AS (
        SELECT color, AVG(present) AS share
        FROM presence_per_game
        GROUP BY color
      )
      SELECT
        c.color,
        ROUND(COALESCE(a.share, 0)::numeric, 6) AS share,
        ROUND((COALESCE(a.share, 0) * 100)::numeric, 2) AS pct,
        t.total_games,
        NULL::numeric AS avg_players_per_game  -- N/A for user-only seat; keep column for shape consistency
      FROM colors c
      LEFT JOIN agg a ON a.color = c.color
      CROSS JOIN totals t
      ORDER BY array_position(ARRAY['W','U','B','R','G']::text[], c.color);
    `;

    const userResult = await pool.query(queryUser, values);

    // If player not found or no games, return 404 (consistent with your earlier behavior)
    const totalGames = userResult.rows?.[0]?.total_games ?? 0;
    if (totalGames === 0) {
      return res.status(404).json({ error: 'Player not found or no games for this player' });
    }

    return res.json(userResult.rows);
  } catch (err) {
    console.error('Query error', err);
    return res.status(500).json({ error: 'Query failed' });
  }
}



export async function getGameFeed(req, res) {
    const nameRaw = req.params.name;
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";

    try {
        let query = `
            WITH game_participants AS (
                SELECT 
                    g.id as game_id,
                    g.date,
                    g.turns,
                    g.wincon,
                    winner_p.player_name as winner_name,
                    g.winner_id,
                    json_agg(
                        json_build_object(
                            'player_id', p.player_id,
                            'player_name', p.player_name,
                            'commander_name', c.commander_name,
                            'turn_order', pg.turn_order,
                            'is_winner', CASE WHEN pg.player_id = g.winner_id THEN true ELSE false END
                        ) ORDER BY pg.turn_order
                    ) AS participants
                FROM game g
                JOIN player_game pg ON pg.game_id = g.id
                JOIN player p ON p.player_id = pg.player_id
                LEFT JOIN player winner_p ON winner_p.player_id = g.winner_id
                LEFT JOIN player_game_commander pgc ON pgc.game_id = pg.game_id AND pgc.player_id = pg.player_id AND pgc.is_primary = TRUE
                LEFT JOIN commander c ON c.id = pgc.commander_id
                WHERE g.date IS NOT NULL
        `;
        
        const values = [];
        
        if (name) {
            query += ` AND EXISTS (
                SELECT 1 FROM player_game pg2 
                JOIN player p2 ON p2.player_id = pg2.player_id
                WHERE pg2.game_id = g.id 
                AND p2.player_name ILIKE $1
            )`;
            values.push(`%${name}%`);
        }
        
        query += `
                GROUP BY g.id, g.date, g.turns, g.wincon, winner_p.player_name, g.winner_id
            )
            SELECT 
                gp.game_id,
                gp.date,
                gp.turns,
                gp.wincon,
                gp.winner_name,
                gp.participants
            FROM game_participants gp
            ORDER BY gp.date DESC, gp.game_id DESC
            LIMIT 20
        `;
        
        const result = await pool.query(query, values);
        
        if (name && result.rows.length === 0) {
            return res.status(404).json({ error: 'No games found for player' });
        }
        
        return res.json(result.rows);
    } catch (err) {
        console.error('Query error', err);
        return res.status(500).json({ error: 'Query failed' });
    }
}

export async function getTotalGamesCount(req, res) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as total_games
      FROM game
    `);
    
    res.json({ total_games: parseInt(result.rows[0].total_games) });
  } catch (err) {
    console.error('Query error', err);
    res.status(500).json({ error: 'Query failed' });
  }
}

export async function getUniquePlayerCount(req, res) {
  try {
    const result = await pool.query(`
      SELECT COUNT(DISTINCT player_id) as unique_players
      FROM player
    `);
    
    res.json({ unique_players: parseInt(result.rows[0].unique_players) });
  } catch (err) {
    console.error('Query error', err);
    res.status(500).json({ error: 'Query failed' });
  }
}

export async function getAverageGameLength(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        AVG(turns) as avg_turns,
        COUNT(*) FILTER (WHERE turns > 0) as games_with_turns,
        COUNT(*) as total_games
      FROM game
      WHERE turns > 0
    `);
    
    const row = result.rows[0];
    const avgTurns = row.avg_turns ? Math.round(parseFloat(row.avg_turns) * 10) / 10 : 0;
    
    res.json({ 
      avg_turns: avgTurns,
      games_with_turns: parseInt(row.games_with_turns),
      total_games: parseInt(row.total_games)
    });
  } catch (err) {
    console.error('Query error', err);
    res.status(500).json({ error: 'Query failed' });
  }
}

export async function getHeadToHead(req, res) {
  try {
    const playerName = req.params.name;
    const vsPlayer = req.query.vs; // Optional: specific opponent

    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    let query, values;

    if (vsPlayer) {
      // Specific 1v1 matchup - get games where both players participated
      query = `
        WITH shared_games AS (
          SELECT DISTINCT pg1.game_id
          FROM player_game pg1
          JOIN player p1 ON p1.player_id = pg1.player_id
          JOIN player_game pg2 ON pg1.game_id = pg2.game_id
          JOIN player p2 ON p2.player_id = pg2.player_id
          JOIN game g ON g.id = pg1.game_id
          WHERE p1.player_name = $1 
            AND p2.player_name = $2
            AND p1.player_name != p2.player_name
        ),
        player_stats AS (
          SELECT 
            COUNT(*) as total_games,
            COUNT(*) FILTER (WHERE g.winner_id = pg1.player_id) as player1_wins,
            COUNT(*) FILTER (WHERE g.winner_id = pg2.player_id) as player2_wins,
            ROUND(
              (COUNT(*) FILTER (WHERE g.winner_id = pg1.player_id))::numeric 
              / NULLIF(COUNT(*), 0) * 100, 2
            ) as player1_win_rate
          FROM shared_games sg
          JOIN game g ON g.id = sg.game_id
          LEFT JOIN player_game pg1 ON pg1.game_id = g.id 
          LEFT JOIN player p1 ON p1.player_id = pg1.player_id AND p1.player_name = $1
          LEFT JOIN player_game pg2 ON pg2.game_id = g.id 
          LEFT JOIN player p2 ON p2.player_id = pg2.player_id AND p2.player_name = $2
        )
        SELECT 
          $1 as player1,
          $2 as player2,
          ps.total_games,
          ps.player1_wins,
          ps.player2_wins,
          ps.player1_win_rate,
          json_agg(
            json_build_object(
              'game_id', g.id,
              'date', g.date,
              'turns', g.turns,
              'wincon', g.wincon,
              'winner_name', winner_p.player_name,
              'participants', (
                SELECT json_agg(
                  json_build_object(
                    'player_id', p.player_id,
                    'player_name', p.player_name,
                    'commander_name', c.commander_name,
                    'turn_order', pg.turn_order,
                    'is_winner', CASE WHEN pg.player_id = g.winner_id THEN true ELSE false END
                  ) ORDER BY pg.turn_order
                )
                FROM player_game pg
                JOIN player p ON p.player_id = pg.player_id
                LEFT JOIN player_game_commander pgc ON pgc.game_id = pg.game_id AND pgc.player_id = pg.player_id AND pgc.is_primary = TRUE
                LEFT JOIN commander c ON c.id = pgc.commander_id
                WHERE pg.game_id = g.id
              )
            ) ORDER BY g.date DESC
          ) FILTER (WHERE g.id IS NOT NULL) as recent_games
        FROM player_stats ps
        CROSS JOIN shared_games sg
        JOIN game g ON g.id = sg.game_id
        LEFT JOIN player winner_p ON winner_p.player_id = g.winner_id
        GROUP BY ps.total_games, ps.player1_wins, ps.player2_wins, ps.player1_win_rate
        LIMIT 1;
      `;
      values = [playerName, vsPlayer];
    } else {
      // All opponents for the player
      query = `
        WITH player_games AS (
          SELECT 
            pg.game_id,
            p1.player_name as target_player,
            pg.player_id as target_player_id,
            g.winner_id,
            g.date
          FROM player_game pg
          JOIN player p1 ON p1.player_id = pg.player_id
          JOIN game g ON g.id = pg.game_id
          WHERE p1.player_name = $1
        ),
        opponent_games AS (
          SELECT 
            pg_main.game_id,
            pg_main.target_player,
            pg_main.target_player_id,
            p2.player_name as opponent,
            pg2.player_id as opponent_id,
            pg_main.winner_id,
            pg_main.date
          FROM player_games pg_main
          JOIN player_game pg2 ON pg2.game_id = pg_main.game_id
          JOIN player p2 ON p2.player_id = pg2.player_id
          WHERE p2.player_name != pg_main.target_player
        )
        SELECT 
          opponent,
          COUNT(*) as games_played,
          COUNT(*) FILTER (WHERE winner_id = og.target_player_id) as wins,
          COUNT(*) FILTER (WHERE winner_id = og.opponent_id) as losses,
          ROUND(
            (COUNT(*) FILTER (WHERE winner_id = og.target_player_id))::numeric 
            / NULLIF(COUNT(*), 0) * 100, 2
          ) as win_rate,
          MAX(date) as last_played
        FROM opponent_games og
        GROUP BY opponent
        HAVING COUNT(*) > 0
        ORDER BY games_played DESC, wins DESC;
      `;
      values = [playerName];
    }

    const result = await pool.query(query, values);
    
    if (vsPlayer && result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No games found between these players' 
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Head-to-head query error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
}