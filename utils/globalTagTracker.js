const fs = require('fs');
const path = require('path');

/**
 * GlobalTagTracker - Prevents duplicate tagging across parallel accounts
 * Maintains a shared state of all tagged users in current batch/session
 */
class GlobalTagTracker {
  constructor() {
    this.taggedUsers = new Set();
    this.tagLog = {};
    this.lockFile = path.join(__dirname, '../.tag-lock.json');
    this.stats = {
      totalTagsAttempted: 0,
      duplicatesPrevented: 0,
      uniqueUsersTagged: 0
    };
  }

  /**
   * Load tagged users from previous session
   */
  loadTagHistory() {
    try {
      if (fs.existsSync(this.lockFile)) {
        const data = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
        this.taggedUsers = new Set(data.taggedUsers || []);
        this.tagLog = data.tagLog || {};
        console.log(`📖 Loaded ${this.taggedUsers.size} previously tagged users from history`);
      }
    } catch (error) {
      console.log('📝 Creating new global tag tracker');
    }
  }

  /**
   * Check if user was already tagged in current batch
   * @param {string} username - Username to check
   * @returns {boolean} - True if user was already tagged
   */
  wasTaggedInCurrentBatch(username) {
    return this.taggedUsers.has(username.toLowerCase());
  }

  /**
   * Mark user as tagged globally across all parallel accounts
   * @param {string} username - Username being tagged
   * @param {string} accountTagger - Account that tagged the user
   * @param {number} timestamp - Unix timestamp
   */
  markAsTagged(username, accountTagger, timestamp = Date.now()) {
    const user = username.toLowerCase();
    const isNewUser = !this.taggedUsers.has(user);

    if (isNewUser) {
      this.taggedUsers.add(user);
      this.stats.uniqueUsersTagged++;
    } else {
      this.stats.duplicatesPrevented++;
    }

    // Log tag attempt
    if (!this.tagLog[user]) {
      this.tagLog[user] = [];
    }

    this.tagLog[user].push({
      taggedBy: accountTagger,
      timestamp: timestamp,
      date: new Date().toISOString(),
      isDuplicate: !isNewUser
    });

    this.stats.totalTagsAttempted++;

    // Save to file for persistence across parallel processes
    this.saveToFile();

    return isNewUser;
  }

  /**
   * Get only available users (not yet tagged in current batch)
   * @param {Array} allUsers - Array of user objects with username property
   * @returns {Array} - Filtered array of available users
   */
  getAvailableUsers(allUsers) {
    if (!Array.isArray(allUsers)) {
      console.warn('⚠️ allUsers must be an array');
      return [];
    }

    const available = allUsers.filter(user => 
      !this.wasTaggedInCurrentBatch(user.username || user)
    );

    return available;
  }

  /**
   * Get users that would cause duplicates
   * @param {Array} selectedUsers - Array of selected users
   * @returns {Array} - Users that were already tagged
   */
  getDuplicates(selectedUsers) {
    return selectedUsers.filter(user =>
      this.wasTaggedInCurrentBatch(user.username || user)
    );
  }

  /**
   * Reset tracker for new post/session
   */
  reset() {
    console.log('🔄 Resetting global tag tracker for new session');
    this.taggedUsers.clear();
    this.tagLog = {};
    this.stats = {
      totalTagsAttempted: 0,
      duplicatesPrevented: 0,
      uniqueUsersTagged: 0
    };

    if (fs.existsSync(this.lockFile)) {
      try {
        fs.unlinkSync(this.lockFile);
      } catch (error) {
        console.error('Error deleting tag lock file:', error.message);
      }
    }
  }

  /**
   * Persist tracker state to file
   */
  saveToFile() {
    try {
      const data = {
        taggedUsers: Array.from(this.taggedUsers),
        tagLog: this.tagLog,
        stats: this.stats,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(this.lockFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Error saving tag tracker:', error.message);
    }
  }

  /**
   * Get current statistics
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      totalUniqueUsersTagged: this.taggedUsers.size,
      totalTagsAttempted: this.stats.totalTagsAttempted,
      duplicatesPrevented: this.stats.duplicatesPrevented,
      uniqueTagsThisSession: this.stats.uniqueUsersTagged,
      successRate: this.stats.totalTagsAttempted > 0 
        ? ((this.stats.uniqueUsersTagged / this.stats.totalTagsAttempted) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Get detailed tag history for a specific user
   * @param {string} username - Username to get history for
   * @returns {Array} - Array of tag attempts
   */
  getUserTagHistory(username) {
    return this.tagLog[username.toLowerCase()] || [];
  }

  /**
   * Get all users tagged by specific account
   * @param {string} accountUsername - Account username
   * @returns {Array} - Array of users tagged by this account
   */
  getUsersByAccount(accountUsername) {
    const users = [];
    for (const [user, logs] of Object.entries(this.tagLog)) {
      const accountTags = logs.filter(log => log.taggedBy === accountUsername);
      if (accountTags.length > 0) {
        users.push({
          username: user,
          tagCount: accountTags.length,
          lastTagged: accountTags[accountTags.length - 1].date
        });
      }
    }
    return users;
  }

  /**
   * Print detailed statistics to console
   */
  printStats() {
    const stats = this.getStats();
    console.log('\n📊 ═══════════════════════════════════════');
    console.log('📊 GLOBAL TAG TRACKER STATISTICS');
    console.log('📊 ═══════════════════════════════════════');
    console.log(`📊 Total Unique Users Tagged: ${stats.totalUniqueUsersTagged}`);
    console.log(`📊 Total Tags Attempted: ${stats.totalTagsAttempted}`);
    console.log(`📊 Duplicates Prevented: ${stats.duplicatesPrevented}`);
    console.log(`📊 Unique Tags This Session: ${stats.uniqueTagsThisSession}`);
    console.log(`📊 Success Rate: ${stats.successRate}`);
    console.log('📊 ═══════════════════════════════════════\n');
  }

  /**
   * Export data for logging/reporting
   * @returns {Object} - Exportable data
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      taggedUsers: Array.from(this.taggedUsers),
      tagLog: this.tagLog
    };
  }
}

// Export singleton instance
const tracker = new GlobalTagTracker();

// Support for CLI reset command
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'reset') {
    tracker.reset();
    console.log('✅ Global tag tracker has been reset!');
    console.log('📝 All tracked tags have been cleared.');
    process.exit(0);
  } else if (command === 'stats') {
    tracker.loadTagHistory();
    tracker.printStats();
    process.exit(0);
  } else if (command === 'export') {
    tracker.loadTagHistory();
    console.log(JSON.stringify(tracker.export(), null, 2));
    process.exit(0);
  } else {
    console.log('Usage:');
    console.log('  node utils/globalTagTracker.js reset   - Reset all tracked tags');
    console.log('  node utils/globalTagTracker.js stats   - Show current statistics');
    console.log('  node utils/globalTagTracker.js export  - Export data as JSON');
    process.exit(0);
  }
}

module.exports = tracker;
