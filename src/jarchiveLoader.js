/**
 * Utilities for loading and parsing Jeopardy games from J-Archive
 */

/**
 * Fetches and parses a Jeopardy game from J-Archive by game ID
 * @param {string} gameId - The J-Archive game ID to fetch
 * @returns {Promise<Object>} - A promise that resolves to the parsed game data
 */
export async function fetchJArchiveGame(gameId) {
  try {
    // Construct the J-Archive game URL
    const url = `https://j-archive.com/showgame.php?game_id=${gameId}`;
    
    // Fetch the HTML content via our proxy
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch game #${gameId}. Status: ${response.status}`);
    }
    
    const htmlContent = await response.text();
    
    // Parse the HTML content
    return parseJArchiveHtml(htmlContent);
  } catch (error) {
    console.error('Error fetching game from J-Archive:', error);
    throw error;
  }
}

/**
 * Parses the HTML content from J-Archive into our game data format
 * @param {string} htmlContent - The HTML content from J-Archive
 * @returns {Object} - The parsed game data
 */
export function parseJArchiveHtml(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const gameData = {
    title: doc.querySelector('#game_title h1')?.textContent.trim() || '',
    jeopardyRound: {
      categories: [],
      clues: []
    },
    doubleJeopardyRound: {
      categories: [],
      clues: []
    },
    finalJeopardy: {
      category: '',
      clue: '',
      answer: ''
    }
  };

  // Extract Jeopardy Round categories
  const jCategoryElements = doc.querySelectorAll('#jeopardy_round .category_name');
  jCategoryElements.forEach(element => {
    gameData.jeopardyRound.categories.push(element.textContent.trim());
  });

  // Extract Double Jeopardy Round categories
  const djCategoryElements = doc.querySelectorAll('#double_jeopardy_round .category_name');
  djCategoryElements.forEach(element => {
    gameData.doubleJeopardyRound.categories.push(element.textContent.trim());
  });

  // Extract Final Jeopardy category
  const fjCategory = doc.querySelector('#final_jeopardy_round .category_name');
  if (fjCategory) {
    gameData.finalJeopardy.category = fjCategory.textContent.trim();
  }

  // Extract Jeopardy Round clues
  const jClueElements = doc.querySelectorAll('#jeopardy_round .clue');
  jClueElements.forEach(clueElement => {
    const clueId = clueElement.querySelector('[id^="clue_J_"]')?.id;
    if (!clueId) return;
    
    // Extract column and row from clue id (format: clue_J_column_row)
    const idParts = clueId.split('_');
    if (idParts.length < 4) return;
    
    const columnIndex = parseInt(idParts[2], 10) - 1;
    const rowIndex = parseInt(idParts[3], 10) - 1;
    
    const question = clueElement.querySelector('[id^="clue_J_"][class="clue_text"]')?.textContent.trim() || '';
    const answerElement = clueElement.querySelector('[id$="_r"][class="clue_text"]');
    const answer = answerElement ? answerElement.querySelector('.correct_response')?.textContent.trim() || '' : '';
    
    const valueElement = clueElement.querySelector('.clue_value');
    const value = valueElement ? 
      parseInt(valueElement.textContent.replace(/[^0-9]/g, ''), 10) : 
      (rowIndex + 1) * 200;
    
    // Check if it's a daily double
    const isDailyDouble = clueElement.querySelector('.clue_value_daily_double') !== null;
    
    gameData.jeopardyRound.clues.push({
      category: gameData.jeopardyRound.categories[columnIndex] || '',
      value,
      question,
      answer,
      isDailyDouble,
      row: rowIndex,
      column: columnIndex
    });
  });

  // Extract Double Jeopardy Round clues
  const djClueElements = doc.querySelectorAll('#double_jeopardy_round .clue');
  djClueElements.forEach(clueElement => {
    const clueId = clueElement.querySelector('[id^="clue_DJ_"]')?.id;
    if (!clueId) return;
    
    // Extract column and row from clue id (format: clue_DJ_column_row)
    const idParts = clueId.split('_');
    if (idParts.length < 4) return;
    
    const columnIndex = parseInt(idParts[2], 10) - 1;
    const rowIndex = parseInt(idParts[3], 10) - 1;
    
    const question = clueElement.querySelector('[id^="clue_DJ_"][class="clue_text"]')?.textContent.trim() || '';
    const answerElement = clueElement.querySelector('[id$="_r"][class="clue_text"]');
    const answer = answerElement ? answerElement.querySelector('.correct_response')?.textContent.trim() || '' : '';
    
    const valueElement = clueElement.querySelector('.clue_value');
    const value = valueElement ? 
      parseInt(valueElement.textContent.replace(/[^0-9]/g, ''), 10) : 
      (rowIndex + 1) * 400;
    
    // Check if it's a daily double
    const isDailyDouble = clueElement.querySelector('.clue_value_daily_double') !== null;
    
    gameData.doubleJeopardyRound.clues.push({
      category: gameData.doubleJeopardyRound.categories[columnIndex] || '',
      value,
      question,
      answer,
      isDailyDouble,
      row: rowIndex,
      column: columnIndex
    });
  });

  // Extract Final Jeopardy clue and answer
  const fjClueElement = doc.querySelector('#final_jeopardy_round .clue_text');
  const fjAnswerElement = doc.querySelector('#final_jeopardy_round [id$="_r"].clue_text');
  
  if (fjClueElement) {
    gameData.finalJeopardy.clue = fjClueElement.textContent.trim();
  }
  
  if (fjAnswerElement) {
    gameData.finalJeopardy.answer = fjAnswerElement.querySelector('.correct_response')?.textContent.trim() || '';
  }

  return gameData;
}

export default fetchJArchiveGame;