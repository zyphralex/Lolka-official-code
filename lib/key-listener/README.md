# key-listener

Нативный N-API модуль для Windows, который перехватывает глобальные события клавиатуры и мыши с использованием low-level hooks.

## Особенности

- ✅ Нативная реализация через N-API (без внешних процессов)
- ✅ Low-level Windows hooks (`WH_KEYBOARD_LL` и `WH_MOUSE_LL`)
- ✅ Перехват всех событий клавиатуры и мыши
- ✅ Отслеживание зажатых клавиш
- ✅ API совместимое с `node-global-key-listener`
- ✅ Только для Windows (macOS/Linux не поддерживаются)

## Требования

- Windows OS
- Node.js с поддержкой N-API
- Visual Studio Build Tools (для компиляции)

## Установка

```bash
npm install
npm run build
```

## Использование

```javascript
const { GlobalKeyboardListener } = require('./lib/key-listener');

// Создание экземпляра
const listener = new GlobalKeyboardListener();

// Проверка доступности
if (!listener.isAvailable()) {
  console.error('Module not available on this platform');
  process.exit(1);
}

// Добавление слушателя
listener.addListener((event, downKeys) => {
  console.log('Event:', event.name, event.state);
  console.log('Currently pressed:', Object.keys(downKeys).filter(k => downKeys[k]));
  
  // Вернуть true для блокировки события (опционально, пока не реализовано)
  return false;
});

// Остановка
listener.kill();
```

## API

### `new GlobalKeyboardListener(options?)`

Создает новый экземпляр слушателя.

### `addListener(callback)`

Добавляет callback для обработки событий.

**Параметры callback:**
- `event` - объект события:
  - `name` - имя клавиши (например, "A", "SPACE", "ESC")
  - `vKey` - виртуальный код клавиши
  - `scanCode` - скан-код клавиши
  - `state` - состояние ("DOWN" или "UP")
  - `button` - для мыши: "LEFT", "RIGHT", "MIDDLE", "MOUSE 4", "MOUSE 5"
  - `x`, `y` - координаты мыши
  - `rawKey` - объект с дополнительной информацией
  
- `downKeys` - объект с текущими зажатыми клавишами (ключ - имя клавиши, значение - true)

**Возвращаемое значение callback:**
- `true` - блокировать событие (не реализовано)
- `false` или `undefined` - пропустить событие

### `removeListener(callback)`

Удаляет ранее добавленный callback.

### `kill()`

Останавливает все хуки и очищает слушатели.

### `isAvailable()`

Проверяет доступность нативного модуля (всегда `true` на Windows, `false` на других ОС).

## События клавиатуры

Модуль распознает следующие клавиши:

- Буквы: A-Z
- Цифры: 0-9
- Функциональные: F1-F12
- Модификаторы: LEFT SHIFT, RIGHT SHIFT, LEFT CTRL, RIGHT CTRL, LEFT ALT, RIGHT ALT, LEFT META, RIGHT META
- Специальные: SPACE, ENTER, BACKSPACE, TAB, ESC, CAPS LOCK, NUM LOCK, SCROLL LOCK
- Навигация: UP, DOWN, LEFT, RIGHT, HOME, END, PAGE UP, PAGE DOWN
- Numpad: NUMPAD 0-9, NUMPAD +, NUMPAD -, NUMPAD *, NUMPAD /, NUMPAD .
- И другие: INSERT, DELETE, PRINT SCREEN, PAUSE

## События мыши

- LEFT - левая кнопка
- RIGHT - правая кнопка
- MIDDLE - средняя кнопка
- MOUSE 4 - дополнительная кнопка 1
- MOUSE 5 - дополнительная кнопка 2

## Архитектура

Модуль использует:
- `SetWindowsHookEx` с `WH_KEYBOARD_LL` и `WH_MOUSE_LL` для low-level хуков
- Отдельный поток с message loop для обработки событий Windows
- `Napi::ThreadSafeFunction` для безопасной передачи событий в JavaScript
- Отслеживание состояния зажатых клавиш для передачи в callback

## Сборка из исходников

```bash
# Установка зависимостей
npm install

# Сборка модуля
npm run build

# Очистка
npm run clean

# Тестирование
npm test
```

## Отличия от node-global-key-listener

1. **Нет внешних процессов** - всё работает внутри Node.js процесса
2. **Только Windows** - не поддерживаются macOS и Linux
3. **Более быстрая работа** - прямой вызов через N-API
4. **Меньше зависимостей** - не требуется sudo-prompt

## Использование в Electron

```javascript
// main.js
const { GlobalKeyboardListener } = require('./lib/key-listener');

class PTTManager {
  async initialize() {
    if (process.platform !== 'win32') {
      console.log('key-listener is only available on Windows');
      return;
    }

    this.listener = new GlobalKeyboardListener();
    
    this.listener.addListener((e) => {
      // Отправка события в renderer процесс
      mainWindow.webContents.send('global-input-event', {
        name: e.name,
        state: e.state,
        vKey: e.vKey
      });
    });
  }
  
  stop() {
    if (this.listener) {
      this.listener.kill();
    }
  }
}
```

## Лицензия

MIT

