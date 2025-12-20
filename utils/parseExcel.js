const xlsx = require('xlsx');
const fs = require('fs');
require('dotenv').config();

let allUsernames = [];
let currentIndex = 0;

/**
 * Loads all mentionable usernames from Excel file.
 *
 * @param {string} filepath - Path to the Excel file.
 * @param {boolean} reset - Whether to reset the index
 */
function loadAllUsernames(filepath, reset = true) {
  try {
    const workbook = xlsx.readFile(filepath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    allUsernames = data
      .filter(row => {
        const isMentionable = row['Is Mentionable'];
        return (
          isMentionable === true ||
          isMentionable === 'TRUE' ||
          isMentionable === 'true' ||
          isMentionable === 1 ||
          isMentionable === '1'
        );
      })
      .map(row => (row['Username'] || '').trim())
      .filter(Boolean); // removes empty or undefined usernames

    if (reset) {
      currentIndex = 0;
    }

    console.log(`✅ Loaded ${allUsernames.length} mentionable usernames.`);
    return allUsernames;
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    allUsernames = [];
    return [];
  }
}

/**
 * Fetches next batch of mentionable usernames.
 *
 * @param {number} [count=5] - Number of usernames to retrieve.
 * @returns {string[]} Array of usernames.
 */
function getNextBatch(count = process.env.ACCOUNT_BATCH_SIZE || 5) {
  const c = parseInt(count);
  if (currentIndex >= allUsernames.length) return [];

  const batch = allUsernames.slice(currentIndex, currentIndex + c);
  currentIndex += batch.length;
  return batch;
}

/**
 * Get all loaded usernames
 * @returns {string[]} Array of all usernames
 */
function getAllUsernames() {
  return [...allUsernames];
}

/**
 * Reset the batch index
 */
function resetIndex() {
  currentIndex = 0;
}

/**
 * Get remaining usernames count
 * @returns {number}
 */
function getRemainingCount() {
  return Math.max(0, allUsernames.length - currentIndex);
}

/**
 * Get total usernames count
 * @returns {number}
 */
function getTotalCount() {
  return allUsernames.length;
}

module.exports = { 
  loadAllUsernames, 
  getNextBatch, 
  getAllUsernames, 
  resetIndex,
  getRemainingCount,
  getTotalCount
};
