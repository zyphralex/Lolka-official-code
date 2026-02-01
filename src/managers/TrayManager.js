const { Tray, Menu, app } = require('electron');
const { isMac, getIconPath } = require('../utils/platform');

class TrayManager {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.tray = null;
  }

  createTray() {
    // Создаем трей только для Windows и Linux
    if (isMac()) {
      return; // На macOS используем dock
    }

    try {
      // Используем иконку приложения для трея
      const trayIconPath = getIconPath('ic_launcher_round.png');

      this.tray = new Tray(trayIconPath);

      // Создаем контекстное меню для трея
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Выйти из Lolka',
          click: () => {
            app.quit();
          },
        },
      ]);

      this.tray.setContextMenu(contextMenu);
      this.tray.setToolTip('Lolka');

      // Обработка клика по иконке трея
      this.tray.on('click', () => {
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
          }
        }
      });

      // Обработка двойного клика по иконке трея
      this.tray.on('double-click', () => {
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        }
      });

      console.log('System tray created successfully');
    } catch (error) {
      console.error('Error creating system tray:', error);
    }
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      console.log('System tray cleared');
    }
  }

  getTray() {
    return this.tray;
  }
}

module.exports = TrayManager;

