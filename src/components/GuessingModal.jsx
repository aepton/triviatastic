import React, { useState, useRef, useEffect } from 'react';
import './Modal.css';

function GuessingModal({ 
  users, 
  questionValue, 
  onClose, 
  onScoreUpdate, 
  correctGuessers: initialCorrectGuessers = [], 
  incorrectGuessers: initialIncorrectGuessers = [],
  question, // Add the question prop
  isGameCreator = false  // Add isGameCreator prop
}) {
  const [step, setStep] = useState('clue'); // 'clue', 'answer', 'scoring'
  const [correctGuessers, setCorrectGuessers] = useState(initialCorrectGuessers);
  const [incorrectGuessers, setIncorrectGuessers] = useState(initialIncorrectGuessers);
  const modalContentRef = useRef(null);
  
  // Use any step passed in from parent component (from tile state)
  useEffect(() => {
    if (question && question.modalStep) {
      setStep(question.modalStep);
    }
  }, [question]);

  const toggleUserGuess = (userId, guessStatus) => {
    let newCorrect, newIncorrect;
    
    if (guessStatus === 'correct') {
      // Toggle correct status
      if (correctGuessers.includes(userId)) {
        newCorrect = correctGuessers.filter(id => id !== userId);
        setCorrectGuessers(newCorrect);
      } else {
        newCorrect = [...correctGuessers, userId];
        setCorrectGuessers(newCorrect);
        // Remove from incorrect if present
        newIncorrect = incorrectGuessers.filter(id => id !== userId);
        setIncorrectGuessers(newIncorrect);
      }
    } else if (guessStatus === 'incorrect') {
      // Toggle incorrect status
      if (incorrectGuessers.includes(userId)) {
        newIncorrect = incorrectGuessers.filter(id => id !== userId);
        setIncorrectGuessers(newIncorrect);
      } else {
        newIncorrect = [...incorrectGuessers, userId];
        setIncorrectGuessers(newIncorrect);
        // Remove from correct if present
        newCorrect = correctGuessers.filter(id => id !== userId);
        setCorrectGuessers(newCorrect);
      }
    } else {
      // Clear both statuses (neutral state)
      newCorrect = correctGuessers.filter(id => id !== userId);
      newIncorrect = incorrectGuessers.filter(id => id !== userId);
      setCorrectGuessers(newCorrect);
      setIncorrectGuessers(newIncorrect);
    }
    
    // Trigger an immediate state save when a user's guess status changes
    // We use setTimeout to ensure the state updates complete first
    if (isGameCreator && onScoreUpdate) {
      setTimeout(() => onScoreUpdate(), 0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // We're no longer calculating scores here
    // Instead we just store the correct and incorrect guessers
    // in the tile state, and then scores will be calculated from that
    
    // Close the modal and pass the guessers arrays to store in tile state
    // The parent component will update the board state with correct/incorrect guessers
    // and request score recalculation
    onClose(null, correctGuessers, incorrectGuessers);
  };

  const handleOverlayClick = (e) => {
    // Close modal when clicking outside the modal content
    if (modalContentRef.current && !modalContentRef.current.contains(e.target)) {
      // Don't update scores when closing by clicking outside
      onClose(null);
    }
  };

  const showAnswer = () => {
    setStep('answer');
    // Trigger a state save when phase changes to answer
    if (isGameCreator && onScoreUpdate) {
      // We need to save the step to the question object to sync with viewers
      question.modalStep = 'answer';
      setTimeout(() => onScoreUpdate(), 0);
    }
  };

  const showScoring = () => {
    setStep('scoring');
    // Trigger a state save when phase changes to scoring
    if (isGameCreator && onScoreUpdate) {
      // We need to save the step to the question object to sync with viewers
      question.modalStep = 'scoring';
      setTimeout(() => onScoreUpdate(), 0);
    }
  };

  return (
    <div className="modal-overlay jeopardy-modal-bg" onClick={handleOverlayClick}>
      <div className="modal-content guessing-modal full-screen" ref={modalContentRef}>
        {isGameCreator && <div className="modal-close-btn" onClick={() => onClose(null)}>✕</div>}
        {!isGameCreator && <div className="viewer-mode-indicator">Viewer Mode</div>}
        
        {step === 'clue' && (
          <div className="jeopardy-clue-screen">
            <h2>Clue</h2>
            <div className="jeopardy-clue">
              {question && <p>{question.question}</p>}
              <div className="jeopardy-value">${questionValue}</div>
            </div>
            {isGameCreator && (
              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={showAnswer}>
                  Show Answer
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'answer' && (
          <div className="jeopardy-answer-screen">
            <h2>Answer</h2>
            <div className="jeopardy-clue">
              <p>{question.question}</p>
            </div>
            <div className="jeopardy-answer">
              <p>{question.answer}</p>
            </div>
            {isGameCreator && (
              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={showScoring}>
                  Score Players
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'scoring' && (
          <div className="jeopardy-scoring-screen">
            <h2>Who Guessed?</h2>
            
            {/* Compact display of clue and answer as reference */}
            <div className="clue-answer-summary">
              <div className="clue"><strong>Clue:</strong> {question.question}</div>
              <div className="answer"><strong>Answer:</strong> {question.answer}</div>
            </div>
            
            {isGameCreator ? (
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
            ) : (
              <div className="players-list view-only">
                {users.map(user => (
                  <div key={user.name} className="player-guess-row">
                    <span className="player-name">{user.name}</span>
                    <div className="guess-status">
                      {correctGuessers.includes(user.name) && <span className="correct">Correct ✓</span>}
                      {incorrectGuessers.includes(user.name) && <span className="incorrect">Incorrect ✗</span>}
                      {!correctGuessers.includes(user.name) && !incorrectGuessers.includes(user.name) && 
                        <span className="neutral">No answer</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GuessingModal;