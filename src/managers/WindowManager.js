const { BrowserWindow, desktopCapturer, systemPreferences } = require('electron');
const path = require('path');
const { LOLKA_APP_URL } = require('../utils/config');
const { isDev, isMac, getIconPath } = require('../utils/platform');

class WindowManager {
  constructor(logger, deepLinkManager = null) {
    this.logger = logger;
    this.deepLinkManager = deepLinkManager;
    this.mainWindow = null;
    this.splashWindow = null;
    this.selectedDisplayMediaSourceId = null;
    this.retryTimer = null;
    this.RETRY_INTERVAL = 5000; // 5 секунд между ретраями
  }

  setDeepLinkManager(deepLinkManager) {
    this.deepLinkManager = deepLinkManager;
  }

  createMainWindow() {
    // Создаем главное окно приложения
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#121212',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '..', '..', 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        // Разрешения для звука и медиа
        backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required',
      },
      icon: getIconPath('ic_launcher_round.webp'),
      show: false,
      // titleBarOverlay: для Windows - объект с настройками, для macOS - true
      titleBarOverlay: isMac()
        ? true
        : {
            color: '#121212', // Цвет фона titlebar
            symbolColor: '#3f4248', // Цвет кнопок управления окном
            height: 31, // Высота titlebar
          },
      titleBarStyle: 'hidden',
      frame: false,
      // Разрешаем полноэкранный режим окна (важно для macOS)
      fullscreenable: true,
    });

    // Настройки для разрешения звука и медиа
    this.setupMediaPermissions();

    // Хэндлер выбора источника для getDisplayMedia в Electron
    this.setupDisplayMediaHandler();

    // Настраиваем обработчики событий
    this.setupMainWindowHandlers();

    // Загружаем lolka.app с retry
    this.loadMainUrl();

    // Открываем DevTools в dev режиме
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    return this.mainWindow;
  }

  createSplashWindow() {
    this.splashWindow = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      alwaysOnTop: true,
      transparent: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '..', '..', 'preload.js'),
        webSecurity: true,
      },
      icon: getIconPath('ic_launcher_round.webp'),
      show: false,
    });

    // Загружаем startup updater screen из файла
    const startupUpdaterPath = path.join(__dirname, '..', '..', 'ui', 'startup-updater', 'startup-updater.html');
    this.splashWindow.loadFile(startupUpdaterPath);

    // Отключаем контекстное меню на splash screen
    this.splashWindow.webContents.on('context-menu', (e) => e.preventDefault());

    this.splashWindow.once('ready-to-show', () => {
      this.splashWindow.show();
      this.splashWindow.center();
    });

    this.splashWindow.on('closed', () => {
      this.splashWindow = null;
    });

    return this.splashWindow;
  }

  closeSplashWindow(delay = 1000) {
    if (this.splashWindow && !this.splashWindow.isDestroyed()) {
      this.logger.log('Closing startup updater screen...');
      setTimeout(() => {
        if (this.splashWindow && !this.splashWindow.isDestroyed()) {
          this.splashWindow.close();
          this.splashWindow = null;
        }
      }, delay);
    }
  }

  setupMediaPermissions() {
    this.mainWindow.webContents.session.setPermissionRequestHandler(async (webContents, permission, callback) => {
      const allowedPermissions = [
        'media',
        'audioCapture',
        'videoCapture',
        'fullscreen',
        'clipboard-read',
        'clipboard-sanitized-write',
      ];

      if (allowedPermissions.includes(permission)) {
        try {
          let hasAccess = true;

          // Для fullscreen и clipboard системных разрешений не требуется
          if (permission === 'fullscreen' || permission.startsWith('clipboard')) {
            callback(true);
            return;
          }

          if (permission === 'media' || permission === 'audioCapture') {
            if (isMac()) {
              const micAccess = await systemPreferences.askForMediaAccess('microphone');
              if (!micAccess) hasAccess = false;
            }
            // На Windows/Linux разрешения не требуются для desktop приложений
          }

          if (permission === 'media' || permission === 'videoCapture') {
            if (isMac()) {
              const camAccess = await systemPreferences.askForMediaAccess('camera');
              if (!camAccess) hasAccess = false;
            }
            // На Windows/Linux разрешения не требуются для desktop приложений
          }

          console.log(`Permission ${permission} requested, system access: ${hasAccess}`);
          callback(hasAccess);
        } catch (error) {
          console.error('Failed to request system media permissions:', error);
          callback(false);
        }
      } else {
        callback(false);
      }
    });

    // Разрешаем все медиа-разрешения
    this.mainWindow.webContents.session.setPermissionCheckHandler(() => {
      return true;
    });
  }

  setupDisplayMediaHandler() {
    try {
      this.mainWindow.webContents.session.setDisplayMediaRequestHandler(
        async (_request, callback) => {
          try {
            const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
            let videoSource = null;

            if (this.selectedDisplayMediaSourceId) {
              videoSource = sources.find((s) => s.id === this.selectedDisplayMediaSourceId) || null;
            }

            // Фолбэк: первый экран
            if (!videoSource && sources.length > 0) {
              videoSource = sources[0];
            }

            if (videoSource) {
              // Аудио не включаем здесь — системный звук берем через WASAPI
              callback({ video: videoSource, audio: false });
            } else {
              callback({ video: false, audio: false });
            }
          } catch (e) {
            console.error('setDisplayMediaRequestHandler error:', e);
            callback({ video: false, audio: false });
          }
        },
        { useSystemPicker: false },
      );
    } catch (e) {
      console.warn('setDisplayMediaRequestHandler is not available:', e?.message || e);
    }
  }

  setupMainWindowHandlers() {
    const { shell } = require('electron');

    // Обработка навигации
    this.mainWindow.webContents.on('did-navigate', (event, url, httpResponseCode) => {
      console.log(`[NAV] did-navigate: ${url} (code: ${httpResponseCode})`);

      // Игнорируем навигацию на локальные файлы (error page)
      if (url.startsWith('file://')) return;

      // Отменяем предыдущий retry таймер при навигации на основной URL
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }

      // HTTP ошибки 4xx/5xx - показываем error page и планируем retry
      if (httpResponseCode >= 400 && url.startsWith(LOLKA_APP_URL)) {
        console.log(`[RETRY] HTTP error ${httpResponseCode}, showing error page`);
        this.showErrorPage();
      }
    });

    // Показываем окно когда оно готово
    this.mainWindow.once('ready-to-show', () => {
      // Закрываем startup updater screen если он есть
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        this.closeSplashWindow(0); // Закрываем немедленно
      }

      // Показываем главное окно
      this.mainWindow.show();
      this.mainWindow.focus();

      // Обрабатываем отложенный диплинк если он есть
      if (this.deepLinkManager) {
        this.deepLinkManager.handlePendingDeepLinkIfExists();
      }

      this.logger.log('Main window shown - update check completed');
    });

    // Обработка внешних ссылок
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      console.log('[WindowManager] Opening external URL:', url);
      shell.openExternal(url).catch((err) => {
        console.error('[WindowManager] Failed to open external URL:', url, err);
      });
      return { action: 'deny' };
    });

    // Предотвращаем навигацию на внешние сайты
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      console.log(`[NAV] will-navigate: ${navigationUrl}`);
      const parsedUrl = new URL(navigationUrl);

      if (parsedUrl.origin !== LOLKA_APP_URL) {
        console.log(`[NAV] Blocking navigation to external: ${navigationUrl}`);
        event.preventDefault();
        shell.openExternal(navigationUrl).catch((err) => {
          console.error('[NAV] Failed to open external URL:', navigationUrl, err);
        });
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  getMainWindow() {
    return this.mainWindow;
  }

  getSplashWindow() {
    return this.splashWindow;
  }

  getMainWebContents() {
    return this.mainWindow && !this.mainWindow.isDestroyed() ? this.mainWindow.webContents : null;
  }

  setSelectedDisplayMediaSourceId(sourceId) {
    this.selectedDisplayMediaSourceId = sourceId || null;
  }

  showMainWindow() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.splashWindow && !this.splashWindow.isDestroyed()) {
        this.closeSplashWindow(0);
      }
      this.mainWindow.show();
      this.mainWindow.focus();
      return true;
    }
    return false;
  }

  isSplashVisible() {
    return this.splashWindow && !this.splashWindow.isDestroyed() && this.splashWindow.isVisible();
  }

  // Загрузка основного URL (как в Vesktop)
  loadMainUrl() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    // Отменяем предыдущий retry таймер
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    const url = `${LOLKA_APP_URL}/login?_t=${Date.now()}`;
    console.log(`[RETRY] Loading: ${url}`);

    this.mainWindow.loadURL(url).catch((error) => {
      // Сетевые ошибки - показываем error page
      console.log(`[RETRY] Network error: ${error.message}`);
      this.showErrorPage();
    });
  }

  // Показать страницу ошибки и запланировать retry
  showErrorPage() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const errorPagePath = path.join(__dirname, '..', '..', 'ui', 'error-page', 'error-page.html');
    this.mainWindow.loadFile(errorPagePath);

    // Планируем retry через 5 сек
    console.log(`[RETRY] Will retry in ${this.RETRY_INTERVAL}ms`);
    this.retryTimer = setTimeout(() => {
      this.loadMainUrl();
    }, this.RETRY_INTERVAL);
  }
}

module.exports = WindowManager;
