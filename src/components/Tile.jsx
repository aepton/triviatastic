import React, { useState } from 'react';
import './Tile.css';

function Tile({ question }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnswerShown, setIsAnswerShown] = useState(false);
  const [isBlank, setIsBlank] = useState(false);

  const handleClick = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    } else if (!isAnswerShown) {
      setIsAnswerShown(true);
    } else if (!isBlank) {
      setIsBlank(true);
    } else {
      // Reset tile if clicked when blank
      setIsFlipped(false);
      setIsAnswerShown(false);
      setIsBlank(false);
    }
  };

  return (
    <div
      className={`tile ${isFlipped ? 'flipped' : ''} ${isBlank ? 'blank' : ''}`}
      onClick={handleClick}
    >
      {!isFlipped ? (
        <div className="tile-front">
          <div className="tile-value">${question.value}</div>
        </div>
      ) : isBlank ? (
        <div className="tile-back"></div>
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
            <div className="tile-hint">Click to blank</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Tile;
