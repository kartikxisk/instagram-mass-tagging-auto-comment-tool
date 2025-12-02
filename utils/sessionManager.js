const fs = require('fs');
const path = require('path');

async function login(page, account) {
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

  await page.waitForSelector('input[name="username"]', { visible: true });
  await page.type('input[name="username"]', account.username, { delay: 100 });
  await page.type('input[name="password"]', account.password, { delay: 100 });
  await page.keyboard.press('Enter');

  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Save cookies
  const cookies = await page.cookies();
  const cookiePath = path.join(__dirname, '..', 'cookies', `${account.username}.json`);
  fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));

  console.log(`Logged in & saved session for ${account.username}`);
}

async function loadSession(page, account) {
  const cookiePath = path.join(__dirname, '..', 'cookies', `${account.username}.json`);
  if (fs.existsSync(cookiePath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiePath));
    await page.setCookie(...cookies);
    console.log(`Loaded session cookies for ${account.username}`);
  } else {
    console.log(`No session found for ${account.username}, logging in...`);
    await login(page, account);
  }
}

async function createSession(page, account) {
  await loadSession(page, account);
}

module.exports = { login, loadSession, createSession };
