/**
 * Utility functions for game operations
 */

/**
 * Extracts words from categories, questions and answers
 * @param {Object} gameData - The parsed game data
 * @returns {Array} - An array of words 5 characters or longer
 */
export const extractWordsFromGame = (gameData) => {
  if (!gameData) return [];

  // Collect all text from categories and questions but not answers
  const allText = [];
  
  // Add categories
  if (gameData.jeopardyRound?.categories) {
    allText.push(...gameData.jeopardyRound.categories);
  }
  
  if (gameData.doubleJeopardyRound?.categories) {
    allText.push(...gameData.doubleJeopardyRound.categories);
  }
  
  // Add clues
  if (gameData.jeopardyRound?.clues) {
    gameData.jeopardyRound.clues.forEach(clue => {
      if (clue.question) allText.push(clue.question);
    });
  }
  
  if (gameData.doubleJeopardyRound?.clues) {
    gameData.doubleJeopardyRound.clues.forEach(clue => {
      if (clue.question) allText.push(clue.question);
    });
  }
  
  // Add Final Jeopardy
  if (gameData.finalJeopardy) {
    if (gameData.finalJeopardy.category) allText.push(gameData.finalJeopardy.category);
    if (gameData.finalJeopardy.clue) allText.push(gameData.finalJeopardy.clue);
  }
  
  // Extract words from all text
  const allWords = allText
    .join(' ')
    .toLowerCase()
    // Remove punctuation and special characters
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    // Filter for words with 5 or more characters
    .filter(word => word.length >= 5);
  
  return allWords;
};

/**
 * Generates a random game identifier by selecting 4 random words
 * @param {Array} words - Array of words to select from
 * @returns {String} - Four random words joined by hyphens
 */
export const generateGameIdentifier = (words) => {
  if (!words.length) return '';
  
  const selectedWords = [];
  const wordSet = new Set(words);
  const wordsArray = Array.from(wordSet);
  
  // Select 4 unique random words
  while (selectedWords.length < 4 && wordsArray.length > 0) {
    const randomIndex = Math.floor(Math.random() * wordsArray.length);
    selectedWords.push(wordsArray[randomIndex]);
    // Remove the word so it's not selected again
    wordsArray.splice(randomIndex, 1);
  }
  
  return selectedWords.join('-');
};

/**
 * Loads a game by ID and generates an identifier
 * @param {String} gameId - The game ID to load
 * @returns {Object} - The game data and identifier
 */
export const loadGameAndGenerateIdentifier = async (gameId) => {
  try {
    // Load the game data
    const response = await fetch(`/games/game_${gameId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load game ${gameId}`);
    }
    
    const gameData = await response.json();
    
    // Extract words and generate identifier
    const words = extractWordsFromGame(gameData);
    const identifier = generateGameIdentifier(words);
    
    return {
      gameData,
      identifier
    };
  } catch (error) {
    console.error('Error loading game:', error);
    throw error;
  }
};