const xlsx = require('xlsx');
const fs = require('fs');
require('dotenv').config();

let allUsernames = [];
let currentIndex = 0;

/**
 * Loads all mentionable usernames from Excel file.
 *
 * @param {string} filepath - Path to the Excel file.
 */
function loadAllUsernames(filepath) {
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

    currentIndex = 0;

    console.log(`✅ Loaded ${allUsernames.length} mentionable usernames.`);
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    allUsernames = [];
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

module.exports = { loadAllUsernames, getNextBatch };
