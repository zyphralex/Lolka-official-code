const { ipcMain } = require('electron');

let processMonitor = null;

/**
 * Initialize process handlers with dependencies
 * @param {ProcessMonitor} monitor - ProcessMonitor instance
 */
function initProcessHandlers(monitor) {
  processMonitor = monitor;

  // Get process list (single request)
  ipcMain.handle('process:getList', async () => {
    try {
      if (!processMonitor) {
        throw new Error('ProcessMonitor not initialized');
      }
      
      const processes = processMonitor.getProcesses();
      return processes;
    } catch (error) {
      console.error('[IPC] Error getting process list:', error);
      throw error;
    }
  });
}

/**
 * Cleanup handlers (call on app quit)
 */
function cleanupProcessHandlers() {
  ipcMain.removeHandler('process:getList');
}

module.exports = {
  initProcessHandlers,
  cleanupProcessHandlers
};

