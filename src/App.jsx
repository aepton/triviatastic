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
  const [isGameCreator, setIsGameCreator] = useState(false);

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
      
      // As a joiner, not the creator
      setIsGameCreator(false);
      
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
          
          // Mark as game creator when loading directly by ID
          setIsGameCreator(true);
          
          // Update URL with the game identifier
          updateUrlWithIdentifier(identifier);
          
          // Load the board with the current round
          loadBoardWithArchiveData(gameData, round);
          
          // Show user setup
          setShowUserSetupModal(true);
          
          // Initial save of game state - explicitly use the current round to avoid async state issues
          saveCurrentGameState(null, round);
          
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
    
    // For game creators, we save state but don't fetch updates
    if (isGameCreator) {
      // Save initial state when game identifier is set
      saveCurrentGameState();
      console.log('Game creator mode: will push updates but not pull them');
      return; // No polling needed for game creator
    } else {
      // For joiners (non-creators), set up polling to get updates
      console.log('Game joiner mode: will pull updates but not push them');
      
      // Initial load of remote state
      fetchGameState(gameIdentifier);
      
      // Set up polling interval for fetching updates (every 1 second for more responsive updates)
      // The shorter interval helps ensure all game state changes are quickly reflected for viewers
      const syncInterval = setInterval(() => {
        // Always fetch game state, even in final jeopardy, to ensure complete sync
        fetchGameState(gameIdentifier);
      }, 1000);
      
      // Clean up interval when component unmounts or identifier changes
      return () => clearInterval(syncInterval);
    }
  }, [gameIdentifier, isGameCreator, round]);
  
  // Effect to reload the board when round changes
  useEffect(() => {
    if (archiveData) {
      if (round === 'finalJeopardy') {
        // Always show final jeopardy modal when the round changes to final jeopardy
        // This ensures both creator and joiners see it at the same time
        console.log('Setting Final Jeopardy modal to show based on round change');
        setShowFinalJeopardyModal(true);
        
        // Save state when switching to Final Jeopardy so joiners will see it too
        if (isGameCreator) {
          // Pass the explicit round value to avoid React's asynchronicity issues
          // Force the modal to be shown in the state
          saveCurrentGameState(null, 'finalJeopardy', true);
          
          console.log('Game creator saved Final Jeopardy state with modal shown');
        } else {
          console.log('Game joiner showing Final Jeopardy modal based on round change');
        }
      } else {
        loadBoardWithArchiveData(archiveData, round);
        // Don't need to reset tile states here as it's already handled in toggleRound
      }
    }
  }, [round, archiveData, isGameCreator]);
  
  // Additional effect to ensure Final Jeopardy modal state is consistent for all users
  useEffect(() => {
    // This effect synchronizes the Final Jeopardy modal state when the round is finalJeopardy
    if (round === 'finalJeopardy' && !showFinalJeopardyModal) {
      console.log('Round is Final Jeopardy but modal is not shown - showing modal');
      setShowFinalJeopardyModal(true);
      
      // For game creators, save this state change
      if (isGameCreator) {
        saveCurrentGameState(null, 'finalJeopardy', true);
      }
    }
  }, [round, showFinalJeopardyModal, isGameCreator]);

  
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


  const toggleRound = () => {
    let newRound;
    if (round === 'jeopardy') {
      newRound = 'doubleJeopardy';
      // Reset tile states when switching to double jeopardy
      if (jeopardyBoardRef.current) {
        jeopardyBoardRef.current.resetTileStates();
      }
    } else if (round === 'doubleJeopardy') {
      newRound = 'finalJeopardy';
    } else {
      newRound = 'jeopardy';
      // Also reset tile states when switching back to jeopardy round
      if (jeopardyBoardRef.current) {
        jeopardyBoardRef.current.resetTileStates();
      }
    }
    setRound(newRound);
    
    // Update board with the new round's data before allowing interactions
    if (archiveData) {
      loadBoardWithArchiveData(archiveData, newRound);
    }
    
    // Save state when toggling rounds so joiners will also see the round change
    if (isGameCreator) {
      // Pass the new round value explicitly to avoid React's async state issues
      saveCurrentGameState(null, newRound);
    }
  };
  
  const handleFinalJeopardyClose = (resetToSingleJeopardy = false) => {
    setShowFinalJeopardyModal(false);
    
    // Reset to single jeopardy if requested
    if (resetToSingleJeopardy && isGameCreator) {
      // Reset to single jeopardy round
      setRound('jeopardy');
      
      // Reset tile states
      if (jeopardyBoardRef.current) {
        jeopardyBoardRef.current.resetTileStates();
      }
      
      // Save the state with the new round
      saveCurrentGameState(null, 'jeopardy', false);
    } else if (isGameCreator) {
      // Explicitly pass current round and state of modal
      saveCurrentGameState(null, 'finalJeopardy', false);
    }
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
      
      // Mark this client as the game creator
      setIsGameCreator(true);
      
      // Update URL with the game identifier
      updateUrlWithIdentifier(identifier);
      
      // Load the board with the current round
      loadBoardWithArchiveData(gameData, round);
      
      // Close the welcome modal and show user setup
      setShowWelcomeModal(false);
      setShowUserSetupModal(true);
      
      // Initial save of game state to Digital Ocean Spaces
      // This will be called again after the users are set up
      // Explicitly pass the round to avoid React's asynchronicity issues
      saveCurrentGameState(null, round);
      
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
    // Set as not the game creator
    setIsGameCreator(false);
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
  const saveCurrentGameState = async (customUsers = null, customRound = null, customShowFinalJeopardyModal = null) => {
    if (!gameIdentifier || !jeopardyBoardRef.current) return;
    
    // Only game creators can save to Digital Ocean
    if (!isGameCreator) {
      console.log('Not the game creator, skipping save to Digital Ocean');
      return;
    }
    
    try {
      // Get current state from the board
      const gameState = jeopardyBoardRef.current.getCurrentState();
      
      // Use custom users if provided, otherwise fallback to the priority order
      const usersToSave = customUsers || 
                          (gameState.users && gameState.users.length > 0 ? gameState.users : users);
      
      // Use custom values if provided to avoid React's asynchronicity issues
      const roundToSave = customRound || round;
      
      // Allow explicit override of modal state (null means use the current state)
      const modalState = customShowFinalJeopardyModal !== null ? 
                         customShowFinalJeopardyModal : 
                         showFinalJeopardyModal;
      
      // Get the correct categories and tile states for the round being saved
      let categoriesToSave = gameState.categories;
      let tileStatesToSave = gameState.tileStates;
      
      // If we're saving a different round than currently displayed,
      // we need to get the correct categories for that round
      if (roundToSave !== round && archiveData) {
        // Convert the parsed data to the format expected by JeopardyBoard for the round being saved
        if (roundToSave !== 'finalJeopardy') {
          const roundCategories = convertToJeopardyBoardFormat(archiveData, roundToSave);
          categoriesToSave = roundCategories;
          
          // Reset tile states for the new round categories
          const newTileStates = {};
          roundCategories.forEach((category, categoryIndex) => {
            category.questions.forEach((question, questionIndex) => {
              const tileId = `${categoryIndex}-${questionIndex}`;
              newTileStates[tileId] = {
                isFlipped: false,
                isAnswerShown: false,
                isBlank: false,
                correctGuessers: [],
                incorrectGuessers: []
              };
            });
          });
          tileStatesToSave = newTileStates;
        }
      }
      
      // Add game metadata
      const stateToSave = {
        ...gameState,
        categories: categoriesToSave, // Use the correct categories for the round
        tileStates: tileStatesToSave, // Use the correct tile states for the round
        users: usersToSave, // Make sure users are explicitly included
        gameId,
        archiveData, // Include the full archive data for joiners
        round: roundToSave, // Use the possibly overridden round value
        showFinalJeopardyModal: modalState, // Use possibly overridden modal state
        metadata: {
          savedAt: new Date().toISOString(),
          gameIdentifier,
          isGameCreator // Include this flag in metadata
        }
      };
      
      console.log('Saving game state as creator', stateToSave);
      
      // Save to Digital Ocean Spaces (this also saves to localStorage internally)
      await saveGameState(gameIdentifier, stateToSave);
      
      console.log(`Game state saved for ${gameIdentifier}`, stateToSave);
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
        
        // Update Archive data if it's not set yet but exists in the game state
        if (!archiveData && gameState.archiveData) {
          setArchiveData(gameState.archiveData);
        }
        
        // Force immediate round update to ensure joiner sees the new round right away
        if (gameState.round && gameState.round !== round) {
          console.log(`Updating round from ${round} to ${gameState.round}`);
          
          // If round is changing, we'll need to load the appropriate categories
          // and reset tile states for the new round
          const newRound = gameState.round;
          setRound(newRound);
          
          // Set the round, but don't manually load categories or reset tile states
          // The loadState call below will handle all that correctly from the game state
        }
        
        // Very important: Show or hide final jeopardy modal based on the game state
        // This needs to be immediate for joiners to see it
        // Force a sync explicitly to ensure this works reliably
        if (gameState.showFinalJeopardyModal !== undefined && !isGameCreator) {
          console.log(`Updating Final Jeopardy modal visibility to: ${gameState.showFinalJeopardyModal}`);
          // Always update this state to ensure it matches the creator's state
          setShowFinalJeopardyModal(gameState.showFinalJeopardyModal);
        }
        
        // Update App-level users state if users exist in loaded state
        if (gameState.users && gameState.users.length > 0) {
          setUsers(gameState.users);
        }
        
        // Always load the full state with categories and tile states
        // This ensures joiners stay in sync with the creator for all game changes
        jeopardyBoardRef.current.loadState(gameState);
        
        console.log(`Game state loaded for ${identifier}, last updated: ${gameState.lastUpdated}`, gameState);
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  };
  
  // Handle game state changes (called when tile states change or after Final Jeopardy)
  const handleGameStateChange = (updatedUsers) => {
    // If we received updated users from Final Jeopardy, use those
    // Otherwise, recalculate scores from tile states
    let newUsers;
    
    if (updatedUsers && updatedUsers.length > 0) {
      // Use the scores provided by Final Jeopardy
      newUsers = updatedUsers;
    } else if (jeopardyBoardRef.current && typeof jeopardyBoardRef.current.calculateScores === 'function') {
      // Calculate scores from tile states for regular questions
      newUsers = jeopardyBoardRef.current.calculateScores();
    } else {
      return; // No way to update scores
    }
    
    // Update App-level users state with the latest scores
    setUsers(newUsers);
    
    // Update JeopardyBoard users state to ensure scoreboard is updated
    if (jeopardyBoardRef.current && typeof jeopardyBoardRef.current.setUsers === 'function') {
      jeopardyBoardRef.current.setUsers(newUsers);
    }
    
    // Only save game state if this client is the game creator
    if (isGameCreator) {
      console.log('Game creator saving state after score update');
      // Explicitly pass the round to avoid React's asynchronicity issues
      
      // For Final Jeopardy, only update the users without refreshing the full state
      if (round === 'finalJeopardy') {
        // Just update users without a full state reload to preserve input values
        saveCurrentGameState(newUsers, round, showFinalJeopardyModal);
      } else {
        saveCurrentGameState(newUsers, round);
      }
    } else {
      console.log('Game joiner not saving state after score update');
    }
  };

  // Handle user setup
  const handleSaveUsers = (newUsers) => {
    // Update the App-level state with users
    setUsers(newUsers);
    
    // Pass users to JeopardyBoard
    if (jeopardyBoardRef.current && typeof jeopardyBoardRef.current.setUsers === 'function') {
      jeopardyBoardRef.current.setUsers(newUsers);
      
      // Only save state if this client is the game creator
      if (isGameCreator) {
        console.log('Game creator saving user setup');
        // Pass the newUsers directly to saveCurrentGameState to ensure users are saved correctly
        // Explicitly pass the round to avoid React's asynchronicity issues
        saveCurrentGameState(newUsers, round);
      } else {
        console.log('Game joiner not saving user setup to remote');
      }
    }
    setShowUserSetupModal(false);
  };

  return (
    <div className="app">
      <h1 className="title">¡Jeopardy!</h1>
      
      {/* Display game title when available */}
      {archiveData && archiveData.title && (
        <div className="game-title">{archiveData.title}</div>
      )}
      
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
        isGameCreator={isGameCreator}
      />
    </div>
  );
}

export default App;
