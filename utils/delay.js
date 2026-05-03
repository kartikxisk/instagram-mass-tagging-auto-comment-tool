/**
 * Delay Utilities
 * Provides various delay functions for human-like behavior
 * Enhanced with anti-detection patterns
 */

/**
 * Get time-of-day activity multiplier
 * Real users are less active at night, more active during day
 * @returns {number} - Multiplier for delays (higher = longer delays)
 */
function getTimeMultiplier() {
  const hour = new Date().getHours();
  
  // Night hours (1am-6am): Much longer delays to simulate tired/casual browsing
  if (hour >= 1 && hour < 6) return 2.5 + Math.random() * 0.5;
  
  // Early morning (6am-9am): Moderate delays
  if (hour >= 6 && hour < 9) return 1.3 + Math.random() * 0.3;
  
  // Peak hours (9am-12pm, 5pm-10pm): Normal activity
  if ((hour >= 9 && hour < 12) || (hour >= 17 && hour < 22)) return 1.0;
  
  // Afternoon (12pm-5pm): Slightly variable
  if (hour >= 12 && hour < 17) return 1.1 + Math.random() * 0.2;
  
  // Late night (10pm-1am): Increasing delays
  return 1.5 + Math.random() * 0.4;
}

/**
 * Generate non-uniform random delay (more realistic distribution)
 * Human timing follows a log-normal distribution, not uniform
 * @param {number} min - Minimum delay
 * @param {number} max - Maximum delay
 * @returns {number} - Delay in ms
 */
function humanRandomDelay(min, max) {
  // Use log-normal distribution for more realistic timing
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6;
  
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Convert to our range with log-normal-like distribution
  let delay = mean + normal * stdDev;
  
  // Occasionally add "distraction" delays (checking something else)
  if (Math.random() < 0.08) {
    delay += Math.random() * (max - min) * 0.5;
  }
  
  // Apply time-of-day multiplier
  delay *= getTimeMultiplier();
  
  // Clamp to reasonable bounds
  return Math.max(min * 0.8, Math.min(max * 2, Math.floor(delay)));
}

/**
 * Basic delay function
 * @param {number} ms - Milliseconds to wait
 * @param {boolean} silent - If true, don't log the delay
 * @returns {Promise}
 */
function delay(ms, silent = false) {
  // Add slight randomness even to fixed delays
  const actualMs = Math.floor(ms * (0.9 + Math.random() * 0.2));
  if (!silent) {
    console.log(`⏳ Waiting for ${actualMs}ms...`);
  }
  return new Promise(resolve => setTimeout(resolve, actualMs));
}

/**
 * Random delay between min and max milliseconds
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @param {boolean} silent - If true, don't log the delay
 * @returns {Promise}
 */
async function randomDelay(min, max, silent = false) {
  const ms = humanRandomDelay(min, max);
  if (!silent) {
    console.log(`⏳ Random delay: ${ms}ms (range: ${min}-${max}ms)`);
  }
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay between comments with realistic variation
 * Uses varied patterns to avoid detection of regular intervals
 * @returns {Promise}
 */
async function delayBetweenComments() {
  // Base range: 90-300 seconds (much more conservative)
  const baseMin = 90000;
  const baseMax = 300000;
  
  // Apply time multiplier
  const multiplier = getTimeMultiplier();
  const min = baseMin * multiplier;
  const max = baseMax * multiplier;
  
  // Use human-like distribution
  let ms = humanRandomDelay(min, max);
  
  // 15% chance of "micro-break" (checking feed, stories, etc.)
  if (Math.random() < 0.15) {
    const microBreak = Math.floor(Math.random() * 60000) + 30000; // 30-90 extra seconds
    ms += microBreak;
    console.log(`   📱 Taking a micro-break (${(microBreak/1000).toFixed(0)}s)...`);
  }
  
  // 5% chance of longer break (bathroom, coffee, etc.)
  if (Math.random() < 0.05) {
    const longBreak = Math.floor(Math.random() * 180000) + 120000; // 2-5 extra minutes
    ms += longBreak;
    console.log(`   ☕ Taking a short break (${(longBreak/60000).toFixed(1)} min)...`);
  }
  
  console.log(`⏳ Comment delay: ${(ms / 1000).toFixed(1)}s`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay between accounts with anti-pattern measures
 * @returns {Promise}
 */
async function delayBetweenAccounts() {
  // Much longer base range: 60-180 seconds between accounts
  const baseMin = 60000;
  const baseMax = 180000;
  
  const multiplier = getTimeMultiplier();
  const min = baseMin * multiplier;
  const max = baseMax * multiplier;
  
  let ms = humanRandomDelay(min, max);
  
  // 20% chance of extended break between accounts
  if (Math.random() < 0.20) {
    const extraBreak = Math.floor(Math.random() * 120000) + 60000; // 1-3 extra minutes
    ms += extraBreak;
    console.log(`   🔄 Extended account switch delay (${(extraBreak/60000).toFixed(1)} min)...`);
  }
  
  console.log(`⏳ Account delay: ${(ms / 1000).toFixed(1)}s`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Long pause with realistic duration variation
 * @param {string} reason - Optional reason for the pause
 * @returns {Promise}
 */
async function longPause(reason = 'Activity limit reached') {
  // Base: 20-45 minutes
  const baseMin = 20 * 60 * 1000;
  const baseMax = 45 * 60 * 1000;
  
  const multiplier = getTimeMultiplier();
  let ms = humanRandomDelay(baseMin * multiplier, baseMax * multiplier);
  
  // 10% chance of even longer pause (simulating leaving phone)
  if (Math.random() < 0.10) {
    const extended = Math.floor(Math.random() * 15 * 60 * 1000) + 10 * 60 * 1000;
    ms += extended;
    console.log(`   🚶 Extended break: ${(extended/60000).toFixed(0)} extra minutes`);
  }
  
  console.log(`⏸️ Long pause (${reason}): ${(ms / 60000).toFixed(1)} minutes`);
  
  // Log periodic updates during long pause
  const startTime = Date.now();
  const updateInterval = 5 * 60 * 1000; // Update every 5 minutes
  
  return new Promise(resolve => {
    const checkProgress = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = ms - elapsed;
      if (remaining > 0) {
        console.log(`   ⏳ Pause remaining: ${(remaining / 60000).toFixed(1)} minutes`);
      }
    }, updateInterval);
    
    setTimeout(() => {
      clearInterval(checkProgress);
      resolve();
    }, ms);
  });
}

/**
 * Session duration with anti-detection timing
 * Returns the target session duration in ms
 * @returns {number}
 */
function getSessionDuration() {
  // Base: 8-20 minutes per account session
  const baseMin = 8 * 60 * 1000;
  const baseMax = 20 * 60 * 1000;
  
  // Apply time multiplier (shorter sessions late at night)
  const multiplier = 1 / getTimeMultiplier(); // Inverse - less activity time when tired
  
  return Math.floor(humanRandomDelay(baseMin * multiplier, baseMax * multiplier));
}

/**
 * Typing delay with human-like patterns
 * @returns {number} - Delay in ms between 40-180ms
 */
function getTypingDelay() {
  // More varied typing speed
  const baseDelay = Math.floor(Math.random() * 80) + 40; // 40-120ms base
  
  // 15% chance of slower keystroke (thinking/hesitation)
  if (Math.random() < 0.15) {
    return baseDelay + Math.floor(Math.random() * 150) + 50;
  }
  
  // 8% chance of burst typing (fast sequence)
  if (Math.random() < 0.08) {
    return Math.floor(baseDelay * 0.5);
  }
  
  return baseDelay;
}

/**
 * Get random scroll wait time
 * @returns {number} - Delay in ms between 1-4 seconds
 */
function getScrollDelay() {
  return humanRandomDelay(1000, 4000);
}

/**
 * Cooldown check - prevent too many actions in short time
 * @param {number} actionsInLastHour - Number of actions in last hour
 * @param {number} maxActions - Maximum allowed actions
 * @returns {Object} - { shouldCooldown: boolean, waitTime: number }
 */
function checkCooldown(actionsInLastHour, maxActions = 15) {
  if (actionsInLastHour >= maxActions) {
    const waitTime = Math.floor(Math.random() * 30 * 60 * 1000) + 20 * 60 * 1000; // 20-50 min
    return { shouldCooldown: true, waitTime };
  }
  
  // Progressive slowdown as approaching limit
  if (actionsInLastHour >= maxActions * 0.7) {
    const extraDelay = Math.floor((actionsInLastHour / maxActions) * 60000);
    return { shouldCooldown: false, waitTime: 0, extraDelay };
  }
  
  return { shouldCooldown: false, waitTime: 0, extraDelay: 0 };
}

/**
 * Get jittered interval (prevents exactly regular timing)
 * @param {number} baseInterval - Base interval in ms
 * @param {number} jitterPercent - Jitter percentage (0-1)
 * @returns {number}
 */
function getJitteredInterval(baseInterval, jitterPercent = 0.3) {
  const jitter = baseInterval * jitterPercent * (Math.random() * 2 - 1);
  return Math.floor(baseInterval + jitter);
}

module.exports = {
  delay,
  randomDelay,
  delayBetweenComments,
  delayBetweenAccounts,
  longPause,
  getSessionDuration,
  getTypingDelay,
  getScrollDelay,
  getTimeMultiplier,
  humanRandomDelay,
  checkCooldown,
  getJitteredInterval
};
