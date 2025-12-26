// main.js - Electron Main Process
// This file runs in Node.js environment and controls the application lifecycle

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

/**
 * Creates the main application window
 */
function createWindow() {
  // Create the browser window with custom dimensions and settings
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Disable Node.js integration in renderer for security
      nodeIntegration: false,
      // Enable context isolation for security (renderer can't directly access main process)
      contextIsolation: true,
      // Preload script path (we'll use this later for secure communication)
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the Angular app
  // In development: load from dev server (hot reload)
  // In production: load from built files
  const isDev = process.argv.includes('--dev');

  if (isDev) {
    // Development mode: load from Angular dev server
    mainWindow.loadURL('http://localhost:4200');
    // Open DevTools in dev mode for debugging
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: load from built files
    mainWindow.loadFile(path.join(__dirname, 'dist/desk-sentry/browser/index.html'));
  }

  // Cleanup reference when window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// App lifecycle events

// This event fires when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create window when dock icon is clicked and no windows are open
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', function () {
  // On macOS, apps typically stay active until user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Additional notes:
// - This is a minimal main process setup
// - Later we'll add: system tray, screen overlay, auto-launch, etc.
// - The preload.js file will be created later for secure IPC communication
