const isDev = process.argv.includes('--dev') || !require('electron').app.isPackaged;

function isMac() {
  return process.platform === 'darwin';
}

function isWindows() {
  return process.platform === 'win32';
}

function isLinux() {
  return process.platform === 'linux';
}

function getIconPath(filename) {
  const path = require('path');
  return path.join(__dirname, '..', '..', 'assets', filename);
}

module.exports = {
  isDev,
  isMac,
  isWindows,
  isLinux,
  getIconPath,
};

