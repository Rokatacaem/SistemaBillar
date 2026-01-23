const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createServer } = require('./api.cjs');
const backupService = require('./backup-service.cjs');
const debtMonitor = require('./debt-monitor.cjs');

// Environment
const isDev = process.env.NODE_ENV === 'development';
const SERVER_PORT = process.env.SERVER_PORT || 3000;

// Start API Server
const userDataPath = app.getPath('userData');
createServer(SERVER_PORT, userDataPath);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });

    if (isDev) {
        // Vite default port
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    backupService.init(app);
    debtMonitor.init(app);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Printer Emulation Handler
ipcMain.handle('print-ticket', async (event, { type, data }) => {
    console.log(`[PRINTER] Request: ${type}`, data);
    const printerMode = process.env.PRINTER_MODE || 'EMULATION';

    if (printerMode === 'EMULATION') {
        // Send back to renderer to show in UI
        mainWindow.webContents.send('printer:emulate', { type, data });
        return { success: true, mode: 'EMULATION' };
    } else {
        // TODO: Implement ESC/POS physical printing
        return { success: false, error: 'Physical printing not implemented yet' };
    }
});
