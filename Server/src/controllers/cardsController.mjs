import { getCardInfoByName, searchCommanders } from '../services/scryfallService.mjs';

export async function getCardDetails(req, res) {
  try {
    const cardName = req.params.name?.trim();
    
    if (!cardName) {
      return res.status(400).json({ error: 'Card name is required' });
    }

    const cardData = await getCardInfoByName(cardName, { exact: false });
    res.json(cardData);
  } catch (err) {
    console.error('Card details error:', err);
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to fetch card details' });
  }
}

export async function searchCommanderSuggestions(req, res) {
  try {
    const query = req.query.q?.trim();
    const limit = Math.min(parseInt(req.query.limit) || 10, 20); // Cap at 20 results
    
    if (!query) {
      return res.json([]);
    }

    // If query is very short, require at least 2 characters
    if (query.length < 2) {
      return res.json([]);
    }

    const suggestions = await searchCommanders(query, { limit });
    res.json(suggestions);
  } catch (err) {
    console.error('Commander search error:', err);
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to search commanders' });
  }
}