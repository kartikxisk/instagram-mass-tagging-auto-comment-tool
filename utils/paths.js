/**
 * Path utilities for Electron app
 * Handles paths correctly for both development and production builds
 */

const path = require('path');
const fs = require('fs');

// Cache for paths
let cachedPaths = null;

/**
 * Get the user data directory
 * In production: ~/Library/Application Support/Instagram Mass Tagger (macOS)
 *                C:\Users\<user>\AppData\Roaming\Instagram Mass Tagger (Windows)
 *                ~/.config/Instagram Mass Tagger (Linux)
 * In development: Project root directory
 */
function getUserDataPath() {
  // Try to get Electron's app module
  let app;
  try {
    app = require('electron').app;
    // If we're in renderer process, app will be undefined
    if (!app) {
      app = require('@electron/remote').app;
    }
  } catch (e) {
    // Not in Electron context (e.g., running with Node directly)
    return path.join(__dirname, '..');
  }

  // Check if app is packaged (production build)
  if (app && app.isPackaged) {
    return app.getPath('userData');
  }

  // Development mode - use project root
  return path.join(__dirname, '..');
}

/**
 * Initialize all paths and create directories if needed
 */
function initializePaths() {
  if (cachedPaths) return cachedPaths;

  const userDataPath = getUserDataPath();

  cachedPaths = {
    userData: userDataPath,
    config: path.join(userDataPath, 'config'),
    cookies: path.join(userDataPath, 'cookies'),
    logs: path.join(userDataPath, 'logs'),
    data: path.join(userDataPath, 'data')
  };

  // Create directories if they don't exist
  Object.values(cachedPaths).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return cachedPaths;
}

/**
 * Get the config directory path
 */
function getConfigPath() {
  const paths = initializePaths();
  return paths.config;
}

/**
 * Get the cookies directory path
 */
function getCookiesPath() {
  const paths = initializePaths();
  return paths.cookies;
}

/**
 * Get the logs directory path
 */
function getLogsPath() {
  const paths = initializePaths();
  return paths.logs;
}

/**
 * Get the data directory path
 */
function getDataPath() {
  const paths = initializePaths();
  return paths.data;
}

/**
 * Get the user data root path
 */
function getUserDataRoot() {
  const paths = initializePaths();
  return paths.userData;
}

/**
 * Reset cached paths (useful for testing)
 */
function resetPaths() {
  cachedPaths = null;
}

module.exports = {
  getConfigPath,
  getCookiesPath,
  getLogsPath,
  getDataPath,
  getUserDataRoot,
  initializePaths,
  resetPaths
};
