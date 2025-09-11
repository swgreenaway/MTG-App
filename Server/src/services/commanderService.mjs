import { pool } from '../db/pool.mjs';
import { getCardInfoByName } from './scryfallService.mjs';

export async function ensureCommandersExist(names) {
  const unique = [...new Set((names || []).map(n => (n || '').trim()).filter(Boolean))];
  if (unique.length === 0) return;

  const { rows } = await pool.query(
    `SELECT commander_name FROM commander WHERE commander_name = ANY($1)`,
    [unique]
  );
  const existing = new Set(rows.map(r => r.commander_name));
  const missing = unique.filter(n => !existing.has(n));
  if (missing.length === 0) return;

  await Promise.all(missing.map(async (name) => {
    try {
      const card = await getCardInfoByName(name, { exact: false });
      const image = card.image;
      console.log(card);
      
      // Insert commander first
      const commanderResult = await pool.query(
        `INSERT INTO commander (commander_name, image)
         VALUES ($1, $2)
         ON CONFLICT (commander_name) DO UPDATE SET image = EXCLUDED.image
         RETURNING id`,
        [name, image]
      );
      
      const commanderId = commanderResult.rows[0].id;
      
      // Handle color identity separately in normalized table
      const colors = (Array.isArray(card.color_identity) && card.color_identity.length)
        ? card.color_identity.map(c => String(c).toUpperCase().trim())
        : [];
      
      if (colors.length > 0) {
        // Delete existing colors for this commander (in case of update)
        await pool.query(
          'DELETE FROM commander_color WHERE commander_id = $1',
          [commanderId]
        );
        
        // Insert new colors
        for (const color of colors) {
          await pool.query(
            'INSERT INTO commander_color (commander_id, color_code) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [commanderId, color]
          );
        }
      }
    } catch (e) {
      console.warn(`Scryfall failed for "${name}":`, e.message || e);
    }
  }));
}

