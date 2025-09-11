import { useState, useRef } from 'react';
import { useGameMeta } from '../contexts/GameMetaProvider';
import CommanderAutocomplete from '../components/CommanderAutocomplete/CommanderAutocomplete';
import './AddGameForm.css'

export default function AddGameForm(){
    const { playerNames } = useGameMeta();
    const [players, setPlayers] = useState([]); //for the players in the form
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState(null);
    const [turnCountNotRecorded, setTurnCountNotRecorded] = useState(false);
    const nextId = useRef(1);
    const formRef = useRef(null);    
    
    //Adds player object to players array, maps HTML for each
    function addPlayer() {
        setPlayers(ps => [...ps,
            {
                id: nextId.current++,
                name: "",
                commanders: [{ name: "", isPrimary: true }],
                turnOrder: ps.length + 1
            }
        ]);
    };

    //Removes player from array
    function removePlayer(id) {
        setPlayers(
            ps => ps.filter(p => p.id !== id).map((p,i) => ({...p, turnOrder: i + 1}))
        );
    };

    //update 
    function update(id, field, value) {
        setPlayers(ps => ps.map(p => (p.id === id ? { ...p, [field]: value } : p)));
    }

    function updateCommander(playerId, commanderIndex, field, value) {
        setPlayers(ps => ps.map(p => {
            if (p.id === playerId) {
                const newCommanders = [...p.commanders];
                newCommanders[commanderIndex] = { ...newCommanders[commanderIndex], [field]: value };
                return { ...p, commanders: newCommanders };
            }
            return p;
        }));
    }

    function togglePartner(playerId) {
        setPlayers(ps => ps.map(p => {
            if (p.id === playerId) {
                if (p.commanders.length === 1) {
                    // Add partner/background
                    return { ...p, commanders: [...p.commanders, { name: "", isPrimary: false }] };
                } else {
                    // Remove partner/background (keep only primary)
                    return { ...p, commanders: [p.commanders[0]] };
                }
            }
            return p;
        }));
    }
    
    function handleSubmit(e){
        e.preventDefault();
        const form = new FormData(e.currentTarget);

        const turnsValue = form.get('turns');
        const turnsNumber = Number(turnsValue);

        const payload = {
            date: form.get('date'),
            turns: turnCountNotRecorded ? null : ((!turnsValue || turnsNumber < 0) ? null : turnsNumber),
            wincon: form.get('wincon'),
            winner: form.get('winner'),
            players: players.map(p => ({
                name: p.name.trim(),
                commanders: p.commanders.filter(c => c.name.trim()).map(c => ({
                    name: c.name.trim(),
                    isPrimary: c.isPrimary
                })),
                turnOrder: Number(p.turnOrder)
            }))
        }

        setFormData(payload);
        setShowConfirmation(true);
    }

    async function confirmSubmit(){
        try {
            const res = await fetch('/api/v1/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify(formData)
            });

            if(!res.ok){
                const err = await res.json().catch(()=>({}));
                throw new Error(err.error || 'Save game failed');
            } else {
                setShowConfirmation(false);
                setShowSuccess(true);
                //Reset form and clear players
                formRef.current.reset();
                setPlayers([]);
                setFormData(null);
                setTurnCountNotRecorded(false);
                
                // Hide success message after 3 seconds
                setTimeout(() => setShowSuccess(false), 3000);
            }        
        } catch (err) {
            console.log(err);
            setShowConfirmation(false);
        }
    }

    function cancelSubmit(){
        setShowConfirmation(false);
        setFormData(null);
    }

  return (
    <>
      {showConfirmation && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Game Submission</h3>
            <p>Are you sure you want to submit this game?</p>
            <div className="modal-buttons">
              <button type="button" onClick={confirmSubmit} className="confirm-btn">
                Yes, Submit Game
              </button>
              <button type="button" onClick={cancelSubmit} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showSuccess && (
        <div className="success-message">
          Game submitted successfully! 🎉
        </div>
      )}
      
      <form onSubmit={handleSubmit} ref={formRef}>
        <datalist id="player-names">
          {playerNames.map(n => <option key={n} value={n} />)}
        </datalist>

      <label>
        Game Date:
        <input type="date" name="date" />
      </label>

      <div className="turn-count-section">
        <label>
          Turn Count:
          <input 
            type="number" 
            name="turns" 
            min="0" 
            disabled={turnCountNotRecorded}
            placeholder={turnCountNotRecorded ? "Not recorded" : "Enter turn count"}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={turnCountNotRecorded}
            onChange={(e) => setTurnCountNotRecorded(e.target.checked)}
          />
          Turn count not recorded
        </label>
      </div>

      <label>
        Win Con:
        <select name="wincon" className="form__select">
          <option value="Combat">Combat</option>
          <option value="Combo">Combo</option>
          <option value="Commander Damage">Commander Damage</option>
          <option value="Ping/Burn">Ping/Burn</option>
          <option value="Scoops">Scoops</option>
          <option value="NULL">Not Recorded</option>
        </select>
      </label>

      <label>
        Winner:
        <input type="text" name="winner" list="player-names" />
      </label>

      <button type="button" onClick={addPlayer}>
        + Add Player
      </button>

      <div className="players">
        {players.map((p, i) => (
          <fieldset key={p.id} className="player">
            <legend>Player {i + 1}</legend>

            <label>
              Name:
              <input
                type="text"
                name={`players[${i}].name`}
                value={p.name}
                onChange={e => update(p.id, "name", e.target.value)}
                list="player-names"
                required
              />
            </label>

            <div className="commanders-section">
              <h4>Commanders:</h4>
              {p.commanders.map((commander, cmdIndex) => (
                <div key={cmdIndex} className="commander-input">
                  <label>
                    {commander.isPrimary ? "Primary Commander:" : "Partner/Background:"}
                    <CommanderAutocomplete
                      value={commander.name}
                      onChange={(value) => updateCommander(p.id, cmdIndex, "name", value)}
                      placeholder={commander.isPrimary ? "Enter primary commander..." : "Enter partner/background..."}
                    />
                  </label>
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => togglePartner(p.id)}
                className={p.commanders.length === 1 ? "add-commander-btn" : "remove-commander-btn"}
              >
                {p.commanders.length === 1 ? "+ Add Partner/Background" : "- Remove Partner/Background"}
              </button>
            </div>

            <label>
              Turn order:
              <input
                type="number"
                min="1"
                name={`players[${i}].turnOrder`}
                value={p.turnOrder}
                onChange={e => update(p.id, "turnOrder", Number(e.target.value))}
              />
            </label>

            <button type="button" onClick={() => removePlayer(p.id)}>
              Remove Player
            </button>
          </fieldset>
        ))}
      </div>

        <div>
          <button type="submit">Save Game</button>
        </div>
      </form>
    </>
  );
}