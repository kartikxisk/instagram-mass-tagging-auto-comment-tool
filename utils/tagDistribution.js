/**
 * Tag Distribution Utility
 * Handles splitting tags into groups and managing tag distribution per account
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array (new array, doesn't modify original)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Split an array of tags into groups of specified size
 * @param {string[]} tags - Array of usernames/tags
 * @param {number} size - Size of each group (10-12 recommended)
 * @returns {string[][]} - Array of tag groups
 */
function splitTagsIntoGroups(tags, size = 10) {
  const groups = [];
  for (let i = 0; i < tags.length; i += size) {
    groups.push(tags.slice(i, i + size));
  }
  return groups;
}

/**
 * Get random tags for an account (60 unique tags per account)
 * @param {string[]} allTags - All available tags
 * @param {number} count - Number of tags to pick (default 60)
 * @returns {string[]} - Array of randomly selected tags
 */
function getRandomTagsForAccount(allTags, count = 60) {
  const shuffled = shuffleArray(allTags);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Generate comment batches for an account
 * Each account gets 60 unique tags, split into 5-7 comments of 10-12 tags each
 * @param {string[]} allTags - All available tags
 * @param {number} tagsPerAccount - Total tags per account (default 60)
 * @param {number} tagsPerComment - Tags per comment (default 10-12, randomly chosen)
 * @returns {Object} - { tags: string[], commentBatches: string[][] }
 */
function generateAccountCommentBatches(allTags, tagsPerAccount = 60) {
  const accountTags = getRandomTagsForAccount(allTags, tagsPerAccount);
  const commentBatches = [];
  let remaining = [...accountTags];
  
  while (remaining.length > 0) {
    // Random size between 10-12 tags per comment
    const batchSize = Math.floor(Math.random() * 3) + 10; // 10, 11, or 12
    const batch = remaining.slice(0, Math.min(batchSize, remaining.length));
    remaining = remaining.slice(batch.length);
    
    if (batch.length >= 5) { // Only add if batch has at least 5 tags
      commentBatches.push(batch);
    } else if (commentBatches.length > 0) {
      // Add remaining to last batch if too small
      commentBatches[commentBatches.length - 1].push(...batch);
    }
  }
  
  return {
    tags: accountTags,
    commentBatches
  };
}

/**
 * Random comment suffixes/emojis to make comments more natural
 */
const COMMENT_SUFFIXES = [
  '🔥', '❤️', '💯', '🙌', '✨', '💪', '🎯', '⭐', '💫', '🚀',
  'amazing!', 'fire! 🔥', 'love this!', 'check this out!', 
  '👆 see this', 'must see!', 'awesome!', 'incredible!', 
  '🔝', '💥', '⚡', '🌟', '💖', '😍', 'wow!', 'nice!'
];

/**
 * Get a random comment suffix
 * @returns {string} Random suffix/emoji
 */
function getRandomCommentSuffix() {
  return COMMENT_SUFFIXES[Math.floor(Math.random() * COMMENT_SUFFIXES.length)];
}

/**
 * Build a comment string from tags with optional random suffix
 * @param {string[]} tags - Array of usernames to tag
 * @param {boolean} addSuffix - Whether to add a random suffix
 * @returns {string} - Formatted comment string
 */
function buildCommentString(tags, addSuffix = true) {
  const tagString = tags.map(t => `@${t}`).join(' ');
  if (addSuffix && Math.random() > 0.3) { // 70% chance to add suffix
    return `${tagString} ${getRandomCommentSuffix()}`;
  }
  return tagString;
}

module.exports = {
  shuffleArray,
  splitTagsIntoGroups,
  getRandomTagsForAccount,
  generateAccountCommentBatches,
  getRandomCommentSuffix,
  buildCommentString
};
