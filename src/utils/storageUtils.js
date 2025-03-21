/**
 * Utility functions for persisting game state
 */

import { config } from './config';

// Base URL for the Digital Ocean Spaces API
const SPACES_API_BASE_URL = config.storage.spacesApiBaseUrl;
// URLs for the Digital Ocean Functions
const SAVER_FUNCTION_URL = 'https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-47dddde9-70be-4ccc-a992-b68c3887ccb9/default/saver';
const READER_FUNCTION_URL = 'https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-47dddde9-70be-4ccc-a992-b68c3887ccb9/default/reader';

// LocalStorage keys
const LOCAL_STORAGE_PREFIX = 'jeopardy_game_';

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
  
  // Always save to localStorage as a backup
  saveToLocalStorage(gameIdentifier, gameState);
  
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
    console.error('Error saving game state to DigitalOcean:', error);
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
    
    const gameState = await response.json();
    
    // Save to localStorage as a backup
    saveToLocalStorage(gameIdentifier, gameState);
    
    return gameState;
  } catch (error) {
    console.error('Error loading game state from DigitalOcean:', error);
    
    // Try to load from localStorage as fallback
    const localState = loadFromLocalStorage(gameIdentifier);
    console.log('Falling back to localStorage:', localState ? 'data found' : 'no data');
    return localState;
  }
};

/**
 * Saves game state to localStorage
 * @param {string} gameIdentifier - The unique identifier for the game
 * @param {Object} gameState - The game state to save
 */
const saveToLocalStorage = (gameIdentifier, gameState) => {
  try {
    const key = `${LOCAL_STORAGE_PREFIX}${gameIdentifier}`;
    const stateWithTimestamp = {
      ...gameState,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(stateWithTimestamp));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

/**
 * Loads game state from localStorage
 * @param {string} gameIdentifier - The unique identifier for the game
 * @returns {Object|null} - The loaded game state or null if not found
 */
const loadFromLocalStorage = (gameIdentifier) => {
  try {
    const key = `${LOCAL_STORAGE_PREFIX}${gameIdentifier}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};