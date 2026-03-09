/**
 * Instagram Login Helper
 * Handles both OLD and NEW Instagram login page formats
 * 
 * OLD Format (Classic Instagram):
 * - Username: input[name="username"]
 * - Password: input[name="password"]
 * - Submit: button[type="submit"]
 * 
 * NEW Format (Meta/2024+):
 * - Username: input[name="email"] with label "Mobile number, username or email"
 * - Password: input[name="pass"] with label "Password"
 * - Submit: div[role="button"] with text "Log in"
 * - Form: #login_form
 */

const LOGIN_URL = 'https://www.instagram.com/accounts/login/';

// Selectors for different login page versions
const SELECTORS = {
  // OLD Instagram login form
  OLD: {
    username: 'input[name="username"]',
    password: 'input[name="password"]',
    submit: 'button[type="submit"]',
    errorMessage: '#slfErrorAlert, p[data-testid="login-error-message"]'
  },
  // NEW Meta login form (2024+)
  NEW: {
    username: 'input[name="email"]',
    password: 'input[name="pass"]',
    form: '#login_form',
    // Submit button is a div with role="button" containing "Log in" text
    submitContainer: 'div[role="button"]',
    errorMessage: 'div[role="alert"]'
  },
  // Common selectors
  COMMON: {
    cookieAccept: 'button[class*="aOOlW"], button:has-text("Accept"), button:has-text("Allow")',
    saveLoginNotNow: 'button:has-text("Not Now"), div[role="button"]:has-text("Not now")',
    notificationsNotNow: 'button:has-text("Not Now")',
    homeIcon: 'svg[aria-label="Home"], a[href="/"]',
    checkpoint: 'challenge, checkpoint, verify'
  }
};

/**
 * Detect which login form version is present
 * @param {Object} page - Puppeteer page
 * @returns {Promise<string>} - 'OLD', 'NEW', or 'UNKNOWN'
 */
async function detectLoginFormVersion(page) {
  try {
    // Check for OLD form first (more specific)
    const hasOldForm = await page.evaluate(() => {
      return document.querySelector('input[name="username"]') !== null;
    });
    
    if (hasOldForm) {
      console.log('📝 Detected OLD Instagram login form');
      return 'OLD';
    }
    
    // Check for NEW Meta form
    const hasNewForm = await page.evaluate(() => {
      return document.querySelector('input[name="email"]') !== null ||
             document.querySelector('#login_form') !== null;
    });
    
    if (hasNewForm) {
      console.log('📝 Detected NEW Meta login form');
      return 'NEW';
    }
    
    return 'UNKNOWN';
  } catch (error) {
    console.error('Error detecting login form version:', error.message);
    return 'UNKNOWN';
  }
}

/**
 * Wait for any login form to appear
 * @param {Object} page - Puppeteer page
 * @param {number} timeout - Maximum wait time in ms
 * @returns {Promise<string>} - Form version detected
 */
async function waitForLoginForm(page, timeout = 15000) {
  const startTime = Date.now();
  console.log(`⏳ waitForLoginForm: waiting up to ${timeout}ms`);

  while (Date.now() - startTime < timeout) {
    const version = await detectLoginFormVersion(page);
    if (version !== 'UNKNOWN') {
      console.log(`✅ waitForLoginForm: detected ${version}`);
      return version;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('⚠️ waitForLoginForm: timeout - login form not found');
  throw new Error('Login form not found within timeout');
}

/**
 * Handle cookie consent popup if present
 * @param {Object} page - Puppeteer page
 */
async function handleCookieConsent(page) {
  try {
    console.log('🍪 handleCookieConsent: checking for cookie consent popup');
    // Try multiple cookie accept button selectors
    const cookieSelectors = [
      'button[class*="aOOlW"]',
      'button:has-text("Accept")',
      'button:has-text("Allow")',
      'button:has-text("Accept All")',
      'button:has-text("Allow All Cookies")',
      'button:has-text("Only allow essential cookies")'
    ];
    
    for (const selector of cookieSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          console.log('🍪 handleCookieConsent: cookie consent handled');
          await new Promise(r => setTimeout(r, 1000));
          return true;
        }
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    // Cookie popup might not appear
  }
  console.log('🍪 handleCookieConsent: no cookie consent popup found');
  return false;
}

/**
 * Type text with human-like delays
 * @param {Object} page - Puppeteer page
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 */
async function humanType(page, selector, text) {
  console.log(`✍️ humanType: typing into ${selector}`);

  // Wait for the element to be present and visible
  await page.waitForSelector(selector, { visible: true, timeout: 7000 }).catch(() => {});

  try {
    // Clear value using the selector inside page context to avoid detached ElementHandles
    await page.$eval(selector, (element) => {
      try {
        element.focus();
        if ('value' in element) {
          element.value = '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          element.innerText = '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (e) {}
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 100));

    // Try to use ElementHandle.type when available, otherwise focus+keyboard
    const handle = await page.$(selector);
    if (handle && typeof handle.type === 'function') {
      await handle.type(text, { delay: 50 + Math.random() * 100 });
    } else {
      await page.focus(selector).catch(() => {});
      for (const char of text) {
        await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
        if (Math.random() < 0.1) await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      }
    }

    // Fire input/change events in case the page uses frameworks listening to them
    await page.$eval(selector, (element) => {
      try {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
    }).catch(() => {});

    console.log(`✅ humanType: finished typing into ${selector}`);
  } catch (err) {
    throw new Error(`humanType failed for ${selector}: ${err.message}`);
  }
}

/**
 * Click the login/submit button
 * @param {Object} page - Puppeteer page
 * @param {string} formVersion - 'OLD' or 'NEW'
 * @returns {Promise<boolean>} - Whether click was successful
 */
async function clickLoginButton(page, formVersion) {
  console.log(`🔘 clickLoginButton: formVersion=${formVersion}`);
  try {
    if (formVersion === 'OLD') {
      // Old form: click submit button
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('🔘 clickLoginButton: clicked OLD submit button');
        return true;
      }
    }
    
    if (formVersion === 'NEW') {
      // New form: find div[role="button"] with "Log in" text
      const clickedMethod = await page.evaluate(() => {
        try {
          const buttons = document.querySelectorAll('div[role="button"]');
          for (const btn of buttons) {
            const text = btn.innerText.trim().toLowerCase();
            if (text === 'log in') {
              btn.click();
              return 'role-text';
            }
          }

          const hiddenSubmit = document.querySelector('input[type="submit"]');
          if (hiddenSubmit) {
            hiddenSubmit.click();
            return 'hidden-submit';
          }

          const form = document.querySelector('#login_form');
          if (form) {
            form.submit();
            return 'form-submit';
          }

          return 'none';
        } catch (e) {
          return 'error';
        }
      });

      if (clickedMethod && clickedMethod !== 'none' && clickedMethod !== 'error') {
        console.log(`🔘 clickLoginButton: clicked NEW login via ${clickedMethod}`);
        return true;
      }
    }
    
    // Fallback: press Enter
    await page.keyboard.press('Enter');
    console.log('🔘 clickLoginButton: fallback - pressed Enter');
    return true;
    
  } catch (error) {
    console.error('Error clicking login button:', error.message);
    // Last resort: press Enter
    await page.keyboard.press('Enter');
    console.log('🔘 clickLoginButton: error fallback - pressed Enter');
    return true;
  }
}

/**
 * Check for login errors
 * @param {Object} page - Puppeteer page
 * @returns {Promise<string|null>} - Error message or null
 */
async function checkLoginError(page) {
  try {
    const error = await page.evaluate(() => {
      // Check for error alerts
      const alertDiv = document.querySelector('div[role="alert"]');
      if (alertDiv) return alertDiv.innerText;
      
      // Check for old error message
      const oldError = document.querySelector('#slfErrorAlert, p[data-testid="login-error-message"]');
      if (oldError) return oldError.innerText;
      
      // Check body text for common errors
      const bodyText = document.body.innerText.toLowerCase();
      if (bodyText.includes('incorrect password') || bodyText.includes('wrong password')) {
        return 'Incorrect password';
      }
      if (bodyText.includes("doesn't match") || bodyText.includes('not found')) {
        return 'Username not found';
      }
      if (bodyText.includes('too many attempts') || bodyText.includes('try again later')) {
        return 'Too many login attempts';
      }
      
      return null;
    });
    if (error) console.log(`⚠️ checkLoginError: ${error}`);
    return error;
  } catch (e) {
    return null;
  }
}

/**
 * Check if checkpoint/verification is required
 * @param {Object} page - Puppeteer page
 * @returns {Promise<boolean>}
 */
async function isCheckpointRequired(page) {
  const url = page.url().toLowerCase();
  if (url.includes('challenge') || url.includes('checkpoint') || url.includes('verify')) {
    return true;
  }
  
  const hasChallenge = await page.evaluate(() => {
    const bodyText = document.body.innerText.toLowerCase();
    return bodyText.includes('verify') || 
           bodyText.includes('confirm') ||
           bodyText.includes('security code') ||
           bodyText.includes("help us confirm it's you") ||
           bodyText.includes('suspicious login');
  });
  
  return hasChallenge;
}

/**
 * Check if account is blocked
 * @param {Object} page - Puppeteer page
 * @returns {Promise<boolean>}
 */
async function isAccountBlocked(page) {
  const blocked = await page.evaluate(() => {
    const bodyText = document.body.innerText.toLowerCase();
    return bodyText.includes('action blocked') || 
           bodyText.includes('we restrict certain') ||
           bodyText.includes('suspicious activity') ||
           bodyText.includes('temporarily blocked');
  });
  
  return blocked;
}

/**
 * Check if login was successful
 * @param {Object} page - Puppeteer page
 * @returns {Promise<boolean>}
 */
async function isLoginSuccessful(page) {
  const url = page.url().toLowerCase();
  
  // If still on login page, not successful
  if (url.includes('login')) {
    return false;
  }
  
  // Check for home elements
  const hasHomeElements = await page.evaluate(() => {
    return document.querySelector('svg[aria-label="Home"]') !== null ||
           document.querySelector('a[href="/"]') !== null ||
           document.querySelector('nav') !== null;
  });
  
  return hasHomeElements || url === 'https://www.instagram.com/';
}

/**
 * Handle post-login popups (Save Login Info, Notifications)
 * @param {Object} page - Puppeteer page
 */
async function handlePostLoginPopups(page) {
  // Wait a bit for popups to appear
  await new Promise(r => setTimeout(r, 2000));
  
  // Handle "Save Login Info" popup
  try {
    const saveLoginHandled = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const btn of buttons) {
        const text = btn.innerText.toLowerCase().trim();
        if (text === 'not now' || text === 'not now') {
          btn.click();
          return true;
        }
      }
      return false;
    });
    if (saveLoginHandled) {
      console.log('📱 Save Login Info popup dismissed');
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (e) {}
  
  // Handle "Turn on Notifications" popup
  try {
    const notifHandled = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const btn of buttons) {
        const text = btn.innerText.toLowerCase().trim();
        if (text === 'not now' || text === 'not now') {
          btn.click();
          return true;
        }
      }
      return false;
    });
    if (notifHandled) {
      console.log('🔔 Notifications popup dismissed');
    }
  } catch (e) {}
}

/**
 * Main login function - handles both OLD and NEW Instagram login
 * @param {Object} page - Puppeteer page
 * @param {Object} account - { username, password }
 * @param {Object} options - { maxRetries, verbose }
 * @returns {Promise<Object>} - { success, checkpoint, blocked, error }
 */
async function performLogin(page, account, options = {}) {
  const { maxRetries = 3, verbose = true } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (verbose) {
        console.log(`🔐 Login attempt ${attempt}/${maxRetries} for ${account.username}`);
      }
      
      // Navigate to login page
      await page.goto(LOGIN_URL, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });
      
      // Handle cookie consent
      const cookieHandled = await handleCookieConsent(page);
      if (verbose) console.log(`🍪 performLogin: cookie consent handled=${cookieHandled}`);
      
      // Wait for and detect login form version
      const formVersion = await waitForLoginForm(page, 15000);
      if (verbose) {
        console.log(`📋 Using ${formVersion} login form for ${account.username}`);
      }
      
      // Get selectors based on form version
      const selectors = SELECTORS[formVersion];
      if (!selectors) {
        throw new Error(`Unknown login form version: ${formVersion}`);
      }
      
      // Small random delay before typing (human behavior)
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

      // Enter username
      if (verbose) console.log(`➡️ performLogin: typing username into ${selectors.username}`);
      await humanType(page, selectors.username, account.username);
      if (verbose) console.log('➡️ performLogin: username typed');
      
      // Small pause between fields
      await new Promise(r => setTimeout(r, 300 + Math.random() * 500));

      // Enter password
      if (verbose) console.log(`➡️ performLogin: typing password into ${selectors.password}`);
      await humanType(page, selectors.password, account.password);
      if (verbose) console.log('➡️ performLogin: password typed');
      
      // Small pause before clicking login
      await new Promise(r => setTimeout(r, 500 + Math.random() * 800));
      
      // Click login button
      const clickResult = await clickLoginButton(page, formVersion);
      if (verbose) console.log(`🔘 performLogin: clickLoginButton returned ${clickResult}`);
      
      // Wait for navigation/response
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      }).catch(() => {});
      if (verbose) console.log(`🌐 performLogin: current URL ${page.url()}`);
      
      // Additional wait for page to stabilize
      await new Promise(r => setTimeout(r, 2000));
      
      // Check for errors first
      const error = await checkLoginError(page);
      if (error) {
        if (verbose) console.log(`❌ Login error for ${account.username}: ${error}`);
        
        // If wrong credentials, don't retry
        if (error.toLowerCase().includes('password') || error.toLowerCase().includes('not found')) {
          return { success: false, checkpoint: false, blocked: false, error };
        }
        
        // For other errors, retry
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
          continue;
        }
        return { success: false, checkpoint: false, blocked: false, error };
      }
      
      // Check for checkpoint
      if (await isCheckpointRequired(page)) {
        if (verbose) console.log(`⚠️ Checkpoint required for ${account.username}`);
        return { success: false, checkpoint: true, blocked: false, error: 'Checkpoint/verification required' };
      }
      
      // Check for blocked account
      if (await isAccountBlocked(page)) {
        if (verbose) console.log(`🚫 Account ${account.username} is blocked`);
        return { success: false, checkpoint: false, blocked: true, error: 'Account blocked' };
      }
      
      // Check for successful login
      if (await isLoginSuccessful(page)) {
        if (verbose) console.log(`✅ Successfully logged in as ${account.username}`);
        
        // Handle post-login popups
        await handlePostLoginPopups(page);
        
        return { success: true, checkpoint: false, blocked: false, error: null };
      }
      
      // If we get here, something unexpected happened
      if (attempt < maxRetries) {
        if (verbose) console.log(`⚠️ Login unclear for ${account.username}, retrying...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      
      return { success: false, checkpoint: false, blocked: false, error: 'Login status unclear' };
      
    } catch (error) {
      if (verbose) console.error(`🚫 Login attempt ${attempt} failed for ${account.username}:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
        continue;
      }
      
      return { success: false, checkpoint: false, blocked: false, error: error.message };
    }
  }
  
  return { success: false, checkpoint: false, blocked: false, error: 'All login attempts failed' };
}

/**
 * Fill login form without submitting (for manual login flow)
 * @param {Object} page - Puppeteer page
 * @param {Object} account - { username, password }
 * @returns {Promise<Object>} - { success, formVersion, error }
 */
async function fillLoginForm(page, account) {
  try {
    // Navigate to login page
    await page.goto(LOGIN_URL, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    // Handle cookie consent
    const cookieHandled = await handleCookieConsent(page);
    console.log(`🍪 fillLoginForm: cookie consent handled=${cookieHandled}`);
    
    // Wait for and detect login form version
    const formVersion = await waitForLoginForm(page, 15000);
    console.log(`📋 Detected ${formVersion} login form`);
    
    // Get selectors based on form version
    const selectors = SELECTORS[formVersion];
    if (!selectors) {
      throw new Error(`Unknown login form version: ${formVersion}`);
    }
    
    // Enter username
    console.log(`➡️ fillLoginForm: typing username into ${selectors.username}`);
    await humanType(page, selectors.username, account.username);
    console.log('➡️ fillLoginForm: username typed');
    
    // Small pause between fields
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
    
    // Enter password
    console.log(`➡️ fillLoginForm: typing password into ${selectors.password}`);
    await humanType(page, selectors.password, account.password);
    console.log('➡️ fillLoginForm: password typed');
    
    console.log(`📝 Login form filled for ${account.username}`);
    
    return { success: true, formVersion, error: null };
    
  } catch (error) {
    console.error('Error filling login form:', error.message);
    return { success: false, formVersion: null, error: error.message };
  }
}

/**
 * Auto-submit the login form (after filling)
 * @param {Object} page - Puppeteer page
 * @param {string} formVersion - 'OLD' or 'NEW'
 * @returns {Promise<Object>} - { success, checkpoint, blocked, error }
 */
async function submitLoginForm(page, formVersion) {
  try {
    // Click login button
    const clickResult = await clickLoginButton(page, formVersion);
    console.log(`🔘 submitLoginForm: clickLoginButton returned ${clickResult}`);
    
    // Wait for navigation/response
    await page.waitForNavigation({ 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    }).catch(() => {});
    console.log(`🌐 submitLoginForm: current URL ${page.url()}`);
    
    // Additional wait for page to stabilize
    await new Promise(r => setTimeout(r, 2000));
    
    // Check results
    const error = await checkLoginError(page);
    if (error) {
      return { success: false, checkpoint: false, blocked: false, error };
    }
    
    if (await isCheckpointRequired(page)) {
      return { success: false, checkpoint: true, blocked: false, error: 'Checkpoint required' };
    }
    
    if (await isAccountBlocked(page)) {
      return { success: false, checkpoint: false, blocked: true, error: 'Account blocked' };
    }
    
    if (await isLoginSuccessful(page)) {
      await handlePostLoginPopups(page);
      return { success: true, checkpoint: false, blocked: false, error: null };
    }
    
    return { success: false, checkpoint: false, blocked: false, error: 'Login status unclear' };
    
  } catch (error) {
    return { success: false, checkpoint: false, blocked: false, error: error.message };
  }
}

module.exports = {
  performLogin,
  fillLoginForm,
  submitLoginForm,
  detectLoginFormVersion,
  waitForLoginForm,
  handleCookieConsent,
  handlePostLoginPopups,
  isLoginSuccessful,
  isCheckpointRequired,
  isAccountBlocked,
  checkLoginError,
  humanType,
  clickLoginButton,
  SELECTORS,
  LOGIN_URL
};