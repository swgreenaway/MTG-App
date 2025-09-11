import { pool } from '../db/pool.mjs';
import { withTransaction } from '../db/tx.mjs';
import { ensureCommandersExist } from '../services/commanderService.mjs';
import { createGameWithPlayers } from '../services/gameService.mjs';

export async function createGame(req, res) {
  const { date, turns, wincon, winner, players } = req.body;
  const num_players = players.length;
  if (!date || !Number.isInteger(turns) || !wincon || !Array.isArray(players) || players.length < 2) {
    console.log(!date, !Number.isInteger(turns), !wincon, !Array.isArray(players), players.length < 2);
    return res.status(400).json({ error: 'Invalid payload' });
  }

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
