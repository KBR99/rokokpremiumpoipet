document.addEventListener('DOMContentLoaded', () => {
  // Load config
  chrome.storage.local.get(['config'], (result) => {
    if (result.config) {
      document.getElementById('refreshInterval').value = result.config.refreshInterval || 300;
    }
  });
  
  // Get status dari content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (res) => {
        if (res) {
          document.getElementById('queueCount').textContent = res.total || 0;
        }
      });
    }
  });
  
  // Save config
  document.getElementById('saveBtn').onclick = () => {
    const config = {
      refreshInterval: parseInt(document.getElementById('refreshInterval').value)
    };
    
    chrome.storage.local.set({ config });
    chrome.runtime.sendMessage({ type: 'UPDATE_CONFIG', data: config });
    
    document.getElementById('statusBadge').textContent = 'Tersimpan';
    setTimeout(() => document.getElementById('statusBadge').textContent = 'Aktif', 1000);
  };
  
  // Refresh page
  document.getElementById('refreshBtn').onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.reload(tabs[0].id);
    });
  };
  
  // Reset notifications
  document.getElementById('resetBtn').onclick = () => {
    chrome.storage.local.set({ notified: [] });
    document.getElementById('statusBadge').textContent = 'Reset OK';
  };
});