# 🚀 Instagram Mass Tagging Automation Tool

A powerful Node.js automation using Puppeteer that logs into multiple Instagram accounts and posts comments containing user tags on a specific reel/post. The automation respects Instagram safety limits to avoid action blocks, shadowban, or account bans.

---

## 📆 Features

### Core Features
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

---

## 📁 Folder Structure

```
instagram-mass-tagger/
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
│   ├── humanBehavior.js      # Human-like behavior simulation
│   ├── logger.js             # Logging and statistics tracking
│   ├── parseExcel.js         # Excel parsing and batching
│   ├── proxyChecker.js       # Proxy validation utility
│   ├── proxySetup.js         # Proxy configuration
│   ├── sessionManager.js     # Cookie/session management
│   ├── tagDistribution.js    # Tag distribution logic
│   └── userAgents.js         # Random user agent generator
├── main.js                   # Original simple automation
├── massTag.js               # 🆕 Mass tagging automation (main script)
├── .env                      # Environment config
├── .env.example              # Example environment config
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

### 3. Create `.env` File

Copy `.env.example` to `.env` and configure:

```ini
# Target Instagram Post/Reel URL
POST_URL=https://www.instagram.com/reel/YOUR_REEL_ID/

# Instagram Login URL (usually don't change)
INSTAGRAM_LOGIN_URL=https://www.instagram.com/accounts/login/

# Debug mode
DEBUG=false
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
    "tagsPerAccount": 60,
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

---

## � Available Scripts

| Command | Description |
|---------|-------------|
| `npm run mass-tag` | 🚀 Run mass tagging automation (recommended) |
| `npm start` | Run simple/original automation |
| `npm run proxy-check` | ✅ Test all proxies before running |
| `npm run browser` | Install Puppeteer Chrome browser |
| `npm run fix` | Run fix script for common issues |

---

## �📝 Preparing the Excel File

Your file should be `data/usernames.xlsx` with these columns:

| Username     | Is Mentionable |
|--------------|----------------|
| user1        | TRUE           |
| user2        | TRUE           |
| spammy_user  | FALSE          |

> Only users with `Is Mentionable = TRUE` will be tagged.

---

## ▶️ Running the Tool

### Mass Tagging Automation (Recommended)

```bash
npm run mass-tag
# or
node massTag.js
```

This runs the full-featured mass tagging automation with:
- Batch processing (100 accounts per batch)
- Safety delays and long pauses
- Human behavior simulation
- Comprehensive logging

### Simple Mode (Original)

```bash
npm start
# or
node main.js
```

### Check Proxies

```bash
npm run proxy-check
# or
node utils/proxyChecker.js
```

Verify all your proxies are working before running the main script:
- Tests each proxy from `proxies` array and individual account proxies
- Shows ✅ Success or ❌ Failed for each proxy
- Saves results to date-wise folder: `logs/YYYY-MM-DD/proxy_check_log.csv`

---

## 🔐 Manual Login (First Time or Challenge)

If Instagram prompts for checkpoint/challenge:

```bash
node manual-login/manual-login.js
```

1. Browser opens for each account
2. Manually complete login/verification
3. Cookies are saved automatically

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

---
3. If prompted, complete any checkpoint/challenge.
4. Timeout per login session is configurable via `.env` (`ACCOUNT_VERIFICATION_TIME`).
5. After login, cookies are auto-saved to `cookies/`.
6. These cookies will be reused in future runs.

---

## 🌐 Proxy Check (Optional)

To verify if your proxies are working before running the tool:

```bash
node utils/proxyChecker.js
```

- This will test each proxy from your `accounts.json`.
- Console output will indicate valid and failed proxies.
- Useful before large-scale operations to prevent account bans.

---

## 📌 Notes

- Instagram may block automated behavior; use this tool responsibly.
- Avoid exceeding safe daily comment limits (e.g., ~100-150 comments/day/account).
- Recommended: 3-5 accounts per proxy.
- instragram policy changes will not be considered tools fault

---

## 📄 License

This tool is proprietary and built for [Client Name/Yogesh]. Redistribution is prohibited without permission.

---

## 🧑‍💻 Author

**Tanishk Dhaka**  
Developer & Automation Specialist  
📍 Delhi, India

