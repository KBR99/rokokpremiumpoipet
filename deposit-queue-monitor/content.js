// content.js - Versi Ultra Ringan
(function() {
  'use strict';
  
  // Konfigurasi minimal
  const CONFIG = {
    checkInterval: 2000, // Check setiap 2 detik (lebih ringan)
    warningMin: 9,
    dangerMin: 10
  };
  
  let transactions = new Map();
  let checkTimer = null;
  let refreshTimer = null;
  let secondsToRefresh = 300;
  
  // Inisialisasi
  function init() {
    createUI();
    startMonitoring();
    setupRefreshTimer();
    loadConfig();
  }
  
  // UI Minimal
  function createUI() {
    // Hapus UI lama jika ada
    if (document.getElementById('deposit-timer')) return;
    
    // Timer floating
    const timer = document.createElement('div');
    timer.id = 'deposit-timer';
    timer.className = 'deposit-timer';
    timer.innerHTML = `
      <span class="timer-dot" id="timer-dot"></span>
      <span id="timer-text">05:00</span>
      <span id="queue-count" style="background:#f3f4f6; padding:2px 6px; border-radius:12px; font-size:11px;">0</span>
    `;
    document.body.appendChild(timer);
    
    // Mini status (hidden by default)
    const status = document.createElement('div');
    status.id = 'deposit-status';
    status.className = 'deposit-status-mini';
    status.style.display = 'none';
    document.body.appendChild(status);
  }
  
  // Load config dari storage
  function loadConfig() {
    chrome.storage.local.get(['config'], (result) => {
      if (result.config) {
        secondsToRefresh = result.config.refreshInterval || 300;
      }
    });
  }
  
  // Start monitoring dengan interval yang lebih jarang
  function startMonitoring() {
    if (checkTimer) clearInterval(checkTimer);
    checkTimer = setInterval(checkTransactions, CONFIG.checkInterval);
    checkTransactions(); // Langsung check sekali
  }
  
  // Timer refresh countdown
  function setupRefreshTimer() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      secondsToRefresh--;
      if (secondsToRefresh <= 0) {
        secondsToRefresh = 300;
        // Refresh page via background
        chrome.runtime.sendMessage({ type: 'REFRESH_PAGE' });
      }
      updateTimerDisplay();
    }, 1000);
  }
  
  // Update tampilan timer
  function updateTimerDisplay() {
    const timerEl = document.getElementById('timer-text');
    if (!timerEl) return;
    
    const mins = Math.floor(secondsToRefresh / 60);
    const secs = secondsToRefresh % 60;
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Cari tabel dengan cepat
  function findTable() {
    // Prioritas: cari tabel dengan banyak baris
    const tables = document.querySelectorAll('table');
    for (let table of tables) {
      if (table.rows.length > 1) return table;
    }
    return null;
  }
  
  // Ekstrak tanggal dari baris (cepat)
  function getDateFromRow(row) {
    // Coba 3 kolom pertama
    for (let i = 1; i <= 3; i++) {
      const cell = row.cells[i];
      if (!cell) continue;
      
      const text = cell.textContent.trim();
      // Coba parse sebagai tanggal
      const date = new Date(text);
      if (!isNaN(date)) return date;
      
      // Coba format DD/MM/YYYY
      const parts = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (parts) {
        return new Date(parts[3], parts[2]-1, parts[1]);
      }
    }
    return null;
  }
  
  // Get ID transaksi (cepat)
  function getTransactionId(row) {
    // Gunakan row index + konten singkat sebagai ID
    const firstCell = row.cells[0]?.textContent.trim().substring(0, 10) || '';
    return `row-${row.rowIndex}-${firstCell}`;
  }
  
  // Hitung durasi
  function getDuration(date) {
    return Math.floor((new Date() - date) / 60000);
  }
  
  // Highlight row (minimal)
  function highlightRow(row, duration) {
    row.classList.remove('queue-warning', 'queue-danger');
    
    if (duration >= CONFIG.dangerMin) {
      row.classList.add('queue-danger');
    } else if (duration >= CONFIG.warningMin) {
      row.classList.add('queue-warning');
    }
    
    // Add/update badge
    let badge = row.querySelector('.duration-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'duration-badge';
      row.cells[0]?.appendChild(badge);
    }
    
    badge.textContent = `${duration}m`;
    badge.className = `duration-badge ${duration >= CONFIG.dangerMin ? 'danger' : duration >= CONFIG.warningMin ? 'warning' : ''}`;
  }
  
  // Check semua transaksi
  function checkTransactions() {
    const table = findTable();
    if (!table) {
      document.getElementById('queue-count').textContent = '0';
      return;
    }
    
    const rows = Array.from(table.rows).slice(1); // Skip header
    let warningCount = 0;
    let dangerCount = 0;
    
    rows.forEach(row => {
      const date = getDateFromRow(row);
      if (!date) return;
      
      const id = getTransactionId(row);
      const duration = getDuration(date);
      
      // Update map
      transactions.set(id, { duration, row });
      
      // Count
      if (duration >= CONFIG.dangerMin) {
        dangerCount++;
      } else if (duration >= CONFIG.warningMin) {
        warningCount++;
      }
      
      // Highlight
      highlightRow(row, duration);
      
      // Notifikasi (hanya sekali)
      if (duration === CONFIG.warningMin && !notified.has(id)) {
        notified.add(id);
        chrome.runtime.sendMessage({
          type: 'NOTIFY',
          data: { id, duration }
        });
        
        // Limit notified size
        if (notified.size > 100) notified.clear();
      }
    });
    
    // Update counter
    document.getElementById('queue-count').textContent = rows.length;
    
    // Update dot status
    const dot = document.getElementById('timer-dot');
    dot.className = `timer-dot ${dangerCount ? 'danger' : warningCount ? 'warning' : ''}`;
  }
  
  // Set untuk tracking notifikasi
  const notified = new Set();
  
  // Listen messages
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'CONFIG_UPDATED') {
      if (msg.data.refreshInterval) {
        secondsToRefresh = msg.data.refreshInterval;
      }
    }
  });
  
  // Start ketika DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (checkTimer) clearInterval(checkTimer);
    if (refreshTimer) clearInterval(refreshTimer);
  });
})();