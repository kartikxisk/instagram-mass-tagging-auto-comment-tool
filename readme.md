# 🚀 Instagram Comment Automation Tool

This tool automates Instagram comments using multiple accounts, with support for proxy handling, account rotation, session reuse via cookies, and controlled tagging of usernames from an Excel sheet.

---

## 📆 Features

- Automated comment posting on a target Instagram post.
- Tags multiple usernames per comment from an Excel file.
- Respects Instagram limits with randomized human-like delays.
- Supports proxy authentication (username/password).
- Account rotation and concurrency control.
- Logs all activity to a CSV file with status and error tracking.
- Uses cookies for faster login (avoids repeated credential login).

---

## 📁 Folder Structure

```
insta-comment-automation/
├── config/
│   └── accounts.json         # Instagram accounts with optional proxy info
├── data/
│   └── usernames.xlsx        # Excel file with mentionable usernames
├── cookies/
│   └── account1.json         # Session cookies per account
├── logs/
│   └── mention_logs.csv      # CSV log of all comments posted
├── manual-login/
│   └── manual-login.js       # Manual login utility
├── utils/
│   ├── parseExcel.js         # Excel parsing and batching logic
│   ├── sessionManager.js     # Cookie-based session handling
│   ├── delay.js              # Random delay utility
│   ├── logger.js             # Logs status to CSV
│   └── proxyChecker.js       # Validates proxy before using
├── main.js                   # Main control logic (entry point)
├── .env                      # Environment config (POST URL etc.)
├── .gitignore
├── package.json
└── README.md
```

---

## 🛠️ Setup

### 1. Download Project Files

- Download the ZIP 
- Extract it to your desired location.

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env` File

```ini
POST_URL=https://www.instagram.com/p/xyz123/
PARALLEL_ACCOUNTS=3
ACCOUNT_BATCH_SIZE=5
```

> Use `.env.example` as a reference.

### 4. Add Your Accounts

In `config/accounts.json`:

```json
[
  {
    "username": "your_instagram_username",
    "password": "your_password",
    "proxy": {
      "address": "127.0.0.1",
      "port": "8080",
      "username": "proxy_user",
      "password": "proxy_pass"
    }
  }
]
```

You can omit the `"proxy"` block if not using a proxy.

---

## 📝 Preparing the Excel File
Your file name should be `usernames.xlsx` in data folder
Your Excel (`usernames.xlsx`) should have the following columns:

| Username     | Is Mentionable |
|--------------|----------------|
| user1        | TRUE           |
| user2        | TRUE           |
| spammy_user  | FALSE          |

> Only users with `Is Mentionable = TRUE` will be tagged.

---

## ▶️ Running the Tool

```bash
node main.js
```

It will:

- Load accounts and usernames.
- Open browser sessions with proxy.
- Rotate accounts and comment batches.
- Tag usernames from Excel on the target post.
- Log all activity to `logs/mention_logs.csv`.

---

## 🔐 Manual Login (First Time or To Avoid Challenges)

If Instagram prompts for checkpoint/challenge or cookie sessions are missing:

```bash
node manual-login/manual-login.js
```

1. The browser will open for each account one by one.
2. Manually log in to each account.
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

