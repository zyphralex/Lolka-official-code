const { ipcMain, systemPreferences } = require('electron');
const { isMac } = require('../utils/platform');

function registerMediaHandlers() {
  // Обработчик запроса разрешения на микрофон
  ipcMain.handle('request-microphone-access', async () => {
    try {
      if (isMac()) {
        const access = await systemPreferences.askForMediaAccess('microphone');
        console.log('Microphone access requested:', access);
        return access;
      } else {
        // На Windows/Linux разрешения не требуются для desktop приложений
        console.log('Microphone access granted (non-macOS)');
        return true;
      }
    } catch (error) {
      console.error('Failed to request microphone access:', error);
      return false;
    }
  });

  // Обработчик запроса разрешения на камеру
  ipcMain.handle('request-camera-access', async () => {
    try {
      if (isMac()) {
        const access = await systemPreferences.askForMediaAccess('camera');
        console.log('Camera access requested:', access);
        return access;
      } else {
        // На Windows/Linux разрешения не требуются для desktop приложений
        console.log('Camera access granted (non-macOS)');
        return true;
      }
    } catch (error) {
      console.error('Failed to request camera access:', error);
      return false;
    }
  });

  // Проверка текущего статуса разрешений без запроса
  ipcMain.handle('get-media-access-status', async (event, mediaType) => {
    try {
      if (isMac()) {
        const status = systemPreferences.getMediaAccessStatus(mediaType);
        return status;
      } else {
        // На Windows/Linux разрешения не требуются для desktop приложений
        return 'granted';
      }
    } catch (error) {
      console.error('Failed to get media access status:', error);
      return 'unknown';
    }
  });
}

module.exports = { registerMediaHandlers };

