const { app, BrowserWindow } = require('electron');

const os = require('os');

// Утилиты (только базовые, нужные для early initialization)
const { loadEnvFile } = require('./src/utils/config');
const { isDev } = require('./src/utils/platform');

// Загружаем .env файл
loadEnvFile(__dirname);

// ============================================
// LINUX AUDIO FIX
// ============================================
// if (process.platform === 'linux') {
//   if (process.env.PULSE_LATENCY_MSEC === undefined) {
//     process.env.PULSE_LATENCY_MSEC = '30';
//   }
// }

// ============================================
// КРИТИЧЕСКИ ВАЖНО: ПРОВЕРКА SINGLE INSTANCE ПЕРВОЙ!
// ============================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('App instance already running, exiting immediately');
  app.quit();
  // Прекращаем выполнение скрипта, чтобы не инициализировать менеджеры
  process.exit(0);
}

// ============================================
// CHROMIUM FLAGS
// ============================================

// Autoplay без жестов пользователя (для voice/video)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Disabled features
const disabledFeatures = [
  'WinRetrieveSuggestionsOnlyOnDemand', // Фикс бага electron со spellcheck
  'HardwareMediaKeyHandling', // Не регистрироваться как медиа-плеер
  'MediaSessionService', // То же самое
  'UseEcoQoSForBackgroundProcess', // НЕ снижать приоритет процесса в фоне
  'IntensiveWakeUpThrottling', // НЕ троттлить wakeup таймеры в фоне
  'AllowAggressiveThrottlingWithWebSocket', // НЕ троттлить WebSocket соединения
];

// macOS: отключаем ScreenCaptureKit на версиях < Sequoia (macOS 15)
// Darwin 24.x = macOS 15 (Sequoia)
// if (process.platform === 'darwin') {
//   const darwinVersion = parseInt(os.release().split('.')[0]);
//   if (darwinVersion < 24) {
//     disabledFeatures.push('ScreenCaptureKitMac');
//     disabledFeatures.push('ScreenCaptureKitMacWindow');
//     disabledFeatures.push('ScreenCaptureKitMacScreen');
//     disabledFeatures.push('ScreenCaptureKitPickerScreen');
//     disabledFeatures.push('ScreenCaptureKitStreamPickerSonoma');
//     disabledFeatures.push('WarmScreenCaptureSonoma');
//     disabledFeatures.push('UseSCContentSharingPicker');
//   }
// }

// Windows: дополнительные флаги троттлинга
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
}

// Применяем disabled features
app.commandLine.appendSwitch('disable-features', disabledFeatures.join(','));

// ============================================
// GPU WORKAROUNDS
// ============================================

// Хелпер для NVIDIA device IDs
function NVIDIA(dev) {
  return [0x10de, dev];
}

// Список GPU с известными багами (GeForce 900 серия и некоторые другие)
const gpuWorkarounds = [
  {
    gpus: [
      NVIDIA(0x1340),
      NVIDIA(0x1341),
      NVIDIA(0x1344),
      NVIDIA(0x1346),
      NVIDIA(0x1347),
      NVIDIA(0x1348),
      NVIDIA(0x1349),
      NVIDIA(0x134b),
      NVIDIA(0x134d),
      NVIDIA(0x134e),
      NVIDIA(0x134f),
      NVIDIA(0x137a),
      NVIDIA(0x137b),
      NVIDIA(0x1380),
      NVIDIA(0x1381),
      NVIDIA(0x1382),
      NVIDIA(0x1390),
      NVIDIA(0x1391),
      NVIDIA(0x1392),
      NVIDIA(0x1393),
      NVIDIA(0x1398),
      NVIDIA(0x1399),
      NVIDIA(0x139a),
      NVIDIA(0x139b),
      NVIDIA(0x139c),
      NVIDIA(0x139d),
      NVIDIA(0x13b0),
      NVIDIA(0x13b1),
      NVIDIA(0x13b2),
      NVIDIA(0x13b3),
      NVIDIA(0x13b4),
      NVIDIA(0x13b6),
      NVIDIA(0x13b9),
      NVIDIA(0x13ba),
      NVIDIA(0x13bb),
      NVIDIA(0x13bc),
      NVIDIA(0x13c0),
      NVIDIA(0x13c2),
      NVIDIA(0x13d7),
      NVIDIA(0x13d8),
      NVIDIA(0x13d9),
      NVIDIA(0x13da),
      NVIDIA(0x13f0),
      NVIDIA(0x13f1),
      NVIDIA(0x13f2),
      NVIDIA(0x13f3),
      NVIDIA(0x13f8),
      NVIDIA(0x13f9),
      NVIDIA(0x13fa),
      NVIDIA(0x13fb),
      NVIDIA(0x1401),
      NVIDIA(0x1406),
      NVIDIA(0x1407),
      NVIDIA(0x1427),
      NVIDIA(0x1617),
      NVIDIA(0x1618),
      NVIDIA(0x1619),
      NVIDIA(0x161a),
      NVIDIA(0x1667),
      NVIDIA(0x174d),
      NVIDIA(0x174e),
      NVIDIA(0x179c),
      NVIDIA(0x17c2),
      NVIDIA(0x17c8),
      NVIDIA(0x17f0),
      NVIDIA(0x17f1),
      NVIDIA(0x17fd),
    ],
    switches: ['disable_accelerated_hevc_decode'],
    predicate: () => process.platform === 'win32',
  },
];

// Асинхронная функция для установки GPU флагов
async function setGPUFlags() {
  try {
    const info = await app.getGPUInfo('basic');
    for (const gpu of info.gpuDevice || []) {
      for (const workaround of gpuWorkarounds) {
        if (workaround.predicate()) {
          for (const g of workaround.gpus) {
            if (g[0] === gpu.vendorId && g[1] === gpu.deviceId) {
              for (const s of workaround.switches) {
                app.commandLine.appendSwitch(s, '1');
                console.log(`[GPU] Applied workaround: ${s} for device ${gpu.deviceId.toString(16)}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('[GPU] Failed to get GPU info:', error.message);
  }
}

// ============================================
// ТОЛЬКО ЕСЛИ ПОЛУЧИЛИ LOCK - ЗАГРУЖАЕМ И ИНИЦИАЛИЗИРУЕМ ВСЁ
// ============================================

const Logger = require('./src/utils/logger');

// Менеджеры
const WindowManager = require('./src/managers/WindowManager');
const TrayManager = require('./src/managers/TrayManager');
const UpdaterManager = require('./src/managers/UpdaterManager');
const DeepLinkManager = require('./src/managers/DeepLinkManager');
const AutoStartManager = require('./src/managers/AutoStartManager');
const MenuManager = require('./src/managers/MenuManager');
const ShortcutsManager = require('./src/managers/ShortcutsManager');
const ProcessMonitor = require('./src/managers/ProcessMonitor');

// PTTManager только для Windows/Linux
const PTTManager = process.platform !== 'darwin' ? require('./src/managers/PTTManager') : null;

// IPC Handlers
const { registerMediaHandlers } = require('./src/ipc/mediaHandlers');
const { registerUpdaterHandlers } = require('./src/ipc/updaterHandlers');
const { registerDesktopSourcesHandlers } = require('./src/ipc/desktopSourcesHandlers');
const { registerDeepLinkHandlers } = require('./src/ipc/deepLinkHandlers');
const { registerAutostartHandlers } = require('./src/ipc/autostartHandlers');
const { registerAudioCaptureHandlers, cleanupAudioCapture } = require('./src/ipc/audioCaptureHandlers');
const { registerMiscHandlers } = require('./src/ipc/miscHandlers');
const { initProcessHandlers, cleanupProcessHandlers } = require('./src/ipc/processHandlers');
const { registerHardwareHandlers } = require('./src/ipc/hardwareHandlers');

// PTT Handlers только для Windows/Linux
const { registerPTTHandlers } =
  process.platform !== 'darwin' ? require('./src/ipc/pttHandlers') : { registerPTTHandlers: null };

// Инициализируем менеджеры
const logger = new Logger(app);
const windowManager = new WindowManager(logger);
const trayManager = new TrayManager(windowManager);
const updaterManager = new UpdaterManager(logger, windowManager);
const pttManager = PTTManager ? new PTTManager(windowManager) : null;
const deepLinkManager = new DeepLinkManager(windowManager);
const autoStartManager = new AutoStartManager(logger);
const menuManager = new MenuManager(windowManager, logger);
const shortcutsManager = new ShortcutsManager(windowManager);
const processMonitor = new ProcessMonitor(logger);

// Связываем deepLinkManager с windowManager после инициализации
windowManager.setDeepLinkManager(deepLinkManager);

// Регистрируем протокол для диплинков
deepLinkManager.registerProtocol();

// Обработка второго экземпляра (когда диплинк открывается в уже запущенном приложении)
app.on('second-instance', (event, commandLine, workingDirectory) => {
  console.log('Second instance started with arguments:', commandLine);

  // Если у нас есть окно, показываем его
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    try {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    } catch (error) {
      console.error('Error restoring window:', error);
    }
  }

  // Проверяем диплинк в аргументах командной строки
  const deepLink = deepLinkManager.getDeepLinkFromArgs(commandLine);
  if (deepLink) {
    console.log('Deep link found in second instance:', deepLink);
    deepLinkManager.handleDeepLink(deepLink);
  }
});

// Обработка диплинка при первоначальном запуске
const initialDeepLink = deepLinkManager.getDeepLinkFromArgs(process.argv);
if (initialDeepLink) {
  console.log('Deep link found at startup:', initialDeepLink);
  deepLinkManager.handleDeepLink(initialDeepLink);
}

// Настройка обработчиков диплинков для macOS
deepLinkManager.setupMacOSHandler();

// Регистрируем все IPC handlers
function registerAllIpcHandlers() {
  try {
    registerMediaHandlers();
    registerUpdaterHandlers(updaterManager, logger);
    registerDesktopSourcesHandlers(windowManager);
    registerDeepLinkHandlers(deepLinkManager);
    if (registerPTTHandlers && pttManager) {
      registerPTTHandlers(pttManager);
    }
    registerAutostartHandlers(autoStartManager);
    registerAudioCaptureHandlers();
    registerMiscHandlers(windowManager);
    initProcessHandlers(processMonitor);
    registerHardwareHandlers();

    console.log('All IPC handlers registered');
  } catch (error) {
    console.error('Error registering IPC handlers:', error);
  }
}

// Обработка закрытия окна (для трея на Windows/Linux и dock на macOS)
function setupWindowCloseHandler() {
  let forceQuit = false;

  app.on('before-quit', () => {
    forceQuit = true;
  });

  // Нужно подписаться на событие после создания окна
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    mainWindow.on('close', (event) => {
      if (!forceQuit) {
        event.preventDefault();
        mainWindow.hide();
      }
    });
  }
}

// Готовность приложения (сначала GPU flags, потом whenReady)
setGPUFlags()
  .then(() => app.whenReady())
  .then(async () => {
    logger.log(`Application started in ${isDev ? 'DEV' : 'PRODUCTION'} mode`);
    logger.log(`App version: ${app.getVersion()}`);
    logger.log(`Operating system: ${process.platform} ${process.arch}`);
    logger.log(`User data folder: ${app.getPath('userData')}`);

    ///Windows: установить GPU Priority для лучшего захвата экрана (как OBS/Discord)
    if (process.platform === 'win32') {
      try {
        const gpuPriority = require('./lib/gpu-priority-win');
        const success = gpuPriority.setGPUPriority();
        logger.log(`GPU priority set: ${success}`);
      } catch (error) {
        logger.log(`Failed to set GPU priority: ${error.message}`);
      }
    }

    // Проверяем флаг автозапуска
    if (autoStartManager.isAutoStarted()) {
      logger.log('Started via system autostart');
    }

    // Настраиваем автозапуск только если он еще не настроен
    autoStartManager.setupIfNeeded();

    // Регистрируем все IPC handlers
    registerAllIpcHandlers();

    // Создаем startup updater screen первым
    windowManager.createSplashWindow();

    // Создаем меню и настройки
    menuManager.createMenu();
    shortcutsManager.setup();

    // Инициализируем PTT (только для Windows/Linux)
    if (pttManager) {
      await pttManager.initialize();
    }

    // Настраиваем систему автообновлений
    updaterManager.setup();

    // Настраиваем callback для создания окна в UpdaterManager
    updaterManager.setOnWindowCreatedCallback(() => {
      setupWindowCloseHandler();
      trayManager.createTray();
    });

    // Запускаем проверку обновлений
    updaterManager.startInitialCheck(500);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const status = updaterManager.getStatus();
        // При активации создаем окно ТОЛЬКО если проверка обновлений уже завершена
        if (status.isUpdateCheckComplete && !status.isUpdateInProgress) {
          if (!windowManager.getMainWindow()) {
            windowManager.createMainWindow();
            setupWindowCloseHandler();
            trayManager.createTray();
          }
        } else if (!windowManager.getSplashWindow()) {
          // Если проверка еще не завершена, показываем splash screen
          windowManager.createSplashWindow();
          logger.log('Activation - waiting for update check to complete');
        }
      } else {
        const mainWindow = windowManager.getMainWindow();
        const status = updaterManager.getStatus();
        if (mainWindow && status.isUpdateCheckComplete && !status.isUpdateInProgress) {
          mainWindow.show();
        }
      }
    });
  })
  .catch((error) => {
    console.error('Error bootstrapping:', error);
  });

// Выход из приложения
app.on('window-all-closed', () => {
  // На macOS приложения обычно остаются активными даже когда все окна закрыты
  // На Windows/Linux если есть трей - не завершаем приложение
  if (process.platform !== 'darwin' && !trayManager.getTray()) {
    app.quit();
  }
});

// Очистка ресурсов при выходе
app.on('will-quit', () => {
  shortcutsManager.unregisterAll();
  if (pttManager) {
    pttManager.stop();
  }
  cleanupProcessHandlers();
  cleanupAudioCapture();  // Release WASAPI resources
  trayManager.destroy();
  console.log('Application terminated');
});

// Безопасность: открываем внешние ссылки в системном браузере
app.on('web-contents-created', (event, contents) => {
  const { shell } = require('electron');

  contents.setWindowOpenHandler(({ url }) => {
    console.log('[Main] Opening external URL:', url);
    shell.openExternal(url).catch((err) => {
      console.error('[Main] Failed to open external URL:', url, err);
    });
    return { action: 'deny' };
  });
});
