export async function createGameWithPlayers(client, payload) {
  const { date, turns, wincon, winner, players } = payload;
  
  // Create the game record
  const gameIns = await client.query(
    `INSERT INTO game (date, turns, wincon)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [date, turns, wincon]
  );
  const gameId = gameIns.rows[0].id;
  
  const playerRows = [];
  let winnerId = null;
  
  for (const p of players) {
    const playerName = p.name.trim();
    const commanders = p.commanders || (p.commander ? [{ name: p.commander.trim(), isPrimary: true }] : []);
    const turnOrder = p.turnOrder;
    
    // Get or create player
    let playerId;
    const existingPlayer = await client.query(
      'SELECT player_id FROM player WHERE player_name = $1',
      [playerName]
    );
    
    if (existingPlayer.rows.length > 0) {
      playerId = existingPlayer.rows[0].player_id;
    } else {
      const newPlayer = await client.query(
        'INSERT INTO player (player_name) VALUES ($1) RETURNING player_id',
        [playerName]
      );
      playerId = newPlayer.rows[0].player_id;
    }
    
    // Add player to game
    await client.query(
      'INSERT INTO player_game (game_id, player_id, turn_order) VALUES ($1, $2, $3)',
      [gameId, playerId, turnOrder]
    );
    
    playerRows.push({ player_id: playerId, player_name: playerName });
    
    // Check if this is the winner
    if (playerName.toLowerCase() === (winner || '').trim().toLowerCase()) {
      winnerId = playerId;
    }
    
    // Handle commanders if provided
    for (const commander of commanders) {
      if (commander.name && commander.name.trim()) {
        const commanderName = commander.name.trim();
        
        // Get or create commander
        let commanderId;
        const existingCommander = await client.query(
          'SELECT id FROM commander WHERE commander_name = $1',
          [commanderName]
        );
        
        if (existingCommander.rows.length > 0) {
          commanderId = existingCommander.rows[0].id;
        } else {
          const newCommander = await client.query(
            'INSERT INTO commander (commander_name) VALUES ($1) RETURNING id',
            [commanderName]
          );
          commanderId = newCommander.rows[0].id;
        }
        
        // Link commander to player's game seat
        await client.query(
          'INSERT INTO player_game_commander (game_id, player_id, commander_id, is_primary) VALUES ($1, $2, $3, $4)',
          [gameId, playerId, commanderId, commander.isPrimary || false]
        );
      }
    }
  }

  // Set winner if found
  if (winnerId) {
    await client.query(
      'UPDATE game SET winner_id = $1 WHERE id = $2',
      [winnerId, gameId]
    );
  } else if (winner && winner.trim()) {
    console.warn('Winner name did not match any inserted player; leaving winner_id NULL');
  }

  return { 
    gameId, 
    playersInserted: playerRows.length, 
    winnerSet: Boolean(winnerId) 
  };
}
