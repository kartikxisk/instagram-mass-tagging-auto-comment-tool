/**
 * Proxy Checker Runner for Electron
 * Checks all proxies and reports progress
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Get user data path for storing app data
 */
function getAppDataPath() {
  if (app && app.isPackaged) {
    return app.getPath('userData');
  }
  return path.join(__dirname, '..');
}

/**
 * Check a single proxy
 */
async function checkProxy(proxy) {
  const proxyUrl = proxy.username && proxy.password
    ? `http://${proxy.username}:${proxy.password}@${proxy.address}:${proxy.port}`
    : `http://${proxy.address}:${proxy.port}`;

  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpsAgent: agent,
      timeout: 15000
    });

    return {
      proxy: `${proxy.address}:${proxy.port}`,
      success: true,
      ip: response.data.ip
    };
  } catch (error) {
    return {
      proxy: `${proxy.address}:${proxy.port}`,
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse proxy from various formats
 * Supports: "ip:port:user:pass", "ip:port", or {address, port, username, password}
 */
function parseProxy(proxyInput) {
  if (!proxyInput) return null;
  
  // Already an object
  if (typeof proxyInput === 'object' && proxyInput.address) {
    return proxyInput;
  }
  
  // String format: "ip:port:user:pass" or "ip:port"
  if (typeof proxyInput === 'string') {
    const parts = proxyInput.split(':');
    if (parts.length >= 2) {
      return {
        address: parts[0],
        port: parts[1],
        username: parts[2] || null,
        password: parts.slice(3).join(':') || null // Handle passwords with colons
      };
    }
  }
  
  return null;
}

/**
 * Check all proxies from config
 */
async function checkAllProxies(onProgress) {
  const basePath = getAppDataPath();
  const configPath = path.join(basePath, 'config', 'accounts.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const allProxies = [];

  // Account-specific proxies only (no global proxies)
  if (config.accounts && Array.isArray(config.accounts)) {
    for (const account of config.accounts) {
      if (account.proxies && Array.isArray(account.proxies)) {
        // Tag proxies with account info for reporting
        account.proxies.forEach(proxyInput => {
          const proxy = parseProxy(proxyInput);
          if (proxy) {
            allProxies.push({
              ...proxy,
              accountUsername: account.username
            });
          }
        });
      }
    }
  }

  // Remove duplicates (same proxy might be used by multiple accounts)
  const uniqueProxies = [];
  const seen = new Set();
  for (const proxy of allProxies) {
    const key = `${proxy.address}:${proxy.port}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueProxies.push(proxy);
    }
  }

  const results = [];
  const total = uniqueProxies.length;

  for (let i = 0; i < uniqueProxies.length; i++) {
    const proxy = uniqueProxies[i];
    const result = await checkProxy(proxy);
    results.push(result);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        proxy: `${proxy.address}:${proxy.port}`,
        status: result.success ? '✅ Success' : '❌ Failed'
      });
    }
  }

  return results;
}

module.exports = { checkAllProxies, checkProxy };
