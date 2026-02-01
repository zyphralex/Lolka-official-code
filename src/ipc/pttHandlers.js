const { ipcMain } = require('electron');

function registerPTTHandlers(pttManager) {
  ipcMain.handle('ptt-is-available', () => {
    return pttManager.isModuleAvailable();
  });

  // macOS Accessibility permission API
  ipcMain.handle('ptt-has-permission', () => {
    return pttManager.hasAccessibilityPermission(false);
  });

  ipcMain.handle('ptt-request-permission', () => {
    return pttManager.requestAccessibilityPermission();
  });
}

module.exports = { registerPTTHandlers };

