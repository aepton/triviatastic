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

const JeopardyBoard = forwardRef((props, ref) => {
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
        if (!tileStates[tileId]) {
          newTileStates[tileId] = {
            isFlipped: false,
            isAnswerShown: false,
            isBlank: false
          };
        } else {
          // Preserve existing state if it exists
          newTileStates[tileId] = tileStates[tileId];
        }
      });
    });
    
    setTileStates(newTileStates);
  }, [categories]);

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
    loadState: (state) => {
      if (!state) return;
      
      if (state.categories) setCategories(state.categories);
      
      // Always update users when they're available in the state
      if (state.users && state.users.length > 0) {
        setUsers(state.users);
      }
      
      // Properly merge tile states, preserving local interaction state but taking remote data
      if (state.tileStates) {
        setTileStates(prevTileStates => {
          const newTileStates = {...prevTileStates};
          
          // Update all tiles from remote state
          Object.keys(state.tileStates).forEach(tileId => {
            newTileStates[tileId] = {
              ...newTileStates[tileId],
              ...state.tileStates[tileId]
            };
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

  const handleScoreUpdate = (updatedUsers) => {
    setUsers(updatedUsers);
    
    // Signal a state change to trigger save
    if (props.onStateChange) {
      props.onStateChange(updatedUsers);
    }
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
    
    setTileStates(prevStates => ({
      ...prevStates,
      [tileId]: newState
    }));
    
    // No longer trigger save on tile state changes
    // Only the handleScoreUpdate function will trigger saves
  };

  return (
    <div className="jeopardy-container">
      {isLoading && <div className="loading">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      
      <div className="jeopardy-board">
        {categories.map((category, categoryIndex) => (
          <Category 
            key={categoryIndex}
            category={category}
            categoryIndex={categoryIndex}
            users={users}
            onScoreUpdate={handleScoreUpdate}
            tileStates={tileStates}
            onTileStateChange={handleTileStateChange}
          />
        ))}
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