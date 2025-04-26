import React, { useState, useEffect } from 'react';
import './Modal.css';
import './FinalJeopardyModal.css';

function FinalJeopardyModal({ category, clue, answer, users, onClose, onScoreUpdate }) {
  const [playerAnswers, setPlayerAnswers] = useState({});
  const [playerWagers, setPlayerWagers] = useState({});
  const [showClue, setShowClue] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [correctGuessers, setCorrectGuessers] = useState({});
  const [showFinalScores, setShowFinalScores] = useState(false);
  const [hasWagerSubmissions, setHasWagerSubmissions] = useState({});
  const [hasAnswerSubmissions, setHasAnswerSubmissions] = useState({});
  
  useEffect(() => {
    // Initialize state for each user, but only when component first mounts
    // or when new users are added (not when users are updated with new scores)
    const initialAnswers = {};
    const initialWagers = {};
    const initialCorrect = {};
    const initialWagerSubmissions = {};
    const initialAnswerSubmissions = {};
    
    users.forEach(user => {
      // Preserve existing values if they exist, otherwise initialize to empty
      initialAnswers[user.name] = playerAnswers[user.name] || "";
      initialWagers[user.name] = playerWagers[user.name] || "";
      initialCorrect[user.name] = correctGuessers[user.name] !== undefined ? correctGuessers[user.name] : null;
      initialWagerSubmissions[user.name] = hasWagerSubmissions[user.name] || false;
      initialAnswerSubmissions[user.name] = hasAnswerSubmissions[user.name] || false;
    });
    
    setPlayerAnswers(initialAnswers);
    setPlayerWagers(initialWagers);
    setCorrectGuessers(initialCorrect);
    setHasWagerSubmissions(initialWagerSubmissions);
    setHasAnswerSubmissions(initialAnswerSubmissions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Poll for submitted wagers and answers regularly
  useEffect(() => {
    fetchSavedResponses();
    
    const interval = setInterval(() => {
      fetchSavedResponses();
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(interval);
  }, [showClue, showAnswers, users]);
  
  // Check if all players have submitted wagers and auto-reveal clue if they have
  useEffect(() => {
    // Check if all users have submitted wagers
    const allWagersSubmitted = users.length > 0 && users.every(user => hasWagerSubmissions[user.name]);
    
    // Determine if current user is game creator (first user in the list)
    const isCreator = users.length > 0 && users.indexOf(users.find(user => user.name === users[0].name)) === 0;
    
    // If everyone has submitted wagers and clue isn't shown yet
    if (allWagersSubmitted && !showClue && isCreator) {
      setShowClue(true);
    }
  }, [hasWagerSubmissions, users, showClue]);
  
  // Check if all players have submitted answers and auto-reveal answer if they have
  useEffect(() => {
    // Check if all users have submitted answers
    const allAnswersSubmitted = users.length > 0 && users.every(user => hasAnswerSubmissions[user.name]);
    
    // Determine if current user is game creator (first user in the list)
    const isCreator = users.length > 0 && users.indexOf(users.find(user => user.name === users[0].name)) === 0;
    
    // If everyone has submitted answers, clue is shown, but answers aren't shown yet
    if (allAnswersSubmitted && showClue && !showAnswers && isCreator) {
      handleReveal();
    }
  }, [hasAnswerSubmissions, users, showClue, showAnswers]);
  
  const fetchSavedResponses = async () => {
    // Check if current user is game creator (first user in the list)
    const isCreator = users.length > 0 && users.indexOf(users.find(user => user.name === users[0].name)) === 0;
    
    // Get the current user's name - assuming the first user in users array
    const currentUserName = users[0]?.name;
    
    // Fetch saved wagers and answers for each user
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
            // Only update if not already showing clue (don't override after clue reveal)
            !showClue && (
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
          
          // Track wager and answer submissions separately
          if (data.wager) {
            setHasWagerSubmissions(prev => ({
              ...prev,
              [user.name]: true
            }));
          }
          
          if (data.answer) {
            setHasAnswerSubmissions(prev => ({
              ...prev,
              [user.name]: true
            }));
          }
        }
      } catch (error) {
        console.error(`Error fetching response for ${user.name}:`, error);
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
  
  const handleSaveWager = async (userName) => {
    try {
      // Get gameId from any user (they all should have the same gameId)
      const gameId = users[0]?.gameId;
      if (!gameId) return;
      
      // Find the user to check their current score
      const user = users.find(u => u.name === userName);
      if (!user) return;
      
      // Parse wager and validate against current score - allow up to $1000 even if score is lower
      const wagerAmount = parseInt(playerWagers[userName] || "0", 10);
      const maxWager = Math.max(user.score, 1000);
      if (wagerAmount > maxWager) {
        alert(`Wager of $${wagerAmount} exceeds your maximum wager of $${maxWager}. Please enter a valid amount.`);
        return;
      }
      
      console.log(`Saving wager for ${userName}:`, {
        score: user.score,
        wager: wagerAmount
      });
      
      const response = await fetch('https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-47dddde9-70be-4ccc-a992-b68c3887ccb9/default/saver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameIdentifier: `${gameId}-wager-${userName}`,
          gameState: {
            wager: wagerAmount.toString(),
            lastUpdated: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save wager');
      }
      
      // Mark this user as having submitted a wager
      setHasWagerSubmissions(prev => {
        const newValue = {
          ...prev,
          [userName]: true
        };
        
        // Save game state after wager submission is registered
        if (onScoreUpdate) {
          setTimeout(() => onScoreUpdate(users), 0);
        }
        
        return newValue;
      });
    } catch (error) {
      console.error('Error saving wager:', error);
    }
  };
  
  const handleSaveAnswer = async (userName) => {
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
      
      // Mark this user as having submitted an answer
      setHasAnswerSubmissions(prev => {
        const newValue = {
          ...prev,
          [userName]: true
        };
        
        // Save game state after answer submission is registered
        if (onScoreUpdate) {
          setTimeout(() => onScoreUpdate(users), 0);
        }
        
        return newValue;
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };
  
  const handleReveal = () => {
    setShowAnswers(true);
    
    // Save state when answer is revealed
    if (onScoreUpdate) {
      setTimeout(() => onScoreUpdate(users), 0);
    }
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
    
    // For Final Jeopardy, we still calculate scores directly because of wagers
    // We'll get the current scores from the passed users prop to ensure we preserve scores from Double Jeopardy
    let currentUsers = JSON.parse(JSON.stringify(users)); // Deep clone to avoid reference issues
    
    // Calculate score changes for this user based on their final jeopardy performance
    const userToUpdate = currentUsers.find(user => user.name === userName);
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
        const updatedUsers = currentUsers.map(user => {
          if (user.name === userName) {
            return {
              ...user,
              score: user.score + scoreChange
            };
          }
          return user;
        });
        
        console.log(`Updating score for ${userName}:`, {
          originalScore: userToUpdate.score,
          wager,
          scoreChange,
          isCorrect: newCorrectValue,
          newScore: userToUpdate.score + scoreChange
        });
        
        // Update parent components with new scores (this triggers state save)
        onScoreUpdate(updatedUsers);
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
  
  // Render the Final Jeopardy stage with only category and wager collection
  if (!showClue) {
    return (
      <div className="modal-overlay">
        <div className="modal-content final-jeopardy-modal">
          <h2>Final Jeopardy</h2>
          <h3 className="final-jeopardy-category">Category: {category}</h3>
          
          <div className="player-answers">
            {users.map(user => (
              <div key={user.name} className="player-answer-row">
                <div className="player-input-group">
                  <div className="player-name">
                    {user.name} - Current Score: ${user.score}
                    {hasWagerSubmissions[user.name] && <span className="submitted-indicator"> (Wager Submitted)</span>}
                  </div>
                  
                  <input
                    type="password"
                    value={playerWagers[user.name] || ""}
                    onChange={(e) => handleWagerChange(user.name, e.target.value)}
                    placeholder="Wager"
                    readOnly={hasWagerSubmissions[user.name]}
                    data-1p-ignore="true"
                  />
                  
                  {/* Add an empty placeholder input to maintain layout consistency */}
                  <input
                    type="password"
                    value=""
                    readOnly
                    style={{ visibility: 'hidden' }}
                  />
                  
                  {!hasWagerSubmissions[user.name] && (
                    <button
                      className="save-btn"
                      onClick={() => handleSaveWager(user.name)}
                      disabled={!playerWagers[user.name] || parseInt(playerWagers[user.name], 10) > Math.max(user.score, 1000)}
                    >
                      Submit Wager
                    </button>
                  )}
                  
                  {!hasWagerSubmissions[user.name] && parseInt(playerWagers[user.name], 10) > Math.max(user.score, 1000) && (
                    <div className="wager-error">Cannot wager more than ${Math.max(user.score, 1000)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Waiting message when some players haven't submitted wagers yet */}
          {users.some(user => !hasWagerSubmissions[user.name]) && (
            <div className="waiting-message">
              <p>Waiting for all players to submit their wagers</p>
            </div>
          )}
          
          {/* Only creator can force proceed */}
          {users.indexOf(users[0]) === 0 && (
            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowClue(true);
                  // Save state when moving to the clue screen
                  if (onScoreUpdate) {
                    setTimeout(() => onScoreUpdate(users), 0);
                  }
                }} 
                className="btn-primary"
                disabled={users.some(user => !hasWagerSubmissions[user.name])}
              >
                Show Clue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Render the Final Jeopardy clue and answer collection
  return (
    <div className="modal-overlay">
      <div className="modal-content final-jeopardy-modal">
        <h2>Final Jeopardy</h2>
        <h3 className="final-jeopardy-category">Category: {category}</h3>
        
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
          {users.map(user => (
            <div key={user.name} className="player-answer-row">              
              <div className="player-input-group">
                <div className="player-name">
                  {user.name} - Current Score: ${user.score}
                  {hasAnswerSubmissions[user.name] && !showAnswers && <span className="submitted-indicator"> (Answer Submitted)</span>}
                </div>

                {/* Show both wager and answer fields */}
                <input
                  type={showAnswers ? "text" : "password"}
                  value={playerAnswers[user.name] || ""}
                  onChange={(e) => handleAnswerChange(user.name, e.target.value)}
                  placeholder="Answer"
                  readOnly={showAnswers || hasAnswerSubmissions[user.name]}
                  data-1p-ignore="true"
                />
                
                <input
                  type={showAnswers ? "text" : "password"}
                  value={playerWagers[user.name] || ""}
                  readOnly={true}
                  data-1p-ignore="true"
                />
                
                {!showAnswers && !hasAnswerSubmissions[user.name] && (
                  <button
                    className="save-btn"
                    onClick={() => handleSaveAnswer(user.name)}
                    disabled={!playerAnswers[user.name]}
                  >
                    Submit Answer
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
          ))}
        </div>
        
        {/* Waiting message when some players haven't submitted answers yet */}
        {!showAnswers && users.some(user => !hasAnswerSubmissions[user.name]) && (
          <div className="waiting-message">
            <p>Waiting for all players to submit their answers...</p>
          </div>
        )}
        
        <div className="modal-actions">
          {/* Show reveal button for creator if not all answers are submitted */}
          {!showAnswers && users.indexOf(users[0]) === 0 && (
            <button 
              onClick={handleReveal} 
              className="btn-primary"
              disabled={users.some(user => !hasAnswerSubmissions[user.name])}
            >
              Reveal Answer
            </button>
          )}
          
          {/* Show final scores button once answers are revealed */}
          {showAnswers && (
            <button 
              onClick={() => {
                setShowFinalScores(true);
                // Save game state when moving to final scores screen
                if (onScoreUpdate) {
                  setTimeout(() => onScoreUpdate(users), 0);
                }
              }} 
              className="btn-secondary"
            >
              Show Final Scores
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinalJeopardyModal;