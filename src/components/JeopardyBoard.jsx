import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './JeopardyBoard.css';
import Category from './Category';
import Scoreboard from './Scoreboard';

// Default data in case the fetch fails
const DEFAULT_CATEGORIES = [
  {
    title: 'HISTORY',
    questions: [
      { value: 200, question: 'This U.S. President delivered the Gettysburg Address', answer: 'Abraham Lincoln' },
      { value: 400, question: 'This ancient empire was founded by Cyrus the Great', answer: 'Persian Empire' },
      { value: 600, question: 'This pharaoh ruled Egypt for 66 years', answer: 'Ramses II' },
      { value: 800, question: 'This emperor built a famous wall in northern England', answer: 'Hadrian' },
      { value: 1000, question: 'This battle in 1066 changed English history forever', answer: 'Battle of Hastings' }
    ]
  },
  {
    title: 'SCIENCE',
    questions: [
      { value: 200, question: 'This element has the atomic number 79', answer: 'Gold' },
      { value: 400, question: 'This planet has the Great Red Spot', answer: 'Jupiter' },
      { value: 600, question: 'This scientist discovered penicillin', answer: 'Alexander Fleming' },
      { value: 800, question: 'This is the hardest natural substance on Earth', answer: 'Diamond' },
      { value: 1000, question: 'This theory explains how species evolve through natural selection', answer: 'Darwin\'s Theory of Evolution' }
    ]
  },
  {
    title: 'FILM',
    questions: [
      { value: 200, question: 'This film features a young wizard attending Hogwarts', answer: 'Harry Potter' },
      { value: 400, question: 'This actor played Tony Stark in the MCU', answer: 'Robert Downey Jr.' },
      { value: 600, question: 'This 1972 film is about a mafia family', answer: 'The Godfather' },
      { value: 800, question: 'This director created Jurassic Park and E.T.', answer: 'Steven Spielberg' },
      { value: 1000, question: 'This film won 11 Oscars, including Best Picture in 1997', answer: 'Titanic' }
    ]
  },
  {
    title: 'GEOGRAPHY',
    questions: [
      { value: 200, question: 'This country is home to the Pyramids of Giza', answer: 'Egypt' },
      { value: 400, question: 'This is the largest ocean on Earth', answer: 'Pacific Ocean' },
      { value: 600, question: 'This mountain is the tallest in the world', answer: 'Mount Everest' },
      { value: 800, question: 'This river is the longest in the world', answer: 'Nile River' },
      { value: 1000, question: 'This South American country is home to the Amazon Rainforest', answer: 'Brazil' }
    ]
  },
  {
    title: 'MUSIC',
    questions: [
      { value: 200, question: 'This band performed "Hey Jude" and "Let It Be"', answer: 'The Beatles' },
      { value: 400, question: 'This artist\'s real name is Stefani Germanotta', answer: 'Lady Gaga' },
      { value: 600, question: 'This instrument has 88 keys', answer: 'Piano' },
      { value: 800, question: 'This composer wrote "The Four Seasons"', answer: 'Antonio Vivaldi' },
      { value: 1000, question: 'This opera by Mozart features the Queen of the Night aria', answer: 'The Magic Flute' }
    ]
  },
  {
    title: 'TECHNOLOGY',
    questions: [
      { value: 200, question: 'This company created the iPhone', answer: 'Apple' },
      { value: 400, question: 'This language is commonly used for web development', answer: 'JavaScript' },
      { value: 600, question: 'This Microsoft CEO is known for his philanthropy', answer: 'Bill Gates' },
      { value: 800, question: 'This technology uses radio waves to identify and track objects', answer: 'RFID' },
      { value: 1000, question: 'This cryptocurrency was created by a person using the pseudonym Satoshi Nakamoto', answer: 'Bitcoin' }
    ]
  }
];

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
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
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
      if (state.users) setUsers(state.users);
      if (state.tileStates) setTileStates(state.tileStates);
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
      // Fallback to default categories
      setCategories(DEFAULT_CATEGORIES);
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
      props.onStateChange();
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
    
    // Signal a state change to trigger save
    if (props.onStateChange) {
      props.onStateChange();
    }
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