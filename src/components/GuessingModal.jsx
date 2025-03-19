import React, { useState } from 'react';
import './Modal.css';

function GuessingModal({ users, questionValue, onClose, onScoreUpdate }) {
  const [correctGuessers, setCorrectGuessers] = useState([]);
  const [incorrectGuessers, setIncorrectGuessers] = useState([]);

  const toggleUserGuess = (userId, isCorrect) => {
    if (isCorrect) {
      // Handle correct guessers
      if (correctGuessers.includes(userId)) {
        setCorrectGuessers(correctGuessers.filter(id => id !== userId));
      } else {
        setCorrectGuessers([...correctGuessers, userId]);
        // Remove from incorrect if present
        setIncorrectGuessers(incorrectGuessers.filter(id => id !== userId));
      }
    } else {
      // Handle incorrect guessers
      if (incorrectGuessers.includes(userId)) {
        setIncorrectGuessers(incorrectGuessers.filter(id => id !== userId));
      } else {
        setIncorrectGuessers([...incorrectGuessers, userId]);
        // Remove from correct if present
        setCorrectGuessers(correctGuessers.filter(id => id !== userId));
      }
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
    
    onScoreUpdate(scoreUpdates);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content guessing-modal">
        <h2>Who Guessed Correctly/Incorrectly?</h2>
        <h3>Value: ${questionValue}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="players-container">
            <div className="correct-guessers">
              <h4>Correct Guessers (+${questionValue})</h4>
              {users.map(user => (
                <div key={`correct-${user.name}`} className="player-choice">
                  <label className={correctGuessers.includes(user.name) ? 'selected' : ''}>
                    <input
                      type="checkbox"
                      checked={correctGuessers.includes(user.name)}
                      onChange={() => toggleUserGuess(user.name, true)}
                    />
                    {user.name}
                  </label>
                </div>
              ))}
            </div>
            
            <div className="incorrect-guessers">
              <h4>Incorrect Guessers (-${questionValue})</h4>
              {users.map(user => (
                <div key={`incorrect-${user.name}`} className="player-choice">
                  <label className={incorrectGuessers.includes(user.name) ? 'selected' : ''}>
                    <input
                      type="checkbox"
                      checked={incorrectGuessers.includes(user.name)}
                      onChange={() => toggleUserGuess(user.name, false)}
                    />
                    {user.name}
                  </label>
                </div>
              ))}
            </div>
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