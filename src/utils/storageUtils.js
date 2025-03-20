/**
 * Utility functions for persisting game state to Digital Ocean Spaces
 */

// Base URL for the Digital Ocean Spaces API
const SPACES_API_BASE_URL = 'https://triviatastic.sfo3.digitaloceanspaces.com';

/**
 * Saves the current game state to Digital Ocean Spaces
 * @param {string} gameIdentifier - The unique identifier for the game
 * @param {Object} gameState - The current state to save
 * @returns {Promise<boolean>} - Whether the save was successful
 */
export const saveGameState = async (gameIdentifier, gameState) => {
  if (!gameIdentifier) return false;
  
  try {
    const response = await fetch(`${SPACES_API_BASE_URL}/games/${gameIdentifier}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // In production, you would use more secure authentication
        // This is a placeholder for demonstration purposes
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: JSON.stringify({
        ...gameState,
        lastUpdated: new Date().toISOString()
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error saving game state:', error);
    return false;
  }
};

/**
 * Loads the current game state from Digital Ocean Spaces
 * @param {string} gameIdentifier - The unique identifier for the game
 * @returns {Promise<Object|null>} - The loaded game state or null if not found
 */
export const loadGameState = async (gameIdentifier) => {
  if (!gameIdentifier) return null;
  
  try {
    const response = await fetch(`${SPACES_API_BASE_URL}/games/${gameIdentifier}.json`, {
      headers: {
        // In production, you would use more secure authentication
        // This is a placeholder for demonstration purposes
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load game state: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error loading game state:', error);
    return null;
  }
};