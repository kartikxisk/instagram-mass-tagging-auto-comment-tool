/**
 * Instagram-specific Fingerprint Generator
 * Mimics real Instagram browser headers and identifiers
 * Based on actual Instagram API request analysis
 */

const crypto = require('crypto');

// Real Instagram App ID (public, don't change)
const IG_APP_ID = '936619743392459';

// Chrome versions to use (recent versions)
const CHROME_VERSIONS = ['128', '129', '130', '131', '132', '133', '134'];

// Platform configurations
const PLATFORMS = {
  macos: {
    platform: 'macOS',
    platformVersion: ['14.0.0', '14.1.0', '14.2.0', '14.4.0', '15.0.0', '15.1.0'],
    userAgentPlatform: 'Macintosh; Intel Mac OS X 10_15_7',
    secChPlatform: '"macOS"',
  },
  windows: {
    platform: 'Windows',
    platformVersion: ['10.0.0', '11.0.0', '15.0.0'],
    userAgentPlatform: 'Windows NT 10.0; Win64; x64',
    secChPlatform: '"Windows"',
  },
  linux: {
    platform: 'Linux',
    platformVersion: ['6.0.0', '6.1.0', '6.2.0'],
    userAgentPlatform: 'X11; Linux x86_64',
    secChPlatform: '"Linux"',
  }
};

/**
 * Seeded random number generator for consistent values per account
 */
function seededRandom(seed, index = 0) {
  const hash = crypto.createHash('sha256').update(`${seed}_${index}`).digest('hex');
  return parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
}

/**
 * Generate a consistent device ID (ig_did) for an account
 * Format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
function generateDeviceId(accountUsername) {
  const hash = crypto.createHash('sha256').update(`device_${accountUsername}_v2`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`.toUpperCase();
}

/**
 * Generate machine ID (mid) - consistent per account
 * Base64-like string, ~27 chars
 */
function generateMachineId(accountUsername) {
  const hash = crypto.createHash('sha256').update(`mid_${accountUsername}_v2`).digest('hex');
  return Buffer.from(hash.slice(0, 20), 'hex').toString('base64').replace(/=/g, '').replace(/\+/g, 'A').replace(/\//g, 'B');
}

/**
 * Generate datr cookie (browser fingerprint)
 */
function generateDatr(accountUsername) {
  const hash = crypto.createHash('sha256').update(`datr_${accountUsername}_v2`).digest('hex');
  return hash.slice(0, 24);
}

/**
 * Generate web session ID format: xxxxx:xxxxxx:xxxxxx
 */
function generateWebSessionId(accountUsername, sessionSalt = null) {
  const salt = sessionSalt || Date.now().toString();
  const hash = crypto.createHash('sha256').update(`session_${accountUsername}_${salt}`).digest('hex');
  return `${hash.slice(0, 6)}:${hash.slice(6, 12)}:${hash.slice(12, 18)}`;
}

/**
 * Generate ASBD ID (A/B testing identifier) - 6 digit number
 */
function generateAsbdId(accountUsername) {
  const hash = crypto.createHash('sha256').update(`asbd_${accountUsername}_v2`).digest('hex');
  return String(parseInt(hash.slice(0, 6), 16) % 900000 + 100000);
}

/**
 * Generate CSRF token format
 */
function generateCsrfToken(accountUsername) {
  const hash = crypto.createHash('sha256').update(`csrf_${accountUsername}_${Date.now()}`).digest('hex');
  return hash.slice(0, 32);
}

/**
 * Get platform configuration based on account username (consistent)
 */
function getPlatformForAccount(accountUsername) {
  const platforms = Object.keys(PLATFORMS);
  const index = Math.floor(seededRandom(accountUsername, 100) * platforms.length);
  return platforms[index];
}

/**
 * Get Chrome version for account (consistent)
 */
function getChromeVersionForAccount(accountUsername) {
  const index = Math.floor(seededRandom(accountUsername, 200) * CHROME_VERSIONS.length);
  return CHROME_VERSIONS[index];
}

/**
 * Get platform version for account (consistent)
 */
function getPlatformVersionForAccount(accountUsername, platformKey) {
  const versions = PLATFORMS[platformKey].platformVersion;
  const index = Math.floor(seededRandom(accountUsername, 300) * versions.length);
  return versions[index];
}

/**
 * Generate Client Hints headers matching the fingerprint
 */
function generateClientHints(chromeVersion, platformKey, platformVersion) {
  const platform = PLATFORMS[platformKey];
  
  return {
    'sec-ch-ua': `"Not(A:Brand";v="8", "Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`,
    'sec-ch-ua-full-version-list': `"Not(A:Brand";v="8.0.0.0", "Chromium";v="${chromeVersion}.0.0.0", "Google Chrome";v="${chromeVersion}.0.0.0"`,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-model': '""',
    'sec-ch-ua-platform': platform.secChPlatform,
    'sec-ch-ua-platform-version': `"${platformVersion}"`,
    'sec-ch-prefers-color-scheme': seededRandom(chromeVersion) > 0.5 ? 'dark' : 'light',
  };
}

/**
 * Generate user agent string matching the fingerprint
 */
function generateUserAgent(chromeVersion, platformKey) {
  const platform = PLATFORMS[platformKey];
  return `Mozilla/5.0 (${platform.userAgentPlatform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
}

/**
 * Generate complete Instagram fingerprint for an account
 * All values are consistent for the same username
 */
function generateInstagramFingerprint(accountUsername) {
  const platformKey = getPlatformForAccount(accountUsername);
  const chromeVersion = getChromeVersionForAccount(accountUsername);
  const platformVersion = getPlatformVersionForAccount(accountUsername, platformKey);
  
  return {
    // Device identifiers (persistent)
    deviceId: generateDeviceId(accountUsername),
    machineId: generateMachineId(accountUsername),
    datr: generateDatr(accountUsername),
    
    // Session identifiers
    asbdId: generateAsbdId(accountUsername),
    webSessionId: generateWebSessionId(accountUsername),
    
    // Instagram constants
    appId: IG_APP_ID,
    
    // Browser info
    chromeVersion,
    platformKey,
    platformVersion,
    userAgent: generateUserAgent(chromeVersion, platformKey),
    clientHints: generateClientHints(chromeVersion, platformKey, platformVersion),
    
    // Accept headers
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br, zstd',
    accept: '*/*',
  };
}

/**
 * Get Instagram-specific request headers
 */
function getInstagramRequestHeaders(fingerprint, csrfToken = null) {
  return {
    'accept': fingerprint.accept,
    'accept-encoding': fingerprint.acceptEncoding,
    'accept-language': fingerprint.acceptLanguage,
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-asbd-id': fingerprint.asbdId,
    'x-ig-app-id': fingerprint.appId,
    'x-ig-www-claim': '0', // Will be set by Instagram after login
    'x-requested-with': 'XMLHttpRequest',
    'x-web-session-id': fingerprint.webSessionId,
    ...(csrfToken ? { 'x-csrftoken': csrfToken } : {}),
    ...fingerprint.clientHints,
  };
}

/**
 * Apply Instagram fingerprint to a Puppeteer page
 */
async function applyInstagramFingerprint(page, accountUsername) {
  const fingerprint = generateInstagramFingerprint(accountUsername);
  
  console.log(`🔐 Applying Instagram fingerprint for ${accountUsername}:`);
  console.log(`   Platform: ${fingerprint.platformKey} (Chrome ${fingerprint.chromeVersion})`);
  console.log(`   Device ID: ${fingerprint.deviceId.substring(0, 8)}...`);
  
  // Set user agent FIRST
  await page.setUserAgent(fingerprint.userAgent);
  
  // Set extra HTTP headers for all requests
  await page.setExtraHTTPHeaders({
    'Accept-Language': fingerprint.acceptLanguage,
    ...fingerprint.clientHints,
  });
  
  // Inject fingerprint data and override browser APIs
  await page.evaluateOnNewDocument((fp) => {
    // Store fingerprint for reference
    window.__igFingerprint = fp;
    
    // Override navigator.userAgentData for Client Hints API
    if ('userAgentData' in navigator) {
      const originalUserAgentData = navigator.userAgentData;
      
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({
          brands: [
            { brand: 'Not(A:Brand', version: '8' },
            { brand: 'Chromium', version: fp.chromeVersion },
            { brand: 'Google Chrome', version: fp.chromeVersion },
          ],
          mobile: false,
          platform: fp.platformKey === 'macos' ? 'macOS' : fp.platformKey === 'windows' ? 'Windows' : 'Linux',
          getHighEntropyValues: async (hints) => {
            return {
              architecture: fp.platformKey === 'macos' ? 'arm' : 'x86',
              bitness: '64',
              brands: [
                { brand: 'Not(A:Brand', version: '8' },
                { brand: 'Chromium', version: fp.chromeVersion },
                { brand: 'Google Chrome', version: fp.chromeVersion },
              ],
              fullVersionList: [
                { brand: 'Not(A:Brand', version: '8.0.0.0' },
                { brand: 'Chromium', version: `${fp.chromeVersion}.0.0.0` },
                { brand: 'Google Chrome', version: `${fp.chromeVersion}.0.0.0` },
              ],
              mobile: false,
              model: '',
              platform: fp.platformKey === 'macos' ? 'macOS' : fp.platformKey === 'windows' ? 'Windows' : 'Linux',
              platformVersion: fp.platformVersion,
              uaFullVersion: `${fp.chromeVersion}.0.0.0`,
              wow64: false,
            };
          },
          toJSON: () => ({
            brands: [
              { brand: 'Not(A:Brand', version: '8' },
              { brand: 'Chromium', version: fp.chromeVersion },
              { brand: 'Google Chrome', version: fp.chromeVersion },
            ],
            mobile: false,
            platform: fp.platformKey === 'macos' ? 'macOS' : fp.platformKey === 'windows' ? 'Windows' : 'Linux',
          }),
        }),
        configurable: true,
      });
    }
    
    // Override the fetch function to add Instagram headers
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
      const urlStr = typeof url === 'string' ? url : url.url;
      
      // Add Instagram headers for API requests
      if (urlStr.includes('instagram.com/api/') || 
          urlStr.includes('instagram.com/graphql/') ||
          urlStr.includes('graph.instagram.com')) {
        
        options.headers = options.headers || {};
        
        // Add Instagram-specific headers
        options.headers['x-asbd-id'] = fp.asbdId;
        options.headers['x-ig-app-id'] = fp.appId;
        options.headers['x-requested-with'] = 'XMLHttpRequest';
        options.headers['x-web-session-id'] = fp.webSessionId;
        
        // Add CSRF token if available from cookies
        const csrfCookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
        if (csrfCookie) {
          options.headers['x-csrftoken'] = csrfCookie.split('=')[1];
        }
      }
      
      return originalFetch.call(this, url, options);
    };
    
    // Override XMLHttpRequest to add Instagram headers
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this.__url = url;
      return originalXHROpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
      const url = this.__url || '';
      
      if (url.includes('instagram.com/api/') || 
          url.includes('instagram.com/graphql/') ||
          url.includes('graph.instagram.com')) {
        
        this.setRequestHeader('x-asbd-id', fp.asbdId);
        this.setRequestHeader('x-ig-app-id', fp.appId);
        this.setRequestHeader('x-requested-with', 'XMLHttpRequest');
        this.setRequestHeader('x-web-session-id', fp.webSessionId);
        
        const csrfCookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
        if (csrfCookie) {
          this.setRequestHeader('x-csrftoken', csrfCookie.split('=')[1]);
        }
      }
      
      return originalXHRSend.call(this, body);
    };
    
  }, fingerprint);
  
  // Set initial cookies for device identification
  const cookies = [
    {
      name: 'ig_did',
      value: fingerprint.deviceId,
      domain: '.instagram.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'mid',
      value: fingerprint.machineId,
      domain: '.instagram.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'datr',
      value: fingerprint.datr,
      domain: '.instagram.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'ig_nrcb',
      value: '1',
      domain: '.instagram.com',
      path: '/',
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'ps_l',
      value: '1',
      domain: '.instagram.com',
      path: '/',
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'ps_n',
      value: '1',
      domain: '.instagram.com',
      path: '/',
      secure: true,
      sameSite: 'None',
    },
  ];
  
  // Navigate to Instagram first to set cookies on the correct domain
  try {
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    // Ignore navigation errors, we just need the page context
  }
  
  // Set cookies
  await page.setCookie(...cookies);
  
  return fingerprint;
}

/**
 * Update web session ID (call this periodically during long sessions)
 */
function refreshWebSessionId(fingerprint) {
  fingerprint.webSessionId = generateWebSessionId(fingerprint.deviceId, Date.now().toString());
  return fingerprint;
}

module.exports = {
  generateInstagramFingerprint,
  applyInstagramFingerprint,
  getInstagramRequestHeaders,
  generateDeviceId,
  generateMachineId,
  generateDatr,
  generateWebSessionId,
  generateAsbdId,
  generateCsrfToken,
  refreshWebSessionId,
  IG_APP_ID,
};
