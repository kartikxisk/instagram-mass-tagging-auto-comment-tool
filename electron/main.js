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
 * Get user data path for storing app data
 * In production: Uses system app data directory
 * In development: Uses project root
 */
function getAppDataPath() {
  if (app.isPackaged) {
    return app.getPath('userData');
  }
  return path.join(__dirname, '..');
}

/**
 * Get paths for various app directories
 */
function getPaths() {
  const basePath = getAppDataPath();
  return {
    config: path.join(basePath, 'config'),
    cookies: path.join(basePath, 'cookies'),
    logs: path.join(basePath, 'logs'),
    data: path.join(basePath, 'data')
  };
}

/**
 * Initialize app directories
 */
function initializeDirectories() {
  const paths = getPaths();
  Object.values(paths).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Create default config if it doesn't exist
  const configFile = path.join(paths.config, 'accounts.json');
  if (!fs.existsSync(configFile)) {
    let defaultSettings = {
      accountsPerBatch: 100,
      tagsPerAccount: 60,
      tagsPerComment: { min: 10, max: 12 },
      commentsPerAccount: { min: 5, max: 7 },
      pauseAfterComments: 50
    };
    
    // In packaged app, try to load settings from bundled config (but NOT accounts/proxies)
    if (app.isPackaged) {
      try {
        const bundledConfigPath = path.join(process.resourcesPath, 'config', 'default-settings.json');
        if (fs.existsSync(bundledConfigPath)) {
          const bundledConfig = JSON.parse(fs.readFileSync(bundledConfigPath, 'utf8'));
          if (bundledConfig.settings) {
            defaultSettings = bundledConfig.settings;
          }
        }
      } catch (e) {
        // Use default settings if bundled config can't be read
      }
    }
    
    // Always start with empty accounts - user must import their own
    // Note: Proxies are now per-account, not global
    const defaultConfig = {
      accounts: [],
      targetPost: '',
      settings: defaultSettings
    };
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
  }
}

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
  // Initialize directories first
  initializeDirectories();
  
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
  
  // Clean up chrome profiles directory on quit
  try {
    const chromeProfilesPath = path.join(app.getPath('userData'), 'chrome-profiles');
    if (fs.existsSync(chromeProfilesPath)) {
      fs.rmSync(chromeProfilesPath, { recursive: true, force: true });
    }
  } catch (e) {
    console.log('Could not clean up chrome profiles:', e.message);
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
    const paths = getPaths();
    const configPath = path.join(paths.config, 'accounts.json');
    
    if (!fs.existsSync(configPath)) {
      // Return default config if file doesn't exist
      return { 
        success: true, 
        config: {
          accounts: [],
          proxies: [],
          targetPost: '',
          settings: {
            accountsPerBatch: 100,
            tagsPerAccount: 60,
            tagsPerComment: { min: 10, max: 12 },
            commentsPerAccount: { min: 5, max: 7 },
            pauseAfterComments: 50
          }
        }
      };
    }
    
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
    const paths = getPaths();
    const configDir = paths.config;
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const configPath = path.join(configDir, 'accounts.json');
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

  const filePath = result.filePaths[0];
  
  // Parse Excel to get total mentionable tags count
  let totalTags = 0;
  try {
    const parseExcel = require('../utils/parseExcel');
    const usernames = parseExcel.loadAllUsernames(filePath, false);
    totalTags = usernames.length;
  } catch (error) {
    console.error('Error parsing Excel for tag count:', error);
  }

  return { success: true, filePath, totalTags };
});

/**
 * Get Excel tags count from existing file
 */
ipcMain.handle('get-excel-tags-count', async (event, filePath) => {
  try {
    const parseExcel = require('../utils/parseExcel');
    const usernames = parseExcel.loadAllUsernames(filePath, false);
    return { success: true, totalTags: usernames.length };
  } catch (error) {
    console.error('Error getting Excel tags count:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Open logs folder
 */
ipcMain.handle('open-logs-folder', async () => {
  try {
    const paths = getPaths();
    const logsPath = paths.logs;
    
    // Ensure logs folder exists
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true });
    }
    
    const error = await shell.openPath(logsPath);
    if (error) {
      console.error('Failed to open logs folder:', error);
      return { success: false, error };
    }
    return { success: true, path: logsPath };
  } catch (error) {
    console.error('Error opening logs folder:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Get app version
 */
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

/**
 * Import accounts from CSV file
 * CSV format: username,password
 */
ipcMain.handle('import-accounts', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Accounts',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'Text Files', extensions: ['txt'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    let accounts = [];
    
    // Skip header row if it looks like a header
    const startIndex = lines[0]?.toLowerCase().includes('username') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV: username,password
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        accounts.push({
          username: parts[0],
          password: parts[1]
        });
      }
    }
    
    return { success: true, accounts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Export accounts to CSV file
 * CSV format: username,password
 */
ipcMain.handle('export-accounts', async (event, accounts) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Accounts',
    defaultPath: 'accounts-export.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const csvLines = ['username,password'];
    accounts.forEach(acc => {
      csvLines.push(`${acc.username},${acc.password}`);
    });
    fs.writeFileSync(result.filePath, csvLines.join('\n'));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Import proxies from CSV file
 * CSV format: address,port,username,password
 */
ipcMain.handle('import-proxies', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Proxies',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'Text Files', extensions: ['txt'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    let proxies = [];
    
    // Skip header row if it looks like a header
    const startIndex = lines[0]?.toLowerCase().includes('address') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV: address,port,username,password
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        proxies.push({
          address: parts[0],
          port: parts[1],
          username: parts[2] || '',
          password: parts[3] || ''
        });
      }
    }
    
    return { success: true, proxies };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Export proxies to CSV file
 * CSV format: address,port,username,password
 */
ipcMain.handle('export-proxies', async (event, proxies) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Proxies',
    defaultPath: 'proxies-export.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const csvLines = ['address,port,username,password'];
    proxies.forEach(proxy => {
      csvLines.push(`${proxy.address},${proxy.port},${proxy.username || ''},${proxy.password || ''}`);
    });
    fs.writeFileSync(result.filePath, csvLines.join('\n'));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Export all sessions (cookies) as a JSON file
 */
ipcMain.handle('export-sessions', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export All Sessions',
    defaultPath: `sessions-export-${Date.now()}.json`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const paths = getPaths();
    const cookiesDir = paths.cookies;
    
    // Check if cookies directory exists and has files
    if (!fs.existsSync(cookiesDir)) {
      return { success: false, error: 'No sessions found to export' };
    }
    
    const files = fs.readdirSync(cookiesDir).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
      return { success: false, error: 'No sessions found to export' };
    }
    
    // Create a JSON export with all sessions
    const sessionData = {};
    files.forEach(file => {
      const username = file.replace('.json', '');
      const filePath = path.join(cookiesDir, file);
      try {
        sessionData[username] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error(`Failed to read session for ${username}:`, e.message);
      }
    });
    
    fs.writeFileSync(result.filePath, JSON.stringify(sessionData, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Import sessions (cookies) from a JSON file
 */
ipcMain.handle('import-sessions', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Sessions',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const filePath = result.filePaths[0];
    const paths = getPaths();
    const cookiesDir = paths.cookies;
    
    // Ensure cookies directory exists
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }
    
    // Read and parse the JSON file
    const content = fs.readFileSync(filePath, 'utf8');
    const sessionData = JSON.parse(content);
    
    let importedCount = 0;
    let failedCount = 0;
    const importedUsernames = [];

    // Handle different formats
    if (typeof sessionData === 'object' && !Array.isArray(sessionData)) {
      // Multiple sessions format: { username: [cookies], username2: [cookies] }
      Object.entries(sessionData).forEach(([username, cookies]) => {
        try {
          if (Array.isArray(cookies)) {
            const destPath = path.join(cookiesDir, `${username}.json`);
            fs.writeFileSync(destPath, JSON.stringify(cookies, null, 2));
            importedCount++;
            importedUsernames.push(username);
          } else {
            failedCount++;
          }
        } catch (e) {
          console.error(`Failed to import session for ${username}:`, e.message);
          failedCount++;
        }
      });
    } else {
      return { success: false, error: 'Invalid session file format. Please use the exported JSON from this application.' };
    }
    
    if (importedCount === 0) {
      return { success: false, error: 'No valid sessions found in the import file.' };
    }
    
    return { success: true, count: importedCount, failed: failedCount, usernames: importedUsernames };
  } catch (error) {
    return { success: false, error: `Failed to import sessions: ${error.message}` };
  }
});

/**
 * Check if an account has saved session/cookies
 */
ipcMain.handle('check-session', async (event, username) => {
  try {
    const paths = getPaths();
    // Use same format as sessionManager.js: {username}.json
    const cookiesPath = path.join(paths.cookies, `${username}.json`);
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
    const paths = getPaths();
    const cookiesPath = path.join(paths.cookies, `${username}.json`);
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
 * Get Global Tag Tracker stats
 */
ipcMain.handle('get-tracker-stats', async () => {
  try {
    const tagTracker = require(path.join(__dirname, '../utils/tagTracker'));
    // Initialize without fresh start to load existing data
    tagTracker.initialize(false);
    const stats = tagTracker.getStats();
    return { 
      success: true, 
      stats: {
        totalUniqueUsersTagged: stats.totalTagged,
        pending: stats.pending,
        sessionId: stats.sessionId,
        successfulComments: stats.successfulComments || 0,
        failedComments: stats.failedComments || 0,
        successRate: stats.successRate || '0%'
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Export Global Tag Tracker data
 */
ipcMain.handle('export-tracker-data', async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const tagTracker = require(path.join(__dirname, '../utils/tagTracker'));
    
    tagTracker.initialize(false);
    const stats = tagTracker.getStats();
    
    // Save to logs folder with timestamp
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filePath = path.join(logsDir, `tracker-export-${timestamp}.json`);
    
    const data = {
      stats: stats,
      exportedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Reset Global Tag Tracker
 */
ipcMain.handle('reset-tracker-global', async () => {
  try {
    const tagTracker = require(path.join(__dirname, '../utils/tagTracker'));
    tagTracker.reset();
    return { success: true };
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
    const paths = getPaths();
    const cookiesDir = paths.cookies;
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

/**
 * Open data folder in file explorer
 */
ipcMain.handle('open-data-folder', async () => {
  const basePath = getAppDataPath();
  
  // Ensure folder exists
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }
  
  shell.openPath(basePath);
  return { success: true, path: basePath };
});

/**
 * Get app data path
 */
ipcMain.handle('get-data-path', () => {
  return { success: true, path: getAppDataPath() };
});
