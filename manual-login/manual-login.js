const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
require('dotenv').config();

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const ACCOUNTS_FILE = path.resolve(__dirname, '../config/accounts.json');
const COOKIES_DIR = path.resolve(__dirname, '../cookies');

if (!fs.existsSync(COOKIES_DIR)) {
  fs.mkdirSync(COOKIES_DIR);
}

/**
 * Find the system-installed Chrome/Chromium browser path
 * Supports macOS, Windows, and Linux
 * @returns {string|null} Path to Chrome executable or null if not found
 */
function findSystemChrome() {
  const platform = process.platform;
  
  // macOS paths
  if (platform === 'darwin') {
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
    ];
    
    for (const chromePath of macPaths) {
      if (fs.existsSync(chromePath)) {
        console.log(`🌐 Found system browser: ${chromePath}`);
        return chromePath;
      }
    }
  }
  
  // Windows paths
  if (platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
    ];
    
    for (const chromePath of winPaths) {
      try {
        if (chromePath && fs.existsSync(chromePath)) {
          console.log(`🌐 Found system browser: ${chromePath}`);
          return chromePath;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  // Linux paths
  if (platform === 'linux') {
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/bin/brave-browser'
    ];
    
    for (const chromePath of linuxPaths) {
      if (fs.existsSync(chromePath)) {
        console.log(`🌐 Found system browser: ${chromePath}`);
        return chromePath;
      }
    }
    
    // Try which command on Linux
    try {
      const chromePath = execSync('which google-chrome || which chromium || which chromium-browser', { encoding: 'utf8' }).trim();
      if (chromePath && fs.existsSync(chromePath)) {
        console.log(`🌐 Found system browser: ${chromePath}`);
        return chromePath;
      }
    } catch (e) {
      // Command failed
    }
  }
  
  console.log('⚠️ No system Chrome found, using Puppeteer bundled browser');
  return null;
}

function askUserToContinue(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

(async () => {
  const config = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
  const accounts = config.accounts || config; // Support both formats

  console.log(`📋 Found ${accounts.length} accounts to process`);

  for (const account of accounts) {
    const { username, password, proxy } = account;
    const cookiePath = path.join(COOKIES_DIR, `${username}.json`);

    if (fs.existsSync(cookiePath)) {
      console.log(`⚠️ Skipping ${username} — cookies already exist.`);
      continue;
    }

    console.log(`\n🟢 Starting login for ${username}...`);

    const proxyUrl = proxy
      ? `--proxy-server=http://${proxy.address}:${proxy.port}`
      : null;

    // Find system Chrome
    const systemChrome = findSystemChrome();
    
    if (systemChrome) {
      console.log(`✅ Using SYSTEM Chrome: ${systemChrome}`);
    } else {
      console.log(`⚠️ WARNING: Using Puppeteer bundled Chromium (will show TEST badge)`);
    }

    // Create a persistent user data directory for this account
    const userDataDir = path.resolve(__dirname, '../chrome-profiles-manual', username);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--start-maximized',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--disable-default-apps',
      '--disable-component-extensions-with-background-pages',
      '--disable-component-update',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
      '--safebrowsing-disable-auto-update',
      '--window-size=1920,1080',
      '--disable-features=TranslateUI',
      '--lang=en-US'
    ];
    if (proxyUrl) args.push(proxyUrl);

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: systemChrome || undefined,
      userDataDir: userDataDir,
      args,
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();

    if (proxy && proxy.username && proxy.password) {
      await page.authenticate({
        username: proxy.username,
        password: proxy.password,
      });
    }

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Enhanced stealth - hide webdriver and automation properties
    await page.evaluateOnNewDocument(() => {
      // Hide webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      
      // Hide automation
      delete navigator.__proto__.webdriver;
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // Hide chrome automation
      window.chrome = { runtime: {} };
      
      // Override plugins to look normal
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    try {
      console.log(`🌐 Navigating to Instagram login page for ${username}...`);
      const loginUrl = process.env.INSTAGRAM_LOGIN_URL || 'https://instagram.com/accounts/login/';
      await page.goto(loginUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for either old or new login form
      // Old form: input[name="username"], input[name="password"]
      // New Meta form: input[name="email"], input[name="pass"]
      let usernameSelector = null;
      let passwordSelector = null;
      
      try {
        // Check for old Instagram form first
        await page.waitForSelector('input[name="username"]', { timeout: 5000 });
        usernameSelector = 'input[name="username"]';
        passwordSelector = 'input[name="password"]';
        console.log(`📝 Detected OLD Instagram login form`);
      } catch (e) {
        // Try new Meta login form
        try {
          await page.waitForSelector('input[name="email"]', { timeout: 10000 });
          usernameSelector = 'input[name="email"]';
          passwordSelector = 'input[name="pass"]';
          console.log(`📝 Detected NEW Meta login form`);
        } catch (e2) {
          throw new Error('Could not find login form (tried both old and new formats)');
        }
      }

      console.log(`🧠 Autofilling credentials for ${username}...`);
      await page.type(usernameSelector, username, { delay: 100 });
      await page.type(passwordSelector, password, { delay: 100 });

      // Click login button - handle both old and new forms
      // Old form: button[type="submit"]
      // New form: div[role="button"] with "Log in" text
      const loginClicked = await page.evaluate(() => {
        // Try old submit button first
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return 'old';
        }
        
        // Try new Meta login button
        const buttons = document.querySelectorAll('div[role="button"]');
        for (const btn of buttons) {
          if (btn.innerText.trim() === 'Log in') {
            btn.click();
            return 'new';
          }
        }
        
        return null;
      });

      if (loginClicked) {
        console.log(`🔘 Clicked ${loginClicked} login button`);
      } else {
        // Fallback: press Enter
        console.log(`🔘 Using Enter key to submit`);
        await page.keyboard.press('Enter');
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

      console.log('⏳ Please complete any verification (2FA, checkpoint, etc.) manually if shown.');
      await askUserToContinue('✅ Once logged in and feed is visible, press ENTER to save cookies...');

      const cookies = await page.cookies();
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
      console.log(`✅ Cookies saved for ${username} at cookies/${username}.json`);

      console.log(`🚨 Browser will stay open for ${username}. Close it manually when you're done.`);
    
    } catch (error) {
      console.error(`❌ Error with ${username}: ${error.message}`);
    }
  }

  console.log('\n📢 All accounts processed. You may manually close any remaining browsers.');
})();
