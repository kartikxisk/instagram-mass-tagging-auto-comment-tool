const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Get the cookies directory path
 * Uses Electron's userData path when packaged, otherwise project root
 */
function getCookiesDir() {
  try {
    const { app } = require('electron');
    if (app && app.isPackaged) {
      return path.join(app.getPath('userData'), 'cookies');
    }
  } catch (e) {
    // Not in Electron context
  }
  return path.join(__dirname, '..', 'cookies');
}

const COOKIES_DIR = getCookiesDir();

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
    console.error(`❌ Failed to save cookies for ${username}: ${error.message}`);
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
    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
      
      // Check if cookies are expired
      const now = Date.now() / 1000;
      const validCookies = cookies.filter(cookie => {
        if (cookie.expires && cookie.expires < now) {
          return false;
        }
        return true;
      });
      
      if (validCookies.length > 0) {
        await page.setCookie(...validCookies);
        console.log(`🍪 Loaded ${validCookies.length} cookies for ${username}`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`⚠️ Failed to load cookies for ${username}: ${error.message}`);
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
    console.error(`⚠️ Failed to delete cookies for ${username}: ${error.message}`);
  }
}

/**
 * Login to Instagram with retry logic
 * @param {Object} page - Puppeteer page
 * @param {Object} account - Account object with username and password
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Object} - { success, checkpoint, blocked, error }
 */
async function login(page, account, maxRetries = 3) {
  const loginUrl = process.env.INSTAGRAM_LOGIN_URL || 'https://www.instagram.com/accounts/login/';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔐 Login attempt ${attempt}/${maxRetries} for ${account.username}`);
      
      await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Handle cookie consent popup if present
      try {
        const acceptCookiesBtn = await page.$('button[class*="aOOlW"]');
        if (acceptCookiesBtn) {
          await acceptCookiesBtn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // Cookie popup might not appear, continue
      }

      // Wait for login form
      await page.waitForSelector('input[name="username"]', { visible: true, timeout: 20000 });
      
      // Clear any existing input and type username with random delays
      const usernameInput = await page.$('input[name="username"]');
      await usernameInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      
      // Type with random delays to mimic human behavior
      for (const char of account.username) {
        await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
      }
      
      // Type password
      await page.click('input[name="password"]');
      for (const char of account.password) {
        await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
      }
      
      // Click login button
      await page.keyboard.press('Enter');
      
      // Wait for navigation or error
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      
      // Check for checkpoint/verification
      const currentUrl = page.url();
      if (currentUrl.includes('challenge') || currentUrl.includes('checkpoint')) {
        console.log(`⚠️ Checkpoint detected for ${account.username}`);
        return { success: false, checkpoint: true, blocked: false, error: 'Checkpoint required' };
      }
      
      // Check for action blocked
      const blockedText = await page.evaluate(() => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('action blocked') || body.includes('try again later') || 
               body.includes('suspicious activity') || body.includes('we restrict certain');
      });
      
      if (blockedText) {
        console.log(`🚫 Account ${account.username} is blocked`);
        return { success: false, checkpoint: false, blocked: true, error: 'Action blocked' };
      }
      
      // Check for wrong credentials
      const wrongCredentials = await page.$('p[data-testid="login-error-message"]');
      if (wrongCredentials) {
        const errorText = await wrongCredentials.evaluate(el => el.textContent);
        console.log(`❌ Login failed for ${account.username}: ${errorText}`);
        return { success: false, checkpoint: false, blocked: false, error: errorText };
      }
      
      // Verify successful login by checking for home elements
      const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('svg[aria-label="Home"]') !== null ||
               document.querySelector('a[href="/"]') !== null ||
               window.location.pathname === '/';
      });
      
      if (isLoggedIn || !currentUrl.includes('login')) {
        console.log(`✅ Successfully logged in as ${account.username}`);
        await saveCookies(page, account.username);
        return { success: true, checkpoint: false, blocked: false, error: null };
      }
      
      // Handle "Save Login Info" popup
      try {
        const notNowBtn = await page.$('button:has-text("Not Now")');
        if (notNowBtn) await notNowBtn.click();
      } catch (e) {
        // Popup might not appear
      }
      
      // Handle notifications popup
      try {
        const notNowNotif = await page.$x('//button[contains(text(), "Not Now")]');
        if (notNowNotif.length > 0) await notNowNotif[0].click();
      } catch (e) {
        // Popup might not appear
      }
      
      return { success: true, checkpoint: false, blocked: false, error: null };
      
    } catch (error) {
      console.error(`❌ Login error for ${account.username} (attempt ${attempt}): ${error.message}`);
      
      if (attempt === maxRetries) {
        return { success: false, checkpoint: false, blocked: false, error: error.message };
      }
      
      // Wait before retry
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  return { success: false, checkpoint: false, blocked: false, error: 'Max retries exceeded' };
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
      await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 30000 });
      
      const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('svg[aria-label="Home"]') !== null ||
               !window.location.href.includes('login');
      });
      
      if (isLoggedIn) {
        console.log(`✅ Session restored for ${account.username}`);
        return { success: true, checkpoint: false, blocked: false, error: null };
      }
    } catch (e) {
      console.log(`⚠️ Session verification failed for ${account.username}`);
    }
    
    // Session invalid, delete old cookies
    deleteCookies(account.username);
  }
  
  // Fresh login required
  console.log(`🔐 No valid session for ${account.username}, logging in...`);
  return await login(page, account);
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
    
    return fs.readdirSync(COOKIES_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
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
    
    sessionList.forEach(username => {
      try {
        const cookiePath = path.join(COOKIES_DIR, `${username}.json`);
        const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
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
        console.error(`❌ Failed to import session for ${username}: ${e.message}`);
        failedCount++;
      }
    });
  } catch (error) {
    console.error(`❌ Failed to import sessions: ${error.message}`);
  }
  
  return { success: successCount > 0, count: successCount, failed: failedCount };
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
  importSessionsFromObject
};
