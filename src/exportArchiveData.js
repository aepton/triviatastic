import { loadJeopardyArchive } from './parseArchive.js';

/**
 * Exports the parsed Jeopardy archive data to the console or a file
 */
async function exportJeopardyData() {
  try {
    console.log('Loading and parsing Jeopardy archive data...');
    const gameData = await loadJeopardyArchive();
    
    if (!gameData) {
      console.error('Failed to parse archive data');
      return;
    }
    
    console.log('Jeopardy data parsed successfully!');
    console.log('Game title:', gameData.title);
    console.log('Jeopardy Round Categories:', gameData.jeopardyRound.categories);
    console.log('Double Jeopardy Round Categories:', gameData.doubleJeopardyRound.categories);
    console.log('Final Jeopardy Category:', gameData.finalJeopardy.category);
    
    console.log('Total clues:', 
      gameData.jeopardyRound.clues.length + 
      gameData.doubleJeopardyRound.clues.length
    );
    
    // Output the data as formatted JSON
    const jsonOutput = JSON.stringify(gameData, null, 2);
    console.log('JSON Output:');
    console.log(jsonOutput);
    
    // To download the JSON data in a browser environment
    downloadJsonFile(gameData, 'jeopardy-game-data.json');
  } catch (error) {
    console.error('Error exporting Jeopardy data:', error);
  }
}

/**
 * Helper function to download JSON data as a file in the browser
 * @param {Object} data - The data to download
 * @param {string} filename - The name of the file to download
 */
function downloadJsonFile(data, filename) {
  // Create a Blob with the data
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  
  // Create a download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  
  // Append to the body, click it, and remove it
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

export default exportJeopardyData;