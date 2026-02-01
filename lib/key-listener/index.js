let addon = null;

// Пытаемся загрузить нативный модуль (только на Windows)
try {
  addon = require('./build/Release/key_listener.node');
  console.log('key-listener: ✅ Native module loaded successfully');
} catch (err) {
  console.warn('key-listener: ❌ Native module not available:', err.message);
}

class GlobalKeyboardListener {
  constructor(options = {}) {
    this.listeners = [];
    this.isActive = false;
    this.options = options;
  }

  /**
   * Добавить слушатель событий
   * @param {Function} callback - (event, down) => boolean | void
   *   event: { name, vKey, scanCode, state, button, x, y, rawKey }
   *   down: { [keyName]: boolean } - текущие зажатые клавиши
   *   Вернуть true для блокировки события (пока не реализовано)
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    this.listeners.push(callback);

    // Если это первый listener, запускаем хуки
    if (this.listeners.length === 1 && !this.isActive) {
      this._startHooks();
    }
  }

  /**
   * Удалить слушатель
   * @param {Function} callback
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }

    // Если больше нет слушателей, останавливаем хуки
    if (this.listeners.length === 0 && this.isActive) {
      this._stopHooks();
    }
  }

  /**
   * Остановить все хуки и очистить слушатели
   */
  kill() {
    this._stopHooks();
    this.listeners = [];
  }

  /**
   * Проверить доступность модуля
   */
  isAvailable() {
    if (!addon) {
      return false;
    }
    return addon.isAvailable();
  }

  _startHooks() {
    if (!addon) {
      console.error('key-listener: Native module not available');
      return false;
    }

    if (this.isActive) {
      console.log('key-listener: Hooks already active');
      return true;
    }

    console.log('key-listener: Starting hooks...');

    try {
      // Запускаем нативные хуки с callback
      const result = addon.startHook((event, down) => {
        // Вызываем все зарегистрированные слушатели
        for (const listener of this.listeners) {
          try {
            const result = listener(event, down);
            // Если listener вернул true, можно было бы блокировать событие
            // (но это требует дополнительной реализации)
            if (result === true) {
              // TODO: implement event blocking
            }
          } catch (err) {
            console.error('key-listener: Error in listener callback:', err);
          }
        }
      });

      console.log('key-listener: addon.startHook() returned:', result);
      this.isActive = true;
      console.log('key-listener: ✅ Hooks started successfully');
      return true;
    } catch (err) {
      console.error('key-listener: ❌ Failed to start hooks:', err);
      console.error('key-listener: Error stack:', err.stack);
      return false;
    }
  }

  _stopHooks() {
    if (!addon || !this.isActive) {
      return;
    }

    try {
      addon.stopHook();
      this.isActive = false;
    } catch (err) {
      console.error('key-listener: Failed to stop hooks:', err);
    }
  }
}

module.exports = {
  GlobalKeyboardListener,
};
