const path = require('path');

/**
 * Configures proxy settings for Puppeteer launch options
 * @param {Object} proxy - Proxy configuration object
 * @param {string} proxy.address - Proxy server address
 * @param {number|string} proxy.port - Proxy server port
 * @param {string} [proxy.protocol='http'] - Proxy protocol (http, https, socks5)
 * @param {string} [proxy.username] - Proxy username for authentication
 * @param {string} [proxy.password] - Proxy password for authentication
 * @returns {Object} - Returns { launchArgs, authenticateConfig }
 */
function setupProxyArgs(proxy) {
  const result = {
    launchArgs: [],
    authenticateConfig: null
  };

  if (!proxy?.address || !proxy?.port) {
    return result;
  }

  const protocol = proxy.protocol || 'http';
  const port = typeof proxy.port === 'string' ? proxy.port : proxy.port;

  // Build proxy URL with or without authentication
  let proxyUrl;

  if (proxy.username && proxy.password) {
    // For HTTP proxies, use page.authenticate() instead of embedding credentials
    if (protocol === 'http') {
      proxyUrl = `${protocol}://${proxy.address}:${port}`;
      result.authenticateConfig = {
        username: proxy.username,
        password: proxy.password
      };
      console.log(`🔐 Proxy authentication method: page.authenticate()`);
    } else {
      // For HTTPS and other protocols, embed credentials in URL
      proxyUrl = `${protocol}://${proxy.username}:${proxy.password}@${proxy.address}:${port}`;
      console.log(`🔐 Proxy authentication method: embedded in URL`);
    }
  } else {
    proxyUrl = `${protocol}://${proxy.address}:${port}`;
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
  applyProxyAuthentication
};
