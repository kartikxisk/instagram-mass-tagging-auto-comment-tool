const path = require('path');

/**
 * Parse proxy from various formats
 * Supports: "ip:port:user:pass", "ip:port", or {address, port, username, password}
 */
function parseProxy(proxyInput) {
  if (!proxyInput) return null;
  
  // Already an object with address
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
        password: parts[3] || null,
        protocol: 'http'
      };
    }
  }
  
  return null;
}

/**
 * Configures proxy settings for Puppeteer launch options
 * @param {Object|string} proxyInput - Proxy configuration object or string "ip:port:user:pass"
 * @returns {Object} - Returns { launchArgs, authenticateConfig }
 */
function setupProxyArgs(proxyInput) {
  const result = {
    launchArgs: [],
    authenticateConfig: null
  };

  // Parse proxy from string or object format
  const proxy = parseProxy(proxyInput);

  if (!proxy?.address || !proxy?.port) {
    return result;
  }

  const protocol = proxy.protocol || 'http';
  const port = proxy.port;

  // Build proxy URL
  let proxyUrl = `${protocol}://${proxy.address}:${port}`;

  if (proxy.username && proxy.password) {
    // Use page.authenticate() for HTTP proxies
    result.authenticateConfig = {
      username: proxy.username,
      password: proxy.password
    };
    console.log(`🔐 Proxy authentication configured for ${proxy.address}:${port}`);
  }

  result.launchArgs.push(`--proxy-server=${proxyUrl}`);
  console.log(`🌐 Proxy configured: ${proxy.address}:${port} (${protocol})`);

  return result;
}

/**
 * Applies proxy authentication to a page if needed
 * @param {Object} page - Puppeteer page object
 * @param {Object} authenticateConfig - Authentication config from setupProxyArgs
 * @param {string} accountUsername - Account username for logging
 */
async function applyProxyAuthentication(page, authenticateConfig, accountUsername) {
  if (!authenticateConfig) {
    return;
  }

  try {
    await page.authenticate(authenticateConfig);
    console.log(`✅ Proxy authentication applied for ${accountUsername}`);
  } catch (error) {
    console.error(`⚠️ Failed to apply proxy authentication for ${accountUsername}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  setupProxyArgs,
  applyProxyAuthentication,
  parseProxy
};
