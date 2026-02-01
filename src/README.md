# Структура кода Electron приложения

Этот проект рефакторен с монолитного `main.js` (1591 строка) на модульную архитектуру для улучшения читаемости и поддержки.

## Структура папок

```
src/
├── managers/           # Менеджеры основных компонентов
│   ├── WindowManager.js       # Управление главным окном и splash screen
│   ├── TrayManager.js         # Системный трей (Windows/Linux)
│   ├── UpdaterManager.js      # Автообновления
│   ├── PTTManager.js          # Push-to-Talk система
│   ├── DeepLinkManager.js     # Обработка диплинков (lolka://)
│   ├── AutoStartManager.js    # Автозапуск (Windows)
│   ├── MenuManager.js         # Меню приложения
│   └── ShortcutsManager.js    # Глобальные горячие клавиши
│
├── ipc/                # IPC обработчики (main <-> renderer)
│   ├── mediaHandlers.js           # Разрешения микрофона/камеры
│   ├── updaterHandlers.js         # Автообновления API
│   ├── desktopSourcesHandlers.js  # Screen share источники
│   ├── deepLinkHandlers.js        # Диплинки API
│   ├── pttHandlers.js             # PTT API
│   ├── autostartHandlers.js       # Автозапуск API
│   ├── audioCaptureHandlers.js    # WASAPI audio capture (Windows)
│   └── miscHandlers.js            # Прочие обработчики
│
└── utils/              # Утилиты
    ├── config.js       # Конфигурация и загрузка .env
    ├── logger.js       # Централизованное логирование
    └── platform.js     # Platform-specific helpers
```

## Основные компоненты

### Менеджеры

**WindowManager** - управление окнами:
- Создание главного окна и splash screen
- Настройка разрешений для медиа (камера/микрофон)
- Display media request handler для screen share

**TrayManager** - системный трей:
- Создание трея для Windows/Linux
- Контекстное меню
- Обработка кликов по иконке

**UpdaterManager** - автообновления:
- Настройка electron-updater для Яндекс S3
- Обработка всех событий обновления
- Логирование процесса обновления

**PTTManager** - Push-to-Talk:
- Инициализация node-global-key-listener
- Обработка глобальных событий клавиатуры/мыши
- Проверка accessibility permissions на macOS

**DeepLinkManager** - диплинки:
- Регистрация протокола lolka://
- Обработка диплинков из второго экземпляра
- Навигация в веб-приложении

**AutoStartManager** - автозапуск:
- Управление автозапуском на Windows
- Проверка статуса
- Флаг первой настройки

**MenuManager** - меню приложения:
- Создание нативного меню
- Диалог "О приложении"
- Platform-specific меню (macOS/Windows/Linux)

**ShortcutsManager** - горячие клавиши:
- Регистрация глобальных shortcuts
- DevTools (Ctrl+Shift+I, F12)
- Force reload (Ctrl+Shift+R)

### IPC Handlers

Все IPC обработчики разбиты по функциональности:
- `mediaHandlers` - разрешения камеры/микрофона
- `updaterHandlers` - API автообновлений
- `desktopSourcesHandlers` - источники для screen share
- `deepLinkHandlers` - API диплинков
- `pttHandlers` - API PTT
- `autostartHandlers` - API автозапуска
- `audioCaptureHandlers` - WASAPI audio capture (Windows)
- `miscHandlers` - dock badge, splash window и др.

### Утилиты

**Logger** - логирование:
- Централизованное логирование в консоль и файл
- Методы: `log()`, `readLogs()`, `clearLogs()`
- Используется всеми менеджерами

**config** - конфигурация:
- Загрузка .env файла
- Константы (LOLKA_APP_URL)

**platform** - platform helpers:
- `isDev`, `isMac()`, `isWindows()`, `isLinux()`
- `getIconPath()` - путь к иконкам

## main.js

Новый `main.js` (~230 строк вместо 1591):
- Инициализация всех менеджеров
- Регистрация IPC handlers
- Single instance lock
- Жизненный цикл приложения (ready, activate, quit)

## Преимущества новой структуры

1. **Модульность** - каждый компонент в отдельном файле
2. **Читаемость** - легко найти нужную функциональность
3. **Поддержка** - изменения локализованы в конкретных модулях
4. **Тестируемость** - каждый модуль можно тестировать отдельно
5. **Масштабируемость** - легко добавлять новые менеджеры/handlers

## Использование

Все модули автоматически импортируются и инициализируются в `main.js`. При необходимости добавления новой функциональности:

1. Создайте новый менеджер в `src/managers/`
2. Создайте IPC handler в `src/ipc/` (если нужен)
3. Зарегистрируйте в `main.js`

Пример:
```javascript
const MyManager = require('./src/managers/MyManager');
const myManager = new MyManager(windowManager, logger);

// В registerAllIpcHandlers():
const { registerMyHandlers } = require('./src/ipc/myHandlers');
registerMyHandlers(myManager);
```

