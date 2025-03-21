/**
 * Configuration settings for the application
 * Loads values from environment variables when available
 */

// Digital Ocean Spaces configuration
export const config = {
  // Storage configuration
  storage: {
    spacesApiBaseUrl: import.meta.env.VITE_DO_SPACES_ENDPOINT || 'https://triviatastic.sfo3.digitaloceanspaces.com',
    spacesRegion: import.meta.env.VITE_DO_SPACES_REGION || 'sfo3',
    spacesBucket: import.meta.env.VITE_DO_SPACES_BUCKET || 'triviatastic',
    spacesAccessKey: import.meta.env.VITE_DO_SPACES_ACCESS_KEY || '',
    spacesSecretKey: import.meta.env.VITE_DO_SPACES_SECRET_KEY || ''
  }
};
