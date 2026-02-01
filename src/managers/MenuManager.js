const { Menu, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { isMac, getIconPath } = require('../utils/platform');

class MenuManager {
  constructor(windowManager, logger) {
    this.windowManager = windowManager;
    this.logger = logger;
  }

  createMenu() {
    const template = [];

    // Меню приложения для macOS (первое меню с названием приложения)
    if (isMac()) {
      template.push({
        label: app.getName(),
        submenu: [
          {
            label: 'О Lolka',
            click: () => {
              this.showAboutDialog();
            },
          },
          { type: 'separator' },
          {
            label: 'Скрыть Lolka',
            accelerator: 'Command+H',
            role: 'hide',
          },
          {
            label: 'Скрыть остальные',
            accelerator: 'Command+Shift+H',
            role: 'hideothers',
          },
          {
            label: 'Показать все',
            role: 'unhide',
          },
          { type: 'separator' },
          {
            label: 'Выйти из Lolka',
            accelerator: 'Command+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      });
    }

    template.push({
      label: 'Файл',
      submenu: [
        // Добавляем "О Lolka" для Windows/Linux
        ...(!isMac()
          ? [
              {
                label: 'О Lolka',
                click: () => {
                  this.showAboutDialog();
                },
              },
              { type: 'separator' },
            ]
          : []),
        {
          label: 'Обновить',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.reload();
            }
          },
        },
        {
          label: 'Принудительное обновление',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          },
        },
        { type: 'separator' },
        // Выйти только для Windows/Linux (на macOS это в меню приложения)
        ...(!isMac()
          ? [
              {
                label: 'Выйти',
                accelerator: 'Ctrl+Q',
                click: () => {
                  app.quit();
                },
              },
            ]
          : []),
      ],
    });

    template.push({
      label: 'Правка',
      submenu: [
        { label: 'Отменить', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Повторить', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Вырезать', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Копировать', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Вставить', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Выделить все', accelerator: 'CmdOrCtrl+A', role: 'selectall' },
      ],
    });

    template.push({
      label: 'Вид',
      submenu: [
        { label: 'На весь экран', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Увеличить', accelerator: 'CmdOrCtrl+Plus', role: 'zoomin' },
        { label: 'Уменьшить', accelerator: 'CmdOrCtrl+-', role: 'zoomout' },
        { label: 'Реальный размер', accelerator: 'CmdOrCtrl+0', role: 'resetzoom' },
        { type: 'separator' },
        {
          label: 'Инструменты разработчика',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Логи автообновления',
          click: async () => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              try {
                const logFile = this.logger.getLogFile();
                let logs = 'Логи не найдены';

                if (logFile && fs.existsSync(logFile)) {
                  const logContent = fs.readFileSync(logFile, 'utf8');
                  logs = logContent.split('\n').slice(-20).join('\n'); // Последние 20 строк
                }

                dialog
                  .showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Логи автообновления',
                    message: 'Логи автообновления',
                    detail: `Лог файл: ${logFile}\n\nПоследние записи:\n${logs}`,
                    buttons: ['OK', 'Открыть папку с логами'],
                  })
                  .then((response) => {
                    if (response.response === 1) {
                      shell.openPath(path.dirname(logFile));
                    }
                  });
              } catch (error) {
                dialog.showErrorBox('Ошибка', 'Не удалось прочитать логи: ' + error.message);
              }
            }
          },
        },
      ],
    });

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  showAboutDialog() {
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) return;

    const version = app.getVersion();
    const electronVersion = process.versions.electron;
    const chromeVersion = process.versions.chrome;

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'О Lolka',
      message: 'Lolka',
      detail: `Версия: ${version}
Electron: ${electronVersion}
Chrome: ${chromeVersion}

© 2025 Lolka Team
Официальный клиент для lolka.app`,
      icon: getIconPath('ic_launcher_round.webp'),
      buttons: ['OK'],
    });
  }
}

module.exports = MenuManager;

