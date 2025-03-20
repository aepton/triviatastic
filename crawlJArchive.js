const fs = require('fs');
const path = require('path');
const https = require('https');
const { JSDOM } = require('jsdom');

// Constants
const JARCHIVE_BASE_URL = 'https://j-archive.com';
const JARCHIVE_GAME_URL = 'https://j-archive.com/showgame.php?game_id=';
const JARCHIVE_SEASON_URL = 'https://j-archive.com/showseason.php?season=';
const OUTPUT_DIR = path.join(__dirname, 'public', 'games');
const DELAY_MS = 1000; // Delay between requests to be respectful of the site

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetches HTML content from a URL
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} - The HTML content
 */
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', reject);
  });
}

/**
 * Delay execution for a specified time
 * @param {number} ms - The delay in milliseconds
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parses the J-Archive HTML content to extract game data
 * @param {string} htmlContent - The HTML content from J-Archive
 * @returns {Object} - The parsed game data
 */
function parseJArchiveHtml(htmlContent) {
  const dom = new JSDOM(htmlContent);
  const doc = dom.window.document;
  
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

  // Extract game date and ID from title
  const titleMatch = gameData.title.match(/#(\d+).*-\s+(.*)/);
  if (titleMatch) {
    gameData.gameId = titleMatch[1];
    gameData.gameDate = titleMatch[2];
  }

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
 * Saves the game data to a JSON file
 * @param {Object} gameData - The game data to save
 * @param {string} gameId - The J-Archive game ID
 */
function saveGameData(gameData, gameId) {
  const filePath = path.join(OUTPUT_DIR, `game_${gameId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2));
  console.log(`Game #${gameId} saved to ${filePath}`);
}

/**
 * Fetches and saves a single game
 * @param {string} gameId - The J-Archive game ID
 * @returns {Promise<boolean>} - Whether the game was successfully saved
 */
async function fetchAndSaveGame(gameId) {
  const url = `${JARCHIVE_GAME_URL}${gameId}`;
  console.log(`Fetching game #${gameId} from ${url}`);
  
  try {
    const htmlContent = await fetchHtml(url);
    const gameData = parseJArchiveHtml(htmlContent);
    saveGameData(gameData, gameId);
    return true;
  } catch (error) {
    console.error(`Error processing game #${gameId}:`, error.message);
    return false;
  }
}

/**
 * Extracts game IDs from a season page
 * @param {string} seasonId - The J-Archive season ID
 * @returns {Promise<string[]>} - Array of game IDs
 */
async function getGameIdsFromSeason(seasonId) {
  const url = `${JARCHIVE_SEASON_URL}${seasonId}`;
  console.log(`Fetching season #${seasonId} from ${url}`);
  
  try {
    const htmlContent = await fetchHtml(url);
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;
    
    const gameLinks = doc.querySelectorAll('a[href^="showgame.php?game_id="]');
    const gameIds = Array.from(gameLinks).map(link => {
      const match = link.href.match(/game_id=(\d+)/);
      return match ? match[1] : null;
    }).filter(id => id !== null);
    
    console.log(`Found ${gameIds.length} games in season #${seasonId}`);
    return gameIds;
  } catch (error) {
    console.error(`Error fetching season #${seasonId}:`, error.message);
    return [];
  }
}

/**
 * Crawls a range of game IDs
 * @param {number} startId - The starting game ID
 * @param {number} endId - The ending game ID
 */
async function crawlGameRange(startId, endId) {
  console.log(`Starting crawl from game #${startId} to #${endId}`);
  
  for (let gameId = startId; gameId <= endId; gameId++) {
    const success = await fetchAndSaveGame(gameId.toString());
    
    if (success) {
      // Respect the site by adding a delay between requests
      await delay(DELAY_MS);
    }
  }
  
  console.log('Game range crawl completed.');
}

/**
 * Crawls specified seasons
 * @param {number[]} seasonIds - Array of season IDs to crawl
 */
async function crawlSeasons(seasonIds) {
  console.log(`Starting crawl of ${seasonIds.length} seasons`);
  
  for (const seasonId of seasonIds) {
    console.log(`Processing season #${seasonId}`);
    const gameIds = await getGameIdsFromSeason(seasonId.toString());
    
    for (const gameId of gameIds) {
      const success = await fetchAndSaveGame(gameId);
      
      if (success) {
        // Respect the site by adding a delay between requests
        await delay(DELAY_MS);
      }
    }
    
    // Additional delay between seasons
    await delay(DELAY_MS * 2);
  }
  
  console.log('Season crawl completed.');
}

/**
 * Main function to run the crawler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node crawlJArchive.js game <gameId>           - Fetch a single game');
    console.log('  node crawlJArchive.js range <startId> <endId> - Fetch a range of games');
    console.log('  node crawlJArchive.js season <seasonId>       - Fetch all games from a season');
    console.log('  node crawlJArchive.js seasons <startSeason> <endSeason> - Fetch multiple seasons');
    return;
  }

  const command = args[0];

  try {
    if (command === 'game' && args.length === 2) {
      await fetchAndSaveGame(args[1]);
    } else if (command === 'range' && args.length === 3) {
      const startId = parseInt(args[1], 10);
      const endId = parseInt(args[2], 10);
      
      if (isNaN(startId) || isNaN(endId) || startId > endId) {
        console.error('Invalid game ID range');
        return;
      }
      
      await crawlGameRange(startId, endId);
    } else if (command === 'season' && args.length === 2) {
      await crawlSeasons([parseInt(args[1], 10)]);
    } else if (command === 'seasons' && args.length === 3) {
      const startSeason = parseInt(args[1], 10);
      const endSeason = parseInt(args[2], 10);
      
      if (isNaN(startSeason) || isNaN(endSeason) || startSeason > endSeason) {
        console.error('Invalid season range');
        return;
      }
      
      const seasonIds = Array.from(
        { length: endSeason - startSeason + 1 },
        (_, i) => startSeason + i
      );
      
      await crawlSeasons(seasonIds);
    } else {
      console.error('Invalid command or arguments');
    }
  } catch (error) {
    console.error('Error running crawler:', error);
  }
}

// Run the main function
main();