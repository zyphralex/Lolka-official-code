// PTTManager - только для Windows и Linux
// На macOS этот модуль не загружается

class PTTManager {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.globalKeyListener = null;
    this.isAvailable = false;
  }

  async initialize() {
    try {
      const { GlobalKeyboardListener } = require('../../lib/key-listener');
      this.globalKeyListener = new GlobalKeyboardListener();
      this.isAvailable = true;
      console.log('PTT: key-listener loaded successfully (keyboard and mouse)');

      // Единый глобальный слушатель для всех событий клавиатуры и мыши
      this.globalKeyListener.addListener((e) => {
        const wc = this.windowManager.getMainWebContents();
        if (!wc) return;

        // Отправляем ВСЕ события (и DOWN, и UP) в веб-приложение
        wc.send('global-input-event', {
          name: e.name,
          vKey: e.vKey,
          button: e.button,
          state: e.state,
        });
      });
    } catch (e) {
      console.log('PTT: Error loading key-listener:', e.message);
      this.isAvailable = false;
    }
  }

  stop() {
    try {
      if (this.globalKeyListener) {
        this.globalKeyListener.kill();
        this.globalKeyListener = null;
        console.log('PTT: GlobalKeyboardListener stopped');
      }
    } catch (e) {
      console.warn('PTT: Error stopping listener:', e.message);
    }
  }

  // Заглушки для совместимости с IPC handlers
  hasAccessibilityPermission() {
    return true; // На Windows/Linux не требуется специальных разрешений
  }

  requestAccessibilityPermission() {
    return true;
  }

  isModuleAvailable() {
    return this.isAvailable;
  }
}

module.exports = PTTManager;
