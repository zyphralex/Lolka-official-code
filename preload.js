console.log('Preload script started loading...');

const { contextBridge, ipcRenderer, clipboard } = require('electron');

console.log('Electron modules loaded successfully');

// Создаем глобальную переменную для отладки
globalThis.electronDebug = {
  ipcRenderer,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
};

// Открываем безопасный API для renderer процесса
console.log('Creating electronAPI via contextBridge...');
contextBridge.exposeInMainWorld('electronAPI', {
  // Метод для обновления каунтеров непрочитанных сообщений
  updateUnreadCounts: (unreadCounts) => {
    ipcRenderer.send('unread-counts-update', unreadCounts);
  },

  // API для автообновления
  updater: {
    // Проверить обновления
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

    // Установить обновление
    installUpdate: () => ipcRenderer.invoke('install-update'),

    // Получить версию приложения
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Получить логи автообновления
    getUpdaterLogs: () => ipcRenderer.invoke('get-updater-logs'),

    // Очистить логи автообновления
    clearUpdaterLogs: () => ipcRenderer.invoke('clear-updater-logs'),

    // Слушатели событий обновления
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download-progress', (event, progress) => callback(progress));
    },

    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (event, info) => callback(info));
    },

    onUpdaterLog: (callback) => {
      ipcRenderer.on('updater-log', (event, logData) => callback(logData));
    },

    // Удалить слушатели
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    },
  },

  // Удобные сокращения для часто используемых методов (прямой доступ)
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getUpdaterLogs: () => ipcRenderer.invoke('get-updater-logs'),

  // API для работы с буфером обмена
  clipboard: {
    // Записать текст в буфер обмена
    writeText: (text) => clipboard.writeText(text),

    // Прочитать текст из буфера обмена
    readText: () => clipboard.readText(),

    // Очистить буфер обмена
    clear: () => clipboard.clear(),
  },

  // API для screen sharing в Electron
  desktopCapturer: {
    // Получить источники для screen share (экраны и окна)
    getSources: (options) => ipcRenderer.invoke('get-desktop-sources', options),
    // Установить выбранный источник для getDisplayMedia()
    setSelectedSource: (sourceId) => ipcRenderer.invoke('set-display-media-selected-source', sourceId),
  },

  // API для работы с диплинками
  deepLinks: {
    // Получить отложенный диплинк
    getPendingDeepLink: () => ipcRenderer.invoke('get-pending-deep-link'),

    // Обработать диплинк
    handleDeepLink: (url) => ipcRenderer.invoke('handle-deep-link', url),

    // Очистить отложенный диплинк
    clearPendingDeepLink: () => ipcRenderer.invoke('clear-pending-deep-link'),

    // Слушатель событий навигации по диплинку
    onDeepLinkNavigate: (callback) => {
      ipcRenderer.on('deep-link-navigate', (event, data) => callback(data));
    },

    // Удалить слушатель диплинков
    removeDeepLinkListener: () => {
      ipcRenderer.removeAllListeners('deep-link-navigate');
    },
  },

  // API для startup updater screen
  startupUpdater: {
    // Закрыть startup updater screen
    close: () => ipcRenderer.invoke('close-startup-updater-screen'),

    // Проверить, виден ли startup updater screen
    isVisible: () => ipcRenderer.invoke('is-startup-updater-visible'),

    // Показать основное окно
    showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  },

  // API для глобального слушателя событий ввода
  globalInput: {
    isAvailable: () => ipcRenderer.invoke('ptt-is-available'),
    hasPermission: () => ipcRenderer.invoke('ptt-has-permission'),
    requestPermission: () => ipcRenderer.invoke('ptt-request-permission'),
    onEvent: (callback) => {
      ipcRenderer.on('global-input-event', (_, data) => callback(data));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('global-input-event');
    },
  },

  // API для управления автозапуском
  autostart: {
    // Получить текущий статус автозапуска
    getStatus: () => ipcRenderer.invoke('get-autostart-status'),

    // Включить/отключить автозапуск
    setEnabled: (enabled) => ipcRenderer.invoke('set-autostart', enabled),
  },

  // API для WASAPI audio capture (Windows only)
  audioCapture: {
    initialize: () => ipcRenderer.invoke('audio-capture-initialize'),
    start: (options) => ipcRenderer.invoke('audio-capture-start', options),
    stop: () => ipcRenderer.invoke('audio-capture-stop'),
    getBuffer: () => ipcRenderer.invoke('audio-capture-get-buffer'),
    getParams: () => ipcRenderer.invoke('audio-capture-get-params'),
    getSessions: () => ipcRenderer.invoke('audio-capture-get-sessions'),
  },

  // API для мониторинга процессов (Windows only)
  processMonitor: {
    // Получить список процессов (одноразовый запрос)
    getProcessList: () => ipcRenderer.invoke('process:getList'),
  },

  // API для получения информации о железе
  hardware: {
    getInfo: () => ipcRenderer.invoke('get-hardware-info'),
  },
});

console.log('electronAPI created successfully via contextBridge');

// Проверяем, попал ли API в window сразу после создания
setTimeout(() => {
  console.log('Checking API right after creation:', !!window.electronAPI);
  if (window.electronAPI) {
    console.log('API available right after creation');
  } else {
    console.log('API not available right after creation');

    // Попробуем альтернативный способ
    console.log('Trying alternative method...');
    try {
      // Создаем API прямо в window (только для отладки)
      if (typeof window !== 'undefined') {
        window.electronAPI = {
          getAppVersion: () => ipcRenderer.invoke('get-app-version'),
          checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
          getUpdaterLogs: () => ipcRenderer.invoke('get-updater-logs'),
          updater: {
            installUpdate: () => ipcRenderer.invoke('install-update'),
            onUpdaterLog: (callback) => ipcRenderer.on('updater-log', (event, logData) => callback(logData)),
            removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
          },
          deepLinks: {
            getPendingDeepLink: () => ipcRenderer.invoke('get-pending-deep-link'),
            handleDeepLink: (url) => ipcRenderer.invoke('handle-deep-link', url),
            clearPendingDeepLink: () => ipcRenderer.invoke('clear-pending-deep-link'),
            onDeepLinkNavigate: (callback) => ipcRenderer.on('deep-link-navigate', (event, data) => callback(data)),
          },
          startupUpdater: {
            close: () => ipcRenderer.invoke('close-startup-updater-screen'),
            isVisible: () => ipcRenderer.invoke('is-startup-updater-visible'),
            showMainWindow: () => ipcRenderer.invoke('show-main-window'),
          },
        };
        console.log('Alternative API created in window');
      }
    } catch (error) {
      console.error('Error creating alternative API:', error);
    }
  }
}, 0);

// Предотвращаем доступ к Node.js API из renderer процесса
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, checking electronAPI...');
  console.log('window.electronAPI at DOMContentLoaded:', !!window.electronAPI);

  // Простая проверка API без циклов
  setTimeout(() => {
    console.log('Checking electronAPI after 500ms...');
    console.log('window.electronAPI now:', typeof window.electronAPI);

    if (window.electronAPI) {
      console.log('electronAPI found! Initializing functions...');
      console.log('Available methods:');
      console.log('  - window.electronAPI.getAppVersion()');
      console.log('  - window.electronAPI.checkForUpdates()');
      console.log('  - window.electronAPI.getUpdaterLogs()');
      console.log('  - window.electronAPI.updater.installUpdate()');

      // Создаем простые debug функции
      window.debug = {
        updater: {
          check: () => window.electronAPI.checkForUpdates(),
          version: () => window.electronAPI.getAppVersion(),
          logs: () => window.electronAPI.getUpdaterLogs(),
          help: () => console.log('Available: debug.updater.check(), debug.updater.version(), debug.updater.logs()'),
        },
        deepLinks: {
          getPending: () => window.electronAPI.deepLinks.getPendingDeepLink(),
          handle: (url) => window.electronAPI.deepLinks.handleDeepLink(url),
          clear: () => window.electronAPI.deepLinks.clearPendingDeepLink(),
          testInvite: () => window.electronAPI.deepLinks.handleDeepLink('lolka://invite/test123'),
          testServer: () => window.electronAPI.deepLinks.handleDeepLink('lolka://server/1'),
          listen: (callback) => window.electronAPI.deepLinks.onDeepLinkNavigate(callback),
          help: () =>
            console.log(
              'Available: debug.deepLinks.getPending(), debug.deepLinks.handle(url), debug.deepLinks.clear(), debug.deepLinks.testInvite(), debug.deepLinks.testServer(), debug.deepLinks.listen(callback)',
            ),
        },
        ui: {
          showStartupUpdater: () =>
            window.electronAPI.startupUpdater
              .isVisible()
              .then((visible) => console.log('Startup Updater visible:', visible)),
          help: () => console.log('Available: debug.ui.showStartupUpdater()'),
        },
        autostart: {
          getStatus: () => window.electronAPI.autostart.getStatus(),
          enable: () => window.electronAPI.autostart.setEnabled(true),
          disable: () => window.electronAPI.autostart.setEnabled(false),
          help: () =>
            console.log('Available: debug.autostart.getStatus(), debug.autostart.enable(), debug.autostart.disable()'),
        },
      };

      // Показываем версию
      window.electronAPI
        .getAppVersion()
        .then((version) => {
          console.log(`App version: ${version}`);
        })
        .catch((err) => {
          console.error('Error getting version:', err);
        });
    } else {
      console.error('electronAPI still not found after 500ms');
      console.log(
        'Searching for electron-related keys:',
        Object.keys(window).filter((k) => k.toLowerCase().includes('electron')),
      );
      console.log('Total window keys count:', Object.keys(window).length);

      // Проверяем альтернативные способы
      console.log('globalThis.electronDebug:', !!globalThis.electronDebug);

      if (globalThis.electronDebug) {
        console.log('Found globalThis.electronDebug! Creating window.electronAPI...');
        window.electronAPI = {
          getAppVersion: globalThis.electronDebug.getAppVersion,
          checkForUpdates: globalThis.electronDebug.checkForUpdates,
        };

        window.debug = {
          updater: {
            version: () => globalThis.electronDebug.getAppVersion(),
            check: () => globalThis.electronDebug.checkForUpdates(),
            help: () => console.log('Available via globalThis: debug.updater.version(), debug.updater.check()'),
          },
        };

        console.log('API restored via globalThis.electronDebug');

        // Тестируем версию
        globalThis.electronDebug.getAppVersion().then((version) => {
          console.log(`Version (via globalThis): ${version}`);
        });
      }
    }
  }, 500);

  // Полифилл для navigator.clipboard API
  if (!navigator.clipboard) {
    navigator.clipboard = {};
  }

  // Переопределяем методы clipboard для работы через Electron API
  navigator.clipboard.writeText = function (text) {
    return new Promise((resolve, reject) => {
      try {
        window.electronAPI.clipboard.writeText(text);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  navigator.clipboard.readText = function () {
    return new Promise((resolve, reject) => {
      try {
        const text = window.electronAPI.clipboard.readText();
        resolve(text);
      } catch (error) {
        reject(error);
      }
    });
  };
});
