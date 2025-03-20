import React, { useState } from 'react';
import './Modal.css';

function JoinGameModal({ onClose, onJoinWithIdentifier }) {
  const [identifierInput, setIdentifierInput] = useState('');

  const handleJoin = () => {
    if (!identifierInput.trim()) {
      alert('Please enter a valid game identifier');
      return;
    }
    
    onJoinWithIdentifier(identifierInput.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Join Game</h2>
        <div className="form-group">
          <label htmlFor="game-identifier">
            Enter the game identifier:
          </label>
          <input
            type="text"
            id="game-identifier"
            value={identifierInput}
            onChange={(e) => setIdentifierInput(e.target.value)}
            placeholder="e.g. butterfly-acropolis-cabinet-france"
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button onClick={handleJoin} className="btn-primary">
            Join Game
          </button>
          <button onClick={onClose} className="btn-secondary">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default JoinGameModal;