const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../logs/mention_logs.csv');

// Function to initialize the log file with headers if not exists
function initializeLogFile() {
  if (!fs.existsSync(logFilePath)) {
    const headers = 'timestamp,account,proxy,status,comment,error\n';
    fs.writeFileSync(logFilePath, headers, 'utf8');
  }
}

/**
 * Logs mention details into the CSV log file.
 *
 * @param {Object} details - The details to log.
 * @param {string} details.account - Instagram account used.
 * @param {string} details.proxy - Proxy used (optional).
 * @param {string} details.status - Status of the comment (Success/Failed).
 * @param {string} details.comment - The comment text.
 * @param {string} details.error - Error message (if any).
 */
function logMention({ account = '', proxy = '', status = '', comment = '', error = '' }) {
  initializeLogFile();

  const timestamp = new Date().toISOString();
  const logEntry = `"${timestamp}","${account}","${proxy}","${status}","${comment}","${error.replace(/\n/g, ' ')}"\n`;

  fs.appendFileSync(logFilePath, logEntry, 'utf8');
}

module.exports = { logMention };
