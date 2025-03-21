import React, { useState } from 'react';
import './Modal.css';

function GuessingModal({ users, questionValue, onClose, onScoreUpdate }) {
  const [correctGuessers, setCorrectGuessers] = useState([]);
  const [incorrectGuessers, setIncorrectGuessers] = useState([]);

  const toggleUserGuess = (userId, guessStatus) => {
    if (guessStatus === 'correct') {
      // Toggle correct status
      if (correctGuessers.includes(userId)) {
        setCorrectGuessers(correctGuessers.filter(id => id !== userId));
      } else {
        setCorrectGuessers([...correctGuessers, userId]);
        // Remove from incorrect if present
        setIncorrectGuessers(incorrectGuessers.filter(id => id !== userId));
      }
    } else if (guessStatus === 'incorrect') {
      // Toggle incorrect status
      if (incorrectGuessers.includes(userId)) {
        setIncorrectGuessers(incorrectGuessers.filter(id => id !== userId));
      } else {
        setIncorrectGuessers([...incorrectGuessers, userId]);
        // Remove from correct if present
        setCorrectGuessers(correctGuessers.filter(id => id !== userId));
      }
    } else {
      // Clear both statuses (neutral state)
      setCorrectGuessers(correctGuessers.filter(id => id !== userId));
      setIncorrectGuessers(incorrectGuessers.filter(id => id !== userId));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update scores for all users
    const scoreUpdates = users.map(user => {
      const userId = user.name;
      let scoreChange = 0;
      
      if (correctGuessers.includes(userId)) {
        scoreChange = questionValue;
      } else if (incorrectGuessers.includes(userId)) {
        scoreChange = -questionValue;
      }
      
      return {
        ...user,
        score: user.score + scoreChange
      };
    });
    
    // First update scores via the callback to ensure it happens
    if (onScoreUpdate) {
      onScoreUpdate(scoreUpdates);
    }
    
    // Then close the modal - this will also update tile state
    onClose(scoreUpdates);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content guessing-modal">
        <h2>Who Guessed?</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="players-list">
            {users.map(user => (
              <div key={user.name} className="player-guess-row">
                <span className="player-name">{user.name}</span>
                <div className="guess-toggles">
                  <button 
                    type="button"
                    className={`toggle-btn ${correctGuessers.includes(user.name) ? 'correct-active' : ''}`}
                    onClick={() => toggleUserGuess(user.name, correctGuessers.includes(user.name) ? 'neutral' : 'correct')}
                  >
                    ✓
                  </button>
                  <button 
                    type="button"
                    className={`toggle-btn ${incorrectGuessers.includes(user.name) ? 'incorrect-active' : ''}`}
                    onClick={() => toggleUserGuess(user.name, incorrectGuessers.includes(user.name) ? 'neutral' : 'incorrect')}
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="modal-actions">
            <button type="submit" className="btn-primary">
              Update Scores
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GuessingModal;