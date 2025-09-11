export async function getCardInfoByName(name, { exact = false, timeoutMs = 8000 } = {}) {
  if (!name || !name.trim()) {
    const err = new Error('Card name is required'); err.status = 400; throw err;
  }
  const url = new URL('https://api.scryfall.com/cards/named');
  url.searchParams.set(exact ? 'exact' : 'fuzzy', name.trim());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) {
      let msg = 'Scryfall lookup failed';
      try { const j = await r.json(); msg = j.details || j.message || msg; } catch {}
      const err = new Error(msg); err.status = r.status; throw err;
    }
    const card = await r.json();

    // pick an image
    let image = card.image_uris?.normal || null;
    if (!image && Array.isArray(card.card_faces) && card.card_faces.length) {
      const face = card.card_faces.find(f => f.image_uris?.normal) || card.card_faces[0];
      image = face?.image_uris?.normal || null;
    }

    return {
      name: card.name,
      color_identity: Array.isArray(card.color_identity) ? card.color_identity : [],
      image,
      set: card.set,
      type_line: card.type_line,
      scryfall_uri: card.scryfall_uri,
      id: card.id,
      mana_cost: card.mana_cost || '',
      cmc: card.cmc || 0,
      oracle_text: card.oracle_text || ''
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function searchCommanders(query, { limit = 10, timeoutMs = 8000 } = {}) {
  if (!query || !query.trim()) {
    return [];
  }
  
  const url = new URL('https://api.scryfall.com/cards/search');
  // Search for legendary creatures that contain the query string
  url.searchParams.set('q', `${query.trim()} type:legendary type:creature`);
  url.searchParams.set('unique', 'names');
  url.searchParams.set('order', 'name');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) {
      if (r.status === 404) {
        // No results found
        return [];
      }
      let msg = 'Scryfall search failed';
      try { const j = await r.json(); msg = j.details || j.message || msg; } catch {}
      const err = new Error(msg); err.status = r.status; throw err;
    }
    
    const result = await r.json();
    const cards = Array.isArray(result.data) ? result.data : [];
    
    return cards.slice(0, limit).map(card => ({
      name: card.name,
      color_identity: Array.isArray(card.color_identity) ? card.color_identity : [],
      type_line: card.type_line,
      mana_cost: card.mana_cost || '',
      image: card.image_uris?.small || card.image_uris?.normal || null
    }));
  } catch (e) {
    if (e.name === 'AbortError') {
      return [];
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

//console.log(await getCardInfoByName("Cloud, Ex-SOLDIER"));