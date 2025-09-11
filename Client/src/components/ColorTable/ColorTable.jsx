import { useState, useEffect } from 'react';
import './ColorTable.css';

const WUBRG = ['W', 'U', 'B', 'R', 'G'];
const LETTER_TO_NAME = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };

export default function ColorTable({name}) {
  const [colors, setColors] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/v1/stats/colors/frequency/${name ? name : ''}`);

        const raw = await res.json(); // [{ color: 'W', share: 0.25, pct: 25.0, total_games: 10, avg_players_per_game: 3.5 }, ...]
        const byLetter = new Map();

        for (const row of Array.isArray(raw) ? raw : []) {
          const letter = String(row.color || '').toUpperCase();
          if (!WUBRG.includes(letter)) continue;
          const share = Number(row.share) || 0; // decimal share (0.0 - 1.0)
          const pct = Number(row.pct) || 0;     // percentage (0 - 100)
          byLetter.set(letter, { share, pct });
        }

        const normalized = WUBRG.map(l => {
          const data = byLetter.get(l) || { share: 0, pct: 0 };
          return {
            color_code: l,
            color_name: LETTER_TO_NAME[l],
            share: data.share,
            percentage: data.pct, // Use the pre-calculated percentage from API
            className: LETTER_TO_NAME[l].toLowerCase(), // "white", "blue", ...
          };
        });

        setColors(normalized);
      } catch (e) {
        console.error('Failed to load color frequencies', e);
        setColors([]);
      }
    })();
  }, []);

  if (!Array.isArray(colors) || colors.length === 0) {
    return (
      <section className="color-analysis">
        <div className="no-color-data">No color data available</div>
      </section>
    );
  }

  return (
    <section>
      <h2>Color Distribution</h2>
      <p className="color-subtitle">Percentage of game seats by color identity</p>
      <ul className="chart">
        {colors.map((c) => (
          <li
            key={c.color_code}
            className={c.className}
            style={{ '--pct': `${c.percentage}%` }}
          >
            <span className="bar" aria-hidden="true" />
            <span className="label">
              {c.color_name}: <span className="count">{c.percentage}%</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
