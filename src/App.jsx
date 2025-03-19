import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import JeopardyBoard from './components/JeopardyBoard';
import { loadJeopardyArchive, convertToJeopardyBoardFormat } from './parseArchive';
import fetchJArchiveGame from './jarchiveLoader';
import exportJeopardyData from './exportArchiveData';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [round, setRound] = useState('jeopardy'); // 'jeopardy' or 'doubleJeopardy'
  const [archiveData, setArchiveData] = useState(null);
  const [gameId, setGameId] = useState(null);
  const jeopardyBoardRef = useRef(null);

  // Effect to check for game ID in URL parameters when the app loads
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameIdParam = params.get('game_id');
    
    if (gameIdParam) {
      setGameId(gameIdParam);
      fetchGameById(gameIdParam);
    }
  }, []);
  
  // Effect to reload the board when round changes
  useEffect(() => {
    if (archiveData) {
      loadBoardWithArchiveData(archiveData, round);
    }
  }, [round, archiveData]);

  // Function to fetch a game by ID from J-Archive
  const fetchGameById = async (id) => {
    try {
      setIsLoading(true);
      setMessage(`Fetching game #${id} from J-Archive...`);
      
      // Use our jarchiveLoader utility to fetch and parse the game
      const data = await fetchJArchiveGame(id);
      
      if (!data) {
        throw new Error('Failed to parse game data');
      }
      
      // Store the parsed data
      setArchiveData(data);
      
      // Store the game ID
      setGameId(id);
      
      // Load the board with the current round
      loadBoardWithArchiveData(data, round);
      
      // Update URL with the game ID for sharing
      updateUrlWithGameId(id);
      
      setMessage(`Successfully loaded game #${id}: ${data.title}!`);
    } catch (error) {
      console.error('Error fetching game:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update URL with game ID for sharing
  const updateUrlWithGameId = (id) => {
    if (!id) return;
    
    const url = new URL(window.location.href);
    url.searchParams.set('game_id', id);
    window.history.replaceState({}, '', url.toString());
  };

  const handleParseArchive = async () => {
    try {
      setIsLoading(true);
      setMessage('Parsing archive.html file...');
      
      // Export to JSON file
      await exportJeopardyData();
      setMessage('Successfully parsed and exported Jeopardy data to file!');
    } catch (error) {
      console.error('Error parsing archive:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBoardWithArchiveData = (data, currentRound) => {
    if (!data) return;

    // Convert the parsed data to the format expected by JeopardyBoard
    const categoriesData = convertToJeopardyBoardFormat(data, currentRound);
    
    // Update the JeopardyBoard component with the new data
    if (jeopardyBoardRef.current && typeof jeopardyBoardRef.current.setCategories === 'function') {
      jeopardyBoardRef.current.setCategories(categoriesData);
      setMessage(`Loaded ${categoriesData.length} categories from ${currentRound === 'jeopardy' ? 'Jeopardy' : 'Double Jeopardy'} round!`);
    } else {
      setMessage('Successfully parsed data, but couldn\'t update the board.');
    }
  };

  const handleLoadArchiveData = async () => {
    try {
      setIsLoading(true);
      setMessage('Loading data from archive.html...');
      
      // Parse the archive.html file
      const data = await loadJeopardyArchive();
      
      if (!data) {
        throw new Error('Failed to parse archive.html');
      }
      
      // Store the archive data for later use
      setArchiveData(data);
      
      // Load the board with the current round
      loadBoardWithArchiveData(data, round);
      
    } catch (error) {
      console.error('Error loading archive data:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFetchGameById = () => {
    const id = prompt('Enter the J-Archive game ID:');
    if (id) {
      fetchGameById(id);
    }
  };

  const toggleRound = () => {
    const newRound = round === 'jeopardy' ? 'doubleJeopardy' : 'jeopardy';
    setRound(newRound);
  };

  return (
    <div className="app">
      <h1 className="title">¡Jeopardy!</h1>
      
      <div className="archive-tools">
      {false &&
        <div className="button-group">          
        <button 
          onClick={handleFetchGameById} 
          disabled={isLoading}
          className="load-button"
        >
          {isLoading ? 'Fetching...' : 'Fetch Game by ID'}
        </button>
      </div>      
      }

        {archiveData && (
          <div className="round-selector">
            <button 
              onClick={toggleRound}
              className={`load-button ${round === 'jeopardy' ? 'active' : ''}`}
              disabled={isLoading}
            >
              {round === 'jeopardy' ? 'Switch to Double Jeopardy' : 'Switch to Jeopardy'}
            </button>
          </div>
        )}
      </div>
      
      <JeopardyBoard ref={jeopardyBoardRef} />
    </div>
  );
}

export default App;
