/**
 * Delay Utilities
 * Provides various delay functions for human-like behavior
 */

/**
 * Basic delay function
 * @param {number} ms - Milliseconds to wait
 * @param {boolean} silent - If true, don't log the delay
 * @returns {Promise}
 */
function delay(ms, silent = false) {
  if (!silent) {
    console.log(`⏳ Waiting for ${ms}ms...`);
  }
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay between min and max milliseconds
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @param {boolean} silent - If true, don't log the delay
 * @returns {Promise}
 */
async function randomDelay(min, max, silent = false) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  if (!silent) {
    console.log(`⏳ Random delay: ${ms}ms (range: ${min}-${max}ms)`);
  }
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay between comments (60-180 seconds - increased for safety)
 * @returns {Promise}
 */
async function delayBetweenComments() {
  const min = 60000;  // 60 seconds (increased from 35)
  const max = 180000; // 180 seconds (increased from 120)
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`⏳ Comment delay: ${(ms / 1000).toFixed(1)}s`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay between accounts (5-20 seconds as per safety rules)
 * @returns {Promise}
 */
async function delayBetweenAccounts() {
  const min = 30000;  // 30 seconds (increased from 5)
  const max = 60000;  // 60 seconds (increased from 20)
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`⏳ Account delay: ${(ms / 1000).toFixed(1)}s`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Long pause after 30 comments (15-30 minutes - increased for safety)
 * @returns {Promise}
 */
async function longPause() {
  const min = 15 * 60 * 1000;  // 15 minutes (increased from 10)
  const max = 30 * 60 * 1000;  // 30 minutes (increased from 20)
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`⏸️ Long pause: ${(ms / 60000).toFixed(1)} minutes`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Session duration delay (5-15 minutes per account)
 * Returns the target session duration in ms
 * @returns {number}
 */
function getSessionDuration() {
  const min = 5 * 60 * 1000;   // 5 minutes
  const max = 15 * 60 * 1000;  // 15 minutes
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Typing delay - random delay between keystrokes for human-like typing
 * @returns {number} - Delay in ms between 40-120ms
 */
function getTypingDelay() {
  // Fast but natural typing: 40-120ms
  const baseDelay = Math.floor(Math.random() * 60) + 40;
  // 10% chance of slightly slower keystroke
  const extraDelay = Math.random() < 0.1 ? Math.floor(Math.random() * 50) : 0;
  return baseDelay + extraDelay;
}

/**
 * Get random scroll wait time
 * @returns {number} - Delay in ms between 1-3 seconds
 */
function getScrollDelay() {
  return Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
}

module.exports = {
  delay,
  randomDelay,
  delayBetweenComments,
  delayBetweenAccounts,
  longPause,
  getSessionDuration,
  getTypingDelay,
  getScrollDelay
};
