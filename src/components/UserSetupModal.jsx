import React, { useState } from 'react';
import './Modal.css';

function UserSetupModal({ onClose, onSaveUsers }) {
  const [userInput, setUserInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Split user input by commas, remove whitespace and empty entries
    const usersList = userInput
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (usersList.length === 0) {
      alert('Please enter at least one user name');
      return;
    }
    
    // Create users array with names and initial scores of 0
    const users = usersList.map(name => ({ name, score: 0 }));
    
    // Call the parent component's callback with the users
    onSaveUsers(users);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Enter Players</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="users">
              Enter player names (comma-separated):
            </label>
            <input
              type="text"
              id="users"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="e.g. Alice, Bob, Charlie"
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">
              Start Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserSetupModal;