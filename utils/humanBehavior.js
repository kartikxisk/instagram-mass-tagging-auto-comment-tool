/**
 * Human Behavior Simulator
 * Provides functions to simulate human-like behavior on Instagram
 * Enhanced with advanced anti-detection techniques
 */

const { getScrollDelay, getTypingDelay, humanRandomDelay } = require('./delay');

// Track last action time for natural pacing
let lastActionTime = Date.now();
let actionCount = 0;

/**
 * Natural pause between actions (humans don't do things instantly)
 */
async function naturalPause() {
  const timeSinceLastAction = Date.now() - lastActionTime;
  
  // If actions are too fast, add extra delay
  if (timeSinceLastAction < 1000) {
    const extraDelay = humanRandomDelay(500, 2000);
    await new Promise(r => setTimeout(r, extraDelay));
  }
  
  lastActionTime = Date.now();
  actionCount++;
}

/**
 * Perform random scrolling on the page with natural patterns
 * @param {Object} page - Puppeteer page
 * @param {number} times - Number of scroll actions (1-5)
 */
async function randomScroll(page, times = null) {
  await naturalPause();
  
  const scrollTimes = times || Math.floor(Math.random() * 4) + 1; // 1-4 times
  
  for (let i = 0; i < scrollTimes; i++) {
    // Weighted direction - users scroll down more often
    const direction = Math.random() > 0.25 ? 'down' : 'up';
    
    // Variable scroll amount - sometimes quick flicks, sometimes slow scrolls
    let amount;
    const scrollType = Math.random();
    if (scrollType < 0.6) {
      // Normal scroll
      amount = Math.floor(Math.random() * 300) + 100; // 100-400 pixels
    } else if (scrollType < 0.85) {
      // Quick flick
      amount = Math.floor(Math.random() * 150) + 50; // 50-200 pixels
    } else {
      // Long scroll
      amount = Math.floor(Math.random() * 500) + 300; // 300-800 pixels
    }
    
    // Smooth scroll simulation (not instant)
    const steps = Math.ceil(amount / 50);
    const stepAmount = amount / steps;
    
    for (let s = 0; s < steps; s++) {
      if (direction === 'down') {
        await page.evaluate((amt) => window.scrollBy(0, amt), stepAmount);
      } else {
        await page.evaluate((amt) => window.scrollBy(0, -amt), stepAmount);
      }
      await new Promise(r => setTimeout(r, Math.random() * 30 + 10)); // Small delay between steps
    }
    
    // Pause after scroll (reading/looking)
    const pauseTime = getScrollDelay();
    await new Promise(r => setTimeout(r, pauseTime));
    
    // Occasionally stop mid-scroll (something caught attention)
    if (Math.random() < 0.15 && i < scrollTimes - 1) {
      await new Promise(r => setTimeout(r, humanRandomDelay(1500, 4000)));
    }
  }
}

/**
 * Move mouse with realistic Bezier curve path
 * @param {Object} page - Puppeteer page
 * @param {number} targetX - Target X
 * @param {number} targetY - Target Y
 */
async function naturalMouseMove(page, targetX, targetY) {
  // Get current position or use center
  const currentPos = await page.evaluate(() => {
    return window.__lastMousePos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  });
  
  const distance = Math.sqrt(
    Math.pow(targetX - currentPos.x, 2) + 
    Math.pow(targetY - currentPos.y, 2)
  );
  
  // More steps for longer distances
  const steps = Math.max(10, Math.floor(distance / 20));
  
  // Bezier control points for natural curve
  const cp1 = {
    x: currentPos.x + (targetX - currentPos.x) * 0.25 + (Math.random() - 0.5) * 40,
    y: currentPos.y + (targetY - currentPos.y) * 0.25 + (Math.random() - 0.5) * 40
  };
  const cp2 = {
    x: currentPos.x + (targetX - currentPos.x) * 0.75 + (Math.random() - 0.5) * 40,
    y: currentPos.y + (targetY - currentPos.y) * 0.75 + (Math.random() - 0.5) * 40
  };
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Cubic Bezier calculation
    const x = Math.pow(1-t, 3) * currentPos.x + 
              3 * Math.pow(1-t, 2) * t * cp1.x + 
              3 * (1-t) * Math.pow(t, 2) * cp2.x + 
              Math.pow(t, 3) * targetX;
    const y = Math.pow(1-t, 3) * currentPos.y + 
              3 * Math.pow(1-t, 2) * t * cp1.y + 
              3 * (1-t) * Math.pow(t, 2) * cp2.y + 
              Math.pow(t, 3) * targetY;
    
    // Add micro-jitter
    const jitterX = (Math.random() - 0.5) * 2;
    const jitterY = (Math.random() - 0.5) * 2;
    
    await page.mouse.move(x + jitterX, y + jitterY);
    
    // Variable speed - slower at start and end (ease-in-out)
    const speedFactor = Math.sin(t * Math.PI);
    const delay = Math.floor(3 + (1 - speedFactor) * 15 + Math.random() * 5);
    await new Promise(r => setTimeout(r, delay));
  }
  
  // Store position
  await page.evaluate((pos) => {
    window.__lastMousePos = pos;
  }, { x: targetX, y: targetY });
}

/**
 * Move mouse randomly on the page
 * @param {Object} page - Puppeteer page
 */
async function randomMouseMove(page) {
  await naturalPause();
  
  const viewport = await page.viewport();
  if (!viewport) return;
  
  // Avoid edges (users rarely move cursor to extreme corners)
  const margin = 80;
  const x = Math.floor(Math.random() * (viewport.width - margin * 2)) + margin;
  const y = Math.floor(Math.random() * (viewport.height - margin * 2)) + margin;
  
  await naturalMouseMove(page, x, y);
  await new Promise(r => setTimeout(r, Math.random() * 300 + 100));
}

/**
 * Type text with human-like random delays and realistic patterns
 * @param {Object} page - Puppeteer page
 * @param {string} text - Text to type
 * @param {Object} options - Options
 */
async function humanType(page, text, options = {}) {
  await naturalPause();
  
  const { 
    minDelay = 45, 
    maxDelay = 180, 
    mistakes = true,
    burstTyping = true 
  } = options;
  
  let inBurst = false;
  let burstRemaining = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Start burst typing randomly (fast sequence)
    if (burstTyping && Math.random() < 0.12 && !inBurst && i < text.length - 3) {
      inBurst = true;
      burstRemaining = Math.floor(Math.random() * 4) + 2; // 2-5 characters
    }
    
    // Occasionally make a typo and correct it (3% chance, not on @ or spaces)
    if (mistakes && Math.random() < 0.03 && char !== ' ' && char !== '@' && !inBurst) {
      const wrongChar = getAdjacentKeyboardChar(char);
      await page.keyboard.type(wrongChar);
      
      // Pause when noticing mistake (varies by person)
      await new Promise(r => setTimeout(r, humanRandomDelay(100, 400)));
      
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, humanRandomDelay(50, 150)));
    }
    
    await page.keyboard.type(char);
    
    // Calculate delay based on character and context
    let delay;
    if (inBurst) {
      delay = Math.floor((minDelay + Math.random() * (maxDelay - minDelay)) * 0.4);
      burstRemaining--;
      if (burstRemaining <= 0) inBurst = false;
    } else {
      delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
      
      // Longer pause after punctuation
      if (['.', ',', '!', '?', ';', ':'].includes(char)) {
        delay += humanRandomDelay(100, 350);
      }
      // Slight pause after space (word boundary)
      else if (char === ' ') {
        delay += humanRandomDelay(30, 120);
      }
      // Thinking pause mid-word occasionally
      else if (Math.random() < 0.04) {
        delay += humanRandomDelay(200, 800);
      }
    }
    
    await new Promise(r => setTimeout(r, delay));
  }
}

/**
 * Get adjacent keyboard character for realistic typos
 */
function getAdjacentKeyboardChar(char) {
  const keyboardLayout = {
    'q': ['w', 'a', '1'], 'w': ['q', 'e', 's', '2'], 'e': ['w', 'r', 'd', '3'],
    'r': ['e', 't', 'f', '4'], 't': ['r', 'y', 'g', '5'], 'y': ['t', 'u', 'h', '6'],
    'u': ['y', 'i', 'j', '7'], 'i': ['u', 'o', 'k', '8'], 'o': ['i', 'p', 'l', '9'],
    'p': ['o', 'l', '0'], 'a': ['q', 's', 'z'], 's': ['a', 'w', 'd', 'x', 'z'],
    'd': ['s', 'e', 'f', 'c', 'x'], 'f': ['d', 'r', 'g', 'v', 'c'],
    'g': ['f', 't', 'h', 'b', 'v'], 'h': ['g', 'y', 'j', 'n', 'b'],
    'j': ['h', 'u', 'k', 'm', 'n'], 'k': ['j', 'i', 'l', 'm'],
    'l': ['k', 'o', 'p'], 'z': ['a', 's', 'x'], 'x': ['z', 's', 'd', 'c'],
    'c': ['x', 'd', 'f', 'v'], 'v': ['c', 'f', 'g', 'b'],
    'b': ['v', 'g', 'h', 'n'], 'n': ['b', 'h', 'j', 'm'],
    'm': ['n', 'j', 'k'], '1': ['2', 'q'], '2': ['1', '3', 'w'],
    '3': ['2', '4', 'e'], '4': ['3', '5', 'r'], '5': ['4', '6', 't'],
    '6': ['5', '7', 'y'], '7': ['6', '8', 'u'], '8': ['7', '9', 'i'],
    '9': ['8', '0', 'o'], '0': ['9', 'p']
  };
  
  const lowerChar = char.toLowerCase();
  const adjacent = keyboardLayout[lowerChar];
  
  if (adjacent && adjacent.length > 0) {
    const newChar = adjacent[Math.floor(Math.random() * adjacent.length)];
    return char === char.toUpperCase() ? newChar.toUpperCase() : newChar;
  }
  
  return char;
}

/**
 * Simulate human-like pause (thinking time)
 * @param {number} minSeconds - Minimum pause in seconds
 * @param {number} maxSeconds - Maximum pause in seconds
 */
async function humanPause(minSeconds = 1, maxSeconds = 3) {
  const ms = humanRandomDelay(minSeconds * 1000, maxSeconds * 1000);
  await new Promise(r => setTimeout(r, ms));
}

/**
 * Click an element with human-like behavior (natural movement + click)
 * @param {Object} page - Puppeteer page
 * @param {string} selector - CSS selector
 */
async function humanClick(page, selector) {
  await naturalPause();
  
  const element = await page.$(selector);
  if (!element) return false;
  
  const box = await element.boundingBox();
  if (!box) return false;
  
  // Click position with natural variance (not exact center)
  const clickVariance = 0.3;
  const x = box.x + box.width * (0.5 + (Math.random() - 0.5) * clickVariance);
  const y = box.y + box.height * (0.5 + (Math.random() - 0.5) * clickVariance);
  
  // Move to element naturally
  await naturalMouseMove(page, x, y);
  
  // Pre-click pause (human reaction time)
  await new Promise(r => setTimeout(r, humanRandomDelay(50, 150)));
  
  // Click with realistic timing
  await page.mouse.down();
  await new Promise(r => setTimeout(r, humanRandomDelay(30, 120))); // Hold time
  await page.mouse.up();
  
  // Post-click pause
  await new Promise(r => setTimeout(r, humanRandomDelay(100, 300)));
  
  return true;
}

/**
 * Wait for a random time within a range using human distribution
 * @param {number} minMs - Minimum milliseconds
 * @param {number} maxMs - Maximum milliseconds
 */
async function randomWait(minMs, maxMs) {
  const ms = humanRandomDelay(minMs, maxMs);
  await new Promise(r => setTimeout(r, ms));
}

/**
 * Simulate reading behavior (scroll, pause, mouse movement - like a real person)
 * @param {Object} page - Puppeteer page
 * @param {number} durationSeconds - How long to simulate reading
 */
async function simulateReading(page, durationSeconds = 5) {
  console.log(`   👀 Reading content for ~${durationSeconds}s...`);
  
  const startTime = Date.now();
  const duration = durationSeconds * 1000;
  
  // Track scroll position to simulate natural reading direction
  let totalScrolled = 0;
  const maxScroll = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
  
  while (Date.now() - startTime < duration) {
    const action = Math.random();
    
    if (action < 0.35) {
      // Scroll down (reading)
      const amount = Math.floor(Math.random() * 150) + 50;
      if (totalScrolled + amount < maxScroll) {
        await page.evaluate((amt) => window.scrollBy(0, amt), amount);
        totalScrolled += amount;
      }
    } else if (action < 0.45) {
      // Scroll up slightly (re-reading something)
      const amount = Math.floor(Math.random() * 80) + 20;
      if (totalScrolled > 0) {
        await page.evaluate((amt) => window.scrollBy(0, -amt), amount);
        totalScrolled = Math.max(0, totalScrolled - amount);
      }
    } else if (action < 0.6) {
      // Move mouse (following content or hovering)
      await randomMouseMove(page);
    } else if (action < 0.75) {
      // Hover over interactive element
      const elements = await page.$$('a, button, img, video');
      if (elements.length > 0) {
        const randomEl = elements[Math.floor(Math.random() * Math.min(elements.length, 10))];
        const box = await randomEl.boundingBox();
        if (box && box.y > 0 && box.y < await page.evaluate(() => window.innerHeight)) {
          await naturalMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
        }
      }
    }
    // else: just wait (actually reading)
    
    await randomWait(400, 1800);
  }
}

/**
 * Set up page for human-like behavior
 * @param {Object} page - Puppeteer page
 * @param {string} username - Account username for consistent fingerprinting
 */
async function setupHumanBehavior(page, username = null) {
  // Import anti-detection utilities
  const { generateConsistentFingerprint, applyStealthSettings } = require('./antiDetection');
  
  // Generate or use consistent fingerprint
  const fingerprint = username ? generateConsistentFingerprint(username) : generateConsistentFingerprint('default_' + Date.now());
  
  // Apply stealth settings (viewport + mouse tracking)
  await applyStealthSettings(page, fingerprint);
  
  console.log(`   🛡️ Stealth mode activated (fingerprint: ${username || 'dynamic'})`);
  
  return fingerprint;
}

module.exports = {
  randomScroll,
  randomMouseMove,
  naturalMouseMove,
  humanType,
  humanPause,
  humanClick,
  randomWait,
  simulateReading,
  setupHumanBehavior,
  naturalPause,
  getAdjacentKeyboardChar
};
