const fs = require('fs');
const path = require('path');

// Constants
const GAMES_DIR = path.join(__dirname, 'public', 'games');
const INDEX_FILE = path.join(__dirname, 'public', 'game-index.json');

/**
 * Generates an index of all game JSON files in the games directory
 */
function generateGameIndex() {
  // Ensure games directory exists
  if (!fs.existsSync(GAMES_DIR)) {
    console.error(`Games directory does not exist: ${GAMES_DIR}`);
    return;
  }

  console.log(`Generating index from games in ${GAMES_DIR}`);
  
  // Read all game files
  const gameFiles = fs.readdirSync(GAMES_DIR)
    .filter(file => file.startsWith('game_') && file.endsWith('.json'));
  
  console.log(`Found ${gameFiles.length} game files`);
  
  // Process each game file to extract metadata
  const gameIndex = [];
  
  for (const file of gameFiles) {
    try {
      const filePath = path.join(GAMES_DIR, file);
      const gameData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Extract game ID from filename
      const gameIdMatch = file.match(/game_(\d+)\.json/);
      const gameId = gameIdMatch ? gameIdMatch[1] : null;
      
      if (!gameId) {
        console.warn(`Could not extract game ID from filename: ${file}`);
        continue;
      }
      
      gameIndex.push({
        id: gameId,
        title: gameData.title,
        date: gameData.gameDate || '',
        fileName: file,
        categories: [
          ...gameData.jeopardyRound.categories,
          ...gameData.doubleJeopardyRound.categories
        ]
      });
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  }
  
  // Sort games by ID (descending)
  gameIndex.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
  
  // Write index file
  fs.writeFileSync(INDEX_FILE, JSON.stringify(gameIndex, null, 2));
  console.log(`Game index written to ${INDEX_FILE} with ${gameIndex.length} entries`);
}

// Run the function
generateGameIndex();