# WASAPI Audio Capture for Windows

Нативный Node.js модуль для захвата системного аудио в Windows с использованием WASAPI (Windows Audio Session API).

## Возможности

- ✅ Захват системного аудио через WASAPI Loopback
- ✅ Автоматическое исключение звука из текущего процесса Electron
- ✅ Получение списка активных аудио сессий
- ✅ Настраиваемые параметры захвата (sample rate, channels)
- ✅ Потоковая передача аудио в JavaScript через Float32Array

## Требования

### Windows
- **Visual Studio 2019 или новее** (Community Edition достаточно)
- **Windows Build Tools** установлены
- **Node.js** 16.x или новее
- **Python** 3.x (для node-gyp)

### Установка Visual Studio Build Tools

```bash
# Вариант 1: Через npm (рекомендуется)
npm install --global windows-build-tools

# Вариант 2: Скачать Visual Studio Community
# https://visualstudio.microsoft.com/downloads/
# Выберите "Desktop development with C++" workload
```

## Установка

```bash
# Перейти в директорию модуля
cd native/audio-capture-win

# Установить зависимости
npm install

# Собрать модуль
npm run build
```

## Тестирование

```bash
# Запустить тестовый скрипт
npm test
# или
node test/test.js
```

Тестовый скрипт:
- Инициализирует WASAPI
- Запускает захват на 5 секунд
- Выводит параметры аудио и размер буфера
- Останавливает захват

## API

### AudioCaptureManager

```javascript
const { AudioCaptureManager } = require('./native/audio-capture-win');

const manager = new AudioCaptureManager();
```

#### Methods

**`initialize()`**
- Инициализирует WASAPI audio capture
- Возвращает: `boolean` - успех инициализации

**`start()`**
- Запускает захват аудио (автоматически исключает текущий процесс)
- Возвращает: `boolean` - успех запуска

**`stop()`**
- Останавливает захват аудио
- Возвращает: `void`

**`getAudioBuffer()`**
- Получает и очищает текущий аудио буфер
- Возвращает: `Float32Array | null` - массив аудио сэмплов

**`getAudioParams()`**
- Получает параметры аудио
- Возвращает: `{ sampleRate: number, channels: number } | null`

**`getActiveSessions()`**
- Получает список активных аудио сессий
- Возвращает: `Array<{ pid: number, name: string, isSystemSound: boolean }>`

**`getCurrentPID()`**
- Получает PID текущего процесса
- Возвращает: `number`

## Использование в Electron

### Main Process (main.js)

```javascript
let audioCaptureManager = null;

if (process.platform === 'win32') {
  try {
    const { AudioCaptureManager } = require('./native/audio-capture-win');
    audioCaptureManager = new AudioCaptureManager();
    console.log('✅ WASAPI audio capture module loaded');
  } catch (error) {
    console.error('❌ Failed to load WASAPI audio capture module:', error);
  }
}

// IPC handlers
ipcMain.handle('audio-capture-initialize', async () => {
  if (!audioCaptureManager) {
    return { success: false, error: 'Module not available' };
  }
  const success = audioCaptureManager.initialize();
  return { success };
});

ipcMain.handle('audio-capture-start', async () => {
  if (!audioCaptureManager) {
    return { success: false, error: 'Module not available' };
  }
  const success = audioCaptureManager.start();
  return { success };
});

ipcMain.handle('audio-capture-stop', async () => {
  if (!audioCaptureManager) {
    return { success: false };
  }
  audioCaptureManager.stop();
  return { success: true };
});
```

### Preload Script (preload.js)

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  audioCapture: {
    initialize: () => ipcRenderer.invoke('audio-capture-initialize'),
    start: () => ipcRenderer.invoke('audio-capture-start'),
    stop: () => ipcRenderer.invoke('audio-capture-stop'),
    getBuffer: () => ipcRenderer.invoke('audio-capture-get-buffer'),
    getParams: () => ipcRenderer.invoke('audio-capture-get-params'),
    getSessions: () => ipcRenderer.invoke('audio-capture-get-sessions'),
  },
});
```

### Renderer Process

```javascript
// Инициализация
const initResult = await window.electronAPI.audioCapture.initialize();
if (!initResult.success) {
  console.error('Failed to initialize audio capture');
  return;
}

// Запуск
const startResult = await window.electronAPI.audioCapture.start();
if (!startResult.success) {
  console.error('Failed to start audio capture');
  return;
}

// Получение буфера (периодически)
setInterval(async () => {
  const buffer = await window.electronAPI.audioCapture.getBuffer();
  if (buffer && buffer.length > 0) {
    // Обработка аудио данных
    console.log('Received audio buffer:', buffer.length, 'samples');
  }
}, 100);

// Остановка
await window.electronAPI.audioCapture.stop();
```

## Интеграция с WebRTC

Пример использования с screen share + system audio:

```javascript
const params = await window.electronAPI.audioCapture.getParams();
const audioContext = new AudioContext({ sampleRate: params.sampleRate });
const destination = audioContext.createMediaStreamDestination();

// Периодически получаем буфер из WASAPI и передаем в stream
const updateInterval = setInterval(async () => {
  const buffer = await window.electronAPI.audioCapture.getBuffer();
  if (buffer && buffer.length > 0) {
    const audioBuffer = audioContext.createBuffer(
      params.channels,
      buffer.length / params.channels,
      params.sampleRate
    );

    for (let channel = 0; channel < params.channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = buffer[i * params.channels + channel];
      }
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    source.start();
  }
}, 100);

const [audioTrack] = destination.stream.getAudioTracks();
// Теперь audioTrack можно добавить в WebRTC connection
```

## Сборка для Production

Для включения модуля в electron-builder сборку:

```json
{
  "build": {
    "files": [
      "native/**/*",
      "!native/**/*.cpp",
      "!native/**/*.h",
      "!native/**/build/Release/.deps"
    ],
    "extraFiles": [
      {
        "from": "native/audio-capture-win/build/Release",
        "to": "native/audio-capture-win/build/Release",
        "filter": ["*.node"]
      }
    ]
  }
}
```

## Troubleshooting

### Ошибка: "Cannot find module './build/Release/audio_capture_win.node'"

**Решение**: Модуль не скомпилирован. Запустите:
```bash
cd native/audio-capture-win
npm run build
```

### Ошибка: "MSBuild not found"

**Решение**: Установите Visual Studio Build Tools:
```bash
npm install --global windows-build-tools
```

### Ошибка: "Failed to initialize audio client in loopback mode"

**Решение**: 
- Проверьте, что аудио устройство воспроизведения настроено в Windows
- Убедитесь, что приложение имеет доступ к аудио устройствам

### Низкая производительность

**Решение**:
- Увеличьте интервал получения буфера (например, с 100ms до 200ms)
- Уменьшите максимальный размер буфера в `audio_capture.cpp`

## Технические детали

### Архитектура

1. **WASAPI Loopback Capture**: Захватывает ВСЁ системное аудио
2. **Audio Session Enumeration**: Получает список всех процессов с аудио
3. **Process Filtering**: Исключает звук из текущего Electron процесса
4. **Buffer Management**: Управляет буфером аудио данных для передачи в JS

### Формат аудио

- **Format**: Float32 (PCM)
- **Sample Rate**: 48000 Hz (по умолчанию, зависит от системных настроек)
- **Channels**: 2 (стерео)
- **Buffer**: До 1 секунды аудио данных

## Лицензия

Этот модуль является частью Lolka Electron приложения.

## Автор

Lolka Development Team

## Ссылки

- [WASAPI Documentation](https://docs.microsoft.com/en-us/windows/win32/coreaudio/wasapi)
- [Audio Session API](https://docs.microsoft.com/en-us/windows/win32/coreaudio/audio-sessions)
- [Node.js N-API](https://nodejs.org/api/n-api.html)
- [node-addon-api](https://github.com/nodejs/node-addon-api)

