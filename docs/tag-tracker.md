# Tag Tracker Guide

## Overview

The Global Tag Tracker prevents duplicate tagging across multiple parallel accounts, ensuring each user is tagged only once even when running hundreds of accounts simultaneously.

## How It Works

### Core Mechanism
1. **Central Storage**: All tagged users stored in `.tag-lock.json`
2. **Real-time Sync**: All parallel accounts share same tracker file
3. **Pre-filtering**: Users already tagged are excluded from selection
4. **Post-marking**: Successfully tagged users are marked immediately

### File Structure
```json
{
  "taggedUsers": {
    "user123": {
      "taggedBy": "account1",
      "timestamp": "2024-12-20T10:30:00Z",
      "postUrl": "https://instagram.com/p/ABC123/"
    }
  },
  "stats": {
    "totalUniqueUsersTagged": 2500,
    "totalTagsAttempted": 3000,
    "duplicatesPrevented": 500,
    "successRate": "83.33"
  }
}
```

## Usage Commands

### View Statistics
```bash
npm run tracker:stats
# or
node utils/globalTagTracker.js stats
```

Output:
```
📊 Global Tag Tracker Statistics
══════════════════════════════════════
Total Unique Users Tagged: 2,500
Total Tags Attempted: 3,000
Duplicates Prevented: 500
Success Rate: 83.33%
══════════════════════════════════════
```

### Reset Tracker
```bash
npm run tracker:reset
# or
node utils/globalTagTracker.js reset
```

### Export Data
```bash
npm run tracker:export > backup.json
# or
node utils/globalTagTracker.js export > backup.json
```

## Code Integration

### Basic Usage
```javascript
const globalTagTracker = require('./utils/globalTagTracker');

// Initialize
globalTagTracker.loadTagHistory();

// Filter available users
const allUsers = loadUsersFromExcel();
const availableUsers = globalTagTracker.getAvailableUsers(allUsers);

// Select users for tagging
const usersToTag = selectRandomUsers(availableUsers, 12);

// Post comment and mark tagged
await postCommentWithTags(usersToTag);
for (const user of usersToTag) {
  globalTagTracker.markAsTagged(user.username, account.username);
}
```

### Advanced Integration
```javascript
class TaggingAutomation {
  async startTagging(account) {
    // Load tracker
    globalTagTracker.loadTagHistory();

    // Get available users
    const availableUsers = globalTagTracker.getAvailableUsers(this.allUsers);

    if (availableUsers.length < 10) {
      console.log('⚠️ Not enough available users');
      return;
    }

    // Tag users
    const taggedUsers = await this.tagUsers(account, availableUsers);

    // Mark as tagged
    taggedUsers.forEach(user => {
      globalTagTracker.markAsTagged(user, account.username);
    });

    // Save progress
    globalTagTracker.saveTagHistory();
  }
}
```

## When to Reset

### Scenarios Requiring Reset
- **New username list**: When using different Excel file
- **New target post**: Different post, same users
- **Fresh campaign**: Starting new tagging campaign
- **Error recovery**: After crashes or corrupted data

### When NOT to Reset
- **Same post, continuing**: Keep history to avoid duplicates
- **Same users, different post**: Reset if different post
- **Incremental tagging**: Continue without reset

## Statistics Explained

### Key Metrics
- **Total Unique Users Tagged**: Actual unique users reached
- **Total Tags Attempted**: Total tag operations performed
- **Duplicates Prevented**: Tags that would have duplicated but were prevented
- **Success Rate**: Percentage of unique tags vs attempted

### Example Calculation
```
Attempted Tags: 3,000
Unique Tags: 2,500
Duplicates Prevented: 500
Success Rate: (2,500 / 3,000) × 100 = 83.33%
```

## Performance Impact

### Benefits
- ✅ Prevents Instagram spam detection
- ✅ Maximizes reach with unique tags
- ✅ Natural engagement patterns
- ✅ Cross-account coordination

### Resource Usage
- Minimal memory footprint
- Fast file I/O operations
- Real-time synchronization
- Automatic cleanup of old data

## Troubleshooting

### Common Issues

**Tracker Not Loading**
```bash
# Check file permissions
ls -la .tag-lock.json

# Reset if corrupted
npm run tracker:reset
```

**Duplicates Still Occurring**
- Ensure all instances use same tracker file
- Check file write permissions
- Verify accounts are reading latest data

**Performance Slow**
- Large tracker files may slow performance
- Consider periodic cleanup
- Use SSD storage for faster I/O

### Recovery Procedures

**After Crash**
```javascript
// Force reload tracker
globalTagTracker.reset();
globalTagTracker.loadTagHistory();
```

**Corrupted File**
```bash
# Backup current file
cp .tag-lock.json .tag-lock.json.backup

# Reset and start fresh
npm run tracker:reset
```

## Best Practices

1. **Always load before tagging**
2. **Mark immediately after success**
3. **Regular statistics monitoring**
4. **Backup before reset**
5. **Test with small batches first**

## Advanced Features

### Custom Filtering
```javascript
// Filter by date
const recentTags = globalTagTracker.getTaggedSince(date);

// Filter by account
const accountTags = globalTagTracker.getTaggedByAccount(account);
```

### Batch Operations
```javascript
// Bulk mark multiple users
globalTagTracker.markMultipleTagged(users, account);

// Bulk check availability
const available = globalTagTracker.filterAvailableUsers(userList);
```</content>
<parameter name="filePath">docs/tag-tracker.md