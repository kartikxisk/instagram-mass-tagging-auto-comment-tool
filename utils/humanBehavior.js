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
  // Set realistic viewport with device scale factor
  const viewports = [
    { width: 1920, height: 1080, deviceScaleFactor: 1 },
    { width: 1366, height: 768, deviceScaleFactor: 1 },
    { width: 1536, height: 864, deviceScaleFactor: 1.25 },
    { width: 1440, height: 900, deviceScaleFactor: 2 },
    { width: 1280, height: 720, deviceScaleFactor: 1 },
    { width: 2560, height: 1440, deviceScaleFactor: 1 },
    { width: 1680, height: 1050, deviceScaleFactor: 1 }
  ];
  
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];
  await page.setViewport(viewport);
  
  // Comprehensive stealth overrides
  await page.evaluateOnNewDocument(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // Delete webdriver property entirely
    delete navigator.__proto__.webdriver;
    
    // Override chrome property
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Override plugins to look realistic
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
        ];
        plugins.length = 3;
        return plugins;
      },
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en', 'en-GB'],
    });
    
    // Override platform based on user agent
    Object.defineProperty(navigator, 'platform', {
      get: () => {
        const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
        return platforms[Math.floor(Math.random() * platforms.length)];
      },
    });
    
    // Override hardware concurrency (CPU cores)
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => [4, 8, 12, 16][Math.floor(Math.random() * 4)],
    });
    
    // Override device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => [4, 8, 16, 32][Math.floor(Math.random() * 4)],
    });
    
    // Override connection info
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: Math.floor(Math.random() * 100) + 50,
        downlink: Math.random() * 10 + 5,
        saveData: false
      }),
    });
    
    // Override WebGL vendor and renderer
    const getParameterProxyHandler = {
      apply: function(target, thisArg, argumentsList) {
        const param = argumentsList[0];
        const gl = thisArg;
        // UNMASKED_VENDOR_WEBGL
        if (param === 37445) {
          return 'Google Inc. (Intel)';
        }
        // UNMASKED_RENDERER_WEBGL
        if (param === 37446) {
          return 'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)';
        }
        return target.apply(thisArg, argumentsList);
      }
    };
    
    // Apply to WebGL
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        gl.getParameter = new Proxy(gl.getParameter, getParameterProxyHandler);
      }
      const gl2 = canvas.getContext('webgl2');
      if (gl2) {
        gl2.getParameter = new Proxy(gl2.getParameter, getParameterProxyHandler);
      }
    } catch (e) {}
    
    // Override toString methods to hide proxy
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function() {
      if (this === window.navigator.permissions.query) {
        return 'function query() { [native code] }';
      }
      return originalToString.call(this);
    };
    
    // Add realistic screen properties
    Object.defineProperty(screen, 'availWidth', { get: () => window.innerWidth });
    Object.defineProperty(screen, 'availHeight', { get: () => window.innerHeight });
    Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
    
    // Disable automation-related properties
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0,
    });
    
    // Add realistic battery API
    if (navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1.0,
        addEventListener: () => {},
        removeEventListener: () => {}
      });
    }
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
