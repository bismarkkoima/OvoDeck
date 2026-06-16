const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 850,
        minHeight: 600,
        title: "OvoDeck Media Player",
        backgroundColor: '#0c0d12',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    // Load the index.html of the app.
    win.loadFile(path.join(__dirname, 'index.html'));

    // Remove the default Electron menu bar for a clean custom player look
    Menu.setApplicationMenu(null);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
