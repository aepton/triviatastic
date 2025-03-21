import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import JeopardyBoard from './components/JeopardyBoard';
import WelcomeModal from './components/WelcomeModal';
import JoinGameModal from './components/JoinGameModal';
import UserSetupModal from './components/UserSetupModal';
import FinalJeopardyModal from './components/FinalJeopardyModal';
import { loadJeopardyArchive, convertToJeopardyBoardFormat } from './parseArchive';
import fetchJArchiveGame from './jarchiveLoader';
import { loadGameAndGenerateIdentifier } from './utils/gameUtils';
import { saveGameState, loadGameState } from './utils/storageUtils';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [round, setRound] = useState('jeopardy'); // 'jeopardy', 'doubleJeopardy', or 'finalJeopardy'
  const [showFinalJeopardyModal, setShowFinalJeopardyModal] = useState(false);
  const [archiveData, setArchiveData] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [gameIdentifier, setGameIdentifier] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showUserSetupModal, setShowUserSetupModal] = useState(false);
  const [users, setUsers] = useState([]);
  const jeopardyBoardRef = useRef(null);

  // Effect to check for game identifier or game ID in URL parameters when the app loads
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const identifierParam = params.get('id');
    const gameIdParam = params.get('gameid');
    
    if (identifierParam) {
      // Handle joining a game with an identifier
      setGameIdentifier(identifierParam);
      setShowWelcomeModal(false);
      setShowUserSetupModal(false); // Show user setup when joining via URL
      
      // Load the saved game state from Digital Ocean Spaces
      fetchGameState(identifierParam);
      
      setMessage(`Joined game with identifier: ${identifierParam}`);
    } else if (gameIdParam) {
      // Handle loading a specific game by ID
      setShowWelcomeModal(false);
      setIsLoading(true);
      setMessage(`Loading game #${gameIdParam}...`);
      
      // Directly load the game and generate identifier
      loadGameAndGenerateIdentifier(gameIdParam)
        .then(({ gameData, identifier }) => {
          // Store the game data and ID
          setArchiveData(gameData);
          setGameId(gameIdParam);
          setGameIdentifier(identifier);
          
          // Update URL with the game identifier
          updateUrlWithIdentifier(identifier);
          
          // Load the board with the current round
          loadBoardWithArchiveData(gameData, round);
          
          // Show user setup
          setShowUserSetupModal(true);
          
          // Initial save of game state
          saveCurrentGameState();
          
          setMessage(`Loaded game #${gameIdParam}`);
        })
        .catch(error => {
          console.error('Error loading game:', error);
          setMessage(`Error: ${error.message}`);
          setShowWelcomeModal(true); // Show welcome modal if loading fails
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* Dependency array intentionally empty to only run on mount */]);

  // Set up periodic syncing for game state
  useEffect(() => {
    if (!gameIdentifier) return;
    
    // Save initial state when game identifier is set
    saveCurrentGameState();
    
    // Set up polling interval for fetching updates (every 5 seconds)
    /*
    const syncInterval = setInterval(() => {
      fetchGameState(gameIdentifier);
    }, 5000);
    */
    
    // Clean up interval when component unmounts or identifier changes
    return () => clearInterval(syncInterval);
  }, [gameIdentifier]);
  
  // Effect to reload the board when round changes
  useEffect(() => {
    if (archiveData) {
      if (round === 'finalJeopardy') {
        setShowFinalJeopardyModal(true);
      } else {
        loadBoardWithArchiveData(archiveData, round);
      }
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
    let newRound;
    if (round === 'jeopardy') {
      newRound = 'doubleJeopardy';
    } else if (round === 'doubleJeopardy') {
      newRound = 'finalJeopardy';
    } else {
      newRound = 'jeopardy';
    }
    setRound(newRound);
  };
  
  const handleFinalJeopardyClose = () => {
    setShowFinalJeopardyModal(false);
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

  // Save current game state to Digital Ocean Spaces and localStorage
  const saveCurrentGameState = async (customUsers = null) => {
    if (!gameIdentifier || !jeopardyBoardRef.current) return;
    
    try {
      // Get current state from the board
      const gameState = jeopardyBoardRef.current.getCurrentState();
      
      // Use custom users if provided, otherwise fallback to the priority order
      const usersToSave = customUsers || 
                          (gameState.users && gameState.users.length > 0 ? gameState.users : users);
      
      // Add game metadata
      const stateToSave = {
        ...gameState,
        users: usersToSave, // Make sure users are explicitly included
        gameId,
        round,
        metadata: {
          savedAt: new Date().toISOString(),
          gameIdentifier,
        }
      };
      
      console.log('Saving game state', stateToSave);
      
      // Save to Digital Ocean Spaces (this also saves to localStorage internally)
      await saveGameState(gameIdentifier, stateToSave);
      
      console.log(`Game state saved for ${gameIdentifier}`);
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  };
  
  // Fetch game state from Digital Ocean Spaces (with localStorage fallback)
  const fetchGameState = async (identifier) => {
    if (!identifier || !jeopardyBoardRef.current) return;
    
    try {
      // Fetch the state from Digital Ocean Spaces (with localStorage fallback)
      const gameState = await loadGameState(identifier);
      
      if (gameState) {
        // Update local state with fetched data
        if (gameState.gameId && gameState.gameId !== gameId) {
          setGameId(gameState.gameId);
        }
        
        if (gameState.round && gameState.round !== round) {
          setRound(gameState.round);
        }
        
        // Update App-level users state if users exist in loaded state
        if (gameState.users && gameState.users.length > 0) {
          setUsers(gameState.users);
        }
        
        // Load the state into the board
        jeopardyBoardRef.current.loadState(gameState);
        
        console.log(`Game state loaded for ${identifier}, last updated: ${gameState.lastUpdated}`);
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  };
  
  // Handle game state changes (only called when points are awarded after guesses)
  const handleGameStateChange = (updatedUsers) => {
    // Update App-level users state with the latest scores
    if (updatedUsers && updatedUsers.length > 0) {
      setUsers(updatedUsers);
    }
    
    // Save game state only when scores are updated
    saveCurrentGameState();
  };

  // Handle user setup
  const handleSaveUsers = (newUsers) => {
    // Update the App-level state with users
    setUsers(newUsers);
    
    // Pass users to JeopardyBoard
    if (jeopardyBoardRef.current && typeof jeopardyBoardRef.current.setUsers === 'function') {
      jeopardyBoardRef.current.setUsers(newUsers);
      
      // Pass the newUsers directly to saveCurrentGameState to ensure users are saved correctly
      saveCurrentGameState(newUsers);
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
      
      {/* Final Jeopardy Modal */}
      {showFinalJeopardyModal && archiveData && (
        <FinalJeopardyModal
          category={archiveData.finalJeopardy.category}
          clue={archiveData.finalJeopardy.clue}
          answer={archiveData.finalJeopardy.answer}
          users={users.map(user => ({ ...user, gameId }))}
          onClose={handleFinalJeopardyClose}
          onScoreUpdate={handleGameStateChange}
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
              {round === 'jeopardy' 
                ? 'Switch to Double Jeopardy' 
                : round === 'doubleJeopardy' 
                  ? 'Switch to Final Jeopardy' 
                  : 'Switch to Jeopardy'}
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
