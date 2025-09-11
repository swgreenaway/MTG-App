// backfill-new-commander-images.mjs
import { pool } from '../db/pool.mjs';
import { getCardInfoByName } from '../services/scryfallService.mjs';

async function fillMissing() {
  // Grab commanders missing an image from the new table
  const { rows } = await pool.query(
    `
    SELECT id, commander_name
    FROM commander
    WHERE image IS NULL OR image = ''
    ORDER BY id
    `
  );

  for (const { id, commander_name } of rows) {
    try {
      // Your service should return { image } for the best URL
      const cardInfo = await getCardInfoByName(commander_name);
      const { image } = cardInfo ?? {};

      if (image && typeof image === 'string' && image.length) {
        await pool.query(
          `UPDATE commander SET image = $1 WHERE id = $2`,
          [image, id]
        );
        console.log(`Updated ${id} – ${commander_name}`);
      } else {
        console.warn(`No image returned for "${commander_name}" (id ${id}); skipping`);
      }
    } catch (err) {
      console.error(`Failed to update "${commander_name}" (id ${id}):`, err?.message ?? err);
    }
  }
}

fillMissing()
  .catch((err) => console.error('Unexpected error:', err))
  .finally(() => pool.end());
