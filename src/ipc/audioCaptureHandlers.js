const { ipcMain } = require('electron');

// WASAPI Audio Capture (Windows only)
let audioCaptureManager = null;

// Только для Windows
if (process.platform === 'win32') {
  try {
    const { AudioCaptureManager } = require('../../lib/audio-capture-win');
    audioCaptureManager = new AudioCaptureManager();
    console.log('WASAPI audio capture module loaded');
  } catch (error) {
    console.error('Failed to load WASAPI audio capture module:', error);
  }
}

function registerAudioCaptureHandlers() {
  ipcMain.handle('audio-capture-initialize', async () => {
    if (!audioCaptureManager) {
      return { success: false, error: 'Module not available on this platform' };
    }

    const success = audioCaptureManager.initialize();
    return { success };
  });

  ipcMain.handle('audio-capture-start', async (event, options = {}) => {
    if (!audioCaptureManager) {
      return { success: false, error: 'Module not available' };
    }

    console.log('[DEBUG] IPC received options:', JSON.stringify(options));
    const { targetPID = null, captureMode = 'exclude' } = options;
    console.log('[DEBUG] Extracted - targetPID:', targetPID, 'captureMode:', captureMode);

    // Дополнительное логирование для отладки
    console.log(`WASAPI: Starting audio capture (mode: ${captureMode}${targetPID ? `, PID: ${targetPID}` : ''})`);
    try {
      const sessions = audioCaptureManager.getActiveSessions();
      const lolkaPIDs = audioCaptureManager.getLolkaPIDs();
      console.log(`WASAPI: Found ${lolkaPIDs.length} Lolka process(es) in sessions`);
      if (lolkaPIDs.length > 0) {
        console.log(`WASAPI: Lolka PIDs: ${lolkaPIDs.join(', ')}`);
      }
    } catch (error) {
      console.warn('WASAPI: Failed to enumerate sessions:', error.message);
    }

    const success = audioCaptureManager.start(targetPID, captureMode);
    return { success };
  });

  ipcMain.handle('audio-capture-stop', async () => {
    if (!audioCaptureManager) {
      return { success: false };
    }

    audioCaptureManager.stop();
    return { success: true };
  });

  ipcMain.handle('audio-capture-get-buffer', async () => {
    if (!audioCaptureManager) {
      return null;
    }

    return audioCaptureManager.getAudioBuffer();
  });

  ipcMain.handle('audio-capture-get-params', async () => {
    if (!audioCaptureManager) {
      return null;
    }

    return audioCaptureManager.getAudioParams();
  });

  ipcMain.handle('audio-capture-get-sessions', async () => {
    if (!audioCaptureManager) {
      return [];
    }

    return audioCaptureManager.getActiveSessions();
  });
}

function cleanupAudioCapture() {
  if (audioCaptureManager) {
    console.log('Cleaning up audio capture on exit...');
    audioCaptureManager.stop();
  }
}

module.exports = { registerAudioCaptureHandlers, cleanupAudioCapture };

