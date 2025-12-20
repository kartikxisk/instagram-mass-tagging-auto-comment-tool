/**
 * Electron Main Process
 * Instagram Mass Tagging Desktop Application
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow = null;
let automationRunner = null;

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Instagram Mass Tagging Tool',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a2e',
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 }
  });

  // Load the index.html
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * App ready event
 */
app.whenReady().then(() => {
  createWindow();

  // Initialize automation runner
  const AutomationRunner = require('./automation-runner');
  automationRunner = new AutomationRunner();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Clean up before quit
 */
app.on('before-quit', async () => {
  if (automationRunner && automationRunner.isRunning) {
    await automationRunner.stop();
  }
});

// ============================================
// IPC Handlers
// ============================================

/**
 * Load configuration from file
 */
ipcMain.handle('load-config', async () => {
  try {
    const configPath = path.join(__dirname, '../config/accounts.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return { success: true, config: JSON.parse(configData) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Save configuration to file
 */
ipcMain.handle('save-config', async (event, config) => {
  try {
    const configPath = path.join(__dirname, '../config/accounts.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Start automation
 */
ipcMain.handle('start-automation', async (event, options) => {
  try {
    // Stop any existing automation first
    if (automationRunner) {
      automationRunner.removeAllListeners();
      if (automationRunner.isRunning) {
        await automationRunner.stop();
      }
    }
    
    // Create fresh instance
    const AutomationRunner = require('./automation-runner');
    automationRunner = new AutomationRunner();

    // Set up event forwarding to renderer
    automationRunner.on('log', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-log', data);
      }
    });

    automationRunner.on('stats', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-stats', data);
      }
    });

    automationRunner.on('status', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-status', data);
      }
    });

    automationRunner.on('complete', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-complete', data);
      }
    });

    automationRunner.on('error', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-error', data);
      }
    });

    await automationRunner.start(options);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Stop automation
 */
ipcMain.handle('stop-automation', async () => {
  try {
    if (automationRunner) {
      automationRunner.removeAllListeners();
      await automationRunner.stop();
      automationRunner = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Check proxies
 */
ipcMain.handle('check-proxies', async () => {
  try {
    const { checkAllProxies } = require('./proxy-checker-runner');
    
    // Forward progress to renderer
    const results = await checkAllProxies((progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('proxy-check-progress', progress);
      }
    });
    
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Open file dialog for Excel file
 */
ipcMain.handle('select-excel-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Usernames Excel File',
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  return { success: true, filePath: result.filePaths[0] };
});

/**
 * Open logs folder
 */
ipcMain.handle('open-logs-folder', async () => {
  const logsPath = path.join(__dirname, '../logs');
  
  // Ensure logs folder exists
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
  
  shell.openPath(logsPath);
  return { success: true };
});

/**
 * Get app version
 */
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

/**
 * Import accounts from file
 */
ipcMain.handle('import-accounts', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Accounts',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'Text Files', extensions: ['txt'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    const ext = path.extname(result.filePaths[0]).toLowerCase();
    
    let accounts = [];
    
    if (ext === '.json') {
      const data = JSON.parse(content);
      accounts = Array.isArray(data) ? data : (data.accounts || []);
    } else {
      // Parse txt format: username:password per line
      const lines = content.split('\n').filter(line => line.trim());
      accounts = lines.map(line => {
        const [username, password] = line.split(':').map(s => s.trim());
        return { username, password };
      }).filter(acc => acc.username && acc.password);
    }
    
    return { success: true, accounts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Export accounts to file
 */
ipcMain.handle('export-accounts', async (event, accounts) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Accounts',
    defaultPath: 'accounts-export.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, JSON.stringify(accounts, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Check if an account has saved session/cookies
 */
ipcMain.handle('check-session', async (event, username) => {
  try {
    // Use same format as sessionManager.js: {username}.json
    const cookiesPath = path.join(__dirname, '../cookies', `${username}.json`);
    const hasSession = fs.existsSync(cookiesPath);
    return { success: true, hasSession };
  } catch (error) {
    return { success: false, hasSession: false, error: error.message };
  }
});

/**
 * Delete session/cookies for an account
 */
ipcMain.handle('delete-session', async (event, username) => {
  try {
    const cookiesPath = path.join(__dirname, '../cookies', `${username}.json`);
    if (fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Reset tag tracker - clear all tagged users
 */
ipcMain.handle('reset-tag-tracker', async () => {
  try {
    const tagTracker = require(path.join(__dirname, '../utils/tagTracker'));
    tagTracker.reset();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Get tag tracker stats
 */
ipcMain.handle('get-tag-stats', async () => {
  try {
    const tagTracker = require(path.join(__dirname, '../utils/tagTracker'));
    tagTracker.initialize(false); // Load without reset
    return { success: true, stats: tagTracker.getStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Manual login - Opens a browser window for manual Instagram login with auto-fill
 */
ipcMain.handle('manual-login', async (event, credentials) => {
  try {
    const { username, password } = credentials;
    
    const puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());
    
    // Ensure cookies directory exists
    const cookiesDir = path.join(__dirname, '../cookies');
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }
    
    // Launch browser in non-headless mode for manual login
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to Instagram login
    await page.goto('https://www.instagram.com/accounts/login/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for login form to be ready
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    
    // Auto-fill username
    await page.type('input[name="username"]', username, { delay: 50 });
    
    // Auto-fill password
    await page.type('input[name="password"]', password, { delay: 50 });
    
    // Click the login button
    await page.click('button[type="submit"]');
    
    // Wait for user to complete any verification (2FA, captcha, etc.)
    // We'll check for logged-in indicators periodically
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const checkInterval = 2000; // Check every 2 seconds
    let elapsed = 0;
    let loggedIn = false;
    
    while (elapsed < maxWaitTime && !loggedIn) {
      try {
        // Check if we're on the home page or if login form is gone
        const url = page.url();
        const isLoginPage = url.includes('/accounts/login');
        const isChallengePage = url.includes('/challenge');
        
        // Check for logged-in indicators
        const hasHomeContent = await page.evaluate(() => {
          // Check for elements that only appear when logged in
          const feedItems = document.querySelectorAll('article');
          const profileLink = document.querySelector('a[href*="/direct/inbox"]');
          const searchIcon = document.querySelector('svg[aria-label="Search"]');
          const homeIcon = document.querySelector('svg[aria-label="Home"]');
          const createIcon = document.querySelector('svg[aria-label="New post"]');
          return feedItems.length > 0 || profileLink || searchIcon || homeIcon || createIcon;
        });
        
        // Check for error messages
        const hasError = await page.evaluate(() => {
          const errorMsg = document.querySelector('#slfErrorAlert');
          const wrongPassword = document.body.innerText.includes('Sorry, your password was incorrect');
          return errorMsg || wrongPassword;
        });
        
        if (hasError) {
          await browser.close();
          throw new Error('Invalid username or password');
        }
        
        if (!isLoginPage && !isChallengePage && hasHomeContent) {
          loggedIn = true;
          break;
        }
        
        // Check if browser is still open
        if (!browser.isConnected()) {
          throw new Error('Browser was closed before login completed');
        }
        
        await new Promise(r => setTimeout(r, checkInterval));
        elapsed += checkInterval;
      } catch (e) {
        if (e.message.includes('Invalid username') || e.message.includes('Browser was closed')) {
          throw e;
        }
        if (!browser.isConnected()) {
          throw new Error('Browser was closed');
        }
        await new Promise(r => setTimeout(r, checkInterval));
        elapsed += checkInterval;
      }
    }
    
    if (!loggedIn) {
      await browser.close();
      throw new Error('Login timeout. Please try again.');
    }
    
    // Wait a bit more to ensure all cookies are set
    await new Promise(r => setTimeout(r, 2000));
    
    // Get cookies and save them (same format as sessionManager.js: {username}.json)
    const cookies = await page.cookies();
    const cookiesPath = path.join(cookiesDir, `${username}.json`);
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    
    // Close browser
    await browser.close();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
