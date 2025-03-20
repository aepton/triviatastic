import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import JeopardyBoard from './components/JeopardyBoard';
import WelcomeModal from './components/WelcomeModal';
import JoinGameModal from './components/JoinGameModal';
import UserSetupModal from './components/UserSetupModal';
import { loadJeopardyArchive, convertToJeopardyBoardFormat } from './parseArchive';
import fetchJArchiveGame from './jarchiveLoader';
import { loadGameAndGenerateIdentifier } from './utils/gameUtils';
import { saveGameState, loadGameState } from './utils/storageUtils';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [round, setRound] = useState('jeopardy'); // 'jeopardy' or 'doubleJeopardy'
  const [archiveData, setArchiveData] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [gameIdentifier, setGameIdentifier] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showUserSetupModal, setShowUserSetupModal] = useState(false);
  const jeopardyBoardRef = useRef(null);

  // Effect to check for game identifier in URL parameters when the app loads
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const identifierParam = params.get('id');
    
    if (identifierParam) {
      setGameIdentifier(identifierParam);
      setShowWelcomeModal(false);
      setShowUserSetupModal(true); // Show user setup when joining via URL
      
      // Load the saved game state from Digital Ocean Spaces
      fetchGameState(identifierParam);
      
      setMessage(`Joined game with identifier: ${identifierParam}`);
    }
  }, []);

  // Set up periodic syncing for game state
  useEffect(() => {
    if (!gameIdentifier) return;
    
    // Save initial state when game identifier is set
    saveCurrentGameState();
    
    // Set up polling interval for fetching updates (every 5 seconds)
    const syncInterval = setInterval(() => {
      fetchGameState(gameIdentifier);
    }, 5000);
    
    // Clean up interval when component unmounts or identifier changes
    return () => clearInterval(syncInterval);
  }, [gameIdentifier]);
  
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
      
      setMessage(`Successfully loaded game #${id}: ${data.title}!`);
    } catch (error) {
      console.error('Error fetching game:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update URL with game identifier for sharing
  const updateUrlWithIdentifier = (identifier) => {
    if (!identifier) return;
    
    const url = new URL(window.location.href);
    url.searchParams.set('id', identifier);
    window.history.replaceState({}, '', url.toString());
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

  const toggleRound = () => {
    const newRound = round === 'jeopardy' ? 'doubleJeopardy' : 'jeopardy';
    setRound(newRound);
  };
  
  // Handle creating a new game
  const handleCreateGame = async (selectedGameId) => {
    try {
      setIsLoading(true);
      setMessage(`Loading game #${selectedGameId}...`);
      
      // Load the game and generate an identifier
      const { gameData, identifier } = await loadGameAndGenerateIdentifier(selectedGameId);
      
      // Store the game data and ID
      setArchiveData(gameData);
      setGameId(selectedGameId);
      setGameIdentifier(identifier);
      
      // Update URL with the game identifier
      updateUrlWithIdentifier(identifier);
      
      // Load the board with the current round
      loadBoardWithArchiveData(gameData, round);
      
      // Close the welcome modal and show user setup
      setShowWelcomeModal(false);
      setShowUserSetupModal(true);
      
      // Initial save of game state to Digital Ocean Spaces
      // This will be called again after the users are set up
      saveCurrentGameState();
      
      setMessage(`Created game with identifier: ${identifier}`);
    } catch (error) {
      console.error('Error creating game:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle joining a game with identifier
  const handleJoinWithIdentifier = (identifier) => {
    setGameIdentifier(identifier);
    updateUrlWithIdentifier(identifier);
    setShowJoinModal(false);
    setShowWelcomeModal(false);
    setShowUserSetupModal(true); // Show user setup after joining
    setMessage(`Joined game with identifier: ${identifier}`);
  };
  
  // Show the join game modal
  const handleShowJoinModal = () => {
    setShowWelcomeModal(false);
    setShowJoinModal(true);
  };

  // Save current game state to Digital Ocean Spaces
  const saveCurrentGameState = async () => {
    if (!gameIdentifier || !jeopardyBoardRef.current) return;
    
    try {
      const gameState = jeopardyBoardRef.current.getCurrentState();
      
      // Add game metadata
      const stateToSave = {
        ...gameState,
        gameId,
        round,
        metadata: {
          savedAt: new Date().toISOString(),
          gameIdentifier,
        }
      };
      
      // Save to Digital Ocean Spaces
      await saveGameState(gameIdentifier, stateToSave);
      console.log(`Game state saved for ${gameIdentifier}`);
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  };
  
  // Fetch game state from Digital Ocean Spaces
  const fetchGameState = async (identifier) => {
    if (!identifier || !jeopardyBoardRef.current) return;
    
    try {
      // Fetch the state from Digital Ocean Spaces
      const gameState = await loadGameState(identifier);
      
      if (gameState) {
        // Update local state with fetched data
        if (gameState.gameId && gameState.gameId !== gameId) {
          setGameId(gameState.gameId);
        }
        
        if (gameState.round && gameState.round !== round) {
          setRound(gameState.round);
        }
        
        // Load the state into the board
        jeopardyBoardRef.current.loadState(gameState);
        
        console.log(`Game state loaded for ${identifier}, last updated: ${gameState.lastUpdated}`);
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  };
  
  // Handle game state changes
  const handleGameStateChange = () => {
    // Save game state whenever a change occurs
    saveCurrentGameState();
  };

  // Handle user setup
  const handleSaveUsers = (users) => {
    // Pass users to JeopardyBoard
    if (jeopardyBoardRef.current && typeof jeopardyBoardRef.current.setUsers === 'function') {
      jeopardyBoardRef.current.setUsers(users);
      
      // Save state after users are added
      saveCurrentGameState();
    }
    setShowUserSetupModal(false);
  };

  return (
    <div className="app">
      <h1 className="title">¡Jeopardy!</h1>
      
      {/* Show the welcome modal on initial load */}
      {showWelcomeModal && (
        <WelcomeModal 
          onClose={() => setShowWelcomeModal(false)}
          onCreateGame={handleCreateGame}
          onJoinGame={handleShowJoinModal}
        />
      )}
      
      {/* Show the join game modal when requested */}
      {showJoinModal && (
        <JoinGameModal 
          onClose={() => {
            setShowJoinModal(false);
            setShowWelcomeModal(true);
          }}
          onJoinWithIdentifier={handleJoinWithIdentifier}
        />
      )}

      {/* Show user setup modal after creating/joining game */}
      {showUserSetupModal && (
        <UserSetupModal 
          onClose={() => setShowUserSetupModal(false)}
          onSaveUsers={handleSaveUsers}
        />
      )}
      
      <div className="archive-tools">
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
      
      <JeopardyBoard 
        ref={jeopardyBoardRef} 
        onRequestUserSetup={() => setShowUserSetupModal(true)}
        onStateChange={handleGameStateChange}
      />
    </div>
  );
}

export default App;
