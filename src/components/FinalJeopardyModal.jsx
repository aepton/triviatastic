import React, { useState, useEffect } from 'react';
import './Modal.css';

function FinalJeopardyModal({ category, clue, answer, users, onClose, onScoreUpdate }) {
  const [playerAnswers, setPlayerAnswers] = useState({});
  const [playerWagers, setPlayerWagers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [correctGuessers, setCorrectGuessers] = useState({});
  const [showFinalScores, setShowFinalScores] = useState(false);
  const [hasSubmissions, setHasSubmissions] = useState({});
  
  useEffect(() => {
    // Initialize state for each user
    const initialAnswers = {};
    const initialWagers = {};
    const initialCorrect = {};
    const initialSubmissions = {};
    
    users.forEach(user => {
      initialAnswers[user.name] = "";
      initialWagers[user.name] = "";
      initialCorrect[user.name] = null;
      initialSubmissions[user.name] = false;
    });
    
    setPlayerAnswers(initialAnswers);
    setPlayerWagers(initialWagers);
    setCorrectGuessers(initialCorrect);
    setHasSubmissions(initialSubmissions);
  }, [users]);
  
  // Poll for submitted answers regularly if not showing answers yet
  useEffect(() => {
    // Only fetch if we're not already showing answers
    if (!showAnswers) {
      fetchSavedAnswers();
      
      const interval = setInterval(() => {
        fetchSavedAnswers();
      }, 3000); // Check every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [showAnswers, users]);
  
  // Check if all players have submitted and auto-reveal if they have
  useEffect(() => {
    // Check if all users have submitted
    const allSubmitted = users.length > 0 && users.every(user => hasSubmissions[user.name]);
    
    // Determine if current user is game creator (first user in the list)
    const isCreator = users.length > 0 && users.indexOf(users.find(user => user.name === users[0].name)) === 0;
    
    // If everyone has submitted and answers aren't shown yet
    if (allSubmitted && !showAnswers && isCreator) {
      handleReveal();
    }
  }, [hasSubmissions, users, showAnswers]);
  
  const fetchSavedAnswers = async () => {
    // Check if current user is game creator (first user in the list)
    const isCreator = users.length > 0 && users.indexOf(users.find(user => user.name === users[0].name)) === 0;
    
    // Get the current user's name - assuming the first user in users array
    const currentUserName = users[0]?.name;
    
    // Fetch saved answers for each user
    for (const user of users) {
      try {
        const response = await fetch(`https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-47dddde9-70be-4ccc-a992-b68c3887ccb9/default/reader?gameIdentifier=${encodeURIComponent(`${user.gameId}-wager-${user.name}`)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // For game creators or when fetching other players' data, always update
          // For joiners, only update their own data if fields are currently empty
          const shouldUpdateAnswer = 
            // Only update if not already showing answers (don't override after reveal)
            !showAnswers && (
              isCreator || // Creator always gets updates
              user.name !== currentUserName || // Always update other players' data
              (user.name === currentUserName && !playerAnswers[user.name]) // Only update joiner's own data if empty
            );
            
          const shouldUpdateWager = 
            // Only update if not already showing answers (don't override after reveal)
            !showAnswers && (
              isCreator || // Creator always gets updates
              user.name !== currentUserName || // Always update other players' data
              (user.name === currentUserName && !playerWagers[user.name]) // Only update joiner's own data if empty
            );
          
          // Only update answers and wagers if they exist and aren't empty and based on the rules above
          if (data.answer && shouldUpdateAnswer) {
            setPlayerAnswers(prev => ({
              ...prev,
              [user.name]: data.answer
            }));
          }
          
          if (data.wager && shouldUpdateWager) {
            setPlayerWagers(prev => ({
              ...prev,
              [user.name]: data.wager
            }));
          }
          
          // Mark user as having submitted if they have both answer and wager
          if (data.answer && data.wager) {
            setHasSubmissions(prev => ({
              ...prev,
              [user.name]: true
            }));
          }
        }
      } catch (error) {
        console.error(`Error fetching answer for ${user.name}:`, error);
      }
    }
  };
  
  const handleAnswerChange = (userName, value) => {
    setPlayerAnswers(prev => ({
      ...prev,
      [userName]: value
    }));
  };
  
  const handleWagerChange = (userName, value) => {
    // Ensure wager is a number
    const numericValue = value.replace(/[^0-9]/g, '');
    setPlayerWagers(prev => ({
      ...prev,
      [userName]: numericValue
    }));
  };
  
  const handleSave = async (userName) => {
    try {
      // Get gameId from any user (they all should have the same gameId)
      const gameId = users[0]?.gameId;
      if (!gameId) return;
      
      const response = await fetch('https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-47dddde9-70be-4ccc-a992-b68c3887ccb9/default/saver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameIdentifier: `${gameId}-wager-${userName}`,
          gameState: {
            answer: playerAnswers[userName] || "",
            wager: playerWagers[userName] || "0",
            lastUpdated: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save answer');
      }
      
      // Mark this user as having submitted
      setHasSubmissions(prev => ({
        ...prev,
        [userName]: true
      }));
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };
  
  const handleReveal = () => {
    setShowAnswers(true);
  };
  
  const toggleUserGuess = (userName, isCorrect) => {
    console.log(`Toggling guess for ${userName} to ${isCorrect}`, {
      currentAnswer: playerAnswers[userName],
      currentWager: playerWagers[userName]
    });
    
    // Determine if we should toggle off or set to a new value
    const newCorrectValue = correctGuessers[userName] === isCorrect ? null : isCorrect;
    
    // Update the correct/incorrect state
    setCorrectGuessers(prev => ({
      ...prev,
      [userName]: newCorrectValue
    }));
    
    // Calculate score changes
    const userToUpdate = users.find(user => user.name === userName);
    if (userToUpdate) {
      const wager = parseInt(playerWagers[userName] || 0, 10);
      let scoreChange = 0;
      
      // If toggling off, reverse the previous change
      if (correctGuessers[userName] === true && newCorrectValue === null) {
        scoreChange = -wager; // Undo previous correct answer
      } else if (correctGuessers[userName] === false && newCorrectValue === null) {
        scoreChange = wager; // Undo previous incorrect answer
      } 
      // If setting to a new value
      else if (newCorrectValue === true) {
        scoreChange = wager; // Add wager for correct
      } else if (newCorrectValue === false) {
        scoreChange = -wager; // Subtract wager for incorrect
      }
      
      // Only update scores if there's a change
      if (scoreChange !== 0) {
        // Create updated users array with the new score
        const updatedUsers = users.map(user => {
          if (user.name === userName) {
            return {
              ...user,
              score: user.score + scoreChange
            };
          }
          return user;
        });
        
        // Update parent components with new scores
        onScoreUpdate(updatedUsers);
        
        // Log after updating scores to see if anything changed
        console.log(`After score update for ${userName}`, {
          answer: playerAnswers[userName],
          wager: playerWagers[userName],
          scoreChange
        });
      }
    }
  };
  
  const handleSubmitScores = () => {
    // Check if there are any users whose guesses haven't been marked yet
    const anyUnmarkedGuesses = users.some(user => correctGuessers[user.name] === null);
    
    if (anyUnmarkedGuesses) {
      // If any guesses are unmarked, show a confirmation
      if (window.confirm("Some players don't have their answers marked as correct or incorrect. Close anyway?")) {
        setShowFinalScores(true);
      }
    } else {
      // All players have been marked, show final scores modal
      setShowFinalScores(true);
    }
  };
  
  // Handler for when user dismisses the final scores modal
  const handleFinalScoresClose = () => {
    setShowFinalScores(false);
    onClose(true); // Pass true to indicate we want to reset to single jeopardy
  };
  
  // If final scores modal is showing, render that instead
  if (showFinalScores) {
    return (
      <div className="modal-overlay">
        <div className="modal-content final-score-modal">
          <h2>Final Scores</h2>
          
          <div className="final-scores-list">
            {/* Sort users by score in descending order */}
            {[...users].sort((a, b) => b.score - a.score).map(user => (
              <div key={user.name} className="final-score-row">
                <div className="player-name">{user.name}</div>
                <div className="player-score">${user.score}</div>
              </div>
            ))}
          </div>
          
          <div className="modal-actions">
            <button onClick={handleFinalScoresClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="modal-overlay">
      <div className="modal-content final-jeopardy-modal">
        <h2>Final Jeopardy</h2>
        <h3>Category: {category}</h3>
        
        <div className="final-clue">
          <p>{clue}</p>
        </div>
        
        {showAnswers && (
          <div className="final-answer">
            <h4>Correct Answer:</h4>
            <p>{answer}</p>
          </div>
        )}
        
        <div className="player-answers">
          {users.map(user => {
            // Determine if this user is the game creator
            const isCreator = users.indexOf(user) === 0;
            
            return (
              <div key={user.name} className="player-answer-row">
                <div className="player-name">
                  {user.name}
                  {hasSubmissions[user.name] && !showAnswers && <span className="submitted-indicator"> (Submitted)</span>}
                </div>
                
                <div className="player-input-group">
                  <input
                    type={showAnswers ? "text" : "password"}
                    value={playerAnswers[user.name] || ""}
                    onChange={(e) => handleAnswerChange(user.name, e.target.value)}
                    placeholder="Answer"
                    readOnly={showAnswers}
                  />
                  
                  <input
                    type={showAnswers ? "text" : "password"}
                    value={playerWagers[user.name] || ""}
                    onChange={(e) => handleWagerChange(user.name, e.target.value)}
                    placeholder="Wager"
                    readOnly={showAnswers}
                  />
                  
                  {!showAnswers && (
                    <button
                      className="save-btn"
                      onClick={() => handleSave(user.name)}
                    >
                      Submit
                    </button>
                  )}
                  
                  {showAnswers && (
                    <div className="guess-toggles">
                      <button 
                        type="button"
                        className={`toggle-btn ${correctGuessers[user.name] === true ? 'correct-active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleUserGuess(user.name, true);
                        }}
                      >
                        ✓
                      </button>
                      <button 
                        type="button"
                        className={`toggle-btn ${correctGuessers[user.name] === false ? 'incorrect-active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleUserGuess(user.name, false);
                        }}
                      >
                        ✗
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="modal-actions">          
          <button onClick={() => {
            setShowFinalScores(true);
          }} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinalJeopardyModal;