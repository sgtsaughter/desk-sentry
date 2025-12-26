// main.js - Electron Main Process
// This file runs in Node.js environment and controls the application lifecycle

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron');
const path = require('path');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let tray; // System tray icon

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
    },
    // Start minimized to tray (optional)
    show: true
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

  // Handle window minimize - hide to tray instead
  mainWindow.on('minimize', function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

  // Handle window close - hide to tray instead of quitting
  mainWindow.on('close', function (event) {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Cleanup reference when window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

/**
 * Creates the system tray icon with menu
 */
function createTray() {
  // Load tray icon from PNG file
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);

  // Resize to 16x16 for Windows system tray
  icon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('Desk Sentry - Posture Monitor');

  // Create context menu for tray icon
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: function () {
        mainWindow.show();
      }
    },
    {
      label: 'Hide App',
      click: function () {
        mainWindow.hide();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: function () {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Click tray icon to show/hide window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

// App lifecycle events

// This event fires when Electron has finished initialization
app.whenReady().then(() => {
  // Set app user model ID for Windows notifications
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.desksentry.app');
  }

  createWindow();
  createTray(); // Create system tray icon
  setupIPC(); // Set up inter-process communication

  // On macOS, re-create window when dock icon is clicked and no windows are open
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

/**
 * Set up IPC handlers for communication with renderer process
 */
function setupIPC() {
  // Handle notification requests from Angular
  ipcMain.on('show-notification', (event, data) => {
    const { title, body, urgency } = data;

    // Ensure notifications are supported
    if (!Notification.isSupported()) {
      console.log('Notifications are not supported on this system');
      return;
    }

    // Create and show notification
    // Note: closeButtonText is only supported on macOS
    const notificationOptions = {
      title: title || 'Desk Sentry',
      body: body || 'Posture alert',
      icon: path.join(__dirname, 'assets', 'tray-icon-posture.png'),
      urgency: urgency || 'normal', // low, normal, critical
      timeoutType: 'default',
      silent: false // Play notification sound
    };

    // On Windows, ensure we're not relying on window focus
    if (process.platform === 'win32') {
      // Windows notifications work independently of window state
      // No special flags needed - Electron handles this automatically
    }

    const notification = new Notification(notificationOptions);

    // When notification is clicked, show the app window
    notification.on('click', () => {
      if (mainWindow) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.focus();
      }
    });

    // Show the notification - this works regardless of window visibility
    notification.show();
    console.log('Notification displayed:', title, '(Window visible:', mainWindow ? mainWindow.isVisible() : false, ')');
  });
}

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
