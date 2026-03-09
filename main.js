/**
 * Instagram Mass Tagging Automation
 *
 * Features:
 * - Multi-account support (500-700 accounts)
 * - Batch processing (100 accounts per batch)
 * - Advanced anti-detection with fingerprinting
 * - Human-like behavior simulation
 * - Proxy support (HTTP/SOCKS5)
 * - Cookie persistence
 * - Session warmup
 * - Time-of-day activity patterns
 * - Comprehensive logging
 */

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Find the system-installed Chrome/Chromium browser path
 * Supports macOS, Windows, and Linux
 * @returns {string|null} Path to Chrome executable or null if not found
 */
function findSystemChrome() {
  const platform = process.platform;

  // Common Chrome paths for each OS
  const chromePaths = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
      `${process.env.HOME}/Applications/Chromium.app/Contents/MacOS/Chromium`,
    ],
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
      "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      "C:\\Program Files\\Chromium\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`,
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
      "/usr/bin/brave-browser",
      "/opt/google/chrome/chrome",
      "/opt/google/chrome/google-chrome",
      "/opt/chromium/chromium",
      `${process.env.HOME}/.local/bin/google-chrome`,
    ],
  };

  const paths = chromePaths[platform] || [];

  // Check each path
  for (const chromePath of paths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Try to find Chrome using 'which' command on Unix systems
  if (platform === "darwin" || platform === "linux") {
    try {
      const whichResult = execSync(
        "which google-chrome || which google-chrome-stable || which chromium || which chromium-browser",
        {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        },
      ).trim();
      if (whichResult && fs.existsSync(whichResult)) {
        return whichResult;
      }
    } catch (e) {
      // Command failed, Chrome not in PATH
    }
  }

  // Try Windows registry as last resort
  if (platform === "win32") {
    try {
      const regResult = execSync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve',
        {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      const match = regResult.match(/REG_SZ\s+(.+)/);
      if (match && match[1] && fs.existsSync(match[1].trim())) {
        return match[1].trim();
      }
    } catch (e) {
      // Registry query failed
    }
  }

  return null;
}

// Apply stealth plugin with all evasions
const stealth = StealthPlugin();
// Enable all evasion techniques
stealth.enabledEvasions.add("chrome.app");
stealth.enabledEvasions.add("chrome.csi");
stealth.enabledEvasions.add("chrome.loadTimes");
stealth.enabledEvasions.add("chrome.runtime");
stealth.enabledEvasions.add("defaultArgs");
stealth.enabledEvasions.add("iframe.contentWindow");
stealth.enabledEvasions.add("media.codecs");
stealth.enabledEvasions.add("navigator.hardwareConcurrency");
stealth.enabledEvasions.add("navigator.languages");
stealth.enabledEvasions.add("navigator.permissions");
stealth.enabledEvasions.add("navigator.plugins");
stealth.enabledEvasions.add("navigator.webdriver");
stealth.enabledEvasions.add("sourceurl");
stealth.enabledEvasions.add("user-agent-override");
stealth.enabledEvasions.add("webgl.vendor");
stealth.enabledEvasions.add("window.outerdimensions");
puppeteer.use(stealth);

// Utilities
const { createSession, saveCookies } = require("./utils/sessionManager");
const { loadAllUsernames, getNextBatch } = require("./utils/parseExcel");
const {
  delay,
  randomDelay,
  delayBetweenComments,
  delayBetweenAccounts,
  longPause,
  getSessionDuration,
  getTypingDelay,
  checkCooldown,
  getTimeMultiplier,
} = require("./utils/delay");
const { logMention, SessionStats, STATUS } = require("./utils/logger");
const {
  setupProxyArgs,
  applyProxyAuthentication,
  parseProxy,
} = require("./utils/proxySetup");
const {
  getActiveProxy,
  switchToNextProxy,
  flagProxy,
  getProxyId,
  DETECTION_REASONS,
} = require("./utils/proxyManager");
const { getRandomUserAgent } = require("./utils/userAgents");
const {
  generateAccountCommentBatches,
  buildCommentString,
} = require("./utils/tagDistribution");
const {
  randomScroll,
  humanType,
  humanPause,
  simulateReading,
  setupHumanBehavior,
  randomWait,
  naturalMouseMove,
} = require("./utils/humanBehavior");
const {
  generateConsistentFingerprint,
  sessionWarmup,
  shouldProceed,
  getDynamicDelay,
  getActivityPatterns,
} = require("./utils/antiDetection");
const {
  applyInstagramFingerprint,
  generateInstagramFingerprint,
} = require("./utils/instagramFingerprint");

require("dotenv").config();

// Configuration
const CONFIG_PATH = "./config/accounts.json";
const USERNAMES_PATH = "./data/usernames.xlsx";

// Load configuration
let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
} catch (error) {
  console.error("❌ Failed to load config:", error.message);
  process.exit(1);
}

// Global statistics
const stats = new SessionStats();

// Global comment counter for long pause trigger
let globalCommentCount = 0;

// Track proxy usage per account for rotation
const accountProxyIndex = new Map();

/**
 * Get proxy for an account (uses proxy manager for flagging support)
 * Uses only the first non-flagged proxy for the account
 * @param {Object} account - Account object
 * @param {number} accountIndex - Account index (unused, kept for compatibility)
 * @returns {Object|null} - Parsed proxy object {address, port, username, password} or null
 */
function getProxyForAccount(account, accountIndex) {
  // If account has proxies array, use proxy manager to get active (non-flagged) proxy
  if (
    account.proxies &&
    Array.isArray(account.proxies) &&
    account.proxies.length > 0
  ) {
    const activeProxy = getActiveProxy(account.username, account.proxies);
    if (activeProxy) {
      const parsed = parseProxy(activeProxy);
      if (parsed) {
        const proxyId = getProxyId(activeProxy);
        console.log(`🔒 Using proxy ${proxyId} for ${account.username}`);
        return parsed;
      }
    }
  }

  // If account has a single proxy object, use it
  if (account.proxy && account.proxy.address) {
    return account.proxy;
  }

  // If account has a single proxy string, parse it
  if (account.proxy && typeof account.proxy === "string") {
    return parseProxy(account.proxy);
  }

  return null;
}

/**
 * Switch to next proxy for an account (when current proxy is flagged)
 * @param {Object} account - Account object
 * @param {string} reason - Reason for switching
 * @returns {Object|null} - Parsed proxy object or null
 */
function switchProxyForAccount(account, reason) {
  if (
    account.proxies &&
    Array.isArray(account.proxies) &&
    account.proxies.length > 1
  ) {
    const newProxy = switchToNextProxy(
      account.username,
      account.proxies,
      reason,
    );
    if (newProxy) {
      console.log(
        `🔄 Switched ${account.username} to new proxy: ${getProxyId(newProxy)}`,
      );
      return parseProxy(newProxy);
    }
  }
  console.log(`⚠️ No backup proxies available for ${account.username}`);
  return null;
}

/**
 * Check for action blocked or error popups
 * @param {Object} page - Puppeteer page
 * @returns {Object} - { blocked: boolean, checkpoint: boolean, rateLimited: boolean, message: string }
 */
async function checkForErrors(page) {
  try {
    // Check for rate limiting (HTTP 429)
    const isRateLimited = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return (
        bodyText.includes("429") ||
        bodyText.includes("too many requests") ||
        bodyText.includes("page isn't working") ||
        bodyText.includes("rate limit")
      );
    });

    if (isRateLimited) {
      return {
        blocked: false,
        checkpoint: false,
        rateLimited: true,
        message: "Rate limited (HTTP 429)",
      };
    }

    // Check for action blocked
    const isBlocked = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return (
        bodyText.includes("action blocked") ||
        bodyText.includes("try again later") ||
        bodyText.includes("we restrict certain") ||
        bodyText.includes("suspicious activity") ||
        bodyText.includes("help us confirm it's you") ||
        bodyText.includes("unusual activity")
      );
    });

    if (isBlocked) {
      return {
        blocked: true,
        checkpoint: false,
        rateLimited: false,
        message: "Action blocked detected",
      };
    }

    // Check for checkpoint / reCAPTCHA
    const url = page.url();
    if (url.includes("challenge") || url.includes("checkpoint")) {
      return {
        blocked: false,
        checkpoint: true,
        rateLimited: false,
        message: "Checkpoint required",
      };
    }

    // Check for reCAPTCHA on page
    const hasRecaptcha = await page.evaluate(() => {
      return (
        document.querySelector('iframe[src*="recaptcha"]') !== null ||
        document.body.innerText.toLowerCase().includes("i'm not a robot")
      );
    });

    if (hasRecaptcha) {
      return {
        blocked: false,
        checkpoint: true,
        rateLimited: false,
        message: "reCAPTCHA detected",
      };
    }

    // Check for error popup
    const errorPopup = await page.$('div[role="alert"]');
    if (errorPopup) {
      const message = await errorPopup.evaluate((el) => el.innerText);
      return { blocked: false, checkpoint: false, rateLimited: false, message };
    }

    return {
      blocked: false,
      checkpoint: false,
      rateLimited: false,
      message: null,
    };
  } catch (error) {
    return {
      blocked: false,
      checkpoint: false,
      rateLimited: false,
      message: null,
    };
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
    if (preCheck.rateLimited) {
      console.log("⚠️ Rate limited! Taking a long break before retrying...");
      await longPause("Rate limited");
      return { success: false, error: "Rate limited - taking a break" };
    }

    // Comment box selectors (multiple for resilience)
    const commentSelectors = [
      'textarea[aria-label="Add a comment…"]',
      'textarea[placeholder="Add a comment…"]',
      "form textarea",
      'textarea[autocomplete="off"]',
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
      return { success: false, error: "Comment textarea not found" };
    }

    // Move mouse to textarea naturally before clicking
    const textareaBox = await textarea.boundingBox();
    if (textareaBox) {
      await naturalMouseMove(
        page,
        textareaBox.x + textareaBox.width * (0.3 + Math.random() * 0.4),
        textareaBox.y + textareaBox.height * (0.3 + Math.random() * 0.4),
      );
    }

    // Click on textarea to focus with natural timing
    await textarea.click();
    await humanPause(0.8, 1.8);

    // Build the comment with tags
    const comment = buildCommentString(tags, true);

    // Type each tag with human-like mentions
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];

      // Pre-typing pause (thinking about who to tag)
      if (i > 0) {
        await humanPause(0.5, 1.5);
      }

      // Type the @ symbol with natural delay
      await page.keyboard.type("@", { delay: getDynamicDelay(80, 150) });
      await randomWait(150, 400);

      // Type the username with human-like patterns (including possible typos)
      await humanType(page, tag, {
        minDelay: 50,
        maxDelay: 150,
        mistakes: false, // Don't make mistakes on usernames
        burstTyping: true,
      });

      // Wait for autocomplete dropdown to appear (variable timing)
      await randomWait(800, 2500);

      // Natural dropdown selection
      await page.keyboard.press("ArrowDown");
      await randomWait(150, 350);
      await page.keyboard.press("Enter");
      await randomWait(250, 500);

      // Add space after tag with natural timing
      await page.keyboard.type(" ", { delay: getDynamicDelay(60, 120) });
      await randomWait(80, 250);
    }

    // Optionally add a suffix (emoji or text) - more varied options
    if (Math.random() > 0.4) {
      const suffixes = [
        "🔥",
        "❤️",
        "💯",
        "✨",
        "👆",
        "💪",
        "👀",
        "🙌",
        "⭐",
        "",
      ];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      if (suffix) {
        await humanPause(0.4, 1.2);
        await page.keyboard.type(suffix);
        await randomWait(100, 300);
      }
    }

    // Review pause before posting (reading what we typed)
    console.log("   📝 Reviewing comment...");
    await humanPause(1.0, 2.5);

    // Submit the comment (Enter key)
    await page.keyboard.press("Enter");

    // Wait for comment to be posted with uncertainty
    await randomWait(2500, 5000);

    // Check for errors after posting
    const postCheck = await checkForErrors(page);
    if (postCheck.blocked) {
      return { success: false, error: "Action blocked after posting" };
    }
    if (postCheck.message && postCheck.message.includes("error")) {
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
  // Check if we should proceed based on time patterns
  const proceedCheck = shouldProceed();
  if (!proceedCheck.proceed) {
    console.log(`⏰ ${proceedCheck.reason}`);
    console.log(
      `   Waiting ${Math.round(proceedCheck.waitTime / 60000)} minutes for better timing...`,
    );
    await new Promise((r) => setTimeout(r, proceedCheck.waitTime));
  }

  const proxy = getProxyForAccount(account, accountIndex);
  const userAgent = getRandomUserAgent();
  const fingerprint = generateConsistentFingerprint(account.username);
  const sessionDuration = getSessionDuration();
  const sessionStart = Date.now();

  const accountResult = {
    username: account.username,
    commentsPosted: 0,
    tagsPosted: 0,
    status: "unknown",
    errors: [],
  };

  // Generate comment batches for this account (very conservative)
  const { commentBatches } = generateAccountCommentBatches(allTags);

  // Even more conservative: 1-2 comments per account based on time of day
  const timeMultiplier = getTimeMultiplier();
  const maxComments = timeMultiplier > 1.5 ? 1 : Math.random() < 0.7 ? 2 : 1;
  const commentsToPost = Math.min(commentBatches.length, maxComments);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`👤 Processing account: ${account.username}`);
  console.log(`🔗 Target: ${targetPost}`);
  console.log(`📝 Comments planned: ${commentsToPost}`);
  console.log(
    `⏱️  Session duration: ${Math.round(sessionDuration / 60000)} minutes`,
  );
  console.log(
    `🌙 Time multiplier: ${timeMultiplier.toFixed(2)}x (${getActivityPatterns().multiplier < 0.5 ? "low activity period" : "normal activity"})`,
  );
  if (proxy) {
    console.log(`🌐 Proxy: ${proxy.address}:${proxy.port}`);
  }
  console.log(
    `🛡️ Fingerprint: ${fingerprint.platform.name} / ${fingerprint.timezone}`,
  );
  console.log("=".repeat(50));

  // Find system Chrome for compatibility with packaged apps
  const systemChrome = findSystemChrome();
  if (systemChrome) {
    console.log(`🌐 Using system Chrome: ${systemChrome}`);
  }

  // Puppeteer launch options with enhanced stealth
  const launchOptions = {
    headless: false, // Set to true for production
    executablePath: systemChrome || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--window-size=1920,1080",
      `--lang=${fingerprint.languages[0]}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-popup-blocking",
    ],
    defaultViewport: null,
    ignoreDefaultArgs: ["--enable-automation"],
  };

  // Setup proxy
  const { launchArgs, authenticateConfig } = setupProxyArgs(proxy);
  launchOptions.args.push(...launchArgs);

  let browser = null;

  try {
    // Launch browser
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Apply Instagram-specific fingerprint FIRST (before any navigation)
    const igFingerprint = await applyInstagramFingerprint(
      page,
      account.username,
    );
    console.log(
      `🔐 Instagram fingerprint applied: Chrome ${igFingerprint.chromeVersion}, ${igFingerprint.platformKey}`,
    );

    // Setup additional human behavior
    await setupHumanBehavior(page, account.username);

    // Apply proxy authentication
    if (authenticateConfig) {
      await applyProxyAuthentication(
        page,
        authenticateConfig,
        account.username,
      );
    }

    // Set extra HTTP headers matching Instagram fingerprint
    await page.setExtraHTTPHeaders({
      "Accept-Language": igFingerprint.acceptLanguage,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Encoding": igFingerprint.acceptEncoding,
      "Cache-Control": "max-age=0",
      ...igFingerprint.clientHints,
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    });

    // Login / restore session
    console.log(`🔐 Logging in as ${account.username}...`);
    const loginResult = await createSession(page, account);

    if (!loginResult.success) {
      if (loginResult.checkpoint) {
        console.log(`⚠️ Checkpoint required for ${account.username}`);
        stats.recordCheckpoint(account.username);
        accountResult.status = "checkpoint";
        logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
          status: STATUS.CHECKPOINT,
          error: "Checkpoint required",
        });
        return accountResult;
      }

      if (loginResult.blocked) {
        console.log(`🚫 Account ${account.username} is blocked`);
        stats.recordBlocked(account.username);
        accountResult.status = "blocked";
        logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
          status: STATUS.BLOCKED,
          error: "Account blocked",
        });
        return accountResult;
      }

      console.log(
        `❌ Login failed for ${account.username}: ${loginResult.error}`,
      );
      stats.recordLoginFailure(account.username, loginResult.error);
      accountResult.status = "login_failed";
      logMention({
        account: account.username,
        proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
        status: STATUS.LOGIN_FAILED,
        error: loginResult.error,
      });
      return accountResult;
    }

    console.log(`✅ Logged in as ${account.username}`);

    // Session warmup - browse naturally before taking actions
    console.log(`🔥 Warming up session...`);
    await sessionWarmup(page, getDynamicDelay(15000, 45000));

    // Navigate to target post with retry logic for rate limiting
    console.log(`📍 Navigating to target post...`);
    let navigationSuccess = false;
    let navigationRetries = 0;
    const maxNavigationRetries = 3;

    while (!navigationSuccess && navigationRetries < maxNavigationRetries) {
      try {
        // Random delay before navigation (don't go directly)
        await randomWait(2000, 5000);

        await page.goto(targetPost, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        // Check for rate limiting after navigation
        const navCheck = await checkForErrors(page);
        if (navCheck.rateLimited) {
          console.log(
            `⚠️ Rate limited on navigation (attempt ${navigationRetries + 1}/${maxNavigationRetries}). Waiting...`,
          );
          // Flag proxy on repeated rate limiting
          if (navigationRetries >= 1 && proxy) {
            switchProxyForAccount(account, DETECTION_REASONS.RATE_LIMITED);
          }
          navigationRetries++;
          if (navigationRetries < maxNavigationRetries) {
            await longPause("Rate limited - cooling down");
            continue;
          } else {
            throw new Error("Rate limited after multiple attempts");
          }
        }

        if (navCheck.checkpoint) {
          console.log(`⚠️ Checkpoint detected for ${account.username}`);
          stats.recordCheckpoint(account.username);
          accountResult.status = "checkpoint";
          // Flag the proxy for checkpoint
          if (proxy) {
            switchProxyForAccount(
              account,
              DETECTION_REASONS.CHALLENGE_REQUIRED,
            );
          }
          return accountResult;
        }

        navigationSuccess = true;
      } catch (navError) {
        navigationRetries++;
        console.log(
          `⚠️ Navigation failed (attempt ${navigationRetries}/${maxNavigationRetries}): ${navError.message}`,
        );
        if (navigationRetries < maxNavigationRetries) {
          console.log("🔄 Retrying after delay...");
          await longPause("Navigation retry");
        } else {
          throw navError;
        }
      }
    }

    // Extensive reading simulation before commenting (like a real user would)
    console.log(`👀 Viewing post content...`);
    const readingTime = getDynamicDelay(8000, 20000);
    await simulateReading(page, Math.ceil(readingTime / 1000));

    // Random scroll - view comments/likes like a real user
    await randomScroll(page, Math.floor(Math.random() * 3) + 2);

    // Brief pause after scrolling (absorbing content)
    await humanPause(2, 5);

    // Post comments with extensive delays
    for (let i = 0; i < commentsToPost; i++) {
      // Check session duration
      if (Date.now() - sessionStart > sessionDuration) {
        console.log(`⏱️ Session time limit reached for ${account.username}`);
        break;
      }

      // Check cooldown status
      const cooldownCheck = checkCooldown(globalCommentCount, 20);
      if (cooldownCheck.shouldCooldown) {
        console.log(
          `🧊 Cooldown triggered - waiting ${Math.round(cooldownCheck.waitTime / 60000)} minutes...`,
        );
        await new Promise((r) => setTimeout(r, cooldownCheck.waitTime));
      } else if (cooldownCheck.extraDelay) {
        console.log(
          `   📉 Progressive slowdown: +${(cooldownCheck.extraDelay / 1000).toFixed(0)}s`,
        );
        await new Promise((r) => setTimeout(r, cooldownCheck.extraDelay));
      }

      const tags = commentBatches[i];
      if (!tags || tags.length === 0) continue;

      console.log(
        `💬 Posting comment ${i + 1}/${commentsToPost} with ${tags.length} tags...`,
      );

      const result = await postComment(page, tags, account);

      if (result.success) {
        console.log(`✅ Comment ${i + 1} posted successfully`);
        stats.recordSuccess(tags.length);
        accountResult.commentsPosted++;
        accountResult.tagsPosted += tags.length;
        globalCommentCount++;

        logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
          status: STATUS.SUCCESS,
          comment: tags.map((t) => `@${t}`).join(" "),
          tagsCount: tags.length,
        });

        // Check if we need a long pause (every 15-25 comments, randomized)
        const pauseThreshold = 15 + Math.floor(Math.random() * 10);
        if (
          globalCommentCount > 0 &&
          globalCommentCount % pauseThreshold === 0
        ) {
          console.log(
            `\n⏸️ Reached ${globalCommentCount} comments, taking a long break...`,
          );
          await longPause("Activity limit reached");
        }
      } else {
        console.log(`❌ Comment ${i + 1} failed: ${result.error}`);
        stats.recordFailure(result.error);
        accountResult.errors.push(result.error);

        logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
          status: STATUS.COMMENT_FAILED,
          comment: tags.map((t) => `@${t}`).join(" "),
          tagsCount: tags.length,
          error: result.error,
        });

        // If blocked, stop this account and flag the proxy
        if (
          result.error.includes("blocked") ||
          result.error.includes("Action blocked")
        ) {
          stats.recordBlocked(account.username);
          accountResult.status = "blocked";
          // Flag the proxy as suspicious
          if (proxy) {
            switchProxyForAccount(account, DETECTION_REASONS.ACTION_BLOCKED);
          }
          // Extra delay after blocked detection
          console.log("🚨 Block detected - adding extra cooling period...");
          await longPause("Block detected - cooling down");
          break;
        }

        // Flag proxy on rate limiting
        if (
          result.error.includes("Rate limited") ||
          result.error.includes("429")
        ) {
          if (proxy) {
            switchProxyForAccount(account, DETECTION_REASONS.RATE_LIMITED);
          }
        }

        // Flag proxy on checkpoint/challenge
        if (
          result.error.includes("Checkpoint") ||
          result.error.includes("Challenge")
        ) {
          if (proxy) {
            switchProxyForAccount(
              account,
              DETECTION_REASONS.CHALLENGE_REQUIRED,
            );
          }
        }
      }

      // Delay between comments (with time-of-day awareness)
      if (i < commentsToPost - 1) {
        await delayBetweenComments();

        // Occasionally do additional browsing between comments (like checking feed)
        if (Math.random() < 0.25) {
          console.log("   📱 Brief browsing activity...");
          await simulateReading(page, Math.floor(Math.random() * 10) + 5);
        }
      }
    }

    // Post-activity cooldown browsing (don't leave immediately after commenting)
    console.log("👋 Post-activity browsing before leaving...");
    await simulateReading(page, getDynamicDelay(5000, 15000) / 1000);

    // Save cookies before closing
    await saveCookies(page, account.username);

    accountResult.status =
      accountResult.commentsPosted > 0 ? "success" : "failed";
    stats.recordAccountProcessed();

    console.log(`\n📊 Account ${account.username} summary:`);
    console.log(`   Comments: ${accountResult.commentsPosted}`);
    console.log(`   Tags: ${accountResult.tagsPosted}`);
    console.log(`   Status: ${accountResult.status}`);
  } catch (error) {
    console.error(`🚫 Error processing ${account.username}: ${error.message}`);
    accountResult.status = "error";
    accountResult.errors.push(error.message);
    stats.recordFailure(error.message);

    logMention({
      account: account.username,
      proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
      status: STATUS.FAILED,
      error: error.message,
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
async function processBatch(
  accounts,
  allTags,
  targetPost,
  batchIndex,
  startIndex,
) {
  console.log(`\n${"#".repeat(60)}`);
  console.log(
    `# BATCH ${batchIndex + 1} - Processing ${accounts.length} accounts`,
  );
  console.log(`${"#".repeat(60)}`);

  const results = [];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const accountIndex = startIndex + i;

    try {
      const result = await processAccount(
        account,
        allTags,
        targetPost,
        accountIndex,
      );
      results.push(result);

      // Skip blocked or checkpoint accounts
      if (result.status === "blocked" || result.status === "checkpoint") {
        console.log(`⏭️ Skipping to next account due to ${result.status}`);
      }
    } catch (error) {
      console.error(`🚫 Batch error for ${account.username}: ${error.message}`);
      results.push({
        username: account.username,
        status: "error",
        error: error.message,
      });
    }

    // Delay between accounts (5-20 seconds)
    if (i < accounts.length - 1) {
      await delayBetweenAccounts();
    }
  }

  // Batch summary
  const successful = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) =>
    ["failed", "error", "login_failed"].includes(r.status),
  ).length;
  const blocked = results.filter((r) => r.status === "blocked").length;
  const checkpoint = results.filter((r) => r.status === "checkpoint").length;

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
    console.error("❌ No accounts found in configuration");
    process.exit(1);
  }

  if (!targetPost) {
    console.error(
      "❌ No target post URL specified. Set POST_URL in .env or targetPost in config",
    );
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
    console.error("❌ No usernames found in Excel file");
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

  // Initial warmup delay to avoid immediate detection
  console.log(`⏳ Warming up... waiting before starting to avoid detection...`);
  await randomDelay(10000, 20000); // 10-20 second startup delay

  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const startIndex = i * batchSize;

    await processBatch(batch, allTags, targetPost, i, startIndex);

    // Longer pause between batches to avoid rate limiting
    if (i < batches.length - 1) {
      console.log(
        `\n⏸️ Batch complete. Taking a longer break before next batch...`,
      );
      await randomDelay(120000, 300000); // 2-5 minutes between batches (increased significantly)
    }
  }

  // Final summary
  stats.printSummary();
  stats.saveSummary();

  console.log(`\n✅ Automation complete!`);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⚠️ Received interrupt signal...");
  stats.printSummary();
  stats.saveSummary();
  process.exit(0);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  stats.saveSummary();
});

// Run main
main().catch((error) => {
  console.error("Fatal error:", error);
  stats.saveSummary();
  process.exit(1);
});
