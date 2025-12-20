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
├── logs/
│   ├── mention_logs.csv      # Detailed log of all comments
│   └── session_summary.json  # Session statistics
├── utils/
│   ├── delay.js              # Delay utilities (random, comment, account delays)
│   ├── humanBehavior.js      # Human-like behavior simulation
│   ├── logger.js             # Logging and statistics tracking
│   ├── parseExcel.js         # Excel parsing and batching
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

### 2. Create `.env` File

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
      "password": "password1",
      "proxy": {
        "protocol": "http",
        "address": "142.111.48.253",
        "port": 7030,
        "username": "proxyuser",
        "password": "proxypass"
      }
    },
    {
      "username": "account2",
      "password": "password2"
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

#### Proxy Assignment
- If an account has its own `proxy` object, it uses that proxy
- Otherwise, proxies rotate from the `proxies` array

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

### Mention Logs (`logs/mention_logs.csv`)
Detailed CSV log of every comment attempt:
- Timestamp
- Account username
- Proxy used
- Status (Success/Failed/Blocked/Checkpoint)
- Comment content
- Tags count
- Error message

### Session Summary (`logs/session_summary.json`)
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

