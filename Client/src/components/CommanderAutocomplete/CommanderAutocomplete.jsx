import { useState, useEffect, useRef } from 'react';
import { useGameMeta } from '../../contexts/GameMetaProvider';
import './CommanderAutocomplete.css';

export default function CommanderAutocomplete({ value, onChange, placeholder = "Enter commander name..." }) {
  const { commanderNames } = useGameMeta();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const timeoutRef = useRef(null);

  // Filter existing commanders and fetch from Scryfall
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the search
    timeoutRef.current = setTimeout(async () => {
      const query = value.toLowerCase();
      
      // Filter existing commanders
      const existingMatches = commanderNames
        .filter(name => name.toLowerCase().includes(query))
        .slice(0, 5)
        .map(name => ({ name, source: 'existing' }));

      setSuggestions(existingMatches);
      setShowSuggestions(true);

      // If we have fewer than 5 matches from existing commanders, search Scryfall
      if (existingMatches.length < 5) {
        setLoading(true);
        try {
          const response = await fetch(`/api/v1/cards/search/commanders?q=${encodeURIComponent(value)}&limit=${10 - existingMatches.length}`);
          if (response.ok) {
            const scryfallResults = await response.json();
            const scryfallSuggestions = scryfallResults
              .filter(card => !existingMatches.some(existing => existing.name.toLowerCase() === card.name.toLowerCase()))
              .map(card => ({ 
                name: card.name, 
                source: 'scryfall',
                type_line: card.type_line,
                mana_cost: card.mana_cost,
                colors: card.color_identity 
              }));
            
            setSuggestions([...existingMatches, ...scryfallSuggestions]);
          }
        } catch (error) {
          console.error('Failed to fetch Scryfall suggestions:', error);
        } finally {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, commanderNames]);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  return (
    <div className="commander-autocomplete">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && setShowSuggestions(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div ref={suggestionsRef} className="suggestions-dropdown">
          {loading && (
            <div className="suggestion-item loading">
              Searching Scryfall...
            </div>
          )}
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.source}-${suggestion.name}`}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''} ${suggestion.source}`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="suggestion-name">{suggestion.name}</div>
              {suggestion.source === 'scryfall' && (
                <div className="suggestion-details">
                  {suggestion.mana_cost && <span className="mana-cost">{suggestion.mana_cost}</span>}
                  <span className="type-line">{suggestion.type_line}</span>
                </div>
              )}
              <div className="suggestion-source">
                {suggestion.source === 'existing' ? 'From your games' : 'From Scryfall'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}