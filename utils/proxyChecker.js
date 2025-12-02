const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { createObjectCsvWriter } = require('csv-writer');

const ACCOUNTS_PATH = path.join(__dirname, '..', 'config', 'accounts.json');
const LOG_PATH = path.join(__dirname, '..', 'logs', 'proxy_check_log.csv');

const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf-8'));

const proxies = accounts
  .filter(acc => acc.proxy && acc.proxy.address && acc.proxy.port)
  .map(acc => {
    const { proxy } = acc;
    const proxyAuth = `${proxy.username}:${proxy.password}`;
    const proxyUrl = `http://${proxyAuth}@${proxy.address}:${proxy.port}`;
    return {
      label: `${proxy.address}:${proxy.port}`,
      url: proxyUrl
    };
  });

(async () => {
  console.log(`🔍 Checking ${proxies.length} proxies from accounts.json...\n`);

  const results = [];

  for (const { label, url } of proxies) {
    try {
      const agent = new HttpsProxyAgent(url);

      const res = await axios.get('https://www.instagram.com/', {
        httpsAgent: agent,
        timeout: 8000,
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

  const csvWriter = createObjectCsvWriter({
    path: LOG_PATH,
    header: [
      { id: 'label', title: 'label' },
      { id: 'status', title: 'status' },
    ],
  });

  await csvWriter.writeRecords(results);

  console.log(`\n📄 Proxy check completed. Results saved to ${LOG_PATH}`);
})();
