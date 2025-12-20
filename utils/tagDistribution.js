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
 * Each account gets unique tags, split into comments based on settings
 * @param {string[]} allTags - All available tags
 * @param {Object} config - Configuration object with settings
 * @param {number} config.tagsPerAccount - Total tags per account (default 60)
 * @param {Object} config.tagsPerComment - Tags per comment settings
 * @param {number} config.tagsPerComment.min - Minimum tags per comment (default 10)
 * @param {number} config.tagsPerComment.max - Maximum tags per comment (default 12)
 * @returns {Object} - { tags: string[], commentBatches: string[][] }
 */
function generateAccountCommentBatches(allTags, config = {}) {
  const tagsPerAccount = config.tagsPerAccount || 60;
  const minTagsPerComment = config.tagsPerComment?.min || 10;
  const maxTagsPerComment = config.tagsPerComment?.max || 12;
  
  const accountTags = getRandomTagsForAccount(allTags, tagsPerAccount);
  const commentBatches = [];
  let remaining = [...accountTags];
  
  while (remaining.length > 0) {
    // Random size between min and max tags per comment
    const range = maxTagsPerComment - minTagsPerComment + 1;
    const batchSize = Math.floor(Math.random() * range) + minTagsPerComment;
    const batch = remaining.slice(0, Math.min(batchSize, remaining.length));
    remaining = remaining.slice(batch.length);
    
    // Only add if batch has at least half of minimum tags
    const minBatchSize = Math.floor(minTagsPerComment / 2);
    if (batch.length >= minBatchSize) { 
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
