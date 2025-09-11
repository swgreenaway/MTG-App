import { pool } from '../db/pool.mjs';
import { withTransaction } from '../db/tx.mjs';
import { ensureCommandersExist } from '../services/commanderService.mjs';
import { createGameWithPlayers } from '../services/gameService.mjs';

export async function createGame(req, res) {
  const { date, turns, wincon, winner, players } = req.body;
  const num_players = players.length;
  
  // Basic validation
  if (!date || (turns !== null && !Number.isInteger(turns)) || !wincon || !Array.isArray(players) || players.length < 2) {
    console.log('Basic validation failed:', {
      noDate: !date,
      invalidTurns: (turns !== null && !Number.isInteger(turns)),
      noWincon: !wincon,
      notArray: !Array.isArray(players),
      tooFewPlayers: players.length < 2
    });
    return res.status(400).json({ error: 'Invalid payload: missing required fields or invalid data types' });
  }
  
  // Validate each player has required fields
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) {
      return res.status(400).json({ 
        error: `Invalid player at index ${i}: missing or empty name` 
      });
    }
    if (!Number.isInteger(player.turnOrder) || player.turnOrder < 1) {
      return res.status(400).json({ 
        error: `Invalid player at index ${i}: turnOrder must be a positive integer` 
      });
    }
  }
  
  console.log('Creating game with players:', players.map(p => ({ name: p.name, turnOrder: p.turnOrder })));

  const commanderNames = players.flatMap(p => {
    if (p.commanders) {
      return p.commanders.map(c => c.name || '').filter(Boolean);
    }
    return p.commander ? [p.commander] : [];
  });
  await ensureCommandersExist(commanderNames);

  const result = await withTransaction(pool, (client) =>
    createGameWithPlayers(client, { date, turns, wincon, winner, players, num_players })
  );

  res.status(201).json(result);
}
