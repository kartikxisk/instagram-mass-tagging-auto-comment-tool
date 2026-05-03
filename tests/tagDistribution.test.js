// tests/tagDistribution.test.js
// Node.js built‑in test runner (node --test)
const { test, describe } = require('node:test');
const assert = require('node:assert').strict;
const {
  shuffleArray,
  splitTagsIntoGroups,
  getRandomTagsForAccount,
  generateAccountCommentBatches,
  buildCommentString
} = require('../utils/tagDistribution');

describe('tagDistribution utilities', () => {
  test('shuffleArray preserves all elements', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original);
    // Same length
    assert.strictEqual(shuffled.length, original.length);
    // Same elements after sorting
    assert.deepStrictEqual([...shuffled].sort(), [...original].sort());
  });

  test('splitTagsIntoGroups splits correctly', () => {
    const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const groups = splitTagsIntoGroups(tags, 3);
    assert.deepStrictEqual(groups, [
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['g']
    ]);
  });

  test('getRandomTagsForAccount returns subset of requested size', () => {
    const all = Array.from({ length: 10 }, (_, i) => `user${i}`);
    const subset = getRandomTagsForAccount(all, 5);
    assert.strictEqual(subset.length, 5);
    // All returned tags must be in the original list
    subset.forEach(tag => assert.ok(all.includes(tag)));
  });

  test('generateAccountCommentBatches respects min/max tags per comment', () => {
    const tags = Array.from({ length: 12 }, (_, i) => `user${i}`);
    const config = { tagsPerComment: { min: 4, max: 6 } };
    const { commentBatches } = generateAccountCommentBatches(tags, config);
    // Total tags across all batches equals original count
    const total = commentBatches.reduce((sum, batch) => sum + batch.length, 0);
    assert.strictEqual(total, tags.length);
    // Each batch length should be within allowed range (or at least half of min after merge)
    const minHalf = Math.floor(config.tagsPerComment.min / 2);
    commentBatches.forEach(batch => {
      assert.ok(batch.length >= minHalf);
      assert.ok(batch.length <= config.tagsPerComment.max);
    });
  });

  test('buildCommentString creates correct format without suffix', () => {
    const tags = ['alice', 'bob'];
    const comment = buildCommentString(tags, false);
    assert.strictEqual(comment, '@alice @bob');
  });

  test('buildCommentString may add suffix when enabled', () => {
    const tags = ['alice', 'bob'];
    const comment = buildCommentString(tags, true);
    // Should start with tags
    assert.ok(comment.startsWith('@alice @bob'));
    // May have extra suffix after a space
    const parts = comment.split(' ');
    assert.ok(parts.length >= 2);
  });
});
