const { globalShortcut } = require('electron');

class ShortcutsManager {
  constructor(windowManager) {
    this.windowManager = windowManager;
  }

  setup() {
    try {
      // Ctrl+Shift+I или F12 для открытия/закрытия DevTools
      globalShortcut.register('CommandOrControl+Shift+I', () => {
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow && mainWindow.webContents && mainWindow.isFocused()) {
          console.log('DevTools toggle requested via Ctrl+Shift+I');
          mainWindow.webContents.toggleDevTools();
        }
      });

      globalShortcut.register('F12', () => {
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow && mainWindow.webContents && mainWindow.isFocused()) {
          console.log('DevTools toggle requested via F12');
          mainWindow.webContents.toggleDevTools();
        }
      });

      // Ctrl+Shift+R для принудительной перезагрузки (дополнительно)
      globalShortcut.register('CommandOrControl+Shift+R', () => {
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow && mainWindow.webContents && mainWindow.isFocused()) {
          console.log('Force reload requested via Ctrl+Shift+R');
          mainWindow.webContents.reloadIgnoringCache();
        }
      });

      console.log('Global shortcuts registered:');
      console.log('  Ctrl+Shift+I or F12 - Open/close DevTools');
      console.log('  Ctrl+Shift+R - Force reload');
    } catch (error) {
      console.error('Error registering global shortcuts:', error);
    }
  }

  unregisterAll() {
    globalShortcut.unregisterAll();
    console.log('Global shortcuts unregistered');
  }
}

module.exports = ShortcutsManager;

