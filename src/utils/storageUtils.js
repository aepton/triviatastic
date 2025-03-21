/**
 * Utility functions for persisting game state
 */

import { config } from './config';

// Base URL for the Digital Ocean Spaces API
const SPACES_API_BASE_URL = config.storage.spacesApiBaseUrl;
// URLs for the Digital Ocean Functions
const SAVER_FUNCTION_URL = 'https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-47dddde9-70be-4ccc-a992-b68c3887ccb9/default/saver';
const READER_FUNCTION_URL = 'https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-47dddde9-70be-4ccc-a992-b68c3887ccb9/default/reader';

/**
 * Saves the current game state using Digital Ocean Function
 * @param {string} gameIdentifier - The unique identifier for the game
 * @param {Object} gameState - The current state to save
 * @returns {Promise<boolean>} - Whether the save was successful
 */
export const saveGameState = async (gameIdentifier, gameState) => {
  if (!gameIdentifier) return false;
  
  // Check if we have an empty grid - don't save if so
  if (gameState.categories && gameState.categories.length === 0) {
    console.log('Not saving empty grid');
    return false;
  }
  
  try {
    const response = await fetch(SAVER_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameIdentifier,
        gameState: {
          ...gameState,
          lastUpdated: new Date().toISOString()
        }
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error saving game state:', error);
    return false;
  }
};

/**
 * Loads the current game state using Digital Ocean Function
 * @param {string} gameIdentifier - The unique identifier for the game
 * @returns {Promise<Object|null>} - The loaded game state or null if not found
 */
export const loadGameState = async (gameIdentifier) => {
  if (!gameIdentifier) return null;
  
  try {
    const response = await fetch(`${READER_FUNCTION_URL}?gameIdentifier=${encodeURIComponent(gameIdentifier)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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