import React, { useState } from 'react';
import './Tile.css';
import GuessingModal from './GuessingModal';

function Tile({ 
  question, 
  categoryIndex, 
  questionIndex, 
  users, 
  onScoreUpdate, 
  tileState, 
  onTileStateChange 
}) {
  const [showGuessingModal, setShowGuessingModal] = useState(false);
  
  // Destructure tile state
  const { isFlipped, isAnswerShown, isBlank } = tileState || {
    isFlipped: false, 
    isAnswerShown: false, 
    isBlank: false
  };

  const updateTileState = (newState) => {
    onTileStateChange(categoryIndex, questionIndex, {
      ...tileState,
      ...newState
    });
  };

  const handleClick = () => {
    if (!isFlipped) {
      updateTileState({ isFlipped: true });
    } else if (!isAnswerShown) {
      updateTileState({ isAnswerShown: true });
    } else if (!isBlank && !showGuessingModal && users && users.length > 0) {
      // Show guessing modal if users are available
      setShowGuessingModal(true);
    } else if (!isBlank) {
      // If no users or modal was dismissed, go to blank state
      updateTileState({ isBlank: true });
    } else {
      // Reset tile if clicked when blank
      updateTileState({ 
        isFlipped: false, 
        isAnswerShown: false, 
        isBlank: false 
      });
    }
  };

  const handleGuessingModalClose = () => {
    setShowGuessingModal(false);
    updateTileState({ isBlank: true }); // Transition to blank state after guessing
  };

  return (
    <>
      <div
        className={`tile ${isFlipped ? 'flipped' : ''} ${isBlank ? 'blank' : ''}`}
        onClick={handleClick}
      >
        {!isFlipped ? (
          <div className="tile-front">
            <div className="tile-value">${question.value}</div>
          </div>
        ) : isBlank ? (
          <div className="tile-back blank"></div>
        ) : (
          <div className="tile-back">
            {!isAnswerShown ? (
              <div className="tile-question">{question.question}</div>
            ) : (
              <div className="tile-answer">{question.answer}</div>
            )}
            {!isAnswerShown ? (
              <div className="tile-hint">Click for answer</div>
            ) : (
              <div className="tile-hint">{users && users.length > 0 ? 'Click to score' : 'Click to blank'}</div>
            )}
          </div>
        )}
      </div>

      {/* Guessing modal */}
      {showGuessingModal && (
        <GuessingModal 
          users={users} 
          questionValue={question.value} 
          onClose={handleGuessingModalClose}
          onScoreUpdate={onScoreUpdate}
        />
      )}
    </>
  );
}

export default Tile;