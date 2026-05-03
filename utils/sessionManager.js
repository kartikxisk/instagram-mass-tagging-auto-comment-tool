const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Import the centralized login helper
const loginHelper = require("./loginHelper");

const { getCookiesPath } = require("./paths");
const COOKIES_DIR = getCookiesPath();

// Ensure cookies directory exists
if (!fs.existsSync(COOKIES_DIR)) {
  fs.mkdirSync(COOKIES_DIR, { recursive: true });
}

/**
 * Save cookies to file
 * @param {Object} page - Puppeteer page
 * @param {string} username - Account username
 */
async function saveCookies(page, username) {
  try {
    const cookies = await page.cookies();
    const cookiePath = path.join(COOKIES_DIR, `${username}.json`);
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
    console.log(`🍪 Cookies saved for ${username}`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to save cookies for ${username}: ${error.message}`,
    );
    return false;
  }
}

/**
 * Load cookies from file
 * @param {Object} page - Puppeteer page
 * @param {string} username - Account username
 * @returns {boolean} - Whether cookies were loaded successfully
 */
async function loadCookies(page, username) {
  try {
    const cookiePath = path.join(COOKIES_DIR, `${username}.json`);
    console.log(`🔍 [${username}] Looking for cookies at: ${cookiePath}`);

    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf8"));

      if (cookies.length > 0) {
        await page.setCookie(...cookies);
        console.log(`🍪 [${username}] Loaded ${cookies.length} cookies`);
        return true;
      } else {
        console.log(`⚠️ [${username}] Cookie file exists but is empty`);
      }
    } else {
      console.log(`⚠️ [${username}] No cookie file found`);
    }
    return false;
  } catch (error) {
    console.error(`❌ [${username}] Failed to load cookies: ${error.message}`);
    return false;
  }
}

/**
 * Check if cookies exist for an account
 * @param {string} username - Account username
 * @returns {boolean}
 */
function hasCookies(username) {
  const cookiePath = path.join(COOKIES_DIR, `${username}.json`);
  return fs.existsSync(cookiePath);
}

/**
 * Delete cookies for an account
 * @param {string} username - Account username
 */
function deleteCookies(username) {
  try {
    const cookiePath = path.join(COOKIES_DIR, `${username}.json`);
    if (fs.existsSync(cookiePath)) {
      fs.unlinkSync(cookiePath);
      console.log(`🗑️ Deleted cookies for ${username}`);
    }
  } catch (error) {
    console.error(
      `⚠️ Failed to delete cookies for ${username}: ${error.message}`,
    );
  }
}

/**
 * Login to Instagram with retry logic
 * Uses the centralized loginHelper to handle both OLD and NEW login forms
 * @param {Object} page - Puppeteer page
 * @param {Object} account - Account object with username and password
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Object} - { success, checkpoint, blocked, error }
 */
async function login(page, account, maxRetries = 3) {
  // Auto-login removed. Require manual login via manual-login flow.
  console.log(
    `🔐 Manual login required for ${account.username} - skipping automatic login.`,
  );
  return {
    success: false,
    checkpoint: false,
    blocked: false,
    error: "manual_login_required",
  };
}

/**
 * Load session (try cookies first, then login)
 * @param {Object} page - Puppeteer page
 * @param {Object} account - Account object
 * @returns {Object} - { success, checkpoint, blocked, error }
 */
async function loadSession(page, account) {
  // Try loading cookies first
  const cookiesLoaded = await loadCookies(page, account.username);

  if (cookiesLoaded) {
    // Verify session is still valid
    try {
      await page.goto("https://www.instagram.com/", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      const isLoggedIn = await page.evaluate(() => {
        return (
          document.querySelector('svg[aria-label="Home"]') !== null ||
          !window.location.href.includes("login")
        );
      });

      if (isLoggedIn) {
        console.log(`✅ Session restored for ${account.username}`);
        return {
          success: true,
          checkpoint: false,
          blocked: false,
          error: null,
        };
      }
    } catch (e) {
      console.log(`⚠️ Session verification failed for ${account.username}`);
    }

    // Session invalid, delete old cookies
    deleteCookies(account.username);
  }

  // Fresh login required - do not attempt automatic login. Ask user to perform manual login.
  console.log(
    `🔐 No valid session for ${account.username}. Manual login required.`,
  );
  return {
    success: false,
    checkpoint: false,
    blocked: false,
    error: "manual_login_required",
  };
}

/**
 * Create session (wrapper for loadSession)
 * @param {Object} page - Puppeteer page
 * @param {Object} account - Account object
 * @returns {Object} - Session result
 */
async function createSession(page, account) {
  return await loadSession(page, account);
}

/**
 * Get all available sessions
 * @returns {Array} - Array of usernames that have sessions
 */
function getAllSessions() {
  try {
    if (!fs.existsSync(COOKIES_DIR)) {
      return [];
    }

    return fs
      .readdirSync(COOKIES_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
  } catch (error) {
    console.error(`❌ Failed to get all sessions: ${error.message}`);
    return [];
  }
}

/**
 * Export all sessions to an object
 * @returns {Object} - Object with usernames as keys and cookies as values
 */
function exportAllSessions() {
  try {
    const sessions = {};
    const sessionList = getAllSessions();

    sessionList.forEach((username) => {
      try {
        const cookiePath = path.join(COOKIES_DIR, `${username}.json`);
        const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf8"));
        sessions[username] = cookies;
      } catch (e) {
        console.warn(`⚠️ Failed to read session for ${username}: ${e.message}`);
      }
    });

    return sessions;
  } catch (error) {
    console.error(`❌ Failed to export sessions: ${error.message}`);
    return {};
  }
}

/**
 * Import sessions from an object
 * @param {Object} sessions - Object with usernames as keys and cookies as values
 * @returns {Object} - { success, count, failed }
 */
function importSessionsFromObject(sessions) {
  let successCount = 0;
  let failedCount = 0;

  try {
    Object.entries(sessions).forEach(([username, cookies]) => {
      try {
        if (Array.isArray(cookies)) {
          const cookiePath = path.join(COOKIES_DIR, `${username}.json`);
          fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
          console.log(`✅ Imported session for ${username}`);
          successCount++;
        }
      } catch (e) {
        console.error(
          `❌ Failed to import session for ${username}: ${e.message}`,
        );
        failedCount++;
      }
    });
  } catch (error) {
    console.error(`❌ Failed to import sessions: ${error.message}`);
  }

  return {
    success: successCount > 0,
    count: successCount,
    failed: failedCount,
  };
}

module.exports = {
  login,
  loadSession,
  createSession,
  saveCookies,
  loadCookies,
  hasCookies,
  deleteCookies,
  getAllSessions,
  exportAllSessions,
  importSessionsFromObject,
};
