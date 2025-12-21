/**
 * Automation Runner
 * Bridges the Electron UI with the automation logic from main.js
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Import automation utilities
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Get user data path for storing app data
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

class AutomationRunner extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.shouldStop = false;
    this.browsers = []; // Track all browser instances for parallel execution
    this.stats = {
      accountsProcessed: 0,
      commentsPosted: 0,
      tagsPosted: 0,
      successfulComments: 0,
      failedComments: 0
    };
    this.activeWorkers = 0; // Track how many accounts are currently processing
  }

  /**
   * Load utilities dynamically
   */
  loadUtilities() {
    const basePath = path.join(__dirname, '..');
    
    return {
      sessionManager: require(path.join(basePath, 'utils/sessionManager')),
      parseExcel: require(path.join(basePath, 'utils/parseExcel')),
      delay: require(path.join(basePath, 'utils/delay')),
      logger: require(path.join(basePath, 'utils/logger')),
      proxySetup: require(path.join(basePath, 'utils/proxySetup')),
      userAgents: require(path.join(basePath, 'utils/userAgents')),
      tagDistribution: require(path.join(basePath, 'utils/tagDistribution')),
      humanBehavior: require(path.join(basePath, 'utils/humanBehavior')),
      tagTracker: require(path.join(basePath, 'utils/tagTracker'))
    };
  }

  /**
   * Start the automation
   * @param {Object} options - Automation options
   */
  async start(options = {}) {
    if (this.isRunning) {
      throw new Error('Automation is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.browsers = [];
    this.activeWorkers = 0;
    this.resetStats();

    try {
      // Load config from correct path
      const paths = getPaths();
      const configPath = path.join(paths.config, 'accounts.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Override target post if provided
      if (options.targetPost) {
        config.targetPost = options.targetPost;
      }

      this.emit('status', { status: 'running', message: 'Loading utilities...' });
      
      const utils = this.loadUtilities();
      
      // Initialize global tag tracker (continue from previous session)
      const trackerStats = utils.tagTracker.initialize(options.freshStart || false);
      this.emit('log', { type: 'info', message: `📊 Tag Tracker: ${trackerStats.totalTagged} users already tagged` });
      
      // Load usernames from the selected Excel file
      const usernamesPath = options.excelFilePath || path.join(__dirname, '../data/usernames.xlsx');
      utils.parseExcel.loadAllUsernames(usernamesPath);
      
      // Get all tags from Excel
      const allTags = [];
      let batch;
      while ((batch = utils.parseExcel.getNextBatch(100)).length > 0) {
        allTags.push(...batch);
      }

      if (allTags.length === 0) {
        throw new Error('No usernames found in Excel file');
      }

      // Get only untagged users
      const untaggedUsers = utils.tagTracker.getUntaggedUsers(allTags);
      
      this.emit('log', { type: 'success', message: `📊 Loaded ${allTags.length} total tags from Excel` });
      this.emit('log', { type: 'info', message: `✨ ${untaggedUsers.length} users remaining to tag` });
      this.emit('log', { type: 'info', message: `👥 Processing ${config.accounts.length} accounts` });
      this.emit('log', { type: 'info', message: `🎯 Target: ${config.targetPost}` });

      if (untaggedUsers.length === 0) {
        this.emit('log', { type: 'warning', message: '⚠️ All users have already been tagged! Use "Reset Tags" to start fresh.' });
        this.emit('complete', {
          accounts: 0,
          comments: 0,
          tags: 0
        });
        return;
      }

      // Get parallel settings
      const parallelAccounts = config.settings?.parallelAccounts || 3;
      this.emit('log', { type: 'info', message: `🔄 Running ${parallelAccounts} accounts in parallel` });

      // Process accounts in parallel batches
      const accounts = config.accounts.slice(0, config.settings?.accountsPerBatch || 100);
      let accountIndex = 0;

      // Worker function to process one account
      const processNextAccount = async () => {
        while (!this.shouldStop && accountIndex < accounts.length) {
          // Check if there are still untagged users
          const remainingUntagged = utils.tagTracker.getUntaggedUsers(allTags);
          if (remainingUntagged.length === 0) {
            this.emit('log', { type: 'success', message: '🎉 All users have been tagged!' });
            break;
          }

          const currentIndex = accountIndex++;
          const account = accounts[currentIndex];
          
          this.activeWorkers++;
          this.emit('log', { type: 'info', message: `🚀 Starting worker for ${account.username} (${this.activeWorkers} active workers)` });
          
          try {
            await this.processAccount(account, allTags, config, currentIndex, options, utils);
          } catch (error) {
            this.emit('log', { type: 'error', message: `Worker error for ${account.username}: ${error.message}` });
          }
          
          this.activeWorkers--;
          this.stats.accountsProcessed++;
          this.emitStats();

          // Small delay before picking up next account (stagger starts)
          if (!this.shouldStop) {
            await this.sleep(2000 + Math.random() * 3000); // 2-5 seconds
          }
        }
      };

      // Start parallel workers
      const workers = [];
      for (let i = 0; i < Math.min(parallelAccounts, accounts.length); i++) {
        // Stagger the start of each worker
        await this.sleep(i * 2000); // 2 seconds apart
        if (!this.shouldStop) {
          workers.push(processNextAccount());
        }
      }

      // Wait for all workers to complete
      await Promise.all(workers);

      this.emit('log', { type: 'success', message: '🎉 Automation completed!' });

      this.emit('complete', {
        accounts: this.stats.accountsProcessed,
        comments: this.stats.commentsPosted,
        tags: this.stats.tagsPosted
      });

    } catch (error) {
      this.emit('error', { message: error.message });
      throw error;
    } finally {
      this.isRunning = false;
      // Close all browsers
      for (const browser of this.browsers) {
        try {
          await browser.close();
        } catch (e) {
          // Browser might already be closed
        }
      }
      this.browsers = [];
    }
  }

  /**
   * Process a single account (runs in parallel with other accounts)
   */
  async processAccount(account, allTags, config, accountIndex, options, utils) {
    const proxy = this.getProxyForAccount(account, config.proxies || [], accountIndex);
    const userAgent = utils.userAgents.getRandomUserAgent();
    
    this.emit('log', { type: 'info', message: `👤 [${account.username}] Starting...` });
    
    if (proxy) {
      this.emit('log', { type: 'info', message: `🌐 [${account.username}] Using proxy: ${proxy.address}:${proxy.port}` });
    } else {
      this.emit('log', { type: 'warning', message: `⚠️ [${account.username}] No proxy assigned` });
    }

    // Launch browser
    const launchOptions = {
      headless: options.headless !== false ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--start-maximized'
      ],
      defaultViewport: null // Use full screen size
    };

    // Setup proxy
    const { launchArgs, authenticateConfig } = utils.proxySetup.setupProxyArgs(proxy);
    launchOptions.args.push(...launchArgs);

    let browser = null;
    let page = null;

    try {
      browser = await puppeteer.launch(launchOptions);
      this.browsers.push(browser); // Track browser for cleanup
      page = await browser.newPage();

      // Setup human behavior
      await utils.humanBehavior.setupHumanBehavior(page);
      await page.setUserAgent(userAgent);

      // Apply proxy authentication
      if (authenticateConfig) {
        await utils.proxySetup.applyProxyAuthentication(page, authenticateConfig, account.username);
      }

      // Set headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });

      // Login - use custom login that emits logs
      this.emit('log', { type: 'info', message: `🔐 [${account.username}] Checking session...` });
      const loginResult = await this.loginWithLogs(page, account, utils);

      if (!loginResult.success) {
        this.emit('log', { type: 'error', message: `❌ [${account.username}] Login failed: ${loginResult.error}` });
        // Log to file as well
        utils.logger.logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
          status: loginResult.checkpoint ? 'CHECKPOINT' : (loginResult.blocked ? 'BLOCKED' : 'LOGIN_FAILED'),
          error: loginResult.error
        });
        return;
      }

      this.emit('log', { type: 'success', message: `✅ [${account.username}] Logged in successfully` });

      // Navigate to target post
      this.emit('log', { type: 'info', message: `📍 [${account.username}] Navigating to target post...` });
      await page.goto(config.targetPost, { waitUntil: 'networkidle2', timeout: 60000 });

      // Check if stopped
      if (this.shouldStop) {
        this.emit('log', { type: 'warning', message: `⏹️ [${account.username}] Stopping after navigation...` });
        return;
      }

      // Get only untagged users for this account (thread-safe via tagTracker)
      const tagsPerAccount = config.settings?.tagsPerAccount || 60;
      const untaggedForAccount = utils.tagTracker.getNextBatch(allTags, tagsPerAccount);
      
      if (untaggedForAccount.length === 0) {
        this.emit('log', { type: 'warning', message: `⚠️ [${account.username}] No more untagged users available` });
        return;
      }
      
      this.emit('log', { type: 'info', message: `📋 [${account.username}] Reserved ${untaggedForAccount.length} users to tag` });

      // Generate comment batches using settings from config
      const tagsPerCommentMin = config.settings?.tagsPerComment?.min || 10;
      const tagsPerCommentMax = config.settings?.tagsPerComment?.max || 12;
      
      const { commentBatches } = utils.tagDistribution.generateAccountCommentBatches(untaggedForAccount, {
        tagsPerAccount: untaggedForAccount.length,
        tagsPerComment: {
          min: tagsPerCommentMin,
          max: tagsPerCommentMax
        }
      });
      
      // Use commentsPerAccount from settings
      const commentsMin = config.settings?.commentsPerAccount?.min || 5;
      const commentsMax = config.settings?.commentsPerAccount?.max || 7;
      const commentsRange = commentsMax - commentsMin + 1;
      const commentsToPost = Math.min(commentBatches.length, Math.floor(Math.random() * commentsRange) + commentsMin);
      
      this.emit('log', { type: 'info', message: `📝 [${account.username}] Planning ${commentsToPost} comments (${tagsPerCommentMin}-${tagsPerCommentMax} tags each)` });

      // Post comments
      for (let i = 0; i < commentsToPost; i++) {
        if (this.shouldStop) {
          this.emit('log', { type: 'warning', message: `⏹️ [${account.username}] Stopping comment loop...` });
          // Release reserved tags that weren't posted
          for (let j = i; j < commentsToPost; j++) {
            if (commentBatches[j]) {
              utils.tagTracker.releaseTags(commentBatches[j]);
            }
          }
          break;
        }

        const tags = commentBatches[i];
        if (!tags || tags.length === 0) continue;

        // Format tags with @ for display (show all)
        const tagsDisplay = tags.map(t => `@${t}`).join(' ');
        this.emit('log', { type: 'info', message: `💬 [${account.username}] Comment ${i + 1}/${commentsToPost} (${tags.length} tags): ${tagsDisplay}` });

        const result = await this.postComment(page, tags, utils);

        if (this.shouldStop) {
          // Release tags if stopped during posting
          utils.tagTracker.releaseTags(tags);
          break;
        }

        if (result.success) {
          // Mark tags as successfully posted in global tracker
          utils.tagTracker.markAsTagged(tags);
          
          this.emit('log', { type: 'success', message: `✅ [${account.username}] Comment ${i + 1} posted (${tags.length} tags)` });
          this.stats.commentsPosted++;
          this.stats.successfulComments++;
          this.stats.tagsPosted += tags.length;
          
          // Log global progress
          const trackerStats = utils.tagTracker.getStats();
          this.emit('log', { type: 'info', message: `📊 Global progress: ${trackerStats.totalTagged} total tagged, ${trackerStats.pending} pending` });
          
          // Log to file
          utils.logger.logMention({
            account: account.username,
            proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
            status: 'SUCCESS',
            comment: tags.map(t => `@${t}`).join(' '),
            tagsCount: tags.length
          });
        } else {
          // Release tags back to pool if comment failed
          utils.tagTracker.releaseTags(tags);
          
          this.emit('log', { type: 'error', message: `❌ [${account.username}] Comment ${i + 1} failed: ${result.error}` });
          this.stats.failedComments++;
          
          // Log to file
          utils.logger.logMention({
            account: account.username,
            proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
            status: 'COMMENT_FAILED',
            comment: tags.map(t => `@${t}`).join(' '),
            tagsCount: tags.length,
            error: result.error
          });
          
          if (result.error.includes('blocked') || result.error.includes("Couldn't post")) {
            this.emit('log', { type: 'warning', message: `🚫 [${account.username}] Action blocked detected, skipping account` });
            // Release remaining tags
            for (let j = i + 1; j < commentsToPost; j++) {
              if (commentBatches[j]) {
                utils.tagTracker.releaseTags(commentBatches[j]);
              }
            }
            break;
          }
        }

        this.emitStats();

        // Delay between comments with human-like scrolling
        if (i < commentsToPost - 1 && !this.shouldStop) {
          const delayTime = Math.floor(Math.random() * 85000) + 35000; // 35-120 seconds
          this.emit('log', { type: 'info', message: `⏳ [${account.username}] Waiting ${Math.round(delayTime/1000)}s before next comment...` });
          
          // Do human-like scrolling while waiting
          await this.humanScrollWhileWaiting(page, delayTime, utils);
        }
      }

      // Only save cookies if not stopped
      if (!this.shouldStop) {
        this.emit('log', { type: 'info', message: `🍪 [${account.username}] Saving session...` });
        await utils.sessionManager.saveCookies(page, account.username);
        this.emit('log', { type: 'success', message: `✅ [${account.username}] Completed successfully` });
      }

    } catch (error) {
      // Only log error if not due to stop
      if (!this.shouldStop) {
        this.emit('log', { type: 'error', message: `🚫 [${account.username}] Error: ${error.message}` });
        
        // Log error to file
        utils.logger.logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
          status: 'ERROR',
          error: error.message
        });
      }
    } finally {
      if (browser) {
        try {
          // Remove from tracked browsers
          const browserIndex = this.browsers.indexOf(browser);
          if (browserIndex > -1) {
            this.browsers.splice(browserIndex, 1);
          }
          await browser.close();
        } catch (e) {
          // Browser might already be closed
        }
      }
    }
  }

  /**
   * Get random filler text to make comments look more natural
   * Returns text to add before, between, or after tags
   */
  getRandomFillerText() {
    const fillerOptions = [
      // Emojis only
      ['🔥', '❤️', '👀', '💯', '✨', '🙌', '👏', '😍', '🤩', '💪', '⚡', '🎯', '👑', '💫', '🌟'],
      // Short phrases
      ['check this', 'look at this', 'omg', 'wow', 'yoo', 'hey', 'lol', 'bruh', 'yo check', 'ayy'],
      // Phrases with emojis
      ['check this out 🔥', 'look 👀', 'yo 🙌', 'hey guys ✨', 'omg 😍', 'wow 🤩', 'yall see this 👀', 'bruh 💀'],
      // Call to action
      ['thoughts?', 'wdyt?', 'yall need to see', 'dont miss this', 'peep this', 'come see'],
      // Engagement phrases
      ['tag your friends', 'show your squad', 'who else?', 'anyone?', 'right?', 'agree?']
    ];
    
    // Pick a random category then random item
    const category = fillerOptions[Math.floor(Math.random() * fillerOptions.length)];
    return category[Math.floor(Math.random() * category.length)];
  }

  /**
   * Get random emoji to sprinkle between tags
   */
  getRandomEmoji() {
    const emojis = ['🔥', '❤️', '👀', '💯', '✨', '🙌', '👏', '😍', '🤩', '💪', '⚡', '🎯', '👑', '💫', '🌟', '😎', '🤙', '💥', '🎉', '👊'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  /**
   * Post a comment with tags and random filler text for natural appearance
   * Makes comments look more human-like to avoid detection
   */
  async postComment(page, tags, utils) {
    try {
      const commentSelectors = [
        'textarea[aria-label="Add a comment…"]',
        'textarea[placeholder="Add a comment…"]',
        'form textarea',
        'textarea[autocomplete="off"]'
      ];

      // Find and click textarea
      let textarea = null;
      for (const selector of commentSelectors) {
        try {
          await page.waitForSelector(selector, { visible: true, timeout: 10000 });
          textarea = await page.$(selector);
          if (textarea) break;
        } catch (e) {
          continue;
        }
      }

      if (!textarea) {
        return { success: false, error: 'Comment textarea not found', tagsPosted: 0 };
      }

      // Click textarea to focus
      await textarea.click();
      await utils.humanBehavior.humanPause(0.5, 1);

      // Decide comment structure randomly for variety
      const structureType = Math.floor(Math.random() * 5);
      // 0: filler + tags
      // 1: tags + filler
      // 2: filler + tags + emoji
      // 3: tags only (sometimes plain is fine)
      // 4: emoji + tags + filler

      // Helper to type text naturally
      const typeText = async (text) => {
        for (const char of text) {
          await page.keyboard.type(char, { delay: utils.delay.getTypingDelay() });
          if (Math.random() < 0.1) {
            await utils.humanBehavior.randomWait(50, 150);
          }
        }
        await page.keyboard.type(' ', { delay: utils.delay.getTypingDelay() });
        await utils.humanBehavior.randomWait(150, 300);
      };

      // Add prefix based on structure
      if (structureType === 0 || structureType === 2) {
        await typeText(this.getRandomFillerText());
      } else if (structureType === 4) {
        await typeText(this.getRandomEmoji());
      }

      // Type each @username with human-like typing
      for (let i = 0; i < tags.length; i++) {
        let tag = tags[i];
        
        // Ensure tag starts with @
        if (!tag.startsWith('@')) {
          tag = `@${tag}`;
        }

        // Type the @username character by character (human-like)
        for (const char of tag) {
          await page.keyboard.type(char, { delay: utils.delay.getTypingDelay() });
          // Random micro-pauses for human feel
          if (Math.random() < 0.15) {
            await utils.humanBehavior.randomWait(100, 300);
          }
        }

        // Add space after username
        await page.keyboard.type(' ', { delay: utils.delay.getTypingDelay() });

        // Small pause between usernames
        await utils.humanBehavior.randomWait(200, 400);

        // Occasionally add emoji between tags (15% chance, not on last tag)
        if (i < tags.length - 1 && Math.random() < 0.15) {
          await typeText(this.getRandomEmoji());
        }
      }

      // Add suffix based on structure
      if (structureType === 1 || structureType === 4) {
        await typeText(this.getRandomFillerText());
      } else if (structureType === 2) {
        await typeText(this.getRandomEmoji());
      }

      // Wait a moment for any popover to appear
      await utils.humanBehavior.randomWait(500, 800);

      // Press Escape to close any mention popover
      await page.keyboard.press('Escape');
      await utils.humanBehavior.randomWait(300, 500);

      // Wait before clicking Post
      await utils.humanBehavior.humanPause(0.3, 0.6);

      // Find and click the Post button
      const postClicked = await page.evaluate(() => {
        // Find all clickable elements with "Post" text
        const allElements = document.querySelectorAll('div[role="button"], button, span');
        for (const el of allElements) {
          const text = el.textContent.trim();
          if (text === 'Post') {
            el.click();
            return true;
          }
        }
        return false;
      });

      if (!postClicked) {
        // Fallback: press Enter to submit
        this.emit('log', { type: 'info', message: 'Post button not found, using Enter key' });
        await page.keyboard.press('Enter');
      }

      // Wait for comment to be posted
      await utils.humanBehavior.randomWait(3000, 5000);

      // Check for "Couldn't post comment" error
      const errorDetected = await page.evaluate(() => {
        const errorTexts = [
          "Couldn't post comment",
          "couldn't post comment",
          "Try again later",
          "try again later",
          "Action Blocked",
          "action blocked"
        ];
        const bodyText = document.body.innerText;
        return errorTexts.some(text => bodyText.includes(text));
      });

      if (errorDetected) {
        return { success: false, error: "Couldn't post comment - Instagram blocked this action", tagsPosted: 0 };
      }

      return { success: true, error: null, tagsPosted: tags.length };

    } catch (error) {
      return { success: false, error: error.message, tagsPosted: 0 };
    }
  }

  /**
   * Get proxy for account
   */
  /**
   * Get a random proxy from the list (more unpredictable, harder to detect)
   */
  getRandomProxy(globalProxies) {
    if (!globalProxies || globalProxies.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * globalProxies.length);
    return globalProxies[randomIndex];
  }

  /**
   * Get proxy for an account - uses random selection for better anonymity
   */
  getProxyForAccount(account, globalProxies, accountIndex) {
    // Account-specific proxies take priority
    if (account.proxies && account.proxies.length > 0) {
      const randomIndex = Math.floor(Math.random() * account.proxies.length);
      return account.proxies[randomIndex];
    }
    if (account.proxy?.address) {
      return account.proxy;
    }
    // Use random proxy from global list
    return this.getRandomProxy(globalProxies);
  }

  /**
   * Login with logging to UI
   * Custom login handler that emits detailed logs
   */
  async loginWithLogs(page, account, utils) {
    const COOKIES_DIR = path.join(__dirname, '..', 'cookies');
    const cookiePath = path.join(COOKIES_DIR, `${account.username}.json`);
    
    // Try to restore session from cookies first
    if (fs.existsSync(cookiePath)) {
      try {
        const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
        const now = Date.now() / 1000;
        const validCookies = cookies.filter(c => !c.expires || c.expires > now);
        
        if (validCookies.length > 0) {
          this.emit('log', { type: 'info', message: `🍪 Loading ${validCookies.length} cookies for ${account.username}` });
          await page.setCookie(...validCookies);
          
          // Go to Instagram and check if logged in
          await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 60000 });
          
          const isLoggedIn = await page.evaluate(() => {
            return document.querySelector('svg[aria-label="Home"]') !== null ||
                   document.querySelector('a[href="/"]') !== null;
          });
          
          if (isLoggedIn) {
            this.emit('log', { type: 'success', message: `🍪 Session restored for ${account.username}` });
            return { success: true, checkpoint: false, blocked: false, error: null };
          }
          
          this.emit('log', { type: 'warning', message: `🍪 Session expired for ${account.username}, logging in fresh...` });
        }
      } catch (e) {
        this.emit('log', { type: 'warning', message: `⚠️ Failed to load cookies: ${e.message}` });
      }
    }
    
    // No valid session, need to login
    this.emit('log', { type: 'info', message: `🔐 No valid session for ${account.username}, logging in...` });
    
    const loginUrl = 'https://www.instagram.com/accounts/login/';
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.emit('log', { type: 'info', message: `🔐 Login attempt ${attempt}/${maxRetries} for ${account.username}` });
        
        await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Handle cookie consent popup
        try {
          const acceptCookiesBtn = await page.$('button[class*="aOOlW"]');
          if (acceptCookiesBtn) {
            await acceptCookiesBtn.click();
            await this.sleep(1000);
          }
        } catch (e) {
          // Cookie popup might not appear
        }
        
        // Wait for login form
        await page.waitForSelector('input[name="username"]', { visible: true, timeout: 20000 });
        
        // Type username
        const usernameInput = await page.$('input[name="username"]');
        await usernameInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        
        for (const char of account.username) {
          await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
        }
        
        // Type password
        await page.click('input[name="password"]');
        for (const char of account.password) {
          await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
        }
        
        // Submit
        await page.keyboard.press('Enter');
        this.emit('log', { type: 'info', message: `⏳ Waiting for login response...` });
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        
        const currentUrl = page.url();
        
        // Check for checkpoint
        if (currentUrl.includes('challenge') || currentUrl.includes('checkpoint')) {
          this.emit('log', { type: 'warning', message: `⚠️ Checkpoint detected for ${account.username}` });
          return { success: false, checkpoint: true, blocked: false, error: 'Checkpoint required' };
        }
        
        // Check for blocked
        const blockedText = await page.evaluate(() => {
          const body = document.body.innerText.toLowerCase();
          return body.includes('action blocked') || body.includes('try again later') ||
                 body.includes('suspicious activity') || body.includes('we restrict certain');
        });
        
        if (blockedText) {
          this.emit('log', { type: 'error', message: `🚫 Account ${account.username} is blocked` });
          return { success: false, checkpoint: false, blocked: true, error: 'Action blocked' };
        }
        
        // Check for wrong credentials
        const wrongCredentials = await page.$('p[data-testid="login-error-message"]');
        if (wrongCredentials) {
          const errorText = await wrongCredentials.evaluate(el => el.textContent);
          this.emit('log', { type: 'error', message: `❌ Login error: ${errorText}` });
          return { success: false, checkpoint: false, blocked: false, error: errorText };
        }
        
        // Verify login success
        const isLoggedIn = await page.evaluate(() => {
          return document.querySelector('svg[aria-label="Home"]') !== null ||
                 document.querySelector('a[href="/"]') !== null ||
                 window.location.pathname === '/';
        });
        
        if (isLoggedIn || !currentUrl.includes('login')) {
          this.emit('log', { type: 'success', message: `✅ Successfully logged in as ${account.username}` });
          
          // Save cookies
          const cookies = await page.cookies();
          if (!fs.existsSync(COOKIES_DIR)) {
            fs.mkdirSync(COOKIES_DIR, { recursive: true });
          }
          fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
          this.emit('log', { type: 'info', message: `🍪 Cookies saved for ${account.username}` });
          
          return { success: true, checkpoint: false, blocked: false, error: null };
        }
        
        this.emit('log', { type: 'warning', message: `⚠️ Login verification failed, retrying...` });
        
      } catch (error) {
        this.emit('log', { type: 'error', message: `❌ Login attempt ${attempt} error: ${error.message}` });
        if (attempt === maxRetries) {
          return { success: false, checkpoint: false, blocked: false, error: error.message };
        }
      }
      
      // Wait before retry
      await this.sleep(2000);
    }
    
    return { success: false, checkpoint: false, blocked: false, error: 'Max retries exceeded' };
  }

  /**
   * Stop the automation
   */
  async stop() {
    if (!this.isRunning && !this.shouldStop) {
      return; // Already stopped
    }
    
    this.shouldStop = true;
    this.emit('log', { type: 'warning', message: '⏹️ Stop requested. Finishing current task...' });
    this.emit('status', { status: 'stopping', message: 'Stopping automation...' });
    
    // Close browser immediately to interrupt any ongoing operations
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        // Browser might already be closed
      }
      this.browser = null;
    }
    
    this.isRunning = false;
    this.emit('log', { type: 'info', message: '✅ Automation stopped by user' });
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      accountsProcessed: 0,
      commentsPosted: 0,
      tagsPosted: 0,
      successfulComments: 0,
      failedComments: 0
    };
  }

  /**
   * Emit current stats
   */
  emitStats() {
    const successRate = this.stats.commentsPosted > 0 
      ? Math.round((this.stats.successfulComments / this.stats.commentsPosted) * 100)
      : 0;

    this.emit('stats', {
      accounts: this.stats.accountsProcessed,
      comments: this.stats.commentsPosted,
      tags: this.stats.tagsPosted,
      successRate
    });
  }

  /**
   * Human-like scrolling while waiting between actions
   * Scrolls up and down randomly to mimic real user behavior
   */
  async humanScrollWhileWaiting(page, totalWaitTime, utils) {
    const startTime = Date.now();
    const endTime = startTime + totalWaitTime;
    
    while (Date.now() < endTime && !this.shouldStop) {
      try {
        // Random pause between scroll actions (2-8 seconds)
        const pauseTime = Math.floor(Math.random() * 6000) + 2000;
        await this.sleep(Math.min(pauseTime, endTime - Date.now()));
        
        if (Date.now() >= endTime || this.shouldStop) break;
        
        // Random scroll direction and amount
        const scrollUp = Math.random() > 0.4; // 40% chance to scroll up, 60% down
        const scrollAmount = Math.floor(Math.random() * 400) + 100; // 100-500px
        
        await page.evaluate((amount, up) => {
          const direction = up ? -1 : 1;
          window.scrollBy({
            top: amount * direction,
            behavior: 'smooth'
          });
        }, scrollAmount, scrollUp);
        
        // Small pause after scroll (0.3-1s)
        await this.sleep(Math.floor(Math.random() * 700) + 300);
        
        // Occasionally do a longer pause like reading content (10% chance)
        if (Math.random() < 0.1) {
          const readTime = Math.floor(Math.random() * 3000) + 2000; // 2-5s
          await this.sleep(Math.min(readTime, endTime - Date.now()));
        }
        
      } catch (e) {
        // Page might have navigated or closed, just continue waiting
        await this.sleep(1000);
      }
    }
  }

  /**
   * Sleep helper - can be interrupted by stop
   */
  sleep(ms) {
    return new Promise(resolve => {
      const checkInterval = 500; // Check every 500ms
      let elapsed = 0;
      
      const timer = setInterval(() => {
        elapsed += checkInterval;
        if (this.shouldStop || elapsed >= ms) {
          clearInterval(timer);
          resolve();
        }
      }, checkInterval);
    });
  }
}

module.exports = AutomationRunner;
