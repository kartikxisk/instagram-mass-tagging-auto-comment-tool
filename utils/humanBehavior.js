/**
 * Human Behavior Simulator
 * Provides functions to simulate human-like behavior on Instagram
 */

const { getScrollDelay, getTypingDelay } = require('./delay');

/**
 * Perform random scrolling on the page
 * @param {Object} page - Puppeteer page
 * @param {number} times - Number of scroll actions (1-5)
 */
async function randomScroll(page, times = null) {
  const scrollTimes = times || Math.floor(Math.random() * 4) + 1; // 1-4 times
  
  for (let i = 0; i < scrollTimes; i++) {
    const direction = Math.random() > 0.3 ? 'down' : 'up'; // 70% down, 30% up
    const amount = Math.floor(Math.random() * 300) + 100; // 100-400 pixels
    
    if (direction === 'down') {
      await page.evaluate((amt) => window.scrollBy(0, amt), amount);
    } else {
      await page.evaluate((amt) => window.scrollBy(0, -amt), amount);
    }
    
    await new Promise(r => setTimeout(r, getScrollDelay()));
  }
}

/**
 * Move mouse randomly on the page
 * @param {Object} page - Puppeteer page
 */
async function randomMouseMove(page) {
  const viewport = await page.viewport();
  if (!viewport) return;
  
  const x = Math.floor(Math.random() * (viewport.width - 100)) + 50;
  const y = Math.floor(Math.random() * (viewport.height - 100)) + 50;
  
  await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
  await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
}

/**
 * Type text with human-like random delays
 * @param {Object} page - Puppeteer page
 * @param {string} text - Text to type
 * @param {Object} options - Options
 */
async function humanType(page, text, options = {}) {
  const { minDelay = 50, maxDelay = 200, mistakes = true } = options;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Occasionally make a typo and correct it (5% chance)
    if (mistakes && Math.random() < 0.05 && char !== ' ' && char !== '@') {
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
      await page.keyboard.type(wrongChar);
      await new Promise(r => setTimeout(r, Math.random() * 300 + 100));
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, Math.random() * 200 + 50));
    }
    
    await page.keyboard.type(char);
    
    // Variable delay between characters
    const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
    
    // Longer pause after certain characters
    const extraDelay = [' ', '.', ',', '!', '?'].includes(char) ? Math.random() * 200 : 0;
    
    await new Promise(r => setTimeout(r, delay + extraDelay));
  }
}

/**
 * Simulate human-like pause (thinking time)
 * @param {number} minSeconds - Minimum pause in seconds
 * @param {number} maxSeconds - Maximum pause in seconds
 */
async function humanPause(minSeconds = 1, maxSeconds = 3) {
  const ms = (Math.random() * (maxSeconds - minSeconds) + minSeconds) * 1000;
  await new Promise(r => setTimeout(r, ms));
}

/**
 * Click an element with human-like behavior
 * @param {Object} page - Puppeteer page
 * @param {string} selector - CSS selector
 */
async function humanClick(page, selector) {
  const element = await page.$(selector);
  if (!element) return false;
  
  const box = await element.boundingBox();
  if (!box) return false;
  
  // Move to element with some randomness
  const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
  const y = box.y + box.height / 2 + (Math.random() * 10 - 5);
  
  await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 5) + 3 });
  await new Promise(r => setTimeout(r, Math.random() * 200 + 50));
  await page.mouse.click(x, y);
  
  return true;
}

/**
 * Wait for a random time within a range
 * @param {number} minMs - Minimum milliseconds
 * @param {number} maxMs - Maximum milliseconds
 */
async function randomWait(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  await new Promise(r => setTimeout(r, ms));
}

/**
 * Simulate reading behavior (scroll and pause)
 * @param {Object} page - Puppeteer page
 * @param {number} durationSeconds - How long to simulate reading
 */
async function simulateReading(page, durationSeconds = 5) {
  const startTime = Date.now();
  const duration = durationSeconds * 1000;
  
  while (Date.now() - startTime < duration) {
    // Random action
    const action = Math.random();
    
    if (action < 0.4) {
      // Scroll a bit
      const amount = Math.floor(Math.random() * 200) + 50;
      await page.evaluate((amt) => window.scrollBy(0, amt), amount);
    } else if (action < 0.6) {
      // Move mouse
      await randomMouseMove(page);
    }
    // else just wait
    
    await randomWait(500, 2000);
  }
}

/**
 * Set up page for human-like behavior
 * @param {Object} page - Puppeteer page
 */
async function setupHumanBehavior(page) {
  // Set realistic viewport
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 }
  ];
  
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];
  await page.setViewport(viewport);
  
  // Override navigator properties to look more human
  await page.evaluateOnNewDocument(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });
}

module.exports = {
  randomScroll,
  randomMouseMove,
  humanType,
  humanPause,
  humanClick,
  randomWait,
  simulateReading,
  setupHumanBehavior
};
