# Proxy Setup Guide

## Understanding Proxy Types

### HTTP Proxies
- Most common type
- Support authentication
- Work with most websites including Instagram

### SOCKS5 Proxies
- More advanced protocol
- Better performance
- Full TCP support

### Residential vs. Datacenter
- **Residential**: Real IP addresses from ISPs (recommended)
- **Datacenter**: Server-based IPs (cheaper but more detectable)

## Recommended Proxy Providers

### Top Providers for Instagram Automation
1. **Bright Data** (formerly Luminati) - Premium residential
2. **Oxylabs** - High-quality residential proxies
3. **Smart Proxy** - Affordable residential option
4. **ProxyRack** - Rotating residential proxies

## Configuration Examples

### Single Proxy per Account
```json
{
  "username": "account1",
  "password": "pass1",
  "proxy": {
    "protocol": "http",
    "address": "192.168.1.100",
    "port": 8080,
    "username": "proxyuser",
    "password": "proxypass"
  }
}
```

### Multiple Proxies (Rotating)
```json
{
  "username": "account1",
  "password": "pass1",
  "proxies": [
    {
      "protocol": "http",
      "address": "proxy1.example.com",
      "port": 8080,
      "username": "user1",
      "password": "pass1"
    },
    {
      "protocol": "http",
      "address": "proxy2.example.com",
      "port": 8080,
      "username": "user2",
      "password": "pass2"
    }
  ]
}
```

### Global Proxy Pool
```json
{
  "proxies": [
    {
      "protocol": "http",
      "address": "142.111.48.253",
      "port": 7030,
      "username": "globaluser",
      "password": "globalpass"
    }
  ]
}
```

## Proxy Testing

### Built-in Proxy Checker
```bash
npm run proxy-check
```

This will:
- Test each configured proxy
- Save results to `logs/YYYY-MM-DD/proxy_check_log.csv`
- Show success/failure status

### Manual Testing
```bash
curl --proxy http://user:pass@proxy:port https://httpbin.org/ip
```

## Best Practices

### Proxy Rotation Strategy
- Use 1 proxy per 3-5 accounts maximum
- Rotate proxies every few hours
- Monitor proxy performance and blacklist slow/failed ones

### Quality Requirements
- Response time < 2 seconds
- Success rate > 95%
- No IP blocks or restrictions
- Residential IPs preferred

### Cost Optimization
- Buy in bulk for discounts
- Use rotating proxies to reduce costs
- Monitor usage to avoid overages

## Troubleshooting Proxy Issues

### Connection Failed
- Verify credentials
- Check proxy IP/port
- Test with different proxy
- Ensure protocol compatibility

### Authentication Errors
- Double-check username/password
- Some proxies require domain in username

### Slow Performance
- Try different proxy provider
- Use SOCKS5 instead of HTTP
- Check network connectivity

### Instagram Blocks
- Proxies may be flagged
- Switch to fresh residential proxies
- Reduce account density per proxy</content>
<parameter name="filePath">docs/proxy-setup.md