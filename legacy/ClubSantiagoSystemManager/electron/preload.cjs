const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    printTicket: (type, data) => ipcRenderer.invoke('print-ticket', { type, data }),
    onPrinterEmulate: (callback) => ipcRenderer.on('printer:emulate', (_event, value) => callback(value)),
});
