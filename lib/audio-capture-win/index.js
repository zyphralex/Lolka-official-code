const addon = require('./build/Release/audio_capture_win.node');

class AudioCaptureManager {
  constructor() {
    this.isInitialized = false;
    this.isCapturing = false;
  }

  /**
   * Инициализировать WASAPI
   */
  initialize() {
    if (this.isInitialized) {
      return true;
    }

    const success = addon.initializeCapture();
    if (success) {
      this.isInitialized = true;
      console.log('✅ WASAPI audio capture initialized');
    } else {
      console.error('❌ Failed to initialize WASAPI audio capture');
    }

    return success;
  }

  /**
   * Запустить захват
   * @param {number|null} targetValue - HWND окна (для INCLUDE) или PID процесса (для EXCLUDE). C++ код сконвертирует HWND в PID.
   * @param {string} captureMode - 'include' для захвата только targetValue, 'exclude' для исключения targetValue
   */
  start(targetValue = null, captureMode = 'exclude') {
    if (!this.isInitialized) {
      throw new Error('Audio capture not initialized. Call initialize() first.');
    }

    if (this.isCapturing) {
      console.warn('⚠️ Audio capture already running');
      return false;
    }

    const currentPID = addon.getCurrentPID();
    // Передаем 0 если targetValue === null, чтобы C++ код автоматически определил Lolka процессы
    const effectiveValue = targetValue === null ? 0 : targetValue;
    
    console.log(`🎵 Starting audio capture (mode: ${captureMode}, target value: ${effectiveValue}, current PID: ${currentPID})`);
    
    // Получаем список всех активных сессий для отладки
    try {
      const sessions = addon.getActiveSessions();
      const lolkaSessions = sessions.filter(s => s.name && s.name.toLowerCase().includes('lolka'));
      
      if (lolkaSessions.length > 0) {
        console.log(`📋 Found ${lolkaSessions.length} Lolka audio session(s):`);
        lolkaSessions.forEach(session => {
          console.log(`   - ${session.name} (PID: ${session.pid})`);
        });
      } else {
        console.log('⚠️ No Lolka audio sessions found in active sessions');
      }
    } catch (error) {
      console.warn('⚠️ Failed to get active sessions:', error.message);
    }

    // Вызываем native addon с параметрами
    const success = addon.startCapture(effectiveValue, captureMode);
    if (success) {
      this.isCapturing = true;
      console.log(`✅ Audio capture started successfully (${captureMode} mode)`);
    } else {
      console.error('❌ Failed to start audio capture');
    }

    return success;
  }

  /**
   * Остановить захват
   */
  stop() {
    if (!this.isCapturing) {
      return;
    }

    addon.stopCapture();
    this.isCapturing = false;
    console.log('🛑 Audio capture stopped');
  }

  /**
   * Получить аудио буфер (Float32Array)
   */
  getAudioBuffer() {
    if (!this.isCapturing) {
      return null;
    }

    return addon.getAudioBuffer();
  }

  /**
   * Получить параметры аудио
   */
  getAudioParams() {
    if (!this.isInitialized) {
      return null;
    }

    return addon.getAudioParams();
  }

  /**
   * Получить список активных аудио сессий
   */
  getActiveSessions() {
    return addon.getActiveSessions();
  }

  /**
   * Получить PID текущего процесса
   */
  getCurrentPID() {
    return addon.getCurrentPID();
  }

  /**
   * Получить список всех PIDs процессов Lolka
   */
  getLolkaPIDs() {
    try {
      const sessions = addon.getActiveSessions();
      return sessions
        .filter(s => s.name && s.name.toLowerCase().includes('lolka'))
        .map(s => s.pid);
    } catch (error) {
      console.error('Failed to get Lolka PIDs:', error);
      return [];
    }
  }
}

module.exports = {
  AudioCaptureManager,
  addon,
};

