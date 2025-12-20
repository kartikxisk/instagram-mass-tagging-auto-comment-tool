/**
 * Instagram Mass Tagging Automation
 * 
 * Features:
 * - Multi-account support (500-700 accounts)
 * - Batch processing (100 accounts per batch)
 * - Safety rules to avoid bans
 * - Proxy support (HTTP/SOCKS5)
 * - Cookie persistence
 * - Human-like behavior simulation
 * - Comprehensive logging
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Utilities
const { createSession, saveCookies } = require('./utils/sessionManager');
const { loadAllUsernames, getNextBatch } = require('./utils/parseExcel');
const { 
  delay, 
  randomDelay, 
  delayBetweenComments, 
  delayBetweenAccounts, 
  longPause,
  getSessionDuration,
  getTypingDelay 
} = require('./utils/delay');
const { logMention, SessionStats, STATUS } = require('./utils/logger');
const { setupProxyArgs, applyProxyAuthentication } = require('./utils/proxySetup');
const { getRandomUserAgent } = require('./utils/userAgents');
const { generateAccountCommentBatches, buildCommentString } = require('./utils/tagDistribution');
const { 
  randomScroll, 
  humanType, 
  humanPause, 
  simulateReading,
  setupHumanBehavior,
  randomWait
} = require('./utils/humanBehavior');

require('dotenv').config();

// Configuration
const CONFIG_PATH = './config/accounts.json';
const USERNAMES_PATH = './data/usernames.xlsx';

// Load configuration
let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (error) {
  console.error('❌ Failed to load config:', error.message);
  process.exit(1);
}

// Global statistics
const stats = new SessionStats();

// Global comment counter for long pause trigger
let globalCommentCount = 0;

/**
 * Get proxy for an account (either assigned or from pool)
 * @param {Object} account - Account object
 * @param {number} index - Account index for proxy rotation
 * @returns {Object|null} - Proxy configuration
 */
function getProxyForAccount(account, index) {
  // If account has its own proxy, use it
  if (account.proxy && account.proxy.address) {
    return account.proxy;
  }
  
  // Otherwise, rotate from proxy pool
  const proxies = config.proxies || [];
  if (proxies.length > 0) {
    return proxies[index % proxies.length];
  }
  
  return null;
}

/**
 * Check for action blocked or error popups
 * @param {Object} page - Puppeteer page
 * @returns {Object} - { blocked: boolean, checkpoint: boolean, message: string }
 */
async function checkForErrors(page) {
  try {
    // Check for action blocked
    const isBlocked = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return bodyText.includes('action blocked') || 
             bodyText.includes('try again later') ||
             bodyText.includes('we restrict certain') ||
             bodyText.includes('suspicious activity');
    });
    
    if (isBlocked) {
      return { blocked: true, checkpoint: false, message: 'Action blocked detected' };
    }
    
    // Check for checkpoint
    const url = page.url();
    if (url.includes('challenge') || url.includes('checkpoint')) {
      return { blocked: false, checkpoint: true, message: 'Checkpoint required' };
    }
    
    // Check for error popup
    const errorPopup = await page.$('div[role="alert"]');
    if (errorPopup) {
      const message = await errorPopup.evaluate(el => el.innerText);
      return { blocked: false, checkpoint: false, message };
    }
    
    return { blocked: false, checkpoint: false, message: null };
  } catch (error) {
    return { blocked: false, checkpoint: false, message: null };
  }
}

/**
 * Post a comment with tags using human-like behavior
 * @param {Object} page - Puppeteer page
 * @param {string[]} tags - Array of usernames to tag
 * @param {Object} account - Account object
 * @returns {Object} - { success: boolean, error: string }
 */
async function postComment(page, tags, account) {
  try {
    // Check for errors before attempting
    const preCheck = await checkForErrors(page);
    if (preCheck.blocked || preCheck.checkpoint) {
      return { success: false, error: preCheck.message };
    }
    
    // Comment box selectors (multiple for resilience)
    const commentSelectors = [
      'textarea[aria-label="Add a comment…"]',
      'textarea[placeholder="Add a comment…"]',
      'form textarea',
      'textarea[autocomplete="off"]'
    ];
    
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
      return { success: false, error: 'Comment textarea not found' };
    }
    
    // Click on textarea to focus
    await textarea.click();
    await humanPause(0.5, 1);
    
    // Build the comment with tags
    const comment = buildCommentString(tags, true);
    
    // Type each tag with mentions
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const mention = `@${tag}`;
      
      // Type the @ symbol
      await page.keyboard.type('@', { delay: getTypingDelay() });
      await randomWait(200, 500);
      
      // Type the username character by character
      for (const char of tag) {
        await page.keyboard.type(char, { delay: getTypingDelay() });
        await randomWait(50, 150);
      }
      
      // Wait for autocomplete dropdown
      await randomWait(1000, 2000);
      
      // Select from dropdown (press down then enter)
      await page.keyboard.press('ArrowDown');
      await randomWait(200, 400);
      await page.keyboard.press('Enter');
      await randomWait(300, 600);
      
      // Add space after tag
      await page.keyboard.type(' ', { delay: getTypingDelay() });
      await randomWait(100, 300);
    }
    
    // Optionally add a suffix (emoji or text)
    if (Math.random() > 0.3) {
      const suffixes = ['🔥', '❤️', '💯', '✨', '👆', '💪', ''];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      if (suffix) {
        await humanPause(0.3, 0.8);
        await page.keyboard.type(suffix);
      }
    }
    
    // Small pause before posting
    await humanPause(0.5, 1.5);
    
    // Submit the comment (Enter key)
    await page.keyboard.press('Enter');
    
    // Wait for comment to be posted
    await randomWait(2000, 4000);
    
    // Check for errors after posting
    const postCheck = await checkForErrors(page);
    if (postCheck.blocked) {
      return { success: false, error: 'Action blocked after posting' };
    }
    if (postCheck.message && postCheck.message.includes('error')) {
      return { success: false, error: postCheck.message };
    }
    
    return { success: true, error: null };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process a single account
 * @param {Object} account - Account object
 * @param {string[]} allTags - All available tags
 * @param {string} targetPost - Target post URL
 * @param {number} accountIndex - Index for proxy rotation
 * @returns {Object} - Account result
 */
async function processAccount(account, allTags, targetPost, accountIndex) {
  const proxy = getProxyForAccount(account, accountIndex);
  const userAgent = getRandomUserAgent();
  const sessionDuration = getSessionDuration();
  const sessionStart = Date.now();
  
  const accountResult = {
    username: account.username,
    commentsPosted: 0,
    tagsPosted: 0,
    status: 'unknown',
    errors: []
  };
  
  // Generate comment batches for this account
  const { commentBatches } = generateAccountCommentBatches(allTags);
  const commentsToPost = Math.min(
    commentBatches.length,
    Math.floor(Math.random() * 3) + 5 // 5-7 comments
  );
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`👤 Processing account: ${account.username}`);
  console.log(`🔗 Target: ${targetPost}`);
  console.log(`📝 Comments planned: ${commentsToPost}`);
  console.log(`⏱️  Session duration: ${Math.round(sessionDuration / 60000)} minutes`);
  if (proxy) {
    console.log(`🌐 Proxy: ${proxy.address}:${proxy.port}`);
  }
  console.log(`🌐 User Agent: ${userAgent.substring(0, 50)}...`);
  console.log('='.repeat(50));
  
  // Puppeteer launch options
  const launchOptions = {
    headless: false, // Set to true for production
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080'
    ],
    defaultViewport: null
  };
  
  // Setup proxy
  const { launchArgs, authenticateConfig } = setupProxyArgs(proxy);
  launchOptions.args.push(...launchArgs);
  
  let browser = null;
  
  try {
    // Launch browser
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // Setup human behavior
    await setupHumanBehavior(page);
    
    // Set user agent
    await page.setUserAgent(userAgent);
    
    // Apply proxy authentication
    if (authenticateConfig) {
      await applyProxyAuthentication(page, authenticateConfig, account.username);
    }
    
    // Set extra HTTP headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    // Login / restore session
    console.log(`🔐 Logging in as ${account.username}...`);
    const loginResult = await createSession(page, account);
    
    if (!loginResult.success) {
      if (loginResult.checkpoint) {
        console.log(`⚠️ Checkpoint required for ${account.username}`);
        stats.recordCheckpoint(account.username);
        accountResult.status = 'checkpoint';
        logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
          status: STATUS.CHECKPOINT,
          error: 'Checkpoint required'
        });
        return accountResult;
      }
      
      if (loginResult.blocked) {
        console.log(`🚫 Account ${account.username} is blocked`);
        stats.recordBlocked(account.username);
        accountResult.status = 'blocked';
        logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
          status: STATUS.BLOCKED,
          error: 'Account blocked'
        });
        return accountResult;
      }
      
      console.log(`❌ Login failed for ${account.username}: ${loginResult.error}`);
      stats.recordLoginFailure(account.username, loginResult.error);
      accountResult.status = 'login_failed';
      logMention({
        account: account.username,
        proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
        status: STATUS.LOGIN_FAILED,
        error: loginResult.error
      });
      return accountResult;
    }
    
    console.log(`✅ Logged in as ${account.username}`);
    
    // Navigate to target post
    console.log(`📍 Navigating to target post...`);
    await page.goto(targetPost, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Simulate human reading behavior
    console.log(`👀 Simulating reading behavior...`);
    await simulateReading(page, Math.floor(Math.random() * 5) + 3); // 3-8 seconds
    
    // Random scroll before commenting
    await randomScroll(page, Math.floor(Math.random() * 3) + 2);
    
    // Post comments
    for (let i = 0; i < commentsToPost; i++) {
      // Check session duration
      if (Date.now() - sessionStart > sessionDuration) {
        console.log(`⏱️ Session time limit reached for ${account.username}`);
        break;
      }
      
      const tags = commentBatches[i];
      if (!tags || tags.length === 0) continue;
      
      console.log(`💬 Posting comment ${i + 1}/${commentsToPost} with ${tags.length} tags...`);
      
      const result = await postComment(page, tags, account);
      
      if (result.success) {
        console.log(`✅ Comment ${i + 1} posted successfully`);
        stats.recordSuccess(tags.length);
        accountResult.commentsPosted++;
        accountResult.tagsPosted += tags.length;
        globalCommentCount++;
        
        logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
          status: STATUS.SUCCESS,
          comment: tags.map(t => `@${t}`).join(' '),
          tagsCount: tags.length
        });
        
        // Check if we need a long pause
        if (globalCommentCount > 0 && globalCommentCount % 50 === 0) {
          console.log(`\n⏸️ Reached ${globalCommentCount} comments, taking a long break...`);
          await longPause();
        }
        
      } else {
        console.log(`❌ Comment ${i + 1} failed: ${result.error}`);
        stats.recordFailure(result.error);
        accountResult.errors.push(result.error);
        
        logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
          status: STATUS.COMMENT_FAILED,
          comment: tags.map(t => `@${t}`).join(' '),
          tagsCount: tags.length,
          error: result.error
        });
        
        // If blocked, stop this account
        if (result.error.includes('blocked')) {
          stats.recordBlocked(account.username);
          accountResult.status = 'blocked';
          break;
        }
      }
      
      // Delay between comments (35-120 seconds)
      if (i < commentsToPost - 1) {
        await delayBetweenComments();
      }
    }
    
    // Save cookies before closing
    await saveCookies(page, account.username);
    
    accountResult.status = accountResult.commentsPosted > 0 ? 'success' : 'failed';
    stats.recordAccountProcessed();
    
    console.log(`\n📊 Account ${account.username} summary:`);
    console.log(`   Comments: ${accountResult.commentsPosted}`);
    console.log(`   Tags: ${accountResult.tagsPosted}`);
    console.log(`   Status: ${accountResult.status}`);
    
  } catch (error) {
    console.error(`🚫 Error processing ${account.username}: ${error.message}`);
    accountResult.status = 'error';
    accountResult.errors.push(error.message);
    stats.recordFailure(error.message);
    
    logMention({
      account: account.username,
      proxy: proxy ? `${proxy.address}:${proxy.port}` : '',
      status: STATUS.FAILED,
      error: error.message
    });
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return accountResult;
}

/**
 * Process a batch of accounts
 * @param {Object[]} accounts - Array of account objects
 * @param {string[]} allTags - All available tags
 * @param {string} targetPost - Target post URL
 * @param {number} batchIndex - Batch number
 * @param {number} startIndex - Starting index for proxy rotation
 */
async function processBatch(accounts, allTags, targetPost, batchIndex, startIndex) {
  console.log(`\n${'#'.repeat(60)}`);
  console.log(`# BATCH ${batchIndex + 1} - Processing ${accounts.length} accounts`);
  console.log(`${'#'.repeat(60)}`);
  
  const results = [];
  
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const accountIndex = startIndex + i;
    
    try {
      const result = await processAccount(account, allTags, targetPost, accountIndex);
      results.push(result);
      
      // Skip blocked or checkpoint accounts
      if (result.status === 'blocked' || result.status === 'checkpoint') {
        console.log(`⏭️ Skipping to next account due to ${result.status}`);
      }
      
    } catch (error) {
      console.error(`🚫 Batch error for ${account.username}: ${error.message}`);
      results.push({
        username: account.username,
        status: 'error',
        error: error.message
      });
    }
    
    // Delay between accounts (5-20 seconds)
    if (i < accounts.length - 1) {
      await delayBetweenAccounts();
    }
  }
  
  // Batch summary
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => ['failed', 'error', 'login_failed'].includes(r.status)).length;
  const blocked = results.filter(r => r.status === 'blocked').length;
  const checkpoint = results.filter(r => r.status === 'checkpoint').length;
  
  console.log(`\n📊 Batch ${batchIndex + 1} Summary:`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Blocked: ${blocked}`);
  console.log(`   Checkpoint: ${checkpoint}`);
  
  return results;
}

/**
 * Main execution function
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     INSTAGRAM MASS TAGGING AUTOMATION                     ║
║     Safety-First Approach                                 ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Validate configuration
  const accounts = config.accounts || [];
  const targetPost = config.targetPost || process.env.POST_URL;
  
  if (accounts.length === 0) {
    console.error('❌ No accounts found in configuration');
    process.exit(1);
  }
  
  if (!targetPost) {
    console.error('❌ No target post URL specified. Set POST_URL in .env or targetPost in config');
    process.exit(1);
  }
  
  console.log(`📋 Configuration:`);
  console.log(`   Accounts: ${accounts.length}`);
  console.log(`   Target Post: ${targetPost}`);
  console.log(`   Proxies Available: ${(config.proxies || []).length}`);
  console.log(`   Batch Size: ${config.settings?.accountsPerBatch || 100}`);
  
  // Load usernames for tagging
  loadAllUsernames(USERNAMES_PATH);
  
  // Get all tags
  const allTags = [];
  let batch;
  while ((batch = getNextBatch(100)).length > 0) {
    allTags.push(...batch);
  }
  
  if (allTags.length === 0) {
    console.error('❌ No usernames found in Excel file');
    process.exit(1);
  }
  
  console.log(`🏷️  Total tags available: ${allTags.length}`);
  
  // Calculate batches
  const batchSize = config.settings?.accountsPerBatch || 100;
  const batches = [];
  for (let i = 0; i < accounts.length; i += batchSize) {
    batches.push(accounts.slice(i, i + batchSize));
  }
  
  console.log(`📦 Total batches: ${batches.length}`);
  console.log(`\n🚀 Starting automation...\n`);
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const startIndex = i * batchSize;
    
    await processBatch(batch, allTags, targetPost, i, startIndex);
    
    // Pause between batches
    if (i < batches.length - 1) {
      console.log(`\n⏸️ Batch complete. Waiting before next batch...`);
      await randomDelay(30000, 60000); // 30-60 seconds between batches
    }
  }
  
  // Final summary
  stats.printSummary();
  stats.saveSummary();
  
  console.log(`\n✅ Automation complete!`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Received interrupt signal...');
  stats.printSummary();
  stats.saveSummary();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  stats.saveSummary();
});

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  stats.saveSummary();
  process.exit(1);
});
