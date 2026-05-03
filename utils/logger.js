const fs = require("fs");
const path = require("path");

const { getLogsPath } = require("./paths");

/**
 * Get the logs directory path
 */
function getLogsDir() {
  return getLogsPath();
}

// Create date-wise folder for logs
const today = new Date();
const dateFolder = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const LOGS_DIR = path.join(getLogsDir(), dateFolder);
const logFilePath = path.join(LOGS_DIR, "mention_logs.csv");
const summaryFilePath = path.join(LOGS_DIR, "session_summary.json");

// Ensure date-wise logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Function to initialize the log file with headers if not exists
function initializeLogFile() {
  if (!fs.existsSync(logFilePath)) {
    const headers = "timestamp,account,proxy,status,comment,tags_count,error\n";
    fs.writeFileSync(logFilePath, headers, "utf8");
  }
}

/**
 * Status types for logging
 */
const STATUS = {
  SUCCESS: "Success",
  FAILED: "Failed",
  BLOCKED: "Blocked",
  CHECKPOINT: "Checkpoint",
  LOGIN_FAILED: "Login Failed",
  COMMENT_FAILED: "Comment Failed",
};

/**
 * Logs mention details into the CSV log file.
 *
 * @param {Object} details - The details to log.
 * @param {string} details.account - Instagram account used.
 * @param {string} details.proxy - Proxy used (optional).
 * @param {string} details.status - Status of the comment (Success/Failed/Blocked/Checkpoint).
 * @param {string} details.comment - The comment text.
 * @param {number} details.tagsCount - Number of tags in comment.
 * @param {string} details.error - Error message (if any).
 */
function logMention({
  account = "",
  proxy = "",
  status = "",
  comment = "",
  tagsCount = 0,
  error = "",
}) {
  initializeLogFile();

  const timestamp = new Date().toISOString();
  const sanitizedComment = comment.replace(/"/g, '""').replace(/\n/g, " ");
  const sanitizedError = error.replace(/"/g, '""').replace(/\n/g, " ");
  const logEntry = `"${timestamp}","${account}","${proxy}","${status}","${sanitizedComment}","${tagsCount}","${sanitizedError}"\n`;

  fs.appendFileSync(logFilePath, logEntry, "utf8");
}

/**
 * Session statistics tracker
 */
class SessionStats {
  constructor() {
    this.startTime = new Date();
    this.totalComments = 0;
    this.successfulComments = 0;
    this.failedComments = 0;
    this.blockedAccounts = 0;
    this.checkpointAccounts = 0;
    this.loginFailures = 0;
    this.accountsProcessed = 0;
    this.totalTags = 0;
    this.errors = [];
  }

  /**
   * Record a successful comment
   * @param {number} tagsCount - Number of tags in the comment
   */
  recordSuccess(tagsCount = 0) {
    this.totalComments++;
    this.successfulComments++;
    this.totalTags += tagsCount;
  }

  /**
   * Record a failed comment
   * @param {string} error - Error message
   */
  recordFailure(error = "") {
    this.totalComments++;
    this.failedComments++;
    if (error) {
      this.errors.push({
        type: "comment_failed",
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Record a blocked account
   * @param {string} account - Account username
   */
  recordBlocked(account) {
    this.blockedAccounts++;
    this.errors.push({
      type: "blocked",
      account,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record a checkpoint account
   * @param {string} account - Account username
   */
  recordCheckpoint(account) {
    this.checkpointAccounts++;
    this.errors.push({
      type: "checkpoint",
      account,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record a login failure
   * @param {string} account - Account username
   * @param {string} error - Error message
   */
  recordLoginFailure(account, error = "") {
    this.loginFailures++;
    this.errors.push({
      type: "login_failed",
      account,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record an account processed
   */
  recordAccountProcessed() {
    this.accountsProcessed++;
  }

  /**
   * Get summary statistics
   * @returns {Object} - Summary object
   */
  getSummary() {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000 / 60; // minutes

    return {
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: Math.round(duration * 100) / 100,
      accountsProcessed: this.accountsProcessed,
      totalComments: this.totalComments,
      successfulComments: this.successfulComments,
      failedComments: this.failedComments,
      successRate:
        this.totalComments > 0
          ? Math.round((this.successfulComments / this.totalComments) * 100)
          : 0,
      totalTags: this.totalTags,
      blockedAccounts: this.blockedAccounts,
      checkpointAccounts: this.checkpointAccounts,
      loginFailures: this.loginFailures,
      errors: this.errors.slice(-50), // Keep last 50 errors
    };
  }

  /**
   * Save summary to file
   */
  saveSummary() {
    const summary = this.getSummary();
    fs.writeFileSync(summaryFilePath, JSON.stringify(summary, null, 2), "utf8");
    console.log(`📊 Session summary saved to ${summaryFilePath}`);
    return summary;
  }

  /**
   * Print summary to console
   */
  printSummary() {
    const summary = this.getSummary();
    console.log("\n" + "=".repeat(50));
    console.log("📊 SESSION SUMMARY");
    console.log("=".repeat(50));
    console.log(`⏱️  Duration: ${summary.durationMinutes} minutes`);
    console.log(`👥 Accounts Processed: ${summary.accountsProcessed}`);
    console.log(`💬 Total Comments: ${summary.totalComments}`);
    console.log(`✅ Successful: ${summary.successfulComments}`);
    console.log(`❌ Failed: ${summary.failedComments}`);
    console.log(`📈 Success Rate: ${summary.successRate}%`);
    console.log(`🏷️  Total Tags: ${summary.totalTags}`);
    console.log(`🚫 Blocked Accounts: ${summary.blockedAccounts}`);
    console.log(`⚠️  Checkpoint Accounts: ${summary.checkpointAccounts}`);
    console.log(`🔐 Login Failures: ${summary.loginFailures}`);
    console.log("=".repeat(50) + "\n");
  }
}

module.exports = {
  logMention,
  SessionStats,
  STATUS,
  initializeLogFile,
};
