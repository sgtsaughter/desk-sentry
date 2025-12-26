// preload.js - Electron Preload Script
// This file runs before the renderer process loads and can expose safe APIs

// Currently empty - we'll use this later for secure communication between
// the main process (Node.js) and renderer process (Angular)
// This is needed for features like:
// - Sending posture data from Angular to main process
// - Triggering screen blur from main process
// - System tray interactions

console.log('Preload script loaded');
