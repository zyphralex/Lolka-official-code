const { ipcMain } = require('electron');

function registerDeepLinkHandlers(deepLinkManager) {
  ipcMain.handle('get-pending-deep-link', () => {
    return deepLinkManager.getPendingDeepLink();
  });

  ipcMain.handle('handle-deep-link', (event, url) => {
    console.log('Processing deep link from renderer process:', url);
    deepLinkManager.handleDeepLink(url);
    return true;
  });

  ipcMain.handle('clear-pending-deep-link', () => {
    return deepLinkManager.clearPendingDeepLink();
  });
}

module.exports = { registerDeepLinkHandlers };

