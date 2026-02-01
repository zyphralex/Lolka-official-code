const { app } = require('electron');
const { isMac } = require('../utils/platform');

class DeepLinkManager {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.pendingDeepLink = null;
  }

  registerProtocol() {
    if (!app.isDefaultProtocolClient('lolka')) {
      // Регистрируем приложение как обработчик протокола lolka://
      app.setAsDefaultProtocolClient('lolka');
      console.log('Registered protocol lolka://');
    }
  }

  setupMacOSHandler() {
    if (isMac()) {
      console.log('Setting up open-url handler for macOS');

      app.on('open-url', (event, incomingHref) => {
        event.preventDefault();
        console.log('macOS open-url event received:', incomingHref);

        if (!incomingHref || !incomingHref.startsWith('lolka://')) {
          console.log('Invalid deep link format in open-url:', incomingHref);
          return;
        }

        // Если окно готово, обрабатываем диплинк сразу
        console.log('Window ready, processing deep link immediately:', incomingHref);
        this.handleDeepLink(incomingHref);
      });
    }
  }

  handleDeepLink(url) {
    console.log('Processing deep link:', url);

    if (!url || !url.startsWith('lolka://')) {
      console.log('Invalid deep link format');
      return;
    }

    // Сохраняем диплинк для обработки
    this.pendingDeepLink = url;

    // Если окно уже создано, передаем диплинк в веб-приложение
    const mainWindow = this.windowManager.getMainWindow();
    if (mainWindow && mainWindow.webContents) {
      this.navigateToDeepLink(url);
    }
  }

  navigateToDeepLink(url) {
    const mainWindow = this.windowManager.getMainWindow();

    if (!mainWindow || !mainWindow.webContents) {
      console.log('Main window not ready for deep link navigation');
      return;
    }

    try {
      console.log(`Processing deep link: ${url}`);

      // Дополнительная проверка перед каждым обращением
      if (!mainWindow || !mainWindow.webContents) {
        console.log('Main window unavailable during deep link navigation');
        return;
      }

      // Показываем окно если оно скрыто
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }

      // Фокусируем окно
      mainWindow.focus();

      // Отправляем событие в renderer процесс с оригинальным URL
      // Пусть веб-приложение само решает куда переходить
      mainWindow.webContents.send('deep-link-navigate', {
        originalUrl: url,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error processing deep link:', error);
    }
  }

  getDeepLinkFromArgs(argv) {
    if (!argv || !Array.isArray(argv)) return null;

    // Ищем аргумент, начинающийся с lolka://
    const deepLinkArg = argv.find((arg) => arg && arg.startsWith('lolka://'));
    return deepLinkArg || null;
  }

  getPendingDeepLink() {
    console.log('Pending deep link requested:', this.pendingDeepLink);
    return this.pendingDeepLink;
  }

  clearPendingDeepLink() {
    console.log('Clearing pending deep link');
    this.pendingDeepLink = null;
    return true;
  }

  handlePendingDeepLinkIfExists() {
    if (this.pendingDeepLink) {
      console.log('Processing pending deep link:', this.pendingDeepLink);
      this.navigateToDeepLink(this.pendingDeepLink);
    }
  }
}

module.exports = DeepLinkManager;

