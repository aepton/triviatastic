import React, { useState, useEffect } from 'react';
import './Tile.css';
import GuessingModal from './GuessingModal';

function Tile({ 
  question, 
  categoryIndex, 
  questionIndex, 
  users, 
  onScoreUpdate, 
  tileState, 
  onTileStateChange,
  isGameCreator = false // Add isGameCreator prop with default value false
}) {
  const [showGuessingModal, setShowGuessingModal] = useState(false);
  
  // Destructure tile state
  const { isFlipped, isAnswerShown, isBlank, correctGuessers, incorrectGuessers, showModal } = tileState || {
    isFlipped: false, 
    isAnswerShown: false, 
    isBlank: false,
    correctGuessers: [],
    incorrectGuessers: [],
    showModal: false
  };
  
  // Sync local modal state with tile state for viewers
  useEffect(() => {
    if (!isGameCreator) {
      // Always reflect the remote state for viewers
      if (showModal && !showGuessingModal) {
        setShowGuessingModal(true);
      } else if (!showModal && showGuessingModal) {
        setShowGuessingModal(false);
      }
    }
  }, [showModal, isGameCreator, showGuessingModal]);

  const updateTileState = (newState) => {
    onTileStateChange(categoryIndex, questionIndex, {
      ...tileState,
      ...newState
    });
  };

  const handleClick = () => {
    if (!isFlipped) {
      // When tile is clicked, immediately blank it and open guessing modal
      updateTileState({ 
        isFlipped: true, 
        isBlank: true,
        showModal: true // Always show modal for all users
      });
      
      // Show guessing modal if users are available
      if (users && users.length > 0) {
        // Only the game creator can interact with the modal
        setShowGuessingModal(true);
      }
    } else if (isBlank) {
      // Reset tile if clicked when blank
      updateTileState({ 
        isFlipped: false, 
        isAnswerShown: false, 
        isBlank: false,
        showModal: false
      });
    }
  };

  const handleGuessingModalClose = (updatedUsers, correctUsers = [], incorrectUsers = []) => {
    console.log('handling guessing modal close', updatedUsers, correctUsers, incorrectUsers);
    setShowGuessingModal(false);
    
    // Only update state if we received correctUsers or incorrectUsers
    // (this means the "Update Scores" button was clicked)
    if (correctUsers.length > 0 || incorrectUsers.length > 0) {
      // Store both the blank state and the guessers in the tile state
      updateTileState({ 
        isBlank: true,
        correctGuessers: correctUsers,
        incorrectGuessers: incorrectUsers,
        showModal: false, // Close modal for viewers too
        // Reset the modal step when closing
        question: {
          ...question,
          modalStep: 'clue'
        }
      });
      
      // Let the parent component know it's time to recalculate scores
      if (onScoreUpdate) {
        onScoreUpdate();
      }
    } else {
      // If modal was closed without clicking "Update Scores", just close it
      // without changing any response data
      updateTileState({
        showModal: false, // Close modal for viewers too
        // Reset the modal step when closing
        question: {
          ...question,
          modalStep: 'clue'
        }
      });
    }
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
          <div className="tile-back blank">
            {/* Display guessers in the blanked tile */}
            {(correctGuessers?.length > 0 || incorrectGuessers?.length > 0) && (
              <div className="tile-guessers">
                {correctGuessers?.map(userId => (
                  <span key={`correct-${userId}`} className="guesser-tag correct-guesser">
                    {userId} ✓
                  </span>
                ))}
                {incorrectGuessers?.map(userId => (
                  <span key={`incorrect-${userId}`} className="guesser-tag incorrect-guesser">
                    {userId} ✗
                  </span>
                ))}
              </div>
            )}
          </div>
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
              <div className="tile-hint">
                {users && users.length > 0 && isGameCreator ? 'Click to score' : 'Click to blank'}
              </div>
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
          correctGuessers={correctGuessers || []}
          incorrectGuessers={incorrectGuessers || []}
          question={question}
          isGameCreator={isGameCreator}
        />
      )}
    </>
  );
}

export default Tile;