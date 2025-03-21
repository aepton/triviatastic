import React, { useState } from 'react';
import './Modal.css';

function WelcomeModal({ onClose, onCreateGame, onJoinGame }) {
  const [gameIdInput, setGameIdInput] = useState('');
  const [showGameIdPrompt, setShowGameIdPrompt] = useState(false);
  
  const handleCreateGame = () => {
    setShowGameIdPrompt(true);
  };
  
  const handleRandomGame = async () => {
    try {
      // Fetch game-index.json to get a list of available games
      const response = await fetch('/game-index.json');
      const gameIndex = await response.json();
      
      // Select a random game from the list
      const gameIds = gameIndex.map(game => game.id);
      const randomIndex = Math.floor(Math.random() * gameIds.length);
      const randomGameId = gameIds[randomIndex];
      
      // Load the game and extract identifier words
      onCreateGame(randomGameId);
    } catch (error) {
      console.error('Error selecting random game:', error);
      alert('Failed to select a random game. Please try again.');
    }
  };
  
  const handleSpecificGame = () => {
    if (!gameIdInput.trim()) {
      alert('Please enter a valid game ID');
      return;
    }
    
    onCreateGame(gameIdInput.trim());
  };
  
  const handleJoinGame = () => {
    onJoinGame();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content welcome-modal">
        <h2>Welcome to ¡Jeopardy!</h2>
        
        {!showGameIdPrompt ? (
          <div className="welcome-options">
            <p>Choose an option to begin:</p>
            <div className="modal-actions">
              <button onClick={handleCreateGame} className="btn-primary">
                Create a Game
              </button>
              <button onClick={handleJoinGame} className="btn-primary">
                Join a Game
              </button>
            </div>
          </div>
        ) : (
          <div className="game-id-prompt">
            <p>Select a game option:</p>
            <div className="modal-actions">
              <button onClick={handleRandomGame} className="btn-primary">
                Random Game
              </button>
              <div className="form-group">
                <input
                  type="text"
                  value={gameIdInput}
                  onChange={(e) => setGameIdInput(e.target.value)}
                  placeholder="Enter Game ID"
                  autoFocus
                />
                <button onClick={handleSpecificGame} className="btn-primary">
                  Use This Game
                </button>
              </div>
              <button onClick={() => setShowGameIdPrompt(false)} className="btn-secondary">
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WelcomeModal;