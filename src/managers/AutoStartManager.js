const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { isWindows, isDev } = require('../utils/platform');

class AutoStartManager {
  constructor(logger) {
    this.logger = logger;
  }

  getStatus() {
    try {
      // Автозапуск только для Windows
      if (!isWindows()) {
        return { openAtLogin: false, platformSupported: false };
      }

      const loginItemSettings = app.getLoginItemSettings();
      const detailedSettings = app.getLoginItemSettings({
        path: process.execPath,
        args: ['--autostart'],
      });

      this.logger.log('Got autostart status (general)', loginItemSettings);
      this.logger.log('Got autostart status (our app)', detailedSettings);
      this.logger.log('process.execPath', process.execPath);

      // Используем executableWillLaunchAtLogin как более надежный индикатор
      const isInAutostart =
        loginItemSettings.executableWillLaunchAtLogin ||
        detailedSettings.openAtLogin ||
        loginItemSettings.openAtLogin;

      return {
        openAtLogin: isInAutostart,
        openAsHidden: detailedSettings.openAsHidden || loginItemSettings.openAsHidden,
        wasOpenedAtLogin: detailedSettings.wasOpenedAtLogin || loginItemSettings.wasOpenedAtLogin,
        wasOpenedAsHidden: detailedSettings.wasOpenedAsHidden || loginItemSettings.wasOpenedAsHidden,
        platformSupported: true,
        debugInfo: {
          general: loginItemSettings,
          specific: detailedSettings,
          execPath: process.execPath,
          computedStatus: isInAutostart,
        },
      };
    } catch (error) {
      this.logger.log('Error getting autostart status:', { error: error.message });
      return { openAtLogin: false, platformSupported: false };
    }
  }

  setAutoStart(enabled) {
    try {
      // Автозапуск только для Windows
      if (!isWindows()) {
        this.logger.log('Autostart is not supported on this platform');
        return false;
      }

      // При отключении нужно убрать все возможные записи
      if (!enabled) {
        // Удаляем запись с аргументами
        app.setLoginItemSettings({
          openAtLogin: false,
          openAsHidden: false,
          name: 'Lolka',
          path: process.execPath,
          args: ['--autostart'],
        });

        // Удаляем запись без аргументов (на случай если была)
        app.setLoginItemSettings({
          openAtLogin: false,
          openAsHidden: false,
          name: 'Lolka',
          path: process.execPath,
          args: [],
        });

        // Общее отключение
        app.setLoginItemSettings({
          openAtLogin: false,
          openAsHidden: false,
        });
      } else {
        // При включении создаем запись с аргументами
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: false,
          name: 'Lolka',
          path: process.execPath,
          args: ['--autostart'],
        });
      }

      // Ставим флаг что пользователь уже взаимодействовал с настройкой автозапуска
      this.setConfiguredFlag();

      this.logger.log(`Autostart ${enabled ? 'enabled' : 'disabled'} (Windows)`);
      return true;
    } catch (error) {
      this.logger.log('Error changing autostart settings:', { error: error.message });
      return false;
    }
  }

  setupIfNeeded() {
    try {
      // Автозапуск только для Windows
      if (!isWindows()) {
        this.logger.log('Autostart disabled for this platform');
        return;
      }

      // Настраиваем автозапуск только в продакшене и только если он еще не настроен
      if (isDev) {
        this.logger.log('[DEV] Autostart disabled in dev mode');
        return;
      }

      // Проверяем флаг что пользователь уже настраивал автозапуск
      if (this.isConfigured()) {
        this.logger.log('User already configured autostart, skipping auto-configuration');
        return;
      }

      // Проверяем текущий статус автозапуска
      const loginSettings = app.getLoginItemSettings();

      // Если автозапуск УЖЕ настроен (например, вручную), просто ставим флаг и выходим
      if (loginSettings.executableWillLaunchAtLogin || loginSettings.openAtLogin) {
        this.logger.log('Autostart already configured manually, setting flag', {
          executableWillLaunchAtLogin: loginSettings.executableWillLaunchAtLogin,
          openAtLogin: loginSettings.openAtLogin,
        });

        // Ставим флаг что настройка уже была
        this.setConfiguredFlag();
        return;
      }

      // Настраиваем автозапуск только при первом запуске после установки
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: false,
        name: 'Lolka',
        path: process.execPath,
        args: ['--autostart'],
      });

      // Ставим флаг что автозапуск настроен автоматически
      this.setConfiguredFlag();

      this.logger.log('Autostart configured on first launch (Windows)');
    } catch (error) {
      this.logger.log('Error configuring autostart:', { error: error.message });
    }
  }

  isConfigured() {
    try {
      const autostartFlagPath = this.getConfiguredFlagPath();
      return fs.existsSync(autostartFlagPath);
    } catch (error) {
      return false;
    }
  }

  setConfiguredFlag() {
    try {
      const autostartFlagPath = this.getConfiguredFlagPath();
      fs.writeFileSync(autostartFlagPath, new Date().toISOString());
    } catch (error) {
      this.logger.log('Failed to create autostart configuration flag:', { error: error.message });
    }
  }

  getConfiguredFlagPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, '.autostart-configured');
  }

  isAutoStarted() {
    return process.argv.includes('--autostart');
  }
}

module.exports = AutoStartManager;

