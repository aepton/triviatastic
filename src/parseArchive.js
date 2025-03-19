/**
 * Parses a Jeopardy archive HTML file and extracts questions, answers, categories, and dollar amounts
 * @param {string} htmlContent - The content of the archive.html file
 * @returns {Object} Parsed game data in JSON format
 */
function parseArchiveHtml(htmlContent) {
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

/**
 * Loads and parses the archive.html file
 * @returns {Promise<Object>} Parsed game data
 */
export async function loadJeopardyArchive() {
  try {
    const response = await fetch('/archive.html');
    const htmlContent = await response.text();
    return parseArchiveHtml(htmlContent);
  } catch (error) {
    console.error('Error loading or parsing archive.html:', error);
    return null;
  }
}

/**
 * Converts the parsed archive data into the format expected by the JeopardyBoard component
 * @param {Object} archiveData - The data parsed from archive.html
 * @param {string} round - Which round to use ('jeopardy' or 'doubleJeopardy')
 * @returns {Array} An array of category objects in the format expected by JeopardyBoard
 */
export function convertToJeopardyBoardFormat(archiveData, round = 'jeopardy') {
  if (!archiveData) return [];
  
  // Choose the appropriate round data
  const roundData = round === 'doubleJeopardy' ? 
    archiveData.doubleJeopardyRound : 
    archiveData.jeopardyRound;
  
  const { categories, clues } = roundData;
  
  // Create a map to organize clues by category
  const categoryMap = new Map();
  
  // Initialize each category in the map
  categories.forEach((categoryName, index) => {
    categoryMap.set(index, {
      title: categoryName,
      questions: []
    });
  });
  
  // Add clues to their respective categories
  clues.forEach(clue => {
    const categoryIndex = clue.column;
    if (categoryMap.has(categoryIndex)) {
      const category = categoryMap.get(categoryIndex);
      category.questions.push({
        value: clue.value,
        question: clue.question,
        answer: clue.answer,
        isDailyDouble: clue.isDailyDouble
      });
    }
  });
  
  // Sort questions by value within each category
  categoryMap.forEach(category => {
    category.questions.sort((a, b) => a.value - b.value);
  });
  
  // Convert map to array
  return Array.from(categoryMap.values());
}

export default loadJeopardyArchive;