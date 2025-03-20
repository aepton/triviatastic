import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import JeopardyBoard from './components/JeopardyBoard';
import WelcomeModal from './components/WelcomeModal';
import JoinGameModal from './components/JoinGameModal';
import UserSetupModal from './components/UserSetupModal';
import { loadJeopardyArchive, convertToJeopardyBoardFormat } from './parseArchive';
import fetchJArchiveGame from './jarchiveLoader';
import { loadGameAndGenerateIdentifier } from './utils/gameUtils';

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
      // Here we would typically look up the game associated with this identifier
      // For now, we'll just display the identifier
      setMessage(`Joined game with identifier: ${identifierParam}`);
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

  // Handle user setup
  const handleSaveUsers = (users) => {
    // Pass users to JeopardyBoard
    if (jeopardyBoardRef.current && typeof jeopardyBoardRef.current.setUsers === 'function') {
      jeopardyBoardRef.current.setUsers(users);
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
      />
    </div>
  );
}

export default App;
