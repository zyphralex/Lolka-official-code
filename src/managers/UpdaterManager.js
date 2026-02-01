const { autoUpdater } = require('electron-updater');
const { isDev } = require('../utils/platform');

class UpdaterManager {
  constructor(logger, windowManager) {
    this.logger = logger;
    this.windowManager = windowManager;
    this.isUpdateInProgress = false;
    this.isUpdateCheckComplete = false;
    this.onWindowCreatedCallback = null;
  }

  setOnWindowCreatedCallback(callback) {
    this.onWindowCreatedCallback = callback;
  }

  createMainWindowWithCallback() {
    this.windowManager.createMainWindow();
    if (this.onWindowCreatedCallback) {
      this.onWindowCreatedCallback();
    }
  }

  setup() {
    // Настраиваем сервер обновлений для Яндекс Облако S3
    autoUpdater.setFeedURL({
      provider: 's3',
      bucket: process.env.YANDEX_BUCKET || 'lolka-electron',
      region: process.env.YANDEX_REGION || 'ru-central1',
      endpoint: process.env.YANDEX_ENDPOINT || 'https://storage.yandexcloud.net',
      path: process.env.YANDEX_PATH || '/releases',
    });

    // Настройка автоматического скачивания
    if (isDev) {
      autoUpdater.autoDownload = false;
      autoUpdater.forceDevUpdateConfig = true;
      this.logger.log('DEV MODE: Auto-download disabled');
    } else {
      autoUpdater.autoDownload = true;
      this.logger.log('PRODUCTION MODE: Fully automatic updates');
    }

    // Логируем конфигурацию автообновления
    this.logger.log('Auto-update configuration:', {
      bucket: process.env.YANDEX_BUCKET || 'lolka-electron',
      region: process.env.YANDEX_REGION || 'ru-central1',
      endpoint: process.env.YANDEX_ENDPOINT || 'https://storage.yandexcloud.net',
      path: process.env.YANDEX_PATH || '/releases',
      autoDownload: autoUpdater.autoDownload,
      forceDevUpdateConfig: autoUpdater.forceDevUpdateConfig,
    });

    // Настройка для правильного обновления на Windows
    if (process.platform === 'win32') {
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.forceDevUpdateConfig = false;
    }

    this.logger.log('Periodic update check disabled - only on app startup');

    // Настраиваем обработчики событий
    this.setupEventHandlers();
  }

  sendToSplash(type, message, data = null) {
    const logData = { type, message, data, timestamp: new Date().toISOString() };
    const splashWindow = this.windowManager.getSplashWindow();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('updater-log', logData);
    }
  }

  setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      this.logger.log(isDev ? '[DEV] Checking for updates...' : 'Checking for updates...');
      this.sendToSplash('checking', 'Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      this.isUpdateInProgress = true;

      if (isDev) {
        this.logger.log(`[DEV] Update available: ${info.version} (download disabled in dev mode)`, info);
      } else {
        this.logger.log(`Update available: ${info.version}`, info);
      }
      this.sendToSplash('available', `Update available: ${info.version}`, info);
    });

    autoUpdater.on('update-not-available', (info) => {
      this.isUpdateCheckComplete = true;
      this.logger.log(isDev ? '[DEV] No updates found - all up to date!' : 'No updates found');
      this.sendToSplash('not-available', 'No updates found');

      // Создаем главное окно если его еще нет
      if (!this.windowManager.getMainWindow()) {
        this.logger.log('Creating main window - no updates');
        this.createMainWindowWithCallback();
      }
    });

    autoUpdater.on('error', (err) => {
      this.isUpdateInProgress = false;
      this.isUpdateCheckComplete = true;

      this.logger.log(isDev ? '[DEV] Auto-update error:' : 'Auto-update error:', {
        error: err.message,
        stack: err.stack,
      });
      this.sendToSplash('error', 'Error', { error: err.message });

      // Создаем главное окно при ошибке если его еще нет
      if (!this.windowManager.getMainWindow()) {
        this.logger.log('Creating main window - update error');
        this.createMainWindowWithCallback();
      }
    });

    // События скачивания работают только в продакшене
    if (!isDev) {
      autoUpdater.on('download-progress', (progressObj) => {
        const progressMessage = `Downloading: ${progressObj.percent.toFixed(1)}% (${progressObj.transferred}/${
          progressObj.total
        } bytes)`;
        this.logger.log(progressMessage, progressObj);

        // Отправляем прогресс в renderer процесс (приоритет splash window)
        const splashWindow = this.windowManager.getSplashWindow();
        const mainWindow = this.windowManager.getMainWindow();

        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('download-progress', progressObj);
        } else if (mainWindow) {
          mainWindow.webContents.send('download-progress', progressObj);
        }
      });

      autoUpdater.on('update-downloaded', (info) => {
        this.logger.log(`Update downloaded: ${info.version}`, info);

        // Отправляем уведомление в renderer процесс
        const splashWindow = this.windowManager.getSplashWindow();
        const mainWindow = this.windowManager.getMainWindow();

        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('update-downloaded', info);
        }
        if (mainWindow) {
          mainWindow.webContents.send('update-downloaded', info);
        }

        // Полностью автоматическое обновление - НИКАКИХ диалогов и уведомлений
        this.logger.log('Auto-installing update and restarting...');

        // Мгновенная установка без вопросов
        setTimeout(() => {
          autoUpdater.quitAndInstall();
        }, 500);
      });
    } else {
      // В dev режиме эмулируем события для тестирования
      autoUpdater.on('update-available', (info) => {
        this.logger.log('[DEV] In production, download would start here...');
        // В dev режиме сбрасываем флаг через 5 секунд для тестирования
        setTimeout(() => {
          this.isUpdateInProgress = false;
          this.isUpdateCheckComplete = true;
          this.logger.log('[DEV] Emulating update process completion');

          // Создаем главное окно в dev режиме если его еще нет
          if (!this.windowManager.getMainWindow()) {
            this.logger.log('[DEV] Creating main window - emulation complete');
            this.createMainWindowWithCallback();
          }
        }, 5000);
      });
    }
  }

  async checkForUpdates() {
    try {
      this.logger.log(isDev ? '[DEV] Manual update check requested...' : 'Manual update check requested...');
      const result = await autoUpdater.checkForUpdates();
      this.logger.log('Update check completed', result);
      return result;
    } catch (error) {
      this.logger.log(isDev ? '[DEV] Error during manual update check:' : 'Error during manual update check:', {
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }

  installUpdate() {
    if (!isDev) {
      this.logger.log('Update installation requested, restarting app...');
      autoUpdater.quitAndInstall();
    } else {
      this.logger.log('[DEV] Update installation requested, but disabled in dev mode');
    }
  }

  getStatus() {
    return {
      isUpdateInProgress: this.isUpdateInProgress,
      isUpdateCheckComplete: this.isUpdateCheckComplete,
    };
  }

  startInitialCheck(delay = 500) {
    setTimeout(() => {
      this.logger.log('Starting initial update check...');
      this.logger.log('Main window will NOT be created until update check completes');
      autoUpdater.checkForUpdates();

      // В dev режиме автообновление не работает, поэтому создаем окно принудительно через таймаут
      if (isDev) {
        setTimeout(() => {
          if (!this.isUpdateCheckComplete && !this.windowManager.getMainWindow()) {
            this.logger.log('[DEV] Auto-update not working in dev mode - creating main window forcefully');
            this.isUpdateCheckComplete = true;
            this.windowManager.createMainWindow();
          }
        }, 3000);
      }
    }, delay);
  }
}

module.exports = UpdaterManager;
