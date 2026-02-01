/**
 * Anti-Detection Module (Simplified)
 * Only contains functionality NOT provided by puppeteer-extra-plugin-stealth
 * 
 * Stealth Plugin already handles:
 * - navigator.webdriver
 * - chrome.runtime, chrome.loadTimes, chrome.csi
 * - navigator.plugins, mimeTypes
 * - navigator.permissions
 * - WebGL vendor/renderer
 * - iframe.contentWindow
 * - media.codecs
 * - sourceurl
 */

const crypto = require('crypto');

/**
 * Generate consistent fingerprint for an account
 * Instagram tracks fingerprint consistency - changing it too often is suspicious
 * @param {string} username - Account username for seeding
 * @returns {Object} - Fingerprint configuration
 */
function generateConsistentFingerprint(username) {
  // Use username to seed random values - same account = same fingerprint
  const seed = crypto.createHash('md5').update(username).digest('hex');
  
  // Seeded random function
  const seededRandom = (index) => {
    const hash = crypto.createHash('md5').update(`${seed}-${index}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
  };

  const viewports = [
    { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false },
    { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false },
    { width: 1536, height: 864, deviceScaleFactor: 1.25, isMobile: false },
    { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
    { width: 1280, height: 720, deviceScaleFactor: 1, isMobile: false },
  ];

  const timezones = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Asia/Singapore'
  ];

  const languages = [
    ['en-US', 'en'],
    ['en-GB', 'en'],
  ];

  // Select consistent values based on username seed
  const viewportIndex = Math.floor(seededRandom(0) * viewports.length);
  const timezoneIndex = Math.floor(seededRandom(2) * timezones.length);
  const languageIndex = Math.floor(seededRandom(3) * languages.length);

  return {
    viewport: viewports[viewportIndex],
    timezone: timezones[timezoneIndex],
    languages: languages[languageIndex]
  };
}

/**
 * Apply minimal stealth settings (only what Stealth Plugin doesn't cover)
 * @param {Object} page - Puppeteer page
 * @param {Object} fingerprint - Fingerprint configuration
 */
async function applyStealthSettings(page, fingerprint) {
  // Set viewport from fingerprint for consistency
  await page.setViewport(fingerprint.viewport);
  
  // Set timezone and language via evaluateOnNewDocument
  await page.evaluateOnNewDocument((fp) => {
    // Initialize mouse position tracking for natural movement
    window.__mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    document.addEventListener('mousemove', (e) => {
      window.__mousePos = { x: e.clientX, y: e.clientY };
    });
  }, fingerprint);
}

/**
 * Get activity time patterns based on realistic user behavior
 * @returns {Object} - Time-based activity modifiers
 */
function getActivityPatterns() {
  const hour = new Date().getHours();
  
  // Simplified activity patterns
  if (hour >= 1 && hour < 6) {
    return { multiplier: 0.2, shouldPause: true, pauseChance: 0.8 };
  }
  if (hour >= 6 && hour < 9) {
    return { multiplier: 0.6, shouldPause: false, pauseChance: 0.2 };
  }
  if (hour >= 9 && hour < 22) {
    return { multiplier: 1.0, shouldPause: false, pauseChance: 0.05 };
  }
  return { multiplier: 0.5, shouldPause: true, pauseChance: 0.4 };
}

/**
 * Calculate dynamic delay based on time of day
 * @param {number} baseMin - Base minimum delay
 * @param {number} baseMax - Base maximum delay
 * @returns {number} - Adjusted delay in ms
 */
function getDynamicDelay(baseMin, baseMax) {
  const activity = getActivityPatterns();
  const timeMultiplier = 2 - activity.multiplier;
  
  const adjustedMin = baseMin * timeMultiplier;
  const adjustedMax = baseMax * timeMultiplier;
  
  return Math.floor(adjustedMin + Math.random() * (adjustedMax - adjustedMin));
}

/**
 * Generate mouse movement path using Bezier curves
 * @param {Object} start - Start point {x, y}
 * @param {Object} end - End point {x, y}
 * @returns {Array} - Array of points
 */
function generateMousePath(start, end) {
  const points = [];
  const steps = Math.floor(Math.random() * 15) + 10;
  
  // Control points for curve
  const cp1 = {
    x: start.x + (end.x - start.x) * 0.3 + (Math.random() - 0.5) * 30,
    y: start.y + (end.y - start.y) * 0.3 + (Math.random() - 0.5) * 30
  };
  const cp2 = {
    x: start.x + (end.x - start.x) * 0.7 + (Math.random() - 0.5) * 30,
    y: start.y + (end.y - start.y) * 0.7 + (Math.random() - 0.5) * 30
  };
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.pow(1-t, 3) * start.x + 
              3 * Math.pow(1-t, 2) * t * cp1.x + 
              3 * (1-t) * Math.pow(t, 2) * cp2.x + 
              Math.pow(t, 3) * end.x;
    const y = Math.pow(1-t, 3) * start.y + 
              3 * Math.pow(1-t, 2) * t * cp1.y + 
              3 * (1-t) * Math.pow(t, 2) * cp2.y + 
              Math.pow(t, 3) * end.y;
    
    points.push({
      x: x + (Math.random() - 0.5) * 2,
      y: y + (Math.random() - 0.5) * 2,
      delay: Math.floor(5 + Math.random() * 15)
    });
  }
  
  return points;
}

/**
 * Perform human-like mouse movement
 * @param {Object} page - Puppeteer page
 * @param {number} targetX - Target X
 * @param {number} targetY - Target Y
 */
async function humanMouseMove(page, targetX, targetY) {
  const currentPos = await page.evaluate(() => {
    return window.__mousePos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  });
  
  const path = generateMousePath(currentPos, { x: targetX, y: targetY });
  
  for (const point of path) {
    await page.mouse.move(point.x, point.y);
    await new Promise(r => setTimeout(r, point.delay));
  }
  
  await page.evaluate((pos) => { window.__mousePos = pos; }, { x: targetX, y: targetY });
}

/**
 * Perform human-like click
 * @param {Object} page - Puppeteer page
 * @param {Object} element - Element to click
 */
async function humanClick(page, element) {
  const box = await element.boundingBox();
  if (!box) return false;
  
  const x = box.x + box.width * (0.3 + Math.random() * 0.4);
  const y = box.y + box.height * (0.3 + Math.random() * 0.4);
  
  await humanMouseMove(page, x, y);
  await new Promise(r => setTimeout(r, Math.random() * 100 + 50));
  
  await page.mouse.down();
  await new Promise(r => setTimeout(r, Math.random() * 80 + 30));
  await page.mouse.up();
  
  return true;
}

/**
 * Get adjacent keyboard key for typos
 */
function getAdjacentKey(char) {
  const keyboard = {
    'q': ['w', 'a'], 'w': ['q', 'e', 's'], 'e': ['w', 'r', 'd'], 'r': ['e', 't', 'f'],
    't': ['r', 'y', 'g'], 'y': ['t', 'u', 'h'], 'u': ['y', 'i', 'j'], 'i': ['u', 'o', 'k'],
    'o': ['i', 'p', 'l'], 'p': ['o', 'l'], 'a': ['q', 's', 'z'], 's': ['a', 'w', 'd', 'x'],
    'd': ['s', 'e', 'f', 'c'], 'f': ['d', 'r', 'g', 'v'], 'g': ['f', 't', 'h', 'b'],
    'h': ['g', 'y', 'j', 'n'], 'j': ['h', 'u', 'k', 'm'], 'k': ['j', 'i', 'l'],
    'l': ['k', 'o', 'p'], 'z': ['a', 's', 'x'], 'x': ['z', 's', 'd', 'c'],
    'c': ['x', 'd', 'f', 'v'], 'v': ['c', 'f', 'g', 'b'], 'b': ['v', 'g', 'h', 'n'],
    'n': ['b', 'h', 'j', 'm'], 'm': ['n', 'j', 'k']
  };
  
  const lowerChar = char.toLowerCase();
  const adjacent = keyboard[lowerChar];
  
  if (adjacent && adjacent.length > 0) {
    const newChar = adjacent[Math.floor(Math.random() * adjacent.length)];
    return char === char.toUpperCase() ? newChar.toUpperCase() : newChar;
  }
  return char;
}

/**
 * Check if it's a good time to proceed
 * @returns {Object} - { proceed: boolean, waitTime: number }
 */
function shouldProceed() {
  const activity = getActivityPatterns();
  
  if (activity.shouldPause && Math.random() < activity.pauseChance) {
    const waitMinutes = Math.floor(Math.random() * 30) + 15;
    return { 
      proceed: false, 
      waitTime: waitMinutes * 60 * 1000,
      reason: 'Off-peak hours'
    };
  }
  
  return { proceed: true, waitTime: 0, reason: null };
}

module.exports = {
  generateConsistentFingerprint,
  getActivityPatterns,
  getDynamicDelay,
  applyStealthSettings,
  generateMousePath,
  humanMouseMove,
  humanClick,
  getAdjacentKey,
  shouldProceed
};
