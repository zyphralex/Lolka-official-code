const os = require('os');

// Check if we're on Windows
if (os.platform() !== 'win32') {
  throw new Error('process-list-win is only supported on Windows');
}

let nativeAddon;

try {
  nativeAddon = require('./build/Release/process_list_win.node');
} catch (err) {
  try {
    nativeAddon = require('./build/Debug/process_list_win.node');
  } catch (err) {
    throw new Error('Native addon not found. Please run "npm install" to build the module.');
  }
}

/**
 * Get list of all running processes with their executable paths
 * @returns {Array<{pid: number, name: string, path: string|null}>}
 */
function getProcessList() {
  try {
    return nativeAddon.getProcessList();
  } catch (error) {
    throw new Error(`Failed to get process list: ${error.message}`);
  }
}

module.exports = {
  getProcessList
};

