/**
 * Renderer Process - Frontend JavaScript
 * Handles UI interactions and communicates with main process
 */

// ============================================
// State Management
// ============================================

const state = {
  config: null,
  isRunning: false,
  autoScroll: true,
  excelFilePath: null
};

// ============================================
// DOM Elements
// ============================================

const elements = {
  // Controls
  btnStart: document.getElementById('btn-start'),
  btnStop: document.getElementById('btn-stop'),
  targetPost: document.getElementById('target-post'),
  excelFilePath: document.getElementById('excel-file-path'),
  btnSelectExcel: document.getElementById('btn-select-excel'),
  
  // Stats
  statAccounts: document.getElementById('stat-accounts'),
  statComments: document.getElementById('stat-comments'),
  
  // Status
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
  
  // Quick Actions
  btnCheckProxies: document.getElementById('btn-check-proxies'),
  btnOpenLogs: document.getElementById('btn-open-logs'),
  
  // Tag Tracker Stats
  trackerTotalTagged: document.getElementById('tracker-total-tagged'),
  trackerSuccessRate: document.getElementById('tracker-success-rate'),
  
  // Tag Tracker Actions
  btnRefreshTracker: document.getElementById('btn-refresh-tracker'),
  btnResetTracker: document.getElementById('btn-reset-tracker'),
  
  // Logs
  logsContainer: document.getElementById('logs-container'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  autoScrollCheckbox: document.getElementById('auto-scroll'),
  
  // Accounts
  accountsList: document.getElementById('accounts-list'),
  accountsCount: document.getElementById('accounts-count'),
  btnImportAccounts: document.getElementById('btn-import-accounts'),
  btnExportAccounts: document.getElementById('btn-export-accounts'),
  btnImportSessions: document.getElementById('btn-import-sessions'),
  btnExportSessions: document.getElementById('btn-export-sessions'),
  btnAddAccount: document.getElementById('btn-add-account'),
  
  // Proxies
  proxiesList: document.getElementById('proxies-list'),
  proxiesCount: document.getElementById('proxies-count'),
  btnTestAllProxies: document.getElementById('btn-test-all-proxies'),
  btnImportProxies: document.getElementById('btn-import-proxies'),
  btnExportProxies: document.getElementById('btn-export-proxies'),
  btnAddProxy: document.getElementById('btn-add-proxy'),
  
  // Settings
  settingParallelAccounts: document.getElementById('setting-parallel-accounts'),
  settingBatchSize: document.getElementById('setting-batch-size'),
  settingTagsPerAccount: document.getElementById('setting-tags-per-account'),
  settingTagsMin: document.getElementById('setting-tags-min'),
  settingTagsMax: document.getElementById('setting-tags-max'),
  settingCommentsMin: document.getElementById('setting-comments-min'),
  settingCommentsMax: document.getElementById('setting-comments-max'),
  settingPauseAfter: document.getElementById('setting-pause-after'),
  settingHeadless: document.getElementById('setting-headless'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnResetSettings: document.getElementById('btn-reset-settings'),
  
  // Modals
  modalAddAccount: document.getElementById('modal-add-account'),
  modalAddProxy: document.getElementById('modal-add-proxy'),
  
  // Version
  versionBadge: document.getElementById('version-badge')
};

// ============================================
// Initialization
// ============================================

async function init() {
  // Load config
  await loadConfig();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup IPC listeners
  setupIPCListeners();
  
  // Load app version
  loadAppVersion();
  
  // Update UI
  updateUI();
  
  // Load tag stats
  updateTagStats();
  
  log('info', 'Application initialized. Ready to start automation.');
}

// ============================================
// Config Management
// ============================================

async function loadConfig() {
  const result = await window.electronAPI.loadConfig();
  
  if (result.success) {
    state.config = result.config;
    log('success', `Loaded configuration: ${state.config.accounts?.length || 0} accounts, ${state.config.proxies?.length || 0} proxies`);
  } else {
    log('error', `Failed to load config: ${result.error}`);
    state.config = {
      accounts: [],
      proxies: [],
      targetPost: '',
      settings: {
        accountsPerBatch: 100,
        tagsPerAccount: 60,
        tagsPerComment: { min: 10, max: 12 },
        commentsPerAccount: { min: 5, max: 7 },
        pauseAfterComments: 50
      }
    };
  }
}

async function saveConfig() {
  // Update config from UI
  state.config.targetPost = elements.targetPost.value;
  state.config.settings = {
    parallelAccounts: parseInt(elements.settingParallelAccounts.value),
    accountsPerBatch: parseInt(elements.settingBatchSize.value),
    tagsPerAccount: parseInt(elements.settingTagsPerAccount.value),
    tagsPerComment: {
      min: parseInt(elements.settingTagsMin.value),
      max: parseInt(elements.settingTagsMax.value)
    },
    commentsPerAccount: {
      min: parseInt(elements.settingCommentsMin.value),
      max: parseInt(elements.settingCommentsMax.value)
    },
    pauseAfterComments: parseInt(elements.settingPauseAfter.value)
  };
  
  const result = await window.electronAPI.saveConfig(state.config);
  
  if (result.success) {
    log('success', 'Configuration saved successfully');
  } else {
    log('error', `Failed to save config: ${result.error}`);
  }
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Start/Stop
  elements.btnStart.addEventListener('click', startAutomation);
  elements.btnStop.addEventListener('click', stopAutomation);
  
  // Excel file selection
  elements.btnSelectExcel.addEventListener('click', selectExcelFile);
  elements.excelFilePath.addEventListener('click', selectExcelFile);
  
  // Quick actions
  elements.btnCheckProxies.addEventListener('click', checkProxies);
  elements.btnOpenLogs.addEventListener('click', openLogsFolder);
  
  // Tag Tracker Actions
  elements.btnRefreshTracker.addEventListener('click', refreshTrackerStats);
  elements.btnResetTracker.addEventListener('click', resetTrackerConfirm);
  
  // Help icons
  document.querySelectorAll('.help-icon').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showHelp(btn.dataset.help);
    });
  });
  
  // Logs
  elements.btnClearLogs.addEventListener('click', clearLogs);
  elements.autoScrollCheckbox.addEventListener('change', (e) => {
    state.autoScroll = e.target.checked;
  });
  
  // Accounts
  elements.btnImportAccounts.addEventListener('click', importAccounts);
  elements.btnExportAccounts.addEventListener('click', exportAccounts);
  elements.btnImportSessions.addEventListener('click', importSessions);
  elements.btnExportSessions.addEventListener('click', exportSessions);
  elements.btnAddAccount.addEventListener('click', () => showModal('modal-add-account'));
  document.getElementById('btn-confirm-add-account').addEventListener('click', addAccount);
  
  // Manual Login
  document.getElementById('btn-open-login-browser').addEventListener('click', startManualLogin);
  
  // Proxies
  elements.btnTestAllProxies.addEventListener('click', checkProxies);
  elements.btnImportProxies.addEventListener('click', importProxies);
  elements.btnExportProxies.addEventListener('click', exportProxies);
  elements.btnAddProxy.addEventListener('click', () => showModal('modal-add-proxy'));
  document.getElementById('btn-confirm-add-proxy').addEventListener('click', addProxy);
  
  // Settings
  elements.btnSaveSettings.addEventListener('click', saveConfig);
  elements.btnResetSettings.addEventListener('click', resetSettings);
  
  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });
  
  // Close modal on background click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });
}

// ============================================
// IPC Listeners
// ============================================

function setupIPCListeners() {
  window.electronAPI.onAutomationLog((data) => {
    log(data.type, data.message, data.username || null);
  });
  
  window.electronAPI.onAutomationStats((data) => {
    updateStats(data);
    // Update tag stats when automation stats update
    updateTagStats();
  });
  
  window.electronAPI.onAutomationStatus((data) => {
    setStatus(data.status, data.message);
  });
  
  window.electronAPI.onAutomationComplete((data) => {
    state.isRunning = false;
    updateControlButtons();
    setStatus('ready', 'Automation complete');
    log('success', `Automation completed! Processed ${data.accounts} accounts, ${data.comments} comments, ${data.tagged} tagged`);
    // Final tag stats update
    updateTagStats();
  });
  
  window.electronAPI.onAutomationError((data) => {
    state.isRunning = false;
    updateControlButtons();
    setStatus('error', data.message);
    log('error', `Automation error: ${data.message}`);
  });
  
  window.electronAPI.onProxyCheckProgress((data) => {
    log('info', `Proxy check: ${data.current}/${data.total} - ${data.proxy} - ${data.status}`);
  });
}

// ============================================
// Automation Control
// ============================================

async function startAutomation() {
  const targetPost = elements.targetPost.value.trim();
  
  if (!state.excelFilePath) {
    log('error', 'Please select an Excel file with usernames');
    return;
  }
  
  if (!targetPost) {
    log('error', 'Please enter a target post URL');
    return;
  }
  
  if (!state.config.accounts || state.config.accounts.length === 0) {
    log('error', 'No accounts configured. Please add accounts first.');
    return;
  }
  
  // Save config before starting
  await saveConfig();
  
  state.isRunning = true;
  updateControlButtons();
  setStatus('running', 'Starting automation...');
  
  // Start auto-refresh of tracker stats
  startTrackerAutoRefresh();
  
  const result = await window.electronAPI.startAutomation({
    targetPost,
    excelFilePath: state.excelFilePath,
    headless: elements.settingHeadless.checked
  });
  
  if (!result.success) {
    state.isRunning = false;
    updateControlButtons();
    setStatus('error', result.error);
    log('error', `Failed to start: ${result.error}`);
    stopTrackerAutoRefresh();
  }
}

async function stopAutomation() {
  setStatus('warning', 'Stopping automation...');
  log('warning', 'Stop requested. Finishing current task...');
  
  // Stop auto-refresh
  stopTrackerAutoRefresh();
  
  const result = await window.electronAPI.stopAutomation();
  
  if (result.success) {
    state.isRunning = false;
    updateControlButtons();
    setStatus('ready', 'Automation stopped');
    log('info', 'Automation stopped by user');
  } else {
    log('error', `Failed to stop: ${result.error}`);
  }
}

// ============================================
// Tag Tracker
// ============================================

async function updateTagStats() {
  const result = await window.electronAPI.getTagStats();
  
  if (result && result.success && result.stats && elements.trackerTotalTagged) {
    elements.trackerTotalTagged.textContent = result.stats.totalTagged || 0;
  }
}

// ============================================
// Tag Tracker - Extended Functions
// ============================================

async function refreshTrackerStats() {
  log('info', 'Refreshing tag tracker statistics...');
  
  const result = await window.electronAPI.getTrackerStats();
  
  if (result && result.success && result.stats) {
    const stats = result.stats;
    
    // Update tracker stats display
    elements.trackerTotalTagged.textContent = stats.totalUniqueUsersTagged || 0;
    elements.trackerSuccessRate.textContent = stats.successRate || '0%';
    
    // Color code the success rate
    const rate = parseFloat(stats.successRate);
    if (rate >= 90) {
      elements.trackerSuccessRate.className = 'tracker-stat-value success';
    } else if (rate >= 70) {
      elements.trackerSuccessRate.className = 'tracker-stat-value warning';
    } else {
      elements.trackerSuccessRate.className = 'tracker-stat-value error';
    }
    
    log('success', 'Tag tracker stats updated');
  } else {
    log('error', `Failed to get tracker stats: ${result?.error || 'Unknown error'}`);
  }
}

async function resetTrackerConfirm() {
  if (!confirm('🔄 Reset Tag Tracker?\n\nThis will clear all tagged user records. Use this when reusing the same usernames file.')) {
    return;
  }
  
  log('warning', 'Resetting global tag tracker...');
  
  const result = await window.electronAPI.resetTrackerGlobal();
  
  if (result && result.success) {
    log('success', '✅ Tag tracker reset successfully!');
    log('info', '📝 All tracked tags have been cleared');
    
    // Update display
    elements.trackerTotalTagged.textContent = '0';
    elements.trackerSuccessRate.textContent = '0%';
    elements.trackerSuccessRate.className = 'tracker-stat-value';
    
  } else {
    log('error', `Failed to reset tracker: ${result?.error || 'Unknown error'}`);
  }
}

// Auto-refresh tracker stats every 5 seconds
let trackerAutoRefreshInterval = null;

function startTrackerAutoRefresh() {
  // Clear existing interval if any
  if (trackerAutoRefreshInterval) {
    clearInterval(trackerAutoRefreshInterval);
  }
  
  // Refresh immediately
  refreshTrackerStats();
  
  // Then refresh every 5 seconds
  trackerAutoRefreshInterval = setInterval(() => {
    refreshTrackerStats();
  }, 5000);
}

function stopTrackerAutoRefresh() {
  if (trackerAutoRefreshInterval) {
    clearInterval(trackerAutoRefreshInterval);
    trackerAutoRefreshInterval = null;
  }
}

// ============================================
// Folder Operations
// ============================================

async function openLogsFolder() {
  const result = await window.electronAPI.openLogsFolder();
  
  if (result.success) {
    log('info', `Opened logs folder: ${result.path}`);
  } else {
    log('error', `Failed to open logs folder: ${result.error}`);
  }
}

// ============================================
// Proxy Checking
// ============================================

async function checkProxies() {
  log('info', 'Starting proxy check...');
  setStatus('running', 'Checking proxies...');
  
  const result = await window.electronAPI.checkProxies();
  
  if (result.success) {
    const working = result.results.filter(r => r.success).length;
    const total = result.results.length;
    log('success', `Proxy check complete: ${working}/${total} proxies working`);
    setStatus('ready', `Proxy check: ${working}/${total} working`);
    
    // Update proxy list with status
    updateProxiesList(result.results);
  } else {
    log('error', `Proxy check failed: ${result.error}`);
    setStatus('error', 'Proxy check failed');
  }
}

// ============================================
// File Operations
// ============================================

async function selectExcelFile() {
  const result = await window.electronAPI.selectExcelFile();
  
  if (result.success) {
    state.excelFilePath = result.filePath;
    elements.excelFilePath.value = result.filePath;
    log('success', `Excel file selected: ${result.filePath}`);
  } else if (!result.canceled) {
    log('error', `Failed to select file: ${result.error}`);
  }
}

/**
 * Show help modal with specific section
 */
function showHelp(section = 'general') {
  // Show all help sections
  const helpSections = document.querySelectorAll('.help-section');
  helpSections.forEach(el => {
    el.style.display = 'block';
  });
  
  showModal('modal-help');
}

async function importAccounts() {
  const result = await window.electronAPI.importAccounts();
  
  if (result.success) {
    state.config.accounts = [...state.config.accounts, ...result.accounts];
    await saveConfig();
    renderAccountsList();
    log('success', `Imported ${result.accounts.length} accounts`);
  } else if (!result.canceled) {
    log('error', `Failed to import: ${result.error}`);
  }
}

async function exportAccounts() {
  const result = await window.electronAPI.exportAccounts(state.config.accounts);
  
  if (result.success) {
    log('success', 'Accounts exported successfully');
  } else if (!result.canceled) {
    log('error', `Failed to export: ${result.error}`);
  }
}

async function importProxies() {
  const result = await window.electronAPI.importProxies();
  
  if (result.success) {
    state.config.proxies = [...state.config.proxies, ...result.proxies];
    await saveConfig();
    renderProxiesList();
    log('success', `Imported ${result.proxies.length} proxies`);
  } else if (!result.canceled) {
    log('error', `Failed to import: ${result.error}`);
  }
}

async function exportProxies() {
  const result = await window.electronAPI.exportProxies(state.config.proxies);
  
  if (result.success) {
    log('success', 'Proxies exported successfully');
  } else if (!result.canceled) {
    log('error', `Failed to export: ${result.error}`);
  }
}

async function exportSessions() {
  const result = await window.electronAPI.exportSessions();
  
  if (result.success) {
    log('success', 'All sessions exported successfully');
  } else if (!result.canceled) {
    log('error', `Failed to export sessions: ${result.error}`);
  }
}

async function importSessions() {
  const result = await window.electronAPI.importSessions();
  
  if (result.success) {
    log('success', `Imported ${result.count} sessions successfully`);
    
    // Auto-add imported usernames to accounts list if they don't exist
    if (result.usernames && result.usernames.length > 0) {
      result.usernames.forEach(username => {
        // Check if account already exists
        const accountExists = state.config.accounts.some(acc => acc.username === username);
        if (!accountExists) {
          // Add placeholder account with imported username
          state.config.accounts.push({ 
            username: username, 
            password: '' // Password will need to be added manually
          });
        }
      });
      
      // Save config with updated accounts
      await saveConfig();
    }
    
    // Refresh the accounts list to show session status
    renderAccountsList();
  } else if (!result.canceled) {
    log('error', `Failed to import sessions: ${result.error}`);
  }
}

// ============================================
// Account Management
// ============================================

function addAccount() {
  const username = document.getElementById('new-account-username').value.trim();
  const password = document.getElementById('new-account-password').value;
  
  if (!username || !password) {
    log('error', 'Please enter both username and password');
    return;
  }
  
  state.config.accounts.push({ username, password });
  saveConfig();
  renderAccountsList();
  closeAllModals();
  
  // Clear form
  document.getElementById('new-account-username').value = '';
  document.getElementById('new-account-password').value = '';
  
  log('success', `Account "${username}" added`);
}

function removeAccount(index) {
  const account = state.config.accounts[index];
  
  // Show confirmation alert
  if (!confirm(`Are you sure you want to remove account "${account.username}"?\n\nThis action cannot be undone.`)) {
    return;
  }
  
  state.config.accounts.splice(index, 1);
  saveConfig();
  renderAccountsList();
  log('success', `Account "${account.username}" removed`);
}

// Check if an account has saved cookies
async function checkAccountSession(username) {
  try {
    const result = await window.electronAPI.checkSession(username);
    return result.hasSession;
  } catch (error) {
    return false;
  }
}

// Render accounts list with session status
async function renderAccountsList() {
  const accounts = state.config.accounts || [];
  elements.accountsCount.textContent = accounts.length;
  
  if (accounts.length === 0) {
    elements.accountsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-text">No accounts configured.<br>Click "Add" to add an account.</div>
      </div>
    `;
    return;
  }
  
  // Check session status for all accounts in parallel
  const sessionStatuses = await Promise.all(
    accounts.map(acc => checkAccountSession(acc.username))
  );
  
  elements.accountsList.innerHTML = accounts.map((acc, i) => {
    const hasSession = sessionStatuses[i];
    const sessionClass = hasSession ? 'has-session' : 'no-session';
    const sessionIcon = hasSession ? '✅' : '⚠️';
    const sessionText = hasSession ? 'Session saved' : 'No session';
    
    return `
      <div class="account-item">
        <div class="account-info">
          <span class="account-username">${escapeHtml(acc.username)}</span>
          <span class="account-status ${sessionClass}">${sessionIcon} ${sessionText} ${acc.proxy ? '| 🔒 Has proxy' : ''}</span>
        </div>
        <div class="account-actions">
          <button class="btn btn-login" data-login-username="${escapeHtml(acc.username)}" title="Manual Login">🔐 Login</button>
          ${hasSession ? `<button class="btn btn-clear-session" data-clear-session="${escapeHtml(acc.username)}" title="Delete Session">🗑️ Session</button>` : ''}
          <button class="btn btn-delete" data-remove-account="${i}" title="Remove Account">❌</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event listeners for account actions
  elements.accountsList.querySelectorAll('[data-login-username]').forEach(btn => {
    btn.addEventListener('click', () => openManualLogin(btn.dataset.loginUsername));
  });
  
  elements.accountsList.querySelectorAll('[data-clear-session]').forEach(btn => {
    btn.addEventListener('click', () => deleteSession(btn.dataset.clearSession));
  });
  
  elements.accountsList.querySelectorAll('[data-remove-account]').forEach(btn => {
    btn.addEventListener('click', () => removeAccount(parseInt(btn.dataset.removeAccount)));
  });
}

// Delete Session
async function deleteSession(username) {
  if (!confirm(`Delete saved session for "${username}"?\n\nYou will need to log in again.`)) {
    return;
  }
  
  try {
    const result = await window.electronAPI.deleteSession(username);
    if (result.success) {
      log('success', `Session deleted for ${username}`);
      renderAccountsList(); // Refresh to update session status
    } else {
      log('error', `Failed to delete session: ${result.error}`);
    }
  } catch (error) {
    log('error', `Failed to delete session: ${error.message}`);
  }
}

// Manual Login
let currentLoginAccount = null;

function openManualLogin(username) {
  // Find the account to get both username and password
  const account = state.config.accounts.find(acc => acc.username === username);
  if (!account) {
    log('error', `Account ${username} not found`);
    return;
  }
  
  currentLoginAccount = account;
  document.getElementById('manual-login-account').textContent = username;
  document.getElementById('manual-login-status').textContent = 'Click the button below to open a browser window. Your credentials will be auto-filled.';
  document.getElementById('login-progress').style.display = 'none';
  document.getElementById('btn-open-login-browser').disabled = false;
  document.getElementById('modal-manual-login').classList.add('active');
}

async function startManualLogin() {
  if (!currentLoginAccount) return;
  
  const progressDiv = document.getElementById('login-progress');
  const progressText = document.getElementById('login-progress-text');
  const loginBtn = document.getElementById('btn-open-login-browser');
  const statusText = document.getElementById('manual-login-status');
  
  progressDiv.style.display = 'flex';
  loginBtn.disabled = true;
  progressText.textContent = 'Opening browser...';
  statusText.textContent = 'A browser window will open with your credentials auto-filled. Complete any verification if needed.';
  
  try {
    log('info', `Starting manual login for ${currentLoginAccount.username}...`);
    
    // Send both username and password for auto-fill
    const result = await window.electronAPI.manualLogin({
      username: currentLoginAccount.username,
      password: currentLoginAccount.password
    });
    
    if (result.success) {
      progressDiv.style.display = 'none';
      statusText.textContent = '✅ Login successful! Cookies have been saved.';
      statusText.style.color = 'var(--success)';
      log('success', `Manual login completed for ${currentLoginAccount.username}`);
      
      // Close modal after a delay
      setTimeout(() => {
        closeAllModals();
        renderAccountsList(); // Refresh to show updated session status
        statusText.style.color = '';
      }, 2000);
    } else {
      throw new Error(result.error || 'Login failed');
    }
  } catch (error) {
    progressDiv.style.display = 'none';
    loginBtn.disabled = false;
    statusText.textContent = `❌ ${error.message}`;
    statusText.style.color = 'var(--error)';
    log('error', `Manual login failed: ${error.message}`);
    
    setTimeout(() => {
      statusText.style.color = '';
    }, 3000);
  }
}

// ============================================
// Proxy Management
// ============================================

function addProxy() {
  const protocol = document.getElementById('new-proxy-protocol').value;
  const address = document.getElementById('new-proxy-address').value.trim();
  const port = parseInt(document.getElementById('new-proxy-port').value);
  const username = document.getElementById('new-proxy-username').value.trim();
  const password = document.getElementById('new-proxy-password').value;
  
  if (!address || !port) {
    log('error', 'Please enter proxy address and port');
    return;
  }
  
  const proxy = { protocol, address, port };
  if (username) proxy.username = username;
  if (password) proxy.password = password;
  
  state.config.proxies.push(proxy);
  saveConfig();
  renderProxiesList();
  closeAllModals();
  
  // Clear form
  document.getElementById('new-proxy-address').value = '';
  document.getElementById('new-proxy-port').value = '';
  document.getElementById('new-proxy-username').value = '';
  document.getElementById('new-proxy-password').value = '';
  
  log('success', `Proxy "${address}:${port}" added`);
}

function removeProxy(index) {
  const proxy = state.config.proxies[index];
  
  // Show confirmation alert
  if (!confirm(`Are you sure you want to remove proxy "${proxy.address}:${proxy.port}"?\n\nThis action cannot be undone.`)) {
    return;
  }
  
  state.config.proxies.splice(index, 1);
  saveConfig();
  renderProxiesList();
  log('success', `Proxy "${proxy.address}:${proxy.port}" removed`);
}

function renderProxiesList(results = null) {
  const proxies = state.config.proxies || [];
  elements.proxiesCount.textContent = proxies.length;
  
  if (proxies.length === 0) {
    elements.proxiesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌐</div>
        <div class="empty-state-text">No proxies configured.<br>Click "Add" to add a proxy.</div>
      </div>
    `;
    return;
  }
  
  elements.proxiesList.innerHTML = proxies.map((proxy, i) => {
    const status = results ? results.find(r => r.proxy === `${proxy.address}:${proxy.port}`) : null;
    const statusClass = status ? (status.success ? 'success' : 'failed') : '';
    const statusText = status ? (status.success ? '✅ Working' : '❌ Failed') : '⏳ Not tested';
    
    return `
      <div class="proxy-item">
        <div class="proxy-info">
          <span class="proxy-address">${proxy.address}:${proxy.port}</span>
          <span class="proxy-status ${statusClass}">${statusText}</span>
        </div>
        <div class="proxy-actions">
          <button class="btn btn-secondary btn-icon-only" data-remove-proxy="${i}" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event listeners for proxy actions
  elements.proxiesList.querySelectorAll('[data-remove-proxy]').forEach(btn => {
    btn.addEventListener('click', () => removeProxy(parseInt(btn.dataset.removeProxy)));
  });
}

function updateProxiesList(results) {
  renderProxiesList(results);
}

// ============================================
// Settings
// ============================================

function resetSettings() {
  elements.settingParallelAccounts.value = 3;
  elements.settingBatchSize.value = 100;
  elements.settingTagsPerAccount.value = 60;
  elements.settingTagsMin.value = 10;
  elements.settingTagsMax.value = 12;
  elements.settingCommentsMin.value = 5;
  elements.settingCommentsMax.value = 7;
  elements.settingPauseAfter.value = 50;
  elements.settingHeadless.checked = false;
  
  log('info', 'Settings reset to defaults');
}

// ============================================
// UI Helpers
// ============================================

function switchTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  // Update tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });
}

function showModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
}

function setStatus(type, message) {
  elements.statusIndicator.className = 'status-indicator';
  
  if (type === 'running') {
    elements.statusIndicator.classList.add('running');
  } else if (type === 'error') {
    elements.statusIndicator.classList.add('error');
  } else if (type === 'warning') {
    elements.statusIndicator.classList.add('warning');
  }
  
  elements.statusText.textContent = message;
}

function updateStats(data) {
  if (data.accounts !== undefined) elements.statAccounts.textContent = data.accounts;
  if (data.comments !== undefined) elements.statComments.textContent = data.comments;
  if (data.tagged !== undefined) elements.trackerTotalTagged.textContent = data.tagged;
  if (data.successRate !== undefined) {
    elements.trackerSuccessRate.textContent = `${data.successRate}%`;
    // Color code the success rate
    const rate = parseFloat(data.successRate);
    if (rate >= 90) {
      elements.trackerSuccessRate.className = 'tracker-stat-value success';
    } else if (rate >= 70) {
      elements.trackerSuccessRate.className = 'tracker-stat-value warning';
    } else {
      elements.trackerSuccessRate.className = 'tracker-stat-value error';
    }
  }
}

function updateControlButtons() {
  elements.btnStart.disabled = state.isRunning;
  elements.btnStop.disabled = !state.isRunning;
}

function updateUI() {
  // Update target post
  elements.targetPost.value = state.config.targetPost || '';
  
  // Update settings
  const settings = state.config.settings || {};
  elements.settingParallelAccounts.value = settings.parallelAccounts || 3;
  elements.settingBatchSize.value = settings.accountsPerBatch || 100;
  elements.settingTagsPerAccount.value = settings.tagsPerAccount || 60;
  elements.settingTagsMin.value = settings.tagsPerComment?.min || 10;
  elements.settingTagsMax.value = settings.tagsPerComment?.max || 12;
  elements.settingCommentsMin.value = settings.commentsPerAccount?.min || 5;
  elements.settingCommentsMax.value = settings.commentsPerAccount?.max || 7;
  elements.settingPauseAfter.value = settings.pauseAfterComments || 50;
  
  // Update lists
  renderAccountsList();
  renderProxiesList();
  
  // Update stats display
  elements.statAccounts.textContent = state.config.accounts?.length || 0;
}

// ============================================
// Logging
// ============================================

function log(type, message, username = null) {
  // Use IST (Indian Standard Time) timezone in 12-hour format
  const time = new Date().toLocaleTimeString('en-IN', { 
    hour12: true,
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Prepend username to message if provided
  let displayMessage = message;
  if (username) {
    displayMessage = `[${username}] ${message}`;
  }
  
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-message">${escapeHtml(displayMessage)}</span>
  `;
  
  elements.logsContainer.appendChild(entry);
  
  if (state.autoScroll) {
    elements.logsContainer.scrollTop = elements.logsContainer.scrollHeight;
  }
}

function clearLogs() {
  elements.logsContainer.innerHTML = '';
  log('info', 'Logs cleared');
}

// ============================================
// Utilities
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadAppVersion() {
  const version = await window.electronAPI.getAppVersion();
  elements.versionBadge.textContent = `v${version}`;
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', init);
