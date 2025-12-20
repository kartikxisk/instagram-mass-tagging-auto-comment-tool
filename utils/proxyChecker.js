const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { createObjectCsvWriter } = require('csv-writer');

const ACCOUNTS_PATH = path.join(__dirname, '..', 'config', 'accounts.json');
const LOG_PATH = path.join(__dirname, '..', 'logs', 'proxy_check_log.csv');

const config = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf-8'));

// Support both old format (array) and new format (object with accounts/proxies)
const accounts = Array.isArray(config) ? config : (config.accounts || []);
const proxyPool = Array.isArray(config) ? [] : (config.proxies || []);

// Get proxies from accounts (if they have individual proxies)
const accountProxies = accounts
  .filter(acc => acc.proxy && acc.proxy.address && acc.proxy.port)
  .map(acc => {
    const { proxy } = acc;
    return {
      label: `${proxy.address}:${proxy.port} (account: ${acc.username})`,
      proxy: proxy
    };
  });

// Get proxies from proxy pool
const poolProxies = proxyPool
  .filter(proxy => proxy.address && proxy.port)
  .map(proxy => ({
    label: `${proxy.address}:${proxy.port} (pool)`,
    proxy: proxy
  }));

// Combine all proxies (deduplicate by address:port)
const seenProxies = new Set();
const allProxies = [...accountProxies, ...poolProxies].filter(item => {
  const key = `${item.proxy.address}:${item.proxy.port}`;
  if (seenProxies.has(key)) return false;
  seenProxies.add(key);
  return true;
});

// Build proxy URLs
const proxies = allProxies.map(item => {
  const { proxy } = item;
  let proxyUrl;
  if (proxy.username && proxy.password) {
    proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.address}:${proxy.port}`;
  } else {
    proxyUrl = `http://${proxy.address}:${proxy.port}`;
  }
  return {
    label: item.label,
    url: proxyUrl
  };
});

(async () => {
  if (proxies.length === 0) {
    console.log('⚠️ No proxies found in accounts.json');
    console.log('   Add proxies to the "proxies" array or to individual accounts.');
    return;
  }

  console.log(`🔍 Checking ${proxies.length} proxies from accounts.json...\n`);

  const results = [];

  for (const { label, url } of proxies) {
    try {
      const agent = new HttpsProxyAgent(url);

      const res = await axios.get('https://www.instagram.com/', {
        httpsAgent: agent,
        timeout: 15000,
      });

      if (res.data.includes('instagram')) {
        console.log(`${label} --> ✅ Success`);
        results.push({ label, status: '✅ Success' });
      } else {
        console.log(`${label} --> ❌ Failed - No IG content`);
        results.push({ label, status: '❌ Failed - No IG content' });
      }
    } catch (err) {
      console.log(`${label} --> ❌ Failed - ${err.message}`);
      results.push({ label, status: `❌ Failed - ${err.message}` });
    }
  }

  // Ensure logs directory exists
  const logsDir = path.dirname(LOG_PATH);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const csvWriter = createObjectCsvWriter({
    path: LOG_PATH,
    header: [
      { id: 'label', title: 'Proxy' },
      { id: 'status', title: 'Status' },
    ],
  });

  await csvWriter.writeRecords(results);

  // Summary
  const successCount = results.filter(r => r.status.includes('Success')).length;
  const failCount = results.length - successCount;
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`� Summary: ${successCount} working, ${failCount} failed`);
  console.log(`📄 Results saved to ${LOG_PATH}`);
})();
