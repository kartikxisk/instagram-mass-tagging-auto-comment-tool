/**
 * Preload Script
 * Exposes safe APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Automation control
  startAutomation: (options) => ipcRenderer.invoke('start-automation', options),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  
  // Proxy checking
  checkProxies: () => ipcRenderer.invoke('check-proxies'),
  
  // File operations
  selectExcelFile: () => ipcRenderer.invoke('select-excel-file'),
  getExcelTagsCount: (filePath) => ipcRenderer.invoke('get-excel-tags-count', filePath),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  importAccounts: () => ipcRenderer.invoke('import-accounts'),
  exportAccounts: (accounts) => ipcRenderer.invoke('export-accounts', accounts),
  importProxies: () => ipcRenderer.invoke('import-proxies'),
  exportProxies: (proxies) => ipcRenderer.invoke('export-proxies', proxies),
  importSessions: () => ipcRenderer.invoke('import-sessions'),
  exportSessions: () => ipcRenderer.invoke('export-sessions'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Manual login & session
  manualLogin: (credentials) => ipcRenderer.invoke('manual-login', credentials),
  checkSession: (username) => ipcRenderer.invoke('check-session', username),
  deleteSession: (username) => ipcRenderer.invoke('delete-session', username),
  
  // Tag tracker
  resetTagTracker: () => ipcRenderer.invoke('reset-tag-tracker'),
  getTagStats: () => ipcRenderer.invoke('get-tag-stats'),
  getTrackerStats: () => ipcRenderer.invoke('get-tracker-stats'),
  exportTrackerData: () => ipcRenderer.invoke('export-tracker-data'),
  resetTrackerGlobal: () => ipcRenderer.invoke('reset-tracker-global'),
  
  // Data folder
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  
  // Event listeners
  onAutomationLog: (callback) => {
    ipcRenderer.on('automation-log', (event, data) => callback(data));
  },
  onAutomationStats: (callback) => {
    ipcRenderer.on('automation-stats', (event, data) => callback(data));
  },
  onAutomationStatus: (callback) => {
    ipcRenderer.on('automation-status', (event, data) => callback(data));
  },
  onAutomationComplete: (callback) => {
    ipcRenderer.on('automation-complete', (event, data) => callback(data));
  },
  onAutomationError: (callback) => {
    ipcRenderer.on('automation-error', (event, data) => callback(data));
  },
  onProxyCheckProgress: (callback) => {
    ipcRenderer.on('proxy-check-progress', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
