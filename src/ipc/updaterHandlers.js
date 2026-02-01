const { ipcMain, app } = require('electron');

function registerUpdaterHandlers(updaterManager, logger) {
  // Обработчики для автообновления
  ipcMain.handle('check-for-updates', async () => {
    return await updaterManager.checkForUpdates();
  });

  ipcMain.handle('install-update', () => {
    updaterManager.installUpdate();
  });

  ipcMain.handle('get-app-version', () => {
    const version = app.getVersion();
    logger.log(`App version requested: ${version}`);
    return version;
  });

  ipcMain.handle('get-update-status', () => {
    return updaterManager.getStatus();
  });

  ipcMain.handle('get-updater-logs', () => {
    return logger.readLogs(100);
  });

  ipcMain.handle('clear-updater-logs', () => {
    return logger.clearLogs();
  });
}

module.exports = { registerUpdaterHandlers };

