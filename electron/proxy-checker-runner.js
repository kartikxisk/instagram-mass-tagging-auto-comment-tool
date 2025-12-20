/**
 * Proxy Checker Runner for Electron
 * Checks all proxies and reports progress
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

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
 * Check all proxies from config
 */
async function checkAllProxies(onProgress) {
  const configPath = path.join(__dirname, '../config/accounts.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const allProxies = [];

  // Global proxies
  if (config.proxies && Array.isArray(config.proxies)) {
    allProxies.push(...config.proxies);
  }

  // Account-specific proxies
  if (config.accounts && Array.isArray(config.accounts)) {
    for (const account of config.accounts) {
      if (account.proxy) {
        allProxies.push(account.proxy);
      }
      if (account.proxies && Array.isArray(account.proxies)) {
        allProxies.push(...account.proxies);
      }
    }
  }

  // Remove duplicates
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
