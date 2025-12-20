const puppeteer = require('puppeteer');
const fs = require('fs');
const { createSession } = require('./utils/sessionManager');
const { loadAllUsernames, getNextBatch } = require('./utils/parseExcel');
const { delay } = require('./utils/delay');
const { logMention } = require('./utils/logger');
const { setupProxyArgs, applyProxyAuthentication } = require('./utils/proxySetup');
require('dotenv').config();

const POST_URL = process.env.POST_URL;
const PARALLEL_ACCOUNTS = parseInt(process.env.PARALLEL_ACCOUNTS) || 3;

/**
 * Posts a comment tagging multiple usernames properly.
 */
async function postComment(page, usernamesBatch, account) {
  try {
    const commentAreaSelector = 'textarea[aria-label="Add a comment…"]';
    await page.waitForSelector(commentAreaSelector, { visible: true, timeout: 20000 });
    const textarea = await page.$(commentAreaSelector);
    await textarea.focus();

    for (const username of usernamesBatch) {
      const mentionText = `@${username}`;

      for (const char of mentionText) {
        await page.keyboard.sendCharacter(char);
        await delay(200);
      }

      await delay(1500);
      await page.keyboard.press('ArrowDown');
      await delay(300);
      await page.keyboard.press('Enter');
      await delay(500);
      await page.keyboard.sendCharacter(' ');
    }

    await delay(1000);
    await page.keyboard.press('Enter');

    await delay(3000);

    const failurePopup = await page.$('div[role="alert"]');
    if (failurePopup) {
      const popupText = await failurePopup.evaluate(el => el.innerText);
      console.error(`⚠️ Comment failed for ${account.username}: ${popupText}`);
      logMention({
        account: account.username,
        status: 'Failed',
        comment: usernamesBatch.join(', '),
        error: popupText
      });
    } else {
      console.log(`✅ Comment posted by ${account.username}: ${usernamesBatch.join(', ')}`);
      logMention({
        account: account.username,
        status: 'Success',
        comment: usernamesBatch.join(', ')
      });
    }

    await delay(5000);
  } catch (error) {
    console.error(`❌ Exception while posting comment for ${account.username}: ${error.message}`);
    logMention({
      account: account.username,
      status: 'Failed',
      comment: usernamesBatch.join(', '),
      error: error.message
    });
  }
}

/**
 * Logs in with a given account and posts the comment.
 */
async function commentWithAccount(account, usernamesBatch) {
  const launchOptions = {
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ],
    defaultViewport: null
  };

  // Setup proxy configuration
  const { launchArgs, authenticateConfig } = setupProxyArgs(account.proxy);
  launchOptions.args.push(...launchArgs);

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    // Apply proxy authentication if needed
    if (authenticateConfig) {
      await applyProxyAuthentication(page, authenticateConfig, account.username);
    }

    console.log(`\n🔐 Logging in with account: ${account.username}`);
    await createSession(page, account);

    console.log(`➡️ Navigating to post...`);
    await page.goto(POST_URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    await page.waitForSelector('textarea[aria-label="Add a comment…"]', { 
      visible: true,
      timeout: 20000
    });
    console.log(`📢 Ready to post comment with ${account.username}`);

    await postComment(page, usernamesBatch, account);
  } catch (err) {
    console.error(`🚫 Error with account ${account.username}: ${err.message}`);
  } finally {
    await browser.close();
  }
}


/**
 * Main Execution
 */
(async () => {
  try {
    const accounts = JSON.parse(fs.readFileSync('./config/accounts.json'));
    loadAllUsernames('./data/usernames.xlsx');

    let accountIndex = 0;

    while (true) {
      const tasks = [];

      for (let i = 0; i < PARALLEL_ACCOUNTS; i++) {
        const batch = getNextBatch(5);
        if (batch.length === 0) break;

        const currentAccount = accounts[accountIndex % accounts.length];

        console.log(`\n🔄 Using account: ${currentAccount.username} for next batch: ${batch.join(', ')}`);

        tasks.push(commentWithAccount(currentAccount, batch));

        accountIndex++;
        await delay(1000);
      }

      if (tasks.length === 0) {
        console.log('🎉 All usernames commented successfully!');
        break;
      }

      await Promise.all(tasks);

      console.log('⏸️ Waiting before next round...');
      await delay(3000);
    }

  } catch (err) {
    console.error(`🔥 Fatal error: ${err.message}`);
  }
})();
