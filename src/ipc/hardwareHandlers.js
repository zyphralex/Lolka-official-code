const { ipcMain } = require('electron');
const { getHardwareInfo } = require('../utils/hardware');

let cachedHardware = null;

function registerHardwareHandlers() {
  ipcMain.handle('get-hardware-info', async () => {
    try {
      if (!cachedHardware) {
        cachedHardware = await getHardwareInfo();
      }
      return cachedHardware;
    } catch (error) {
      console.error('Failed to get hardware info:', error);
      return null;
    }
  });
}

module.exports = { registerHardwareHandlers };
