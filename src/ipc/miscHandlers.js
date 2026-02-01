const { ipcMain, app } = require('electron');
const { isMac } = require('../utils/platform');

function registerMiscHandlers(windowManager) {
  // Обновление badge в доке (macOS)
  ipcMain.on('unread-counts-update', (event, unreadCounts) => {
    updateDockBadge(unreadCounts);
  });

  // Обработчики для startup updater screen
  ipcMain.handle('close-startup-updater-screen', () => {
    console.log('Startup updater screen close requested from renderer process');
    windowManager.closeSplashWindow(0);
    return true;
  });

  ipcMain.handle('is-startup-updater-visible', () => {
    return windowManager.isSplashVisible();
  });

  ipcMain.handle('show-main-window', () => {
    return windowManager.showMainWindow();
  });
}

// Функция для обновления badge в доке
function updateDockBadge(unreadCounts) {
  if (!isMac()) {
    return; // Badge только для macOS
  }

  try {
    // Подсчитываем общее количество непрочитанных сообщений
    const totalUnread = Object.values(unreadCounts || {}).reduce((sum, count) => sum + (count.unreadCount || 0), 0);

    if (totalUnread > 0) {
      // Устанавливаем маленькую точку в доке если есть непрочитанные
      app.dock.setBadge('•');
    } else {
      // Убираем badge если нет непрочитанных
      app.dock.setBadge('');
    }

    console.log(`Dock badge updated: ${totalUnread > 0 ? 'dot shown' : 'hidden'} (total: ${totalUnread})`);
  } catch (error) {
    console.error('Failed to update dock badge:', error);
  }
}

module.exports = { registerMiscHandlers };

