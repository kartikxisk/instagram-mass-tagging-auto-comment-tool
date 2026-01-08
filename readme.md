# 🚀 Instagram Mass Tagging Automation Tool

A powerful Node.js automation using Puppeteer that logs into multiple Instagram accounts and posts comments containing user tags on a specific reel/post. Now available as a **Desktop Application** with a modern GUI! The to## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run ---

| Command | Description |
|---------|-------------|
| `npm run electron` | 🖥️ Run desktop application (GUI) |
| `npm start` | 🚀 Run CLI mass tagging automation |
| `npm run proxy-check` | ✅ Test all proxies before running |
| `npm run browser` | Install Puppeteer Chrome browser |
| `npm run build:mac` | 📦 Build macOS app (.dmg) |
| `npm run build:win` | 📦 Build Windows app (.exe) |
| `npm run fix` | Run fix script for common issues |

### Tag Tracker Commands

| Command | Description |
|---------|-------------|
| `node utils/globalTagTracker.js reset` | 🔄 Reset all tracked tags (use when reusing usernames file) |
| `node utils/globalTagTracker.js stats` | 📊 Show current tagging statistics |
| `node utils/globalTagTracker.js export` | 📤 Export tracked data as JSON |

**Or use npm shortcuts (easier):**

| Command | Description |
|---------|-------------|
| `npm run tracker:reset` | 🔄 Reset all tracked tags |
| `npm run tracker:stats` | 📊 Show current statistics |
| `npm run tracker:export` | 📤 Export tracker data |

---

## 📝 Preparing the Excel File Run desktop application (GUI) |
| `npm start` | 🚀 Run CLI mass tagging automation |
| `npm run proxy-check` | ✅ Test all proxies before running |
| `npm run browser` | Install Puppeteer Chrome browser |
| `npm run build:mac` | 📦 Build macOS app (.dmg) |
| `npm run build:win` | 📦 Build Windows app (.exe) |
| `npm run fix` | Run fix script for common issues |ts Instagram safety limits to avoid action blocks, shadowban, or account bans.

---

## �️ Desktop Application (Electron)

The tool now comes with a beautiful desktop GUI built with Electron!

### Features
- 🎨 Modern dark theme interface
- 📊 Real-time statistics and progress tracking
- �📜 Live log viewer with color-coded messages
- ⚙️ Easy account and proxy management
- 🔄 Start/Stop controls
- 🔌 Built-in proxy checker

### Quick Start (Desktop App)

```bash
# Install dependencies
npm install

# Run the desktop app
npm run electron
```

### Build for Distribution

```bash
# Build for macOS
npm run build:mac

# Build for Windows  
npm run build:win

# Build for Linux
npm run build:linux
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run electron` | 🖥️ Run desktop application (GUI) |
| `npm start` | 🚀 Run CLI mass tagging automation |
| `npm run proxy-check` | ✅ Test all proxies before running |
| `npm run browser` | Install Puppeteer Chrome browser |
| `npm run build:mac` | 📦 Build macOS app (.dmg) |
| `npm run build:win` | 📦 Build Windows app (.exe) |
| `npm run fix` | Run fix script for common issues |

---

## 📆 Features

### Core Features
- **Desktop Application**: Modern GUI with Electron
- **Multi-Account Support**: Handle 500-700+ accounts
- **Batch Processing**: Accounts divided into groups of 100 per batch
- **Smart Tag Distribution**: 60 unique tags per account, 10-12 tags per comment
- **Safety-First Approach**: Built-in delays and anti-detection measures
- **Proxy Support**: Full HTTP/SOCKS5 proxy support with authentication
- **Session Persistence**: Cookie storage and reuse for faster logins
- **Comprehensive Logging**: CSV logs + session summaries

### Safety Features
- ✅ Random delays between comments (35-120 seconds)
- ✅ Random delays between accounts (5-20 seconds)
- ✅ Long pause after 50 comments (10-20 minutes)
- ✅ Session duration limits (5-15 minutes per account)
- ✅ Random typing speed for human-like behavior
- ✅ Random scrolling before commenting
- ✅ Different user-agent per account
- ✅ Action blocked detection → auto-skip account
- ✅ Checkpoint detection → auto-skip account
- ✅ Stealth plugin to avoid bot detection

### Duplicate Prevention (Parallel Accounts)
- ✅ **Global tag tracking** - Prevents same user being tagged multiple times
- ✅ **Cross-account awareness** - All parallel accounts share tag history
- ✅ **Persistent tracking** - Tagged users saved to `.tag-lock.json` file
- ✅ **Real-time filtering** - Unavailable users automatically excluded from selection
- ✅ **Live statistics** - Track duplicates prevented in real-time
- ✅ **Per-account history** - See which account tagged which user and when

---

## 📁 Folder Structure

```
instagram-mass-tagger/
├── electron/                 # 🖥️ Electron app files
│   ├── main.js               # Electron main process
│   ├── preload.js            # IPC bridge
│   ├── automation-runner.js  # Automation bridge
│   ├── proxy-checker-runner.js
│   └── renderer/
│       ├── index.html        # App UI
│       ├── styles.css        # Dark theme styles
│       └── renderer.js       # Frontend logic
├── assets/                   # App icons
│   └── icon.png
├── config/
│   └── accounts.json         # Accounts + proxies configuration
├── data/
│   └── usernames.xlsx        # Excel file with usernames to tag
├── cookies/
│   └── [username].json       # Session cookies per account
├── logs/                     # 📅 Date-wise log folders
│   ├── 2025-12-20/
│   │   ├── proxy_check_log.csv
│   │   ├── mention_logs.csv
│   │   └── session_summary.json
│   └── 2025-12-21/
│       └── ...
├── utils/
│   ├── delay.js              # Delay utilities (random, comment, account delays)
│   ├── globalTagTracker.js   # 🆕 Prevent duplicate tags across parallel accounts
│   ├── humanBehavior.js      # Human-like behavior simulation
│   ├── logger.js             # Logging and statistics tracking
│   ├── parseExcel.js         # Excel parsing and batching
│   ├── proxyChecker.js       # Proxy validation utility
│   ├── proxySetup.js         # Proxy configuration
│   ├── sessionManager.js     # Cookie/session management
│   ├── tagDistribution.js    # Tag distribution logic
│   └── userAgents.js         # Random user agent generator
├── main.js                   # 🚀 CLI automation script
└── package.json
```

---

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Install Browser (if needed)

```bash
npm run browser
```

### 3. Configure Accounts & Proxies

Edit `config/accounts.json`:

```json
{
  "accounts": [
    {
      "username": "account1",
      "password": "password1"
    },
    {
      "username": "account2",
      "password": "password2",
      "proxy": {
        "protocol": "http",
        "address": "single.proxy.ip",
        "port": 8080,
        "username": "user",
        "password": "pass"
      }
    },
    {
      "username": "account3",
      "password": "password3",
      "proxies": [
        {
          "protocol": "http",
          "address": "proxy1.ip",
          "port": 8080,
          "username": "user",
          "password": "pass"
        },
        {
          "protocol": "http",
          "address": "proxy2.ip",
          "port": 8081,
          "username": "user",
          "password": "pass"
        }
      ]
    }
  ],
  "proxies": [
    {
      "protocol": "http",
      "address": "142.111.48.253",
      "port": 7030,
      "username": "proxyuser",
      "password": "proxypass"
    }
  ],
  "targetPost": "https://www.instagram.com/reel/YOUR_REEL_ID/",
  "settings": {
    "accountsPerBatch": 100,
    "tagsPerComment": { "min": 10, "max": 12 },
    "commentsPerAccount": { "min": 5, "max": 7 },
    "pauseAfterComments": 50
  }
}
```

#### Proxy Assignment (Priority Order)

| Priority | Config | Description |
|----------|--------|-------------|
| 1️⃣ | `account.proxies[]` | Multiple proxies per account (rotating) |
| 2️⃣ | `account.proxy` | Single proxy for account |
| 3️⃣ | `proxies[]` | Global proxy pool (rotating) |

#### Examples:

**Account with multiple proxies (rotating):**
```json
{
  "username": "myaccount",
  "password": "mypass",
  "proxies": [
    { "protocol": "http", "address": "1.1.1.1", "port": 8080, "username": "u", "password": "p" },
    { "protocol": "http", "address": "2.2.2.2", "port": 8080, "username": "u", "password": "p" },
    { "protocol": "http", "address": "3.3.3.3", "port": 8080, "username": "u", "password": "p" }
  ]
}
```
→ Each session/comment cycle rotates: proxy1 → proxy2 → proxy3 → proxy1...

**Account with single proxy:**
```json
{
  "username": "myaccount",
  "password": "mypass",
  "proxy": { "protocol": "http", "address": "1.1.1.1", "port": 8080, "username": "u", "password": "p" }
}
```

**Account using global pool:**
```json
{
  "username": "myaccount",
  "password": "mypass"
}
```
→ Uses proxies from the global `proxies` array

#### Understanding `accountsPerBatch`

**`accountsPerBatch`** controls how many accounts are processed **simultaneously in parallel**:

- **Default**: 100 accounts per batch
- **Example**: With 500 accounts and `accountsPerBatch: 100`:
  - Batch 1: Accounts 1-100 run together
  - Batch 2: Accounts 101-200 run together (after batch 1 completes)
  - Batch 3-5: Continue sequentially

**Benefits**:
- ✅ Prevents Instagram rate-limiting
- ✅ Manages system resources (limits concurrent browser instances)
- ✅ Spreads activity naturally over time
- ✅ Reduces bot detection risk

---

## 🎯 Duplicate Tag Prevention (Parallel Accounts)

When running multiple accounts in parallel on the same post, there's a critical issue: **same users being tagged multiple times**.

### The Problem

Without duplicate prevention:
- 6 parallel accounts × 10-12 tags/comment = 60-72 tags
- **Result**: Same 10-12 users tagged 5-6 times each ❌
- **Risk**: Looks unnatural → Instagram spam detection → action blocks

### The Solution: Global Tag Tracker

With `globalTagTracker.js` enabled:
- 6 parallel accounts × 10-12 tags/comment = 60-72 tags
- **Result**: 60-72 unique users tagged once each ✅
- **Benefit**: Natural engagement → Instagram safe → no blocks

### How It Works

1. **On Startup** - Loads previously tagged users from `.tag-lock.json`
2. **Before Tagging** - Each account checks the global tracker
3. **Filter Available** - Only users not yet tagged are available for selection
4. **Mark Tagged** - After tagging, user is added to global tracker
5. **Real-time Sync** - All parallel accounts share the same tracker file
6. **Statistics** - Track duplicates prevented in real-time

### Usage Example

```javascript
// In your automation runner
const globalTagTracker = require('./utils/globalTagTracker');

// Start of batch processing
globalTagTracker.loadTagHistory(); // Load existing tagged users

// When selecting users to tag
const allUsers = parseExcelUsers(); // Load from Excel
const availableUsers = globalTagTracker.getAvailableUsers(allUsers);
// Now availableUsers only contains users not yet tagged

// After posting comment with tags
for (const user of taggedUsers) {
  globalTagTracker.markAsTagged(user.username, account.username);
}

// View statistics
globalTagTracker.printStats();
// Output:
// 📊 Total Unique Users Tagged: 1,250
// 📊 Total Tags Attempted: 1,500
// 📊 Duplicates Prevented: 250
// 📊 Success Rate: 83.33%
```

### Statistics Available

Track these metrics in real-time:

```javascript
const stats = globalTagTracker.getStats();
// {
//   totalUniqueUsersTagged: 1250,
//   totalTagsAttempted: 1500,
//   duplicatesPrevented: 250,
//   uniqueTagsThisSession: 847,
//   successRate: "83.33%"
// }
```

### Resetting the Tracker (Reusing Usernames File)

**Important:** When you reuse the same `usernames.xlsx` file, reset the tracker to avoid blocking all users as "already tagged".

#### Method 1: CLI Command (Recommended)

```bash
# Reset all tracked tags
node utils/globalTagTracker.js reset
```

**Output:**
```
✅ Global tag tracker has been reset!
📝 All tracked tags have been cleared.
```

#### Method 2: Programmatically

```javascript
const globalTagTracker = require('./utils/globalTagTracker');

// Reset tracker before starting new batch with same usernames
globalTagTracker.reset();
console.log('✅ Tracker reset - ready for new tagging session!');
```

#### When to Reset?

| Scenario | Action | Reason |
|----------|--------|--------|
| 🔁 **Reusing same usernames file** | ✅ **RESET** | Allow users to be tagged again |
| 📅 **Starting new day with new list** | ✅ **RESET** | Clean slate for new batch |
| ❌ **Bug or crash occurred** | ✅ **RESET** | Remove corrupted tracker |
| 🔄 **Same post, continuous tagging** | ❌ **DON'T RESET** | Keep history to avoid duplicates |
| 📊 **Different post, same users** | ✅ **RESET** | Different post = fresh tagging |

#### Checking Tracker Status Before Reset

```bash
# View current statistics before resetting
npm run tracker:stats
# or
node utils/globalTagTracker.js stats
```

**Example Output:**
```
📊 ═══════════════════════════════════════
📊 GLOBAL TAG TRACKER STATISTICS
📊 ═══════════════════════════════════════
📊 Total Unique Users Tagged: 2,500
📊 Total Tags Attempted: 3,000
📊 Duplicates Prevented: 500
📊 Unique Tags This Session: 1,750
📊 Success Rate: 83.33%
📊 ═══════════════════════════════════════
```

#### Exporting Tracker Data Before Reset

```bash
# Export all tracked data for backup/analysis
npm run tracker:export > tracker-backup.json
# or
node utils/globalTagTracker.js export > tracker-backup.json
```

Then safely reset:
```bash
# Reset after backing up data
npm run tracker:reset
# or
node utils/globalTagTracker.js reset
```

#### Complete Reset Workflow Example

**Simple (using npm shortcuts):**
```bash
# 1. View current statistics
npm run tracker:stats

# 2. Reset the tracker
npm run tracker:reset

# 3. Confirm reset
npm run tracker:stats
# Output: All values should be 0
```

**Advanced (with backup):**
```bash
# 1. View current statistics
npm run tracker:stats

# 2. Export data for records (backup)
npm run tracker:export > logs/tracker-backup-$(date +%Y-%m-%d).json

# 3. Reset the tracker
npm run tracker:reset

# 4. Confirm reset
npm run tracker:stats
```

Or using direct commands:

```bash
# 1. View current statistics
node utils/globalTagTracker.js stats

# 2. Export data for records (optional)
node utils/globalTagTracker.js export > logs/tracker-$(date +%Y-%m-%d).json

# 3. Reset the tracker
node utils/globalTagTracker.js reset

# 4. Confirm reset
node utils/globalTagTracker.js stats
# Output: All values should be 0
```

#### Automatic Reset in Code

```javascript
const globalTagTracker = require('./utils/globalTagTracker');

async function startNewTaggingSession() {
  // Check if we should reset
  const stats = globalTagTracker.getStats();
  
  if (stats.totalUniqueUsersTagged > 0) {
    console.log('⚠️ Previous tags detected. Resetting for fresh session...');
    globalTagTracker.reset();
    console.log('✅ Tracker reset complete!');
  }
  
  // Load fresh history
  globalTagTracker.loadTagHistory();
  
  // Start tagging...
}
```

### 📖 For Complete Tag Tracker Guide

See **[TAG_TRACKER_GUIDE.md](TAG_TRACKER_GUIDE.md)** for detailed documentation including:
- ✅ Quick start commands
- ✅ Complete workflow examples
- ✅ Troubleshooting tips
- ✅ Code integration examples
- ✅ Output reference

---

| Command | Description |
|---------|-------------|
| `npm run electron` | �️ Run desktop application (GUI) |
| `npm start` | 🚀 Run CLI mass tagging automation |
| `npm run proxy-check` | ✅ Test all proxies before running |
| `npm run browser` | Install Puppeteer Chrome browser |
| `npm run build:mac` | 📦 Build macOS app (.dmg) |
| `npm run build:win` | 📦 Build Windows app (.exe) |
| `npm run fix` | Run fix script for common issues |

---

## 📝 Preparing the Excel File

Your file should be `data/usernames.xlsx` with these columns:

| Username     | Is Mentionable |
|--------------|----------------|
| user1        | TRUE           |
| user2        | TRUE           |
| spammy_user  | FALSE          |

> Only users with `Is Mentionable = TRUE` will be tagged.

---

## ▶️ Running the Tool

### Option 1: Desktop GUI (Recommended)

```bash
npm run electron
```

Launch the modern Electron app with:
- 📊 Real-time statistics and progress tracking
- 📜 Live log viewer with color-coded messages
- ⚙️ Easy account and proxy management
- 🔄 Start/Stop controls
- 🔌 Built-in proxy checker

### Option 2: CLI Mass Tagging Automation

```bash
npm start
# or
node main.js
```

This runs the full-featured mass tagging automation with:
- Batch processing (configurable accounts per batch)
- Safety delays and long pauses
- Human behavior simulation
- Comprehensive logging

### Check Proxies Before Running

```bash
npm run proxy-check
# or
node utils/proxyChecker.js
```

Verify all your proxies are working before running the main script:
- Tests each proxy from `proxies` array and individual account proxies
- Shows ✅ Success or ❌ Failed for each proxy
- Saves results to: `logs/YYYY-MM-DD/proxy_check_log.csv`

---

## 🔐 Manual Login (First Time or Challenge)

If Instagram prompts for checkpoint/challenge:

```bash
node manual-login/manual-login.js
```

**Steps:**
1. Browser opens for each account
2. Manually complete login/verification
3. Cookies are saved automatically
4. Timeout per login session is configurable via `.env` (`ACCOUNT_VERIFICATION_TIME`)

---

## 📊 Logs & Statistics

All logs are organized in **date-wise folders** for easy tracking:

```
logs/
├── 2025-12-20/
│   ├── proxy_check_log.csv    # Proxy test results
│   ├── mention_logs.csv       # Comment activity logs
│   └── session_summary.json   # Session statistics
├── 2025-12-21/
│   └── ...
└── ...
```

### Mention Logs (`logs/YYYY-MM-DD/mention_logs.csv`)
Detailed CSV log of every comment attempt:
- Timestamp
- Account username
- Proxy used
- Status (Success/Failed/Blocked/Checkpoint)
- Comment content
- Tags count
- Error message

### Proxy Check Logs (`logs/YYYY-MM-DD/proxy_check_log.csv`)
| Date | Time | Timestamp | Proxy | Status |
|------|------|-----------|-------|--------|
| 12/20/2025 | 14:30:25 | 2025-12-20T14:30:25.123Z | 142.111.48.253:7030 | ✅ Success |

### Session Summary (`logs/YYYY-MM-DD/session_summary.json`)
```json
{
  "startTime": "2024-12-20T10:00:00.000Z",
  "endTime": "2024-12-20T14:30:00.000Z",
  "durationMinutes": 270,
  "accountsProcessed": 150,
  "totalComments": 750,
  "successfulComments": 720,
  "failedComments": 30,
  "successRate": 96,
  "totalTags": 7920,
  "blockedAccounts": 3,
  "checkpointAccounts": 2,
  "loginFailures": 5
}
```

---

## 📊 Daily Capacity Calculator

### Per Account (Safe Limits)
| Metric | Value | Calculation |
|--------|-------|-------------|
| Tags per account/day | **60 tags** | Safety limit |
| Comments per account/day | **5-7 comments** | 60 tags ÷ 10-12 tags/comment |
| Tags per comment | **10-12 tags** | Optimal for engagement |
| Time per account | **5-15 minutes** | Session duration |

### With 100 Accounts (1 Batch)
| Metric | Min | Max | Average |
|--------|-----|-----|---------|
| Total tags/day | 6,000 | 6,000 | **6,000 tags** |
| Total comments/day | 500 | 700 | **~600 comments** |
| Time required | ~8 hrs | ~25 hrs | **~12-15 hrs** |

### With 500 Accounts (5 Batches)
| Metric | Min | Max | Average |
|--------|-----|-----|---------|
| Total tags/day | 30,000 | 30,000 | **30,000 tags** |
| Total comments/day | 2,500 | 3,500 | **~3,000 comments** |
| Time required | ~40 hrs | ~125 hrs | **~60-75 hrs** |

### With 700 Accounts (7 Batches)
| Metric | Min | Max | Average |
|--------|-----|-----|---------|
| Total tags/day | 42,000 | 42,000 | **42,000 tags** |
| Total comments/day | 3,500 | 4,900 | **~4,200 comments** |
| Time required | ~56 hrs | ~175 hrs | **~85-105 hrs** |

### ⏱️ Time Breakdown (Per Account)
| Action | Min Time | Max Time | Notes |
|--------|----------|----------|-------|
| Login + Setup | 30s | 60s | With cookies: faster |
| Navigate to post | 5s | 15s | Network dependent |
| Per comment cycle | 35s | 120s | Safety delay |
| 6 comments total | 3.5 min | 12 min | Per account |
| **Total per account** | **~5 min** | **~15 min** | Including delays |

### 📈 Scaling Example

**Goal: Tag 10,000 users in one day**

| Setup | Accounts Needed | Comments Needed | Est. Time |
|-------|-----------------|-----------------|-----------|
| 10 tags/comment | 167 accounts | ~1,000 comments | ~28 hrs |
| 12 tags/comment | 139 accounts | ~834 comments | ~23 hrs |

**Goal: Tag 30,000 users in one day**

| Setup | Accounts Needed | Comments Needed | Est. Time |
|-------|-----------------|-----------------|-----------|
| 10 tags/comment | 500 accounts | ~3,000 comments | ~83 hrs |
| 12 tags/comment | 417 accounts | ~2,500 comments | ~69 hrs |

> ⚠️ **Note**: Running multiple instances in parallel can reduce time significantly. For example, running 3 instances can process 3x faster.

---

## ⚠️ Safety Rules Implemented

| Rule | Implementation |
|------|----------------|
| Comment delay | Random 35-120 seconds |
| Account delay | Random 5-20 seconds |
| Long pause | 10-20 min after every 50 comments |
| Session limit | 5-15 minutes per account |
| Typing speed | Random delays between keystrokes |
| Scrolling | Random scroll before commenting |
| User agents | Different per account |
| Blocked detection | Auto-skip blocked accounts |
| Checkpoint detection | Auto-skip checkpoint accounts |

---

## 🛡️ Best Practices

1. **Warm up accounts** - Use manual login first for new accounts
2. **Use quality proxies** - Residential proxies work best
3. **Don't rush** - Let the safety delays do their job
4. **Monitor logs** - Check for blocked/checkpoint accounts
5. **Rotate proxies** - Don't use same proxy for too many accounts
6. **Limit daily usage** - Don't exceed 60 tags per account per day
7. **Test with small batch** - Start with 10-20 accounts before scaling to 500+

---

## 🔧 Troubleshooting

### "Action Blocked" Errors
- Account may be flagged, let it rest for 24-48 hours
- Try using a different proxy
- Use manual login to verify the account

### Checkpoint Required
- Run manual login script
- Complete verification manually
- Cookies will be saved for next run

### Login Failures
- Verify credentials in accounts.json
- Check if proxy is working
- Account may be disabled/locked

### Proxy Connection Issues
- Run `npm run proxy-check` to test proxies
- Verify proxy credentials are correct
- Check if proxy supports HTTP/SOCKS5
- Try with a different proxy provider

---

## 📌 Important Notes

- Instagram may block automated behavior; use this tool responsibly.
- Avoid exceeding safe daily comment limits (e.g., ~100-150 comments/day/account).
- Recommended: 3-5 accounts per proxy.
- Instagram policy changes will not be considered the tool's fault.
- Always test with a small batch before running large-scale operations.

---

## 📄 License

This tool is proprietary and built for authorized users only. Redistribution is prohibited without permission.

---

## 🧑‍💻 Author

**Diksha**  
Developer & Automation Specialist  
📍 Delhi, India

