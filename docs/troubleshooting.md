# Troubleshooting Guide

## Common Issues & Solutions

### Action Blocked Errors

**Symptoms:**
- "Action Blocked" messages
- Comments not posting
- Account temporarily restricted

**Solutions:**
1. **Increase delays**: Extend time between comments (60-120 seconds)
2. **Reduce batch size**: Lower `accountsPerBatch` to 50-75
3. **Change proxies**: Switch to different IP addresses
4. **Account rest**: Let account sit idle for 24-48 hours
5. **Manual verification**: Use manual login to confirm account status

### Checkpoint Required

**Symptoms:**
- "Checkpoint Required" notifications
- Login verification prompts
- Security challenge screens

**Solutions:**
1. **Manual login**: Run `node manual-login/manual-login.js`
2. **Complete verification**: Handle CAPTCHA/security questions manually
3. **Save cookies**: Let tool save session cookies
4. **Retry automation**: Run main script after verification

### Login Failures

**Symptoms:**
- Authentication failed
- Invalid credentials error
- Account disabled messages

**Solutions:**
1. **Verify credentials**: Double-check username/password in `accounts.json`
2. **Test proxy**: Run `npm run proxy-check` to verify proxy works
3. **Account status**: Confirm account isn't locked/disabled
4. **Reset password**: May need password change if suspicious activity
5. **Use manual login**: Test login manually first

### Proxy Connection Issues

**Symptoms:**
- Proxy connection failed
- Timeout errors
- Network unreachable

**Solutions:**
1. **Test proxies**: Run `npm run proxy-check`
2. **Verify credentials**: Ensure proxy username/password correct
3. **Check protocol**: Confirm HTTP/SOCKS5 compatibility
4. **Different provider**: Try alternative proxy service
5. **Firewall check**: Ensure outbound connections allowed

### Performance Issues

**Symptoms:**
- Slow operation
- High memory usage
- Browser crashes

**Solutions:**
1. **Reduce concurrency**: Lower `accountsPerBatch`
2. **Increase system resources**: More RAM/CPU recommended
3. **Close other applications**: Free up system resources
4. **Update dependencies**: `npm update` for latest versions

## Diagnostic Commands

### Check System Status
```bash
# View running processes
ps aux | grep -E "(electron|node|puppeteer)"

# Check memory usage
top -p $(pgrep -f "electron\|node")

# View logs
tail -f logs/$(date +%Y-%m-%d)/mention_logs.csv
```

### Validate Configuration
```bash
# Test proxy connectivity
npm run proxy-check

# Verify account credentials (manual test)
node manual-login/manual-login.js

# Check tag tracker status
npm run tracker:stats
```

### Clear Cache/Data
```bash
# Clear browser cache
rm -rf ~/.cache/puppeteer

# Reset tag tracker
npm run tracker:reset

# Clear logs (optional)
rm -rf logs/*
```

## Error Codes Reference

| Code | Error | Solution |
|------|-------|----------|
| 1001 | Proxy connection failed | Check proxy settings |
| 1002 | Login failed | Verify credentials |
| 1003 | Action blocked | Increase delays |
| 1004 | Checkpoint required | Manual verification |
| 1005 | Session timeout | Check network/proxy |
| 1006 | Invalid config | Validate accounts.json |

## Log Analysis

### Reading Mention Logs
```csv
Timestamp,Account,Proxy,Status,Comment,Tags Count,Error
2024-12-20T10:30:00Z,account1,proxy1:8080,Success,"@user1 @user2 ...",12,
2024-12-20T10:32:15Z,account2,proxy2:8080,Failed,,0,"Action Blocked"
```

### Session Summary Analysis
```json
{
  "startTime": "2024-12-20T10:00:00Z",
  "endTime": "2024-12-20T14:30:00Z",
  "accountsProcessed": 150,
  "totalComments": 750,
  "successfulComments": 720,
  "failedComments": 30,
  "successRate": 96,
  "blockedAccounts": 3
}
```

## Recovery Procedures

### After System Crash
1. **Check logs**: Review last successful operations
2. **Reset tag tracker**: `npm run tracker:reset` if data corrupted
3. **Resume from last batch**: Modify config to skip completed accounts
4. **Verify accounts**: Test login for affected accounts

### After Account Bans
1. **Identify banned accounts**: Check logs for patterns
2. **Remove from config**: Delete banned accounts from `accounts.json`
3. **Appeal if possible**: Contact Instagram support
4. **Create new accounts**: Replace with fresh accounts (if allowed)

### Data Recovery
```bash
# Backup important files
cp accounts.json accounts.json.backup
cp data/usernames.xlsx data/usernames.xlsx.backup

# Export tag tracker data
npm run tracker:export > tag-tracker-backup.json

# Clear corrupted data
npm run tracker:reset
```

## Preventive Maintenance

### Regular Checks
- **Weekly proxy testing**: `npm run proxy-check`
- **Daily account verification**: Manual login check
- **Monthly statistics review**: Analyze success rates
- **Update dependencies**: `npm update` quarterly

### System Optimization
- **Use SSD storage**: Faster file operations
- **Increase RAM**: Minimum 8GB recommended
- **Stable internet**: Wired connection preferred
- **Background processes**: Minimize other applications

## Getting Help

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm start

# View detailed browser logs
npm run electron:dev
```

### Support Information
When reporting issues, include:
- Error messages/logs
- Configuration (redacted)
- System information
- Steps to reproduce
- Recent changes made

### Community Resources
- Check existing issues on GitHub
- Review documentation
- Test with minimal configuration
- Isolate variables (test one account, one proxy)</content>
<parameter name="filePath">docs/troubleshooting.md