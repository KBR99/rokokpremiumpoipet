// background.js - Versi Minimal
let config = {
  refreshInterval: 300,
  warningThreshold: 9
};

let notified = new Set();

// Load config
chrome.storage.local.get(['config', 'notified'], (result) => {
  if (result.config) config = { ...config, ...result.config };
  if (result.notified) notified = new Set(result.notified);
});

// Auto refresh
chrome.alarms.create('refresh', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh') {
    chrome.tabs.query({ url: 'https://topwd.idrbo1.com/*' }, (tabs) => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));
    });
  }
});

// Handle messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'NOTIFY') {
    const { id, duration } = msg.data;
    
    if (!notified.has(id)) {
      notified.add(id);
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '⚠️ Deposit Alert',
        message: `Transaksi ${id.substring(0,8)}... sudah ${duration} menit`,
        priority: 2
      });
      
      // Simpan notified
      chrome.storage.local.set({ notified: Array.from(notified) });
    }
  }
  
  if (msg.type === 'REFRESH_PAGE') {
    chrome.tabs.reload(sender.tab.id);
  }
  
  if (msg.type === 'UPDATE_CONFIG') {
    config = { ...config, ...msg.data };
    chrome.storage.local.set({ config });
    
    // Update alarm
    chrome.alarms.clear('refresh');
    chrome.alarms.create('refresh', { periodInMinutes: config.refreshInterval / 60 });
  }
  
  sendResponse({ ok: true });
  return true;
});

// Cleanup old notifications (seminggu sekali)
setInterval(() => {
  notified.clear();
  chrome.storage.local.set({ notified: [] });
}, 7 * 24 * 60 * 60 * 1000);