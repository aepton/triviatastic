import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './JeopardyBoard.css';
import Category from './Category';
import Scoreboard from './Scoreboard';

// Empty array for initial state
const EMPTY_CATEGORIES = [];

/**
 * Fetches Jeopardy categories, questions, and answers from a URL
 * @param {string} url - The URL to fetch data from
 * @returns {Promise<Array>} - A promise that resolves to an array of categories
 */
const fetchJeopardyData = async (url) => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Jeopardy data:', error);
    return null;
  }
};

const JeopardyBoard = forwardRef(({ isGameCreator = false, ...props }, ref) => {
  const [categories, setCategories] = useState(EMPTY_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [tileStates, setTileStates] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Initialize tile states when categories change
  useEffect(() => {
    const newTileStates = {};
    
    categories.forEach((category, categoryIndex) => {
      category.questions.forEach((question, questionIndex) => {
        const tileId = `${categoryIndex}-${questionIndex}`;
        
        // Get the question value and ensure it's a number
        const questionValue = question.value || 0;
        const numericValue = typeof questionValue === 'string' ? parseInt(questionValue, 10) : questionValue;
        
        if (!tileStates[tileId]) {
          newTileStates[tileId] = {
            isFlipped: false,
            isAnswerShown: false,
            isBlank: false,
            correctGuessers: [],
            incorrectGuessers: [],
            originalValue: numericValue // Store the original value
          };
        } else {
          // Preserve existing state if it exists, including originalValue
          newTileStates[tileId] = {
            ...tileStates[tileId],
            originalValue: tileStates[tileId].originalValue || numericValue // Keep existing originalValue or set if missing
          };
        }
      });
    });
    
    setTileStates(newTileStates);
  }, [categories]);

  // Calculate scores based on correctGuessers and incorrectGuessers in tile states
  const calculateScoresFromTileStates = () => {
    // Start with all users having 0 score
    const userScores = {};
    users.forEach(user => {
      userScores[user.name] = 0;
    });

    // Calculate scores from all tile states
    Object.keys(tileStates).forEach(tileId => {
      const state = tileStates[tileId];
      const [catIndex, qIndex] = tileId.split('-').map(Number);
      
      // Skip if the category or question index is invalid
      if (isNaN(catIndex) || isNaN(qIndex) || !categories[catIndex]) return;
      
      // Get the question value
      const questionValue = categories[catIndex]?.questions[qIndex]?.value || 0;
      
      // Ensure question value is a number, not a string
      const numericValue = typeof questionValue === 'string' ? parseInt(questionValue, 10) : questionValue;
      
      // Store the value in the tile state to preserve it across round changes
      if (!state.originalValue) {
        state.originalValue = numericValue;
      }
      
      // Use the stored original value for scoring
      const valueToUse = state.originalValue || numericValue;
      
      // Add points for correct guessers
      state.correctGuessers?.forEach(userId => {
        if (userScores.hasOwnProperty(userId)) {
          userScores[userId] += valueToUse;
        }
      });
      
      // Subtract points for incorrect guessers
      state.incorrectGuessers?.forEach(userId => {
        if (userScores.hasOwnProperty(userId)) {
          userScores[userId] -= valueToUse;
        }
      });
    });
    
    // Convert back to users array
    return users.map(user => ({
      ...user,
      score: userScores[user.name] || 0
    }));
  };

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    setCategories: (newCategories) => {
      setCategories(newCategories);
    },
    setUsers: (newUsers) => {
      setUsers(newUsers);
    },
    getCurrentState: () => {
      return {
        categories,
        users,
        tileStates,
        lastUpdated: new Date().toISOString()
      };
    },
    calculateScores: () => {
      return calculateScoresFromTileStates();
    },
    resetTileStates: (preservedUsers = null) => {
      // Create fresh tile states for all current categories
      const newTileStates = {};
      
      categories.forEach((category, categoryIndex) => {
        category.questions.forEach((question, questionIndex) => {
          const tileId = `${categoryIndex}-${questionIndex}`;
          // Get the question value and ensure it's a number
          const questionValue = question.value || 0;
          const numericValue = typeof questionValue === 'string' ? parseInt(questionValue, 10) : questionValue;
          
          // Create new tile state with the original value stored
          newTileStates[tileId] = {
            isFlipped: false,
            isAnswerShown: false,
            isBlank: false,
            correctGuessers: [],
            incorrectGuessers: [],
            originalValue: numericValue // Store the original value when reset
          };
        });
      });
      
      setTileStates(newTileStates);
      
      // If we have users with preserved scores, update them
      if (preservedUsers && preservedUsers.length > 0) {
        setUsers(preservedUsers);
      }
    },
    loadState: (state) => {
      if (!state) return;
      
      // Always update categories first
      if (state.categories) setCategories(state.categories);
      
      // Always update users when they're available in the state
      // This ensures scores are maintained when changing rounds
      if (state.users && state.users.length > 0) {
        setUsers(state.users);
      }
      
      // Properly merge tile states, always taking remote data to ensure viewers stay in sync
      if (state.tileStates) {
        setTileStates(prevTileStates => {
          const newTileStates = {...prevTileStates};
          
          // Update all tiles from remote state, always syncing all properties
          Object.keys(state.tileStates).forEach(tileId => {
            // If this is a new tile that didn't exist before, create it
            if (!newTileStates[tileId]) {
              newTileStates[tileId] = state.tileStates[tileId];
            } else {
              // For existing tiles, sync all properties to ensure viewers stay in sync
              newTileStates[tileId].isFlipped = state.tileStates[tileId].isFlipped;
              newTileStates[tileId].isAnswerShown = state.tileStates[tileId].isAnswerShown;
              newTileStates[tileId].isBlank = state.tileStates[tileId].isBlank;
              newTileStates[tileId].showModal = state.tileStates[tileId].showModal;
              
              // Preserve originalValue when syncing tile states
              if (state.tileStates[tileId].originalValue) {
                newTileStates[tileId].originalValue = state.tileStates[tileId].originalValue;
              } else if (newTileStates[tileId].originalValue) {
                // Keep existing originalValue if it's not in the remote state
              } else {
                // If neither has originalValue, try to set it from the current question value
                const [catIndex, qIndex] = tileId.split('-').map(Number);
                if (!isNaN(catIndex) && !isNaN(qIndex) && categories[catIndex]?.questions[qIndex]) {
                  const questionValue = categories[catIndex].questions[qIndex].value || 0;
                  newTileStates[tileId].originalValue = typeof questionValue === 'string' ? 
                    parseInt(questionValue, 10) : questionValue;
                }
              }
              
              // Also sync the question object if it was modified to include modal state
              if (state.tileStates[tileId].question) {
                newTileStates[tileId].question = state.tileStates[tileId].question;
              }
              
              // Also sync the guessers information
              if (state.tileStates[tileId].correctGuessers) {
                newTileStates[tileId].correctGuessers = state.tileStates[tileId].correctGuessers;
              }
              if (state.tileStates[tileId].incorrectGuessers) {
                newTileStates[tileId].incorrectGuessers = state.tileStates[tileId].incorrectGuessers;
              }
            }
          });
          
          return newTileStates;
        });
      }
      
      if (state.lastUpdated) setLastUpdated(state.lastUpdated);
    }
  }));

  const loadJeopardyData = async (url) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchJeopardyData(url);
      
      if (data) {
        setCategories(data);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
      // Fallback to empty categories
      setCategories(EMPTY_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUsers = (newUsers) => {
    setUsers(newUsers);
  };

  const handleScoreUpdate = () => {
    // Calculate the scores from tile states
    const calculatedScores = calculateScoresFromTileStates();
    console.log('Calculated scores:', calculatedScores);
    
    // Update the local state with a new array reference to trigger re-renders
    setUsers([...calculatedScores]);
    
    // Signal a state change to trigger save
    if (props.onStateChange) {
      console.log('Triggering onStateChange with calculated scores:', calculatedScores);
      props.onStateChange(calculatedScores);
    }
    
    // Force a lastUpdated change to ensure components re-render
    setLastUpdated(new Date().toISOString());
    console.log('Last updated:', new Date().toISOString());
  };

  const handleResetUsers = () => {
    // Signal to parent component to show the user setup modal
    if (props.onRequestUserSetup) {
      props.onRequestUserSetup();
    }
  };
  
  // Handle a tile state change
  const handleTileStateChange = (categoryIndex, questionIndex, newState) => {
    const tileId = `${categoryIndex}-${questionIndex}`;
    
    setTileStates(prevStates => {
      const updatedStates = {
        ...prevStates,
        [tileId]: newState
      };
      
      // Calculate scores based on updated tile states
      const calculatedScores = calculateScoresFromUpdatedTileStates(updatedStates);
      console.log('New calculated scores:', calculatedScores);
      
      // Update users with new scores
      setUsers([...calculatedScores]);
      
      // Trigger state change to save immediately after any tile state change
      if (isGameCreator && props.onStateChange) {
        console.log('Triggering immediate save after tile state change');
        setTimeout(() => props.onStateChange(calculatedScores), 0);
      }
      
      return updatedStates;
    });
  };
  
  // Calculate scores based on passed-in tile states (not using component state)
  const calculateScoresFromUpdatedTileStates = (updatedTileStates) => {
    // Start with all users having 0 score
    const userScores = {};
    users.forEach(user => {
      userScores[user.name] = 0;
    });

    // Calculate scores from all tile states
    Object.keys(updatedTileStates).forEach(tileId => {
      const state = updatedTileStates[tileId];
      const [catIndex, qIndex] = tileId.split('-').map(Number);
      
      // Skip if the category or question index is invalid
      if (isNaN(catIndex) || isNaN(qIndex) || !categories[catIndex]) return;
      
      // Get the question value
      const questionValue = categories[catIndex]?.questions[qIndex]?.value || 0;
      
      // Ensure question value is a number, not a string
      const numericValue = typeof questionValue === 'string' ? parseInt(questionValue, 10) : questionValue;
      
      // Store the value in the tile state to preserve it across round changes
      if (!state.originalValue) {
        state.originalValue = numericValue;
      }
      
      // Use the stored original value for scoring
      const valueToUse = state.originalValue || numericValue;
      
      // Add points for correct guessers
      state.correctGuessers?.forEach(userId => {
        if (userScores.hasOwnProperty(userId)) {
          userScores[userId] += valueToUse;
        }
      });
      
      // Subtract points for incorrect guessers
      state.incorrectGuessers?.forEach(userId => {
        if (userScores.hasOwnProperty(userId)) {
          userScores[userId] -= valueToUse;
        }
      });
    });
    
    // Convert back to users array
    return users.map(user => ({
      ...user,
      score: userScores[user.name] || 0
    }));
  };

  return (
    <div className="jeopardy-container">
      {isLoading && <div className="loading">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      
      <div className="jeopardy-board">
        <div className="categories-container">
          {categories.map((category, categoryIndex) => (
            <Category 
              key={categoryIndex}
              category={category}
              categoryIndex={categoryIndex}
              users={users}
              onScoreUpdate={handleScoreUpdate}
              tileStates={tileStates}
              onTileStateChange={handleTileStateChange}
              isGameCreator={isGameCreator}
            />
          ))}
        </div>
      </div>
      
      {/* Reset Users Button */}
      {users.length > 0 && (
        <button 
          className="reset-users-btn" 
          onClick={handleResetUsers}
        >
          Reset Players
        </button>
      )}
      
      {/* Scoreboard */}
      {users.length > 0 && <Scoreboard users={users} />}
    </div>
  );
});

export default JeopardyBoard;