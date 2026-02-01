// process-list-win работает только на Windows
const isWindows = process.platform === 'win32';
const getProcessList = isWindows ? require('../../lib/process-list-win').getProcessList : null;

class ProcessMonitor {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Get current list of running processes
   * @returns {Array} Array of process objects with { pid, name, path, arguments }
   */
  getProcesses() {
    if (!isWindows || !getProcessList) {
      return [];
    }

    try {
      return getProcessList();
    } catch (error) {
      this.logger.log('Error getting process list:', error.message);
      return [];
    }
  }

  /**
   * Get processes with paths only (filtered)
   * @returns {Array} Filtered array of processes that have accessible paths
   */
  getProcessesWithPath() {
    const processes = this.getProcesses();
    return processes.filter((process) => process.path != null);
  }

  /**
   * Log current processes (for debugging)
   */
  logProcesses() {
    try {
      const processes = this.getProcesses();
      const processesWithPath = processes.filter((process) => process.path != null);
      this.logger.log(`Total processes: ${processes.length}, with path: ${processesWithPath.length}`);
    } catch (error) {
      this.logger.log('Error logging processes:', error.message);
    }
  }
}

module.exports = ProcessMonitor;
