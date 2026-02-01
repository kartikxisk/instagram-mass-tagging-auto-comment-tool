/**
 * Random User Agent Generator
 * Provides realistic user agents to avoid detection
 * Updated for 2025-2026 browser versions
 * Includes matching platform info for fingerprint consistency
 */

// User agents grouped by platform for consistency
const USER_AGENTS_BY_PLATFORM = {
  windows: [
    // Chrome on Windows 10/11 (2025-2026 versions)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  ],
  macos: [
    // Chrome on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // Safari on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    // Firefox on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:133.0) Gecko/20100101 Firefox/133.0',
  ],
  linux: [
    // Chrome on Linux
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // Firefox on Linux
    'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  ]
};

// Flattened list for backward compatibility
const USER_AGENTS = [
  ...USER_AGENTS_BY_PLATFORM.windows,
  ...USER_AGENTS_BY_PLATFORM.macos,
  ...USER_AGENTS_BY_PLATFORM.linux
];

/**
 * Get a random user agent string
 * @returns {string} Random user agent
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get a user agent that matches a specific platform
 * @param {string} platform - 'windows', 'macos', or 'linux'
 * @returns {string} User agent for the platform
 */
function getUserAgentForPlatform(platform) {
  const platformKey = platform.toLowerCase().includes('win') ? 'windows' :
                      platform.toLowerCase().includes('mac') ? 'macos' : 'linux';
  const platformAgents = USER_AGENTS_BY_PLATFORM[platformKey] || USER_AGENTS_BY_PLATFORM.windows;
  return platformAgents[Math.floor(Math.random() * platformAgents.length)];
}

/**
 * Get a consistent user agent for an account (seeded by username)
 * @param {string} username - Account username for consistency
 * @returns {string} Consistent user agent for this account
 */
function getConsistentUserAgent(username) {
  // Create a simple hash from username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % USER_AGENTS.length;
  return USER_AGENTS[index];
}

/**
 * Get all available user agents
 * @returns {string[]} Array of all user agents
 */
function getAllUserAgents() {
  return [...USER_AGENTS];
}

/**
 * Get user agents by platform
 * @returns {Object} User agents grouped by platform
 */
function getUserAgentsByPlatform() {
  return { ...USER_AGENTS_BY_PLATFORM };
}

module.exports = { 
  getRandomUserAgent, 
  getAllUserAgents,
  getUserAgentForPlatform,
  getConsistentUserAgent,
  getUserAgentsByPlatform
};
