// preload.js - Electron Preload Script
// This file runs before the renderer process loads and can expose safe APIs

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Send notification request to main process
  sendNotification: (data) => ipcRenderer.send('show-notification', data),

  // Listen for events from main process (if needed later)
  onNotificationClick: (callback) => ipcRenderer.on('notification-clicked', callback)
});

console.log('Preload script loaded');
