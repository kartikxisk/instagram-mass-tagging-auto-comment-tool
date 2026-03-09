/**
 * Automation Runner
 * Bridges the Electron UI with the automation logic from main.js
 */

const EventEmitter = require("events");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const { execSync } = require("child_process");

// Import automation utilities
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

// Import centralized login helper
const loginHelper = require(path.join(__dirname, "../utils/loginHelper"));

/**
 * Get user data path for storing app config and data files
 * Uses project folder during development, app data when packaged
 */
function getAppDataPath() {
  try {
    if (app.isPackaged) {
      return app.getPath("userData");
    }
    // Development: use project folder
    return path.join(__dirname, "..");
  } catch (e) {
    // Fallback for non-Electron context
    return path.join(__dirname, "..");
  }
}

/**
 * Get chrome profiles directory path (always in temp/app data, never in project folder)
 */
function getChromeProfilesPath() {
  try {
    return path.join(app.getPath("userData"), "chrome-profiles");
  } catch (e) {
    const os = require("os");
    return path.join(os.tmpdir(), "instabot-chrome-profiles");
  }
}

/**
 * Delete a chrome profile directory safely
 * @param {string} profilePath - Path to the profile directory
 */
function deleteProfileDirectory(profilePath) {
  try {
    if (fs.existsSync(profilePath)) {
      fs.rmSync(profilePath, { recursive: true, force: true });
    }
  } catch (e) {
    console.log(`Could not delete profile directory: ${e.message}`);
  }
}

/**
 * Get paths for various app directories
 */
function getPaths() {
  const basePath = getAppDataPath();
  return {
    config: path.join(basePath, "config"),
    cookies: path.join(basePath, "cookies"),
    logs: path.join(basePath, "logs"),
    data: path.join(basePath, "data"),
  };
}

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
      // macOS paths
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
      `${process.env.HOME}/Applications/Chromium.app/Contents/MacOS/Chromium`,
    ],
    win32: [
      // Windows paths
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
      // Linux paths
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

class AutomationRunner extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.shouldStop = false;
    this.browsers = []; // Track all browser instances for parallel execution
    this.utils = null; // Store utils reference for class methods
    this.stats = {
      accountsProcessed: 0,
      commentsPosted: 0,
      tagsPosted: 0,
      successfulComments: 0,
      failedComments: 0,
    };
    this.activeWorkers = 0; // Track how many accounts are currently processing
  }

  /**
   * Load utilities dynamically
   */
  loadUtilities() {
    const basePath = path.join(__dirname, "..");

    return {
      sessionManager: require(path.join(basePath, "utils/sessionManager")),
      parseExcel: require(path.join(basePath, "utils/parseExcel")),
      delay: require(path.join(basePath, "utils/delay")),
      logger: require(path.join(basePath, "utils/logger")),
      proxySetup: require(path.join(basePath, "utils/proxySetup")),
      userAgents: require(path.join(basePath, "utils/userAgents")),
      tagDistribution: require(path.join(basePath, "utils/tagDistribution")),
      humanBehavior: require(path.join(basePath, "utils/humanBehavior")),
      tagTracker: require(path.join(basePath, "utils/tagTracker")),
    };
  }

  /**
   * Start the automation
   * @param {Object} options - Automation options
   */
  async start(options = {}) {
    if (this.isRunning) {
      throw new Error("Automation is already running");
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.browsers = [];
    this.activeWorkers = 0;
    this.utils = null; // Reset utils
    this.resetStats();

    try {
      // Load config from correct path
      const paths = getPaths();
      const configPath = path.join(paths.config, "accounts.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

      // Override target post if provided
      if (options.targetPost) {
        config.targetPost = options.targetPost;
      }

      this.emit("status", {
        status: "running",
        message: "Loading utilities...",
      });

      const utils = this.loadUtilities();
      this.utils = utils; // Store for class methods

      // Initialize global tag tracker (continue from previous session)
      const trackerStats = utils.tagTracker.initialize(
        options.freshStart || false,
      );
      this.emit("log", {
        type: "info",
        message: `📊 Tag Tracker: ${trackerStats.totalTagged} users already tagged`,
      });

      // Load usernames from the selected Excel file
      const usernamesPath =
        options.excelFilePath || path.join(__dirname, "../data/usernames.xlsx");
      utils.parseExcel.loadAllUsernames(usernamesPath);

      // Get all tags from Excel
      const allTags = [];
      let batch;
      while ((batch = utils.parseExcel.getNextBatch(100)).length > 0) {
        allTags.push(...batch);
      }

      if (allTags.length === 0) {
        throw new Error("No usernames found in Excel file");
      }

      // Get only untagged users
      const untaggedUsers = utils.tagTracker.getUntaggedUsers(allTags);

      this.emit("log", {
        type: "success",
        message: `📊 Loaded ${allTags.length} total tags from Excel`,
      });
      this.emit("log", {
        type: "info",
        message: `✨ ${untaggedUsers.length} users remaining to tag`,
      });
      this.emit("log", {
        type: "info",
        message: `👥 Processing ${config.accounts.length} accounts`,
      });
      this.emit("log", {
        type: "info",
        message: `🎯 Target: ${config.targetPost}`,
      });

      if (untaggedUsers.length === 0) {
        this.emit("log", {
          type: "warning",
          message:
            '⚠️ All users have already been tagged! Use "Reset Tags" to start fresh.',
        });
        this.emit("complete", {
          accounts: 0,
          comments: 0,
          tags: 0,
        });
        return;
      }

      // Get parallel settings
      const parallelAccounts = config.settings?.parallelAccounts || 3;
      this.emit("log", {
        type: "info",
        message: `🔄 Running ${parallelAccounts} accounts in parallel`,
      });

      // Process accounts in parallel batches
      const accounts = config.accounts.slice(
        0,
        config.settings?.accountsPerBatch || 100,
      );
      let accountIndex = 0;

      // Worker function to process one account
      const processNextAccount = async () => {
        while (!this.shouldStop && accountIndex < accounts.length) {
          // Check if there are still untagged users
          const remainingUntagged = utils.tagTracker.getUntaggedUsers(allTags);
          if (remainingUntagged.length === 0) {
            this.emit("log", {
              type: "success",
              message: "🎉 All users have been tagged!",
            });
            break;
          }

          const currentIndex = accountIndex++;
          const account = accounts[currentIndex];

          this.activeWorkers++;
          this.emit("log", {
            type: "info",
            message: `🚀 Starting worker for ${account.username} (${this.activeWorkers} active workers)`,
          });

          try {
            await this.processAccount(
              account,
              allTags,
              config,
              currentIndex,
              options,
              utils,
            );
          } catch (error) {
            this.emit("log", {
              type: "error",
              message: `Worker error for ${account.username}: ${error.message}`,
            });
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

      this.emit("log", {
        type: "success",
        message: "🎉 Automation completed!",
      });

      // Get final tagged count from tracker for accuracy
      let finalTaggedCount = this.stats.tagsPosted;
      if (this.utils && this.utils.tagTracker) {
        const trackerStats = this.utils.tagTracker.getStats();
        finalTaggedCount = trackerStats.totalTagged || this.stats.tagsPosted;
      }

      this.emit("complete", {
        accounts: this.stats.accountsProcessed,
        comments: this.stats.successfulComments,
        tagged: finalTaggedCount, // Use 'tagged' to match frontend expectation
      });
    } catch (error) {
      this.emit("error", { message: error.message });
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
    const proxy = this.getProxyForAccount(account);
    const userAgent = utils.userAgents.getRandomUserAgent();

    this.emit("log", {
      type: "info",
      message: `👤 Starting...`,
      username: account.username,
    });

    if (proxy) {
      this.emit("log", {
        type: "info",
        message: `🌐 Using proxy: ${proxy.address}:${proxy.port}`,
        username: account.username,
      });
    } else {
      this.emit("log", {
        type: "warning",
        message: `⚠️ No proxy configured for this account`,
        username: account.username,
      });
    }

    // Find system Chrome for more stealth
    const systemChrome = findSystemChrome();
    if (systemChrome) {
      this.emit("log", {
        type: "info",
        message: `🌐 Using system Chrome`,
        username: account.username,
      });
    }

    // Create unique user data directory for this account to isolate sessions
    const userDataDir = path.join(getChromeProfilesPath(), account.username);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Launch browser with enhanced anti-detection args
    const launchOptions = {
      headless: options.headless !== false ? "new" : false,
      executablePath: systemChrome || undefined, // Use system Chrome if found
      userDataDir: userDataDir, // Use persistent profile per account
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--start-maximized",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
        "--disable-features=BlockInsecurePrivateNetworkRequests",
        "--ignore-certificate-errors",
        "--ignore-certificate-errors-spki-list",
        "--disable-extensions",
        "--disable-default-apps",
        "--disable-component-extensions-with-background-pages",
        "--disable-component-update",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-first-run",
        "--safebrowsing-disable-auto-update",
        `--window-size=${1920 + Math.floor(Math.random() * 200)},${1080 + Math.floor(Math.random() * 100)}`,
      ],
      defaultViewport: null, // Use full screen size
      ignoreDefaultArgs: ["--enable-automation"],
    };

    // Setup proxy
    const { launchArgs, authenticateConfig } =
      utils.proxySetup.setupProxyArgs(proxy);
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
        await utils.proxySetup.applyProxyAuthentication(
          page,
          authenticateConfig,
          account.username,
        );
      }

      // Set headers
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      });

      // Login - use custom login that emits logs
      this.emit("log", {
        type: "info",
        message: `🔐 Checking session...`,
        username: account.username,
      });
      const loginResult = await this.loginWithLogs(page, account, utils);

      if (!loginResult.success) {
        this.emit("log", {
          type: "error",
          message: `❌ Login failed: ${loginResult.error}`,
          username: account.username,
        });
        // Log to file as well
        utils.logger.logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
          status: loginResult.checkpoint
            ? "CHECKPOINT"
            : loginResult.blocked
              ? "BLOCKED"
              : "LOGIN_FAILED",
          error: loginResult.error,
        });
        return;
      }

      this.emit("log", {
        type: "success",
        message: `✅ Logged in successfully`,
        username: account.username,
      });

      // Navigate to target post
      this.emit("log", {
        type: "info",
        message: `📍 Navigating to target post...`,
        username: account.username,
      });
      await page.goto(config.targetPost, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Check if stopped
      if (this.shouldStop) {
        this.emit("log", {
          type: "warning",
          message: `⏹️ Stopping after navigation...`,
          username: account.username,
        });
        return;
      }

      // Get only untagged users for this account (thread-safe via tagTracker)
      // Calculate tagsPerAccount dynamically from settings
      const maxComments = config.settings?.commentsPerAccount?.max || 7;
      const maxTagsPerComment = config.settings?.tagsPerComment?.max || 12;
      const tagsPerAccount = maxComments * maxTagsPerComment; // e.g., 7 comments * 12 tags = 84 tags max
      const untaggedForAccount = utils.tagTracker.getNextBatch(
        allTags,
        tagsPerAccount,
      );

      if (untaggedForAccount.length === 0) {
        this.emit("log", {
          type: "warning",
          message: `⚠️ No more untagged users available`,
          username: account.username,
        });
        return;
      }

      this.emit("log", {
        type: "info",
        message: `📋 Reserved ${untaggedForAccount.length} users to tag`,
        username: account.username,
      });

      // Generate comment batches using settings from config
      const tagsPerCommentMin = config.settings?.tagsPerComment?.min || 10;
      const tagsPerCommentMax = config.settings?.tagsPerComment?.max || 12;

      const { commentBatches } =
        utils.tagDistribution.generateAccountCommentBatches(
          untaggedForAccount,
          {
            tagsPerAccount: untaggedForAccount.length,
            tagsPerComment: {
              min: tagsPerCommentMin,
              max: tagsPerCommentMax,
            },
          },
        );

      // Use commentsPerAccount from settings
      const commentsMin = config.settings?.commentsPerAccount?.min || 5;
      const commentsMax = config.settings?.commentsPerAccount?.max || 7;
      const commentsRange = commentsMax - commentsMin + 1;
      const commentsToPost = Math.min(
        commentBatches.length,
        Math.floor(Math.random() * commentsRange) + commentsMin,
      );

      this.emit("log", {
        type: "info",
        message: `📝 Planning ${commentsToPost} comments (${tagsPerCommentMin}-${tagsPerCommentMax} tags each)`,
        username: account.username,
      });

      // Post comments - close and restart browser for each comment
      for (let i = 0; i < commentsToPost; i++) {
        if (this.shouldStop) {
          this.emit("log", {
            type: "warning",
            message: `⏹️ Stopping comment loop...`,
            username: account.username,
          });
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
        const tagsDisplay = tags.map((t) => `@${t}`).join(" ");
        this.emit("log", {
          type: "info",
          message: `💬 Comment ${i + 1}/${commentsToPost} (${tags.length} tags): ${tagsDisplay}`,
          username: account.username,
        });

        const result = await this.postComment(page, tags, utils);

        if (this.shouldStop) {
          // Release tags if stopped during posting
          utils.tagTracker.releaseTags(tags);
          break;
        }

        if (result.success) {
          // Mark tags as successfully posted in global tracker
          utils.tagTracker.markAsTagged(tags);

          this.emit("log", {
            type: "success",
            message: `✅ Comment ${i + 1} posted (${tags.length} tags)`,
            username: account.username,
          });
          this.stats.commentsPosted++;
          this.stats.successfulComments++;
          this.stats.tagsPosted += tags.length;

          // Check if we need to pause after X comments (pauseAfterComments setting)
          const pauseAfterComments = config.settings?.pauseAfterComments || 50;
          const pauseDurationMinutes =
            config.settings?.pauseDurationMinutes || 30;
          if (
            this.stats.commentsPosted > 0 &&
            this.stats.commentsPosted % pauseAfterComments === 0
          ) {
            this.emit("log", {
              type: "warning",
              message: `⏸️ Reached ${pauseAfterComments} comments - taking a ${pauseDurationMinutes} minute break to avoid detection`,
              username: account.username,
            });
            const pauseMs = pauseDurationMinutes * 60 * 1000;
            const shouldContinue = await this.sleepWithCountdown(
              pauseMs,
              account.username,
              "Safety pause",
            );
            if (!shouldContinue) {
              // Release remaining tags
              for (let j = i + 1; j < commentsToPost; j++) {
                if (commentBatches[j]) {
                  utils.tagTracker.releaseTags(commentBatches[j]);
                }
              }
              break;
            }
          }

          // Emit stats update in real-time
          this.emitStats();

          // Log global progress with username context
          const trackerStats = utils.tagTracker.getStats();
          this.emit("log", {
            type: "success",
            message: `📊 Tag Tracker Updated: ${trackerStats.totalTagged} total tagged, ${trackerStats.pending} pending`,
            username: account.username,
          });

          // Log to file
          utils.logger.logMention({
            account: account.username,
            proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
            status: "SUCCESS",
            comment: tags.map((t) => `@${t}`).join(" "),
            tagsCount: tags.length,
          });

          // Close browser after successful comment
          this.emit("log", {
            type: "info",
            message: `🔄 Closing browser for fresh restart...`,
            username: account.username,
          });
          if (browser) {
            try {
              const browserIndex = this.browsers.indexOf(browser);
              if (browserIndex > -1) {
                this.browsers.splice(browserIndex, 1);
              }
              await browser.close();
              browser = null;
              page = null;
            } catch (e) {
              this.emit("log", {
                type: "warning",
                message: `⚠️ Error closing browser: ${e.message}`,
                username: account.username,
              });
            }
          }

          // Delay before starting fresh browser (simulate user break)
          if (i < commentsToPost - 1 && !this.shouldStop) {
            const delayTime = Math.floor(Math.random() * 45000) + 45000; // 45-90 seconds
            const shouldContinue = await this.sleepWithCountdown(
              delayTime,
              account.username,
              "Next comment",
            );
            if (!shouldContinue) {
              // Release remaining tags
              for (let j = i + 1; j < commentsToPost; j++) {
                if (commentBatches[j]) {
                  utils.tagTracker.releaseTags(commentBatches[j]);
                }
              }
              break;
            }
          }

          // Start fresh browser with new proxy if there are more comments
          if (i < commentsToPost - 1 && !this.shouldStop) {
            this.emit("log", {
              type: "info",
              message: `🚀 Starting fresh browser for comment ${i + 2}...`,
              username: account.username,
            });
            const newProxy = this.getProxyForAccount(account);
            const newUserAgent = utils.userAgents.getRandomUserAgent();

            if (newProxy) {
              this.emit("log", {
                type: "info",
                message: `🌐 New proxy: ${newProxy.address}:${newProxy.port}`,
                username: account.username,
              });
            } else {
              this.emit("log", {
                type: "warning",
                message: `⚠️ No proxy available for this account`,
                username: account.username,
              });
            }
            this.emit("log", {
              type: "info",
              message: `🔄 New User Agent applied`,
              username: account.username,
            });

            // Re-initialize browser with system Chrome and enhanced anti-detection args
            const launchOptions = {
              headless: options.headless !== false ? "new" : false,
              executablePath: systemChrome || undefined,
              userDataDir: userDataDir,
              args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--start-maximized",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
                "--disable-site-isolation-trials",
                "--disable-features=BlockInsecurePrivateNetworkRequests",
                "--ignore-certificate-errors",
                "--ignore-certificate-errors-spki-list",
                "--disable-extensions",
                "--disable-default-apps",
                "--disable-component-extensions-with-background-pages",
                "--disable-component-update",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-background-networking",
                "--disable-sync",
                "--disable-translate",
                "--hide-scrollbars",
                "--metrics-recording-only",
                "--mute-audio",
                "--safebrowsing-disable-auto-update",
                `--window-size=${1920 + Math.floor(Math.random() * 200)},${1080 + Math.floor(Math.random() * 100)}`,
              ],
              defaultViewport: null,
              ignoreDefaultArgs: ["--enable-automation"],
            };

            const { launchArgs, authenticateConfig } =
              utils.proxySetup.setupProxyArgs(newProxy);
            launchOptions.args.push(...launchArgs);

            try {
              browser = await puppeteer.launch(launchOptions);
              this.browsers.push(browser);
              page = await browser.newPage();

              await utils.humanBehavior.setupHumanBehavior(page);
              await page.setUserAgent(newUserAgent);

              if (authenticateConfig) {
                await utils.proxySetup.applyProxyAuthentication(
                  page,
                  authenticateConfig,
                  account.username,
                );
              }

              await page.setExtraHTTPHeaders({
                "Accept-Language": "en-US,en;q=0.9",
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              });

              // Re-login with new browser
              this.emit("log", {
                type: "info",
                message: `🔐 Re-logging in...`,
                username: account.username,
              });
              const reLoginResult = await this.loginWithLogs(
                page,
                account,
                utils,
              );

              if (!reLoginResult.success) {
                this.emit("log", {
                  type: "error",
                  message: `❌ Re-login failed: ${reLoginResult.error}`,
                  username: account.username,
                });
                utils.tagTracker.releaseTags(tags); // Release this batch
                // Release remaining tags
                for (let j = i + 1; j < commentsToPost; j++) {
                  if (commentBatches[j]) {
                    utils.tagTracker.releaseTags(commentBatches[j]);
                  }
                }
                break;
              }

              this.emit("log", {
                type: "success",
                message: `✅ Re-logged in successfully`,
                username: account.username,
              });

              // Navigate to target post again
              this.emit("log", {
                type: "info",
                message: `📍 Navigating to target post...`,
                username: account.username,
              });
              await page.goto(config.targetPost, {
                waitUntil: "networkidle2",
                timeout: 60000,
              });

              this.emit("log", {
                type: "success",
                message: `✅ Ready for next comment`,
                username: account.username,
              });
            } catch (error) {
              this.emit("log", {
                type: "error",
                message: `❌ Failed to restart browser: ${error.message}`,
                username: account.username,
              });
              utils.tagTracker.releaseTags(tags);
              // Release remaining tags
              for (let j = i + 1; j < commentsToPost; j++) {
                if (commentBatches[j]) {
                  utils.tagTracker.releaseTags(commentBatches[j]);
                }
              }
              break;
            }
          }
        } else {
          // Release tags back to pool if comment failed (count as failed)
          utils.tagTracker.releaseTags(tags, true);

          this.emit("log", {
            type: "error",
            message: `❌ Comment ${i + 1} failed: ${result.error}`,
            username: account.username,
          });
          this.stats.failedComments++;
          // Note: Do NOT increment commentsPosted for failed comments - that counter is for successful comments only

          // Emit stats update in real-time
          this.emitStats();

          // Log to file
          utils.logger.logMention({
            account: account.username,
            proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
            status: "COMMENT_FAILED",
            comment: tags.map((t) => `@${t}`).join(" "),
            tagsCount: tags.length,
            error: result.error,
          });

          // Close browser after failed comment for fresh restart
          this.emit("log", {
            type: "info",
            message: `🔄 Closing browser after failed comment...`,
            username: account.username,
          });
          if (browser) {
            try {
              const browserIndex = this.browsers.indexOf(browser);
              if (browserIndex > -1) {
                this.browsers.splice(browserIndex, 1);
              }
              await browser.close();
              browser = null;
              page = null;
            } catch (e) {
              this.emit("log", {
                type: "warning",
                message: `⚠️ Error closing browser: ${e.message}`,
                username: account.username,
              });
            }
          }

          if (
            result.error.includes("blocked") ||
            result.error.includes("Couldn't post")
          ) {
            this.emit("log", {
              type: "warning",
              message: `🚫 Action blocked detected`,
              username: account.username,
            });
            // Flag current proxy (if any) and attempt to switch to next proxy for this account
            try {
              if (
                proxy &&
                this.utils &&
                this.utils.proxyManager &&
                typeof this.utils.proxyManager.flagProxy === "function"
              ) {
                const proxyRaw = proxy.raw || `${proxy.address}:${proxy.port}`;
                this.utils.proxyManager.flagProxy(
                  proxyRaw,
                  this.utils.proxyManager.DETECTION_REASONS.ACTION_BLOCKED ||
                    "Action blocked",
                  account.username,
                );
                this.emit("log", {
                  type: "warning",
                  message: `⚠️ Flagged proxy ${proxy.address}:${proxy.port} for ${account.username}`,
                  username: account.username,
                });
              }
            } catch (e) {
              this.emit("log", {
                type: "warning",
                message: `⚠️ Proxy flagging failed: ${e.message}`,
                username: account.username,
              });
            }
            this.emit("log", {
              type: "warning",
              message: `⏭️ Skipping account due to action block`,
              username: account.username,
            });
            // Release remaining tags
            for (let j = i + 1; j < commentsToPost; j++) {
              if (commentBatches[j]) {
                utils.tagTracker.releaseTags(commentBatches[j]);
              }
            }
            break;
          }

          // Delay before trying again with fresh browser
          if (i < commentsToPost - 1 && !this.shouldStop) {
            const delayTime = Math.floor(Math.random() * 45000) + 45000; // 45-90 seconds
            const shouldContinue = await this.sleepWithCountdown(
              delayTime,
              account.username,
              "Retry comment",
            );
            if (!shouldContinue) {
              // Release remaining tags
              for (let j = i + 1; j < commentsToPost; j++) {
                if (commentBatches[j]) {
                  utils.tagTracker.releaseTags(commentBatches[j]);
                }
              }
              break;
            }

            // Start fresh browser for retry
            this.emit("log", {
              type: "info",
              message: `🚀 Starting fresh browser for retry...`,
              username: account.username,
            });
            let newProxy = this.getProxyForAccount(account);
            // If previous attempt failed for reasons indicating proxy issues, try switching via proxyManager
            if (this.utils && this.utils.proxyManager && proxy) {
              try {
                // If current proxy is flagged now, switch to next available
                const proxyRaw = proxy.raw || `${proxy.address}:${proxy.port}`;
                if (
                  this.utils.proxyManager.isProxyFlagged &&
                  this.utils.proxyManager.isProxyFlagged(proxyRaw)
                ) {
                  const switched = this.utils.proxyManager.switchToNextProxy(
                    account.username,
                    account.proxies || [],
                    "Retry after failed comment",
                  );
                  if (switched) {
                    newProxy = this.parseProxy(switched);
                  }
                }
              } catch (e) {
                // ignore
              }
            }
            const newUserAgent = utils.userAgents.getRandomUserAgent();

            if (newProxy) {
              this.emit("log", {
                type: "info",
                message: `🌐 New proxy: ${newProxy.address}:${newProxy.port}`,
                username: account.username,
              });
            } else {
              this.emit("log", {
                type: "warning",
                message: `⚠️ No proxy available for this account`,
                username: account.username,
              });
            }
            this.emit("log", {
              type: "info",
              message: `🔄 New User Agent applied`,
              username: account.username,
            });

            const launchOptions = {
              headless: options.headless !== false ? "new" : false,
              executablePath: systemChrome || undefined,
              userDataDir: userDataDir,
              args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--start-maximized",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
                "--disable-site-isolation-trials",
                "--disable-features=BlockInsecurePrivateNetworkRequests",
                "--ignore-certificate-errors",
                "--ignore-certificate-errors-spki-list",
                "--disable-extensions",
                "--disable-default-apps",
                "--disable-component-extensions-with-background-pages",
                "--disable-component-update",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-background-networking",
                "--disable-sync",
                "--disable-translate",
                "--hide-scrollbars",
                "--metrics-recording-only",
                "--mute-audio",
                "--safebrowsing-disable-auto-update",
                `--window-size=${1920 + Math.floor(Math.random() * 200)},${1080 + Math.floor(Math.random() * 100)}`,
              ],
              defaultViewport: null,
              ignoreDefaultArgs: ["--enable-automation"],
            };

            const { launchArgs, authenticateConfig } =
              utils.proxySetup.setupProxyArgs(newProxy);
            launchOptions.args.push(...launchArgs);

            try {
              browser = await puppeteer.launch(launchOptions);
              this.browsers.push(browser);
              page = await browser.newPage();

              await utils.humanBehavior.setupHumanBehavior(page);
              await page.setUserAgent(newUserAgent);

              if (authenticateConfig) {
                await utils.proxySetup.applyProxyAuthentication(
                  page,
                  authenticateConfig,
                  account.username,
                );
              }

              await page.setExtraHTTPHeaders({
                "Accept-Language": "en-US,en;q=0.9",
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              });

              // Re-login
              this.emit("log", {
                type: "info",
                message: `🔐 Re-logging in after failed comment...`,
                username: account.username,
              });
              const reLoginResult = await this.loginWithLogs(
                page,
                account,
                utils,
              );

              if (!reLoginResult.success) {
                this.emit("log", {
                  type: "error",
                  message: `❌ Re-login failed: ${reLoginResult.error}`,
                  username: account.username,
                });
                // Release remaining tags
                for (let j = i + 1; j < commentsToPost; j++) {
                  if (commentBatches[j]) {
                    utils.tagTracker.releaseTags(commentBatches[j]);
                  }
                }
                break;
              }

              this.emit("log", {
                type: "success",
                message: `✅ Re-logged in successfully`,
                username: account.username,
              });

              // Navigate to target post
              this.emit("log", {
                type: "info",
                message: `📍 Navigating to target post...`,
                username: account.username,
              });
              await page.goto(config.targetPost, {
                waitUntil: "networkidle2",
                timeout: 60000,
              });
            } catch (error) {
              this.emit("log", {
                type: "error",
                message: `❌ Failed to restart browser after failed comment: ${error.message}`,
                username: account.username,
              });
              // Release remaining tags
              for (let j = i + 1; j < commentsToPost; j++) {
                if (commentBatches[j]) {
                  utils.tagTracker.releaseTags(commentBatches[j]);
                }
              }
              break;
            }
          }
        }

        this.emitStats();
      }

      // Session is already saved during login, no need to save again
      if (!this.shouldStop) {
        this.emit("log", {
          type: "success",
          message: `✅ Completed successfully`,
          username: account.username,
        });
      }
    } catch (error) {
      // Only log error if not due to stop
      if (!this.shouldStop) {
        this.emit("log", {
          type: "error",
          message: `🚫 Error: ${error.message}`,
          username: account.username,
        });

        // Log error to file
        utils.logger.logMention({
          account: account.username,
          proxy: proxy ? `${proxy.address}:${proxy.port}` : "",
          status: "ERROR",
          error: error.message,
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

      // Clean up the chrome profile directory to save disk space
      const userDataDir = path.join(getChromeProfilesPath(), account.username);
      deleteProfileDirectory(userDataDir);
    }
  }

  /**
   * Get random filler text to make comments look more natural
   * Returns text to add before, between, or after tags
   */
  getRandomFillerText() {
    const fillerOptions = [
      // Emojis only
      [
        "🔥",
        "❤️",
        "👀",
        "💯",
        "✨",
        "🙌",
        "👏",
        "😍",
        "🤩",
        "💪",
        "⚡",
        "🎯",
        "👑",
        "💫",
        "🌟",
      ],
      // Short phrases
      [
        "check this",
        "look at this",
        "omg",
        "wow",
        "yoo",
        "hey",
        "lol",
        "bruh",
        "yo check",
        "ayy",
      ],
      // Phrases with emojis
      [
        "check this out 🔥",
        "look 👀",
        "yo 🙌",
        "hey guys ✨",
        "omg 😍",
        "wow 🤩",
        "yall see this 👀",
        "bruh 💀",
      ],
      // Call to action
      [
        "thoughts?",
        "wdyt?",
        "yall need to see",
        "dont miss this",
        "peep this",
        "come see",
      ],
      // Engagement phrases
      [
        "tag your friends",
        "show your squad",
        "who else?",
        "anyone?",
        "right?",
        "agree?",
      ],
    ];

    // Pick a random category then random item
    const category =
      fillerOptions[Math.floor(Math.random() * fillerOptions.length)];
    return category[Math.floor(Math.random() * category.length)];
  }

  /**
   * Get random emoji to sprinkle between tags
   */
  getRandomEmoji() {
    const emojis = [
      "🔥",
      "❤️",
      "👀",
      "💯",
      "✨",
      "🙌",
      "👏",
      "😍",
      "🤩",
      "💪",
      "⚡",
      "🎯",
      "👑",
      "💫",
      "🌟",
      "😎",
      "🤙",
      "💥",
      "🎉",
      "👊",
    ];
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
        "form textarea",
        'textarea[autocomplete="off"]',
      ];

      // Random pre-comment behavior - look around the page first like a real user
      await this.simulateReadingPost(page, utils);

      // Small scroll to ensure comment section is visible
      await page.evaluate(() => {
        const textarea =
          document.querySelector('textarea[aria-label="Add a comment…"]') ||
          document.querySelector('textarea[placeholder="Add a comment…"]');
        if (textarea) {
          textarea.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
      await utils.humanBehavior.randomWait(400, 800);

      // Random mouse movement before clicking textarea
      await this.randomMouseMovement(page);

      // Find and click textarea - always get fresh reference
      let textarea = null;
      for (const selector of commentSelectors) {
        try {
          await page.waitForSelector(selector, {
            visible: true,
            timeout: 10000,
          });
          textarea = await page.$(selector);
          if (textarea) break;
        } catch (e) {
          continue;
        }
      }

      if (!textarea) {
        return {
          success: false,
          error: "Comment textarea not found",
          tagsPosted: 0,
        };
      }

      // Click textarea to focus with human-like click
      const box = await textarea.boundingBox();
      if (box) {
        // Click at a random position within the textarea
        const clickX =
          box.x + Math.random() * box.width * 0.8 + box.width * 0.1;
        const clickY =
          box.y + Math.random() * box.height * 0.6 + box.height * 0.2;
        await page.mouse.click(clickX, clickY);
      } else {
        await textarea.click();
      }
      await utils.humanBehavior.humanPause(0.4, 0.8);

      // Clear any existing content in textarea (important for subsequent comments)
      const isMac = process.platform === "darwin";
      if (isMac) {
        await page.keyboard.down("Meta");
        await page.keyboard.press("KeyA");
        await page.keyboard.up("Meta");
      } else {
        await page.keyboard.down("Control");
        await page.keyboard.press("KeyA");
        await page.keyboard.up("Control");
      }
      await page.keyboard.press("Backspace");
      await utils.humanBehavior.randomWait(150, 300);

      // Re-click to ensure focus after clearing
      textarea =
        (await page.$(commentSelectors[0])) ||
        (await page.$(commentSelectors[1]));
      if (textarea) {
        await textarea.click();
        await utils.humanBehavior.randomWait(200, 400);
      }

      // Decide comment structure randomly for variety
      const structureType = Math.floor(Math.random() * 5);

      // Helper to type text naturally with variable speed and occasional pauses
      const typeText = async (text) => {
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const baseDelay = utils.delay.getTypingDelay();
          const extraDelay = [" ", ".", ",", "!", "?", "@"].includes(char)
            ? Math.random() * 80
            : 0;

          await page.keyboard.type(char, { delay: baseDelay + extraDelay });

          // Random micro-pauses (5% chance)
          if (Math.random() < 0.05) {
            await utils.humanBehavior.randomWait(100, 250);
          }
        }
        await page.keyboard.type(" ", { delay: utils.delay.getTypingDelay() });
        await utils.humanBehavior.randomWait(100, 200);
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
        if (!tag.startsWith("@")) {
          tag = `@${tag}`;
        }

        // Type the @username character by character (human-like)
        for (let j = 0; j < tag.length; j++) {
          const char = tag[j];
          const baseDelay = utils.delay.getTypingDelay();
          // Type @ slightly slower
          const charDelay =
            char === "@" ? baseDelay + Math.random() * 50 : baseDelay;

          await page.keyboard.type(char, { delay: charDelay });

          // Random micro-pauses for human feel (8% chance)
          if (Math.random() < 0.08) {
            await utils.humanBehavior.randomWait(50, 150);
          }
        }

        // Add space after username
        await page.keyboard.type(" ", { delay: utils.delay.getTypingDelay() });

        // Shorter pause between usernames
        const pauseType = Math.random();
        if (pauseType < 0.8) {
          await utils.humanBehavior.randomWait(150, 300); // Normal pause
        } else {
          await utils.humanBehavior.randomWait(300, 500); // Slightly longer
        }

        // Occasionally add emoji between tags (8% chance, not on last tag)
        if (i < tags.length - 1 && Math.random() < 0.08) {
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
      await utils.humanBehavior.randomWait(300, 600);

      // Press Escape to close any mention popover
      await page.keyboard.press("Escape");
      await utils.humanBehavior.randomWait(200, 400);

      // Human-like pause before posting (like reviewing what you typed)
      await utils.humanBehavior.humanPause(0.5, 1.0);

      // Random mouse movement before clicking Post
      await this.randomMouseMovement(page);

      // Try posting up to 3 attempts with human-like activity between failures
      let attempt = 0;
      let lastError = null;
      while (attempt < 3) {
        attempt++;

        // Find and click the Post button
        const postClicked = await page.evaluate(() => {
          const allElements = document.querySelectorAll(
            'div[role="button"], button, span',
          );
          for (const el of allElements) {
            const text = el.textContent.trim();
            if (text === "Post") {
              el.click();
              return true;
            }
          }
          return false;
        });

        if (!postClicked) {
          this.emit("log", {
            type: "info",
            message: "Post button not found, using Enter key",
          });
          await page.keyboard.press("Enter");
        }

        // Wait for comment to be posted (longer wait for Instagram to process)
        await utils.humanBehavior.randomWait(2500, 4000);

        // Check for errors including "Couldn't post comment" and "automated behavior"
        const errorDetected = await page.evaluate(() => {
          const errorTexts = [
            "Couldn't post comment",
            "couldn't post comment",
            "Try again later",
            "try again later",
            "Action Blocked",
            "action blocked",
            "We restrict certain",
            "temporarily blocked",
            "automated behavior",
            "suspect automated",
            "temporarily restricted",
            "suspicious activity",
          ];
          const bodyText = document.body.innerText || "";
          return errorTexts.some((text) =>
            bodyText.toLowerCase().includes(text.toLowerCase()),
          );
        });

        // Try to dismiss any popup that appeared
        try {
          const dismissBtn = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const dismissButton = buttons.find(
              (btn) =>
                btn.textContent.toLowerCase().includes("dismiss") ||
                btn.textContent.toLowerCase().includes("ok") ||
                btn.textContent.toLowerCase().includes("got it"),
            );
            if (dismissButton) {
              dismissButton.click();
              return true;
            }
            return false;
          });
          if (dismissBtn) {
            await utils.humanBehavior.randomWait(1000, 2000);
          }
        } catch (e) {
          // Popup might not be present
        }

        if (!errorDetected) {
          // After successful post, do natural post-comment behavior
          try {
            // Click somewhere neutral to reset focus
            await page.evaluate(() => {
              const postArea =
                document.querySelector("article") || document.body;
              if (postArea) postArea.click();
            });
            await utils.humanBehavior.randomWait(400, 800);

            // Scroll around naturally like viewing the post
            await page.evaluate(() => {
              window.scrollBy({
                top: Math.random() * 60 + 20,
                behavior: "smooth",
              });
            });
            await utils.humanBehavior.randomWait(300, 500);
            await page.evaluate(() => {
              window.scrollBy({
                top: -(Math.random() * 50 + 15),
                behavior: "smooth",
              });
            });
            await utils.humanBehavior.randomWait(200, 400);
          } catch (e) {
            // Ignore errors in cleanup
          }

          return { success: true, error: null, tagsPosted: tags.length };
        }

        // If error detected, record and perform human-like recovery actions before retrying
        lastError = "Couldn't post comment - Instagram blocked this action";
        this.emit("log", {
          type: "warning",
          message: `Comment attempt ${attempt} failed. Performing human-like recovery before retry.`,
          username: null,
        });

        // Human-like activity: random scrolling, mouse movements, small pauses
        try {
          await this.randomMouseMovement(page);
          await this.simulateReadingPost(page, utils);
          // Longer randomized backoff before next attempt (3-8 seconds)
          const backoffMs = Math.floor(Math.random() * 5000) + 3000;
          await utils.humanBehavior.randomWait(backoffMs, backoffMs + 1000);
        } catch (e) {
          // ignore
        }

        // If this was the last attempt, break and return failure
        if (attempt >= 3) break;

        // Re-focus the textarea before next try
        try {
          const textarea =
            (await page.$('textarea[aria-label="Add a comment…"]')) ||
            (await page.$('textarea[placeholder="Add a comment…"]'));
          if (textarea) {
            await textarea.click();
            await utils.humanBehavior.randomWait(200, 400);
          }
        } catch (e) {
          // ignore
        }
      }

      return {
        success: false,
        error: lastError || "Failed to post comment",
        tagsPosted: 0,
      };
    } catch (error) {
      return { success: false, error: error.message, tagsPosted: 0 };
    }
  }

  /**
   * Simulate reading the post before commenting (like a real user would)
   */
  async simulateReadingPost(page, utils) {
    try {
      // 50% chance to skip this entirely for speed
      if (Math.random() < 0.5) return;

      // Quick pre-comment action
      const action = Math.random();

      if (action < 0.4) {
        // Small scroll
        await page.evaluate(() => {
          window.scrollBy({ top: -80, behavior: "smooth" });
        });
        await utils.humanBehavior.randomWait(500, 1000);
        await page.evaluate(() => {
          window.scrollBy({ top: 80, behavior: "smooth" });
        });
        await utils.humanBehavior.randomWait(300, 500);
      } else {
        // Just a quick pause
        await utils.humanBehavior.randomWait(400, 800);
      }
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Random mouse movement to simulate human behavior
   */
  async randomMouseMovement(page) {
    try {
      const viewport = page.viewport();
      if (!viewport) return;

      // Move mouse to a random position
      const x = Math.floor(Math.random() * (viewport.width - 200)) + 100;
      const y = Math.floor(Math.random() * (viewport.height - 200)) + 100;

      await page.mouse.move(x, y, {
        steps: Math.floor(Math.random() * 10) + 5,
      });
      await new Promise((r) => setTimeout(r, Math.random() * 300 + 100));
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Get proxy for account
   */
  /**
   * Parse proxy string to object
   * Supports: "ip:port:user:pass" or "ip:port" or object {address, port, username, password}
   */
  parseProxy(proxyInput) {
    if (!proxyInput) return null;

    // Already an object
    if (typeof proxyInput === "object" && proxyInput.address) {
      return proxyInput;
    }

    // String format: "ip:port:user:pass" or "ip:port"
    if (typeof proxyInput === "string") {
      const parts = proxyInput.split(":");
      if (parts.length >= 2) {
        return {
          address: parts[0],
          port: parts[1],
          username: parts[2] || null,
          password: parts.slice(3).join(":") || null, // Handle passwords with colons
        };
      }
    }

    return null;
  }

  /**
   * Get a random proxy from the account's own proxy list
   * Each account has its own proxies that are not shared with other accounts
   */
  getProxyForAccount(account) {
    // Prefer proxyManager active proxy if available (ensures same proxy reused until flagged)
    try {
      if (
        this.utils &&
        this.utils.proxyManager &&
        typeof this.utils.proxyManager.getActiveProxy === "function"
      ) {
        const active = this.utils.proxyManager.getActiveProxy(
          account.username,
          account.proxies || [],
        );
        if (active) {
          return this.parseProxy(active);
        }
      }
    } catch (e) {
      // Fall back to random selection
      this.emit &&
        this.emit("log") &&
        this.emit("log", {
          type: "warning",
          message: `Proxy manager error: ${e.message}`,
          username: account.username,
        });
    }

    // Fallback: random selection from account proxies
    if (account.proxies && account.proxies.length > 0) {
      const randomIndex = Math.floor(Math.random() * account.proxies.length);
      const proxyInput = account.proxies[randomIndex];
      return this.parseProxy(proxyInput);
    }
    // No proxies configured for this account
    return null;
  }

  /**
   * Login with logging to UI
   * Custom login handler that emits detailed logs
   */
  async loginWithLogs(page, account, utils) {
    const COOKIES_DIR = path.join(__dirname, "..", "cookies");
    const cookiePath = path.join(COOKIES_DIR, `${account.username}.json`);

    // Try to restore session from cookies first (use sessionManager when available)
    try {
      // Prefer sessionManager helper if provided
      if (
        utils &&
        utils.sessionManager &&
        typeof utils.sessionManager.loadCookies === "function"
      ) {
        const loaded = await utils.sessionManager.loadCookies(
          page,
          account.username,
        );
        if (loaded) {
          this.emit("log", {
            type: "info",
            message: `🍪 Loaded cookies for ${account.username}`,
            username: account.username,
          });
          // Verify session
          await page
            .goto("https://www.instagram.com/", {
              waitUntil: "networkidle2",
              timeout: 60000,
            })
            .catch(() => {});
          const isLoggedIn = await page.evaluate(() => {
            return (
              document.querySelector('svg[aria-label="Home"]') !== null ||
              document.querySelector('a[href="/"]') !== null
            );
          });
          if (isLoggedIn) {
            this.emit("log", {
              type: "success",
              message: `🍪 Session restored for ${account.username}`,
              username: account.username,
            });
            return {
              success: true,
              checkpoint: false,
              blocked: false,
              error: null,
            };
          } else {
            this.emit("log", {
              type: "warning",
              message: `🍪 Session exists but is expired for ${account.username}`,
              username: account.username,
            });
            return {
              success: false,
              error: "manual_login_required",
              checkpoint: false,
              blocked: false,
            };
          }
        }
      } else {
        // Fallback: try reading cookie file directly
        if (fs.existsSync(cookiePath)) {
          const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf8"));
          if (cookies && Array.isArray(cookies) && cookies.length > 0) {
            await page.setCookie(...cookies);
            await page
              .goto("https://www.instagram.com/", {
                waitUntil: "networkidle2",
                timeout: 60000,
              })
              .catch(() => {});
            const isLoggedIn = await page.evaluate(() => {
              return (
                document.querySelector('svg[aria-label="Home"]') !== null ||
                document.querySelector('a[href="/"]') !== null
              );
            });
            if (isLoggedIn) {
              this.emit("log", {
                type: "success",
                message: `🍪 Session restored for ${account.username}`,
                username: account.username,
              });
              return {
                success: true,
                checkpoint: false,
                blocked: false,
                error: null,
              };
            } else {
              this.emit("log", {
                type: "warning",
                message: `🍪 Session exists but is expired for ${account.username}`,
                username: account.username,
              });
              return {
                success: false,
                error: "manual_login_required",
                checkpoint: false,
                blocked: false,
              };
            }
          }
        }
      }
    } catch (e) {
      this.emit("log", {
        type: "warning",
        message: `⚠️ Failed loading cookies: ${e.message}`,
        username: account.username,
      });
      return {
        success: false,
        error: "manual_login_required",
        checkpoint: false,
        blocked: false,
      };
    }

    // No valid cookies found — require manual login
    this.emit("log", {
      type: "info",
      message: `🔐 No saved session for ${account.username}. Manual login required.`,
      username: account.username,
    });
    return {
      success: false,
      error: "manual_login_required",
      checkpoint: false,
      blocked: false,
    };
  }

  /**
   * Stop the automation
   */
  async stop() {
    if (!this.isRunning && !this.shouldStop) {
      return; // Already stopped
    }

    this.shouldStop = true;
    this.emit("log", {
      type: "warning",
      message: "⏹️ Stop requested. Finishing current task...",
    });
    this.emit("status", {
      status: "stopping",
      message: "Stopping automation...",
    });

    // Close all browser instances to interrupt any ongoing operations
    if (this.browsers && this.browsers.length > 0) {
      this.emit("log", {
        type: "info",
        message: `🔄 Closing ${this.browsers.length} browser(s)...`,
      });
      for (const browser of this.browsers) {
        try {
          await browser.close();
        } catch (e) {
          // Browser might already be closed
        }
      }
      this.browsers = [];
    }

    // Also close legacy single browser reference if exists
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        // Browser might already be closed
      }
      this.browser = null;
    }

    // Clean up all chrome profile directories
    this.emit("log", {
      type: "info",
      message: "🧹 Cleaning up temporary browser profiles...",
    });
    try {
      const profilesPath = getChromeProfilesPath();
      if (fs.existsSync(profilesPath)) {
        fs.rmSync(profilesPath, { recursive: true, force: true });
      }
    } catch (e) {
      this.emit("log", {
        type: "warning",
        message: `⚠️ Could not clean up profiles: ${e.message}`,
      });
    }

    this.isRunning = false;
    this.emit("log", {
      type: "info",
      message: "✅ Automation stopped by user",
    });
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
      failedComments: 0,
    };
  }

  /**
   * Emit current stats
   */
  emitStats() {
    // Get tagged count from global tracker (use this.utils stored from start())
    let trackerStats = { totalTagged: 0 };
    if (this.utils && this.utils.tagTracker) {
      trackerStats = this.utils.tagTracker.getStats();
    }

    this.emit("stats", {
      accounts: this.stats.accountsProcessed,
      comments: this.stats.successfulComments, // Only successful comments
      tagged: trackerStats.totalTagged || this.stats.tagsPosted,
      taggedTotal: trackerStats.totalTagged || this.stats.tagsPosted,
      failedComments: this.stats.failedComments,
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

        await page.evaluate(
          (amount, up) => {
            const direction = up ? -1 : 1;
            window.scrollBy({
              top: amount * direction,
              behavior: "smooth",
            });
          },
          scrollAmount,
          scrollUp,
        );

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
   * Sleep helper - simple delay without checking shouldStop
   * Each account runs independently in parallel mode
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sleep with countdown display - shows remaining time and can be stopped
   * @param {number} totalMs - Total milliseconds to wait
   * @param {string} username - Username for log context
   * @param {string} reason - Reason for waiting (e.g., "Next comment")
   * @returns {Promise<boolean>} - Returns true if completed, false if stopped
   */
  async sleepWithCountdown(totalMs, username, reason = "Next action") {
    const updateInterval = 5000; // Update every 5 seconds
    let remaining = totalMs;

    while (remaining > 0 && !this.shouldStop) {
      const waitTime = Math.min(updateInterval, remaining);

      // Show countdown
      const remainingSecs = Math.ceil(remaining / 1000);
      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      this.emit("log", {
        type: "countdown",
        message: `⏱️ ${reason} in ${timeStr}...`,
        username,
        countdown: {
          remaining: remainingSecs,
          total: Math.ceil(totalMs / 1000),
        },
      });

      await this.sleep(waitTime);
      remaining -= waitTime;
    }

    if (this.shouldStop) {
      this.emit("log", {
        type: "warning",
        message: `⏹️ Wait cancelled - stopping`,
        username,
      });
      return false;
    }

    return true;
  }
}

module.exports = AutomationRunner;
