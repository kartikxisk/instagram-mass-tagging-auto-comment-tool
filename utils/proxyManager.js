/**
 * Proxy Manager - Manages active and flagged proxies per account
 * Features:
 * - Track active proxy per account
 * - Flag suspicious proxies
 * - Auto-switch to backup proxy when flagged
 * - Persist flagged proxy data
 */

const fs = require("fs");
const path = require("path");
const { getDataPath } = require("./paths");
const DATA_DIR = getDataPath();
const FLAGGED_PROXIES_FILE = path.join(DATA_DIR, "flagged_proxies.json");
const ACTIVE_PROXIES_FILE = path.join(DATA_DIR, "active_proxies.json");

// Ensure data directory exists (handled by paths.js but redundant check is safe)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Parse proxy string to object
 */
function parseProxy(proxy) {
  if (!proxy) return null;

  if (typeof proxy === "object") {
    return proxy;
  }

  const parts = proxy.split(":");
  if (parts.length >= 4) {
    return {
      address: parts[0],
      port: parts[1],
      username: parts[2],
      password: parts.slice(3).join(":"), // Handle passwords with colons
      raw: proxy,
    };
  } else if (parts.length === 2) {
    return {
      address: parts[0],
      port: parts[1],
      raw: proxy,
    };
  }
  return null;
}

/**
 * Get proxy identifier (ip:port)
 */
function getProxyId(proxy) {
  const parsed = parseProxy(proxy);
  if (!parsed) return null;
  return `${parsed.address}:${parsed.port}`;
}

/**
 * Load flagged proxies from file
 */
function loadFlaggedProxies() {
  try {
    if (fs.existsSync(FLAGGED_PROXIES_FILE)) {
      return JSON.parse(fs.readFileSync(FLAGGED_PROXIES_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Error loading flagged proxies:", error.message);
  }
  return {
    proxies: [],
    lastUpdated: null,
  };
}

/**
 * Save flagged proxies to file
 */
function saveFlaggedProxies(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(FLAGGED_PROXIES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving flagged proxies:", error.message);
    return false;
  }
}

/**
 * Load active proxies per account
 */
function loadActiveProxies() {
  try {
    if (fs.existsSync(ACTIVE_PROXIES_FILE)) {
      return JSON.parse(fs.readFileSync(ACTIVE_PROXIES_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Error loading active proxies:", error.message);
  }
  return {};
}

/**
 * Save active proxies per account
 */
function saveActiveProxies(data) {
  try {
    fs.writeFileSync(ACTIVE_PROXIES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving active proxies:", error.message);
    return false;
  }
}

/**
 * Check if a proxy is flagged
 */
function isProxyFlagged(proxy) {
  const flaggedData = loadFlaggedProxies();
  const proxyId = getProxyId(proxy);
  return flaggedData.proxies.some((fp) => fp.proxyId === proxyId);
}

/**
 * Flag a proxy as suspicious
 * @param {string} proxy - Proxy string
 * @param {string} reason - Reason for flagging
 * @param {string} account - Account that triggered the flag
 */
function flagProxy(proxy, reason, account = null) {
  const flaggedData = loadFlaggedProxies();
  const proxyId = getProxyId(proxy);

  // Check if already flagged
  const existing = flaggedData.proxies.find((fp) => fp.proxyId === proxyId);
  if (existing) {
    existing.flagCount++;
    existing.lastFlagged = new Date().toISOString();
    existing.reasons.push({
      reason,
      account,
      timestamp: new Date().toISOString(),
    });
  } else {
    flaggedData.proxies.push({
      proxyId,
      proxy: proxy,
      flagCount: 1,
      firstFlagged: new Date().toISOString(),
      lastFlagged: new Date().toISOString(),
      reasons: [{ reason, account, timestamp: new Date().toISOString() }],
    });
  }

  saveFlaggedProxies(flaggedData);
  console.log(`⚠️  Proxy ${proxyId} flagged: ${reason}`);
  return true;
}

/**
 * Unflag a proxy (mark as good again)
 */
function unflagProxy(proxy) {
  const flaggedData = loadFlaggedProxies();
  const proxyId = getProxyId(proxy);

  flaggedData.proxies = flaggedData.proxies.filter(
    (fp) => fp.proxyId !== proxyId,
  );
  saveFlaggedProxies(flaggedData);
  console.log(`✅ Proxy ${proxyId} unflagged`);
  return true;
}

/**
 * Get all flagged proxies
 */
function getFlaggedProxies() {
  return loadFlaggedProxies();
}

/**
 * Clear all flagged proxies
 */
function clearFlaggedProxies() {
  saveFlaggedProxies({ proxies: [], lastUpdated: new Date().toISOString() });
  console.log("🗑️  All flagged proxies cleared");
  return true;
}

/**
 * Get active proxy for an account
 * @param {string} username - Account username
 * @param {Array} accountProxies - List of proxies for the account
 * @returns {string|null} Active proxy string or null
 */
function getActiveProxy(username, accountProxies) {
  if (!accountProxies || accountProxies.length === 0) {
    return null;
  }

  const activeProxies = loadActiveProxies();
  const flaggedData = loadFlaggedProxies();

  // Get current active proxy index for this account
  let activeIndex = activeProxies[username]?.activeIndex || 0;

  // Find first non-flagged proxy starting from active index
  for (let i = 0; i < accountProxies.length; i++) {
    const index = (activeIndex + i) % accountProxies.length;
    const proxy = accountProxies[index];
    const proxyId = getProxyId(proxy);

    const isFlagged = flaggedData.proxies.some((fp) => fp.proxyId === proxyId);

    if (!isFlagged) {
      // Update active index if changed
      if (index !== activeIndex) {
        activeProxies[username] = {
          activeIndex: index,
          proxy: proxy,
          lastUpdated: new Date().toISOString(),
        };
        saveActiveProxies(activeProxies);
        console.log(`🔄 Account ${username} switched to proxy ${proxyId}`);
      }
      return proxy;
    }
  }

  // All proxies are flagged - return first one anyway with warning
  console.warn(
    `⚠️  All proxies for ${username} are flagged! Using first proxy anyway.`,
  );
  return accountProxies[0];
}

/**
 * Switch to next available proxy for an account
 * @param {string} username - Account username
 * @param {Array} accountProxies - List of proxies for the account
 * @param {string} reason - Reason for switching
 * @returns {string|null} New active proxy or null
 */
function switchToNextProxy(username, accountProxies, reason = "Manual switch") {
  if (!accountProxies || accountProxies.length <= 1) {
    console.log(`⚠️  No backup proxies available for ${username}`);
    return null;
  }

  const activeProxies = loadActiveProxies();
  const currentIndex = activeProxies[username]?.activeIndex || 0;
  const currentProxy = accountProxies[currentIndex];

  // Flag the current proxy
  flagProxy(currentProxy, reason, username);

  // Find next non-flagged proxy
  const flaggedData = loadFlaggedProxies();

  for (let i = 1; i < accountProxies.length; i++) {
    const index = (currentIndex + i) % accountProxies.length;
    const proxy = accountProxies[index];
    const proxyId = getProxyId(proxy);

    const isFlagged = flaggedData.proxies.some((fp) => fp.proxyId === proxyId);

    if (!isFlagged) {
      activeProxies[username] = {
        activeIndex: index,
        proxy: proxy,
        lastUpdated: new Date().toISOString(),
      };
      saveActiveProxies(activeProxies);
      console.log(`✅ Account ${username} switched to new proxy ${proxyId}`);
      return proxy;
    }
  }

  console.warn(`⚠️  No unflagged proxies remaining for ${username}`);
  return null;
}

/**
 * Get proxy status for all accounts (for UI)
 */
function getProxyStatus(accounts) {
  const activeProxies = loadActiveProxies();
  const flaggedData = loadFlaggedProxies();

  const status = accounts.map((account) => {
    const accountProxies = account.proxies || [];
    const activeIndex = activeProxies[account.username]?.activeIndex || 0;
    const activeProxy = accountProxies[activeIndex];

    const proxyStatuses = accountProxies.map((proxy, index) => {
      const proxyId = getProxyId(proxy);
      const flagInfo = flaggedData.proxies.find((fp) => fp.proxyId === proxyId);

      return {
        proxy: proxyId,
        isActive: index === activeIndex,
        isFlagged: !!flagInfo,
        flagCount: flagInfo?.flagCount || 0,
        lastFlagged: flagInfo?.lastFlagged || null,
        reasons: flagInfo?.reasons || [],
      };
    });

    return {
      username: account.username,
      activeProxy: getProxyId(activeProxy),
      totalProxies: accountProxies.length,
      flaggedCount: proxyStatuses.filter((p) => p.isFlagged).length,
      availableCount: proxyStatuses.filter((p) => !p.isFlagged).length,
      proxies: proxyStatuses,
    };
  });

  return {
    accounts: status,
    totalFlagged: flaggedData.proxies.length,
    lastUpdated: flaggedData.lastUpdated,
  };
}

/**
 * Detection reasons that should trigger proxy flagging
 */
const DETECTION_REASONS = {
  RATE_LIMITED: "Rate limited by Instagram",
  CHALLENGE_REQUIRED: "Challenge/verification required",
  SUSPICIOUS_ACTIVITY: "Suspicious activity detected",
  LOGIN_FAILED: "Login failed multiple times",
  IP_BLOCKED: "IP appears to be blocked",
  CAPTCHA: "Captcha triggered",
  ACTION_BLOCKED: "Action was blocked",
  ACCOUNT_RESTRICTED: "Account restricted while using this proxy",
};

module.exports = {
  parseProxy,
  getProxyId,
  isProxyFlagged,
  flagProxy,
  unflagProxy,
  getFlaggedProxies,
  clearFlaggedProxies,
  getActiveProxy,
  switchToNextProxy,
  getProxyStatus,
  DETECTION_REASONS,
  loadFlaggedProxies,
  loadActiveProxies,
};
