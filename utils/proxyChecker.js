const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { createObjectCsvWriter } = require('csv-writer');

const ACCOUNTS_PATH = path.join(__dirname, '..', 'config', 'accounts.json');

// Create date-wise folder for logs
const today = new Date();
const dateFolder = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const LOGS_DIR = path.join(__dirname, '..', 'logs', dateFolder);
const LOG_PATH = path.join(LOGS_DIR, 'proxy_check_log.csv');

const config = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf-8'));

// Support both old format (array) and new format (object with accounts/proxies)
const accounts = Array.isArray(config) ? config : (config.accounts || []);
const proxyPool = Array.isArray(config) ? [] : (config.proxies || []);

// Get proxies from accounts - support both single proxy and multiple proxies
const accountProxies = [];

accounts.forEach(acc => {
  // Check for multiple proxies array
  if (acc.proxies && Array.isArray(acc.proxies)) {
    acc.proxies.forEach((proxy, idx) => {
      if (proxy.address && proxy.port) {
        accountProxies.push({
          label: `${proxy.address}:${proxy.port} (account: ${acc.username} [${idx + 1}/${acc.proxies.length}])`,
          proxy: proxy
        });
      }
    });
  }
  // Check for single proxy object
  else if (acc.proxy && acc.proxy.address && acc.proxy.port) {
    accountProxies.push({
      label: `${acc.proxy.address}:${acc.proxy.port} (account: ${acc.username})`,
      proxy: acc.proxy
    });
  }
});

// Get proxies from global proxy pool
const poolProxies = proxyPool
  .filter(proxy => proxy.address && proxy.port)
  .map(proxy => ({
    label: `${proxy.address}:${proxy.port} (global pool)`,
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
    const timestamp = new Date().toISOString();
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const time = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });

    try {
      const agent = new HttpsProxyAgent(url);

      const res = await axios.get('https://www.instagram.com/', {
        httpsAgent: agent,
        timeout: 15000,
      });

      if (res.data.includes('instagram')) {
        console.log(`${label} --> ✅ Success`);
        results.push({ date, time, timestamp, label, status: '✅ Success' });
      } else {
        console.log(`${label} --> ❌ Failed - No IG content`);
        results.push({ date, time, timestamp, label, status: '❌ Failed - No IG content' });
      }
    } catch (err) {
      console.log(`${label} --> ❌ Failed - ${err.message}`);
      results.push({ date, time, timestamp, label, status: `❌ Failed - ${err.message}` });
    }
  }

  // Ensure date-wise logs directory exists
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  const csvWriter = createObjectCsvWriter({
    path: LOG_PATH,
    header: [
      { id: 'date', title: 'Date' },
      { id: 'time', title: 'Time' },
      { id: 'timestamp', title: 'Timestamp' },
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
