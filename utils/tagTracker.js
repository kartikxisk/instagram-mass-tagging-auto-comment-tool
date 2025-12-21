/**
 * Global Tag Tracker
 * Tracks which users have been tagged across all accounts to prevent duplicates
 */

const fs = require('fs');
const path = require('path');

/**
 * Get the data directory path
 * Uses Electron's userData path when packaged, otherwise project root
 */
function getDataDir() {
  try {
    const { app } = require('electron');
    if (app && app.isPackaged) {
      return path.join(app.getPath('userData'), 'data');
    }
  } catch (e) {
    // Not in Electron context
  }
  return path.join(__dirname, '..', 'data');
}

const TRACKER_DIR = getDataDir();
const TRACKER_FILE = path.join(TRACKER_DIR, 'tagged_users.json');

// In-memory tracking
let taggedUsers = new Set();
let pendingTags = new Set(); // Tags currently being processed
let sessionId = null;

/**
 * Initialize tracker - load from file or start fresh
 * @param {boolean} freshStart - If true, start a new session (clear old tags)
 * @returns {Object} - { totalTagged: number, sessionId: string }
 */
function initialize(freshStart = false) {
  // Ensure data directory exists
  if (!fs.existsSync(TRACKER_DIR)) {
    fs.mkdirSync(TRACKER_DIR, { recursive: true });
  }

  if (freshStart) {
    // Start fresh session
    taggedUsers = new Set();
    pendingTags = new Set();
    sessionId = Date.now().toString();
    save();
    return { totalTagged: 0, sessionId };
  }

  // Load existing data
  try {
    if (fs.existsSync(TRACKER_FILE)) {
      const data = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
      taggedUsers = new Set(data.taggedUsers || []);
      sessionId = data.sessionId || Date.now().toString();
      console.log(`📊 Loaded ${taggedUsers.size} previously tagged users`);
    } else {
      taggedUsers = new Set();
      sessionId = Date.now().toString();
    }
  } catch (error) {
    console.error('Error loading tag tracker:', error.message);
    taggedUsers = new Set();
    sessionId = Date.now().toString();
  }

  pendingTags = new Set();
  return { totalTagged: taggedUsers.size, sessionId };
}

/**
 * Save tracker to file
 */
function save() {
  try {
    const data = {
      sessionId,
      taggedUsers: Array.from(taggedUsers),
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving tag tracker:', error.message);
  }
}

/**
 * Check if a user has already been tagged
 * @param {string} username - Username to check
 * @returns {boolean}
 */
function isTagged(username) {
  const normalized = username.toLowerCase().replace('@', '');
  return taggedUsers.has(normalized) || pendingTags.has(normalized);
}

/**
 * Get untagged users from a list
 * @param {string[]} usernames - List of usernames to filter
 * @returns {string[]} - List of untagged usernames
 */
function getUntaggedUsers(usernames) {
  return usernames.filter(username => {
    const normalized = username.toLowerCase().replace('@', '');
    return !taggedUsers.has(normalized) && !pendingTags.has(normalized);
  });
}

/**
 * Reserve tags for processing (mark as pending)
 * @param {string[]} usernames - Usernames to reserve
 */
function reserveTags(usernames) {
  for (const username of usernames) {
    const normalized = username.toLowerCase().replace('@', '');
    pendingTags.add(normalized);
  }
}

/**
 * Mark tags as successfully posted
 * @param {string[]} usernames - Usernames that were successfully tagged
 */
function markAsTagged(usernames) {
  for (const username of usernames) {
    const normalized = username.toLowerCase().replace('@', '');
    pendingTags.delete(normalized);
    taggedUsers.add(normalized);
  }
  save();
}

/**
 * Release reserved tags (if comment failed)
 * @param {string[]} usernames - Usernames to release
 */
function releaseTags(usernames) {
  for (const username of usernames) {
    const normalized = username.toLowerCase().replace('@', '');
    pendingTags.delete(normalized);
  }
}

/**
 * Get statistics
 * @returns {Object} - { totalTagged, pending, sessionId }
 */
function getStats() {
  return {
    totalTagged: taggedUsers.size,
    pending: pendingTags.size,
    sessionId
  };
}

/**
 * Reset tracker (clear all data)
 */
function reset() {
  taggedUsers = new Set();
  pendingTags = new Set();
  sessionId = Date.now().toString();
  save();
}

/**
 * Get next batch of untagged users
 * @param {string[]} allUsers - All available users
 * @param {number} count - Number of users to get
 * @returns {string[]} - Untagged users
 */
function getNextBatch(allUsers, count) {
  const untagged = getUntaggedUsers(allUsers);
  const batch = untagged.slice(0, count);
  reserveTags(batch);
  return batch;
}

module.exports = {
  initialize,
  save,
  isTagged,
  getUntaggedUsers,
  reserveTags,
  markAsTagged,
  releaseTags,
  getStats,
  reset,
  getNextBatch
};
