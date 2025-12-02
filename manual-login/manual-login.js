const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const ACCOUNTS_FILE = path.resolve(__dirname, '../config/accounts.json');
const COOKIES_DIR = path.resolve(__dirname, '../cookies');

if (!fs.existsSync(COOKIES_DIR)) {
  fs.mkdirSync(COOKIES_DIR);
}

function askUserToContinue(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

(async () => {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));

  for (const account of accounts) {
    const { username, password, proxy } = account;
    const cookiePath = path.join(COOKIES_DIR, `${username}.json`);

    if (fs.existsSync(cookiePath)) {
      console.log(`⚠️ Skipping ${username} — cookies already exist.`);
      continue;
    }

    console.log(`\n🟢 Starting login for ${username}...`);

    const proxyUrl = proxy
      ? `--proxy-server=http://${proxy.address}:${proxy.port}`
      : null;

    const args = ['--no-sandbox', '--disable-setuid-sandbox'];
    if (proxyUrl) args.push(proxyUrl);

    const browser = await puppeteer.launch({
      headless: false,
      args,
      defaultViewport: null,
    });

    const page = await browser.newPage();

    if (proxy && proxy.username && proxy.password) {
      await page.authenticate({
        username: proxy.username,
        password: proxy.password,
      });
    }

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    try {
      console.log(`🌐 Navigating to Instagram login page for ${username}...`);
      await page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      await page.waitForSelector('input[name="username"]', { timeout: 20000 });

      console.log(`🧠 Autofilling credentials for ${username}...`);
      await page.type('input[name="username"]', username, { delay: 100 });
      await page.type('input[name="password"]', password, { delay: 100 });

      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
      ]);

      console.log('⏳ Please complete any verification (2FA, checkpoint, etc.) manually if shown.');
      await askUserToContinue('✅ Once logged in and feed is visible, press ENTER to save cookies...');

      const cookies = await page.cookies();
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
      console.log(`✅ Cookies saved for ${username} at cookies/${username}.json`);

      console.log(`🚨 Browser will stay open for ${username}. Close it manually when you're done.`);
    
    } catch (error) {
      console.error(`❌ Error with ${username}: ${error.message}`);
    }
  }

  console.log('\n📢 All accounts processed. You may manually close any remaining browsers.');
})();
