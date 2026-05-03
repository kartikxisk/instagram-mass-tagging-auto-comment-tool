# API Reference

## Core Classes

### GlobalTagTracker

Manages duplicate tag prevention across multiple accounts.

#### Methods

- `loadTagHistory()` - Load previously tagged users from storage
- `getAvailableUsers(users)` - Filter users not yet tagged
- `markAsTagged(username, account)` - Mark user as tagged by account
- `getStats()` - Get current statistics
- `reset()` - Clear all tagged history
- `printStats()` - Display formatted statistics

#### Example Usage

```javascript
const tracker = require('./utils/globalTagTracker');

// Load existing history
tracker.loadTagHistory();

// Get available users
const available = tracker.getAvailableUsers(allUsers);

// Mark tagged after posting
tracker.markAsTagged('user123', 'account1');

// View stats
tracker.printStats();
```

### ProxyManager

Handles proxy rotation and validation.

#### Methods

- `validateProxy(proxy)` - Test proxy connectivity
- `rotateProxy(account)` - Get next proxy for account
- `checkAllProxies()` - Validate all configured proxies

### Logger

Comprehensive logging system for tracking activities.

#### Methods

- `logMention(account, status, details)` - Log comment activity
- `logSession(stats)` - Save session summary
- `getDailyLogs(date)` - Retrieve logs for specific date

## Configuration Schema

### accounts.json Structure

```json
{
  "accounts": [
    {
      "username": "string",
      "password": "string",
      "proxy": {
        "protocol": "http|socks5",
        "address": "string",
        "port": "number",
        "username": "string",
        "password": "string"
      },
      "proxies": [
        {
          "protocol": "string",
          "address": "string",
          "port": "number",
          "username": "string",
          "password": "string"
        }
      ]
    }
  ],
  "proxies": [
    {
      "protocol": "string",
      "address": "string",
      "port": "number",
      "username": "string",
      "password": "string"
    }
  ],
  "targetPost": "string",
  "settings": {
    "accountsPerBatch": "number",
    "tagsPerComment": {
      "min": "number",
      "max": "number"
    },
    "commentsPerAccount": {
      "min": "number",
      "max": "number"
    },
    "pauseAfterComments": "number",
    "sessionTimeoutMinutes": "number"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 1001 | Proxy connection failed |
| 1002 | Instagram login failed |
| 1003 | Account action blocked |
| 1004 | Checkpoint required |
| 1005 | Session timeout |
| 1006 | Invalid credentials |

## Webhook Integration (Future)

The API supports webhook notifications for real-time monitoring:

```json
{
  "event": "comment_posted",
  "account": "username",
  "status": "success|failed",
  "tags_count": 12,
  "timestamp": "2024-12-20T10:30:00Z"
}
```</content>
<parameter name="filePath">docs/api.md