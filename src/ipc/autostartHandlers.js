const { ipcMain } = require('electron');

function registerAutostartHandlers(autoStartManager) {
  ipcMain.handle('get-autostart-status', () => {
    return autoStartManager.getStatus();
  });

  ipcMain.handle('set-autostart', (event, enabled) => {
    return autoStartManager.setAutoStart(enabled);
  });
}

module.exports = { registerAutostartHandlers };

