const fs = require('fs');
const path = require('path');

class Logger {
  constructor(app) {
    this.app = app;
    this.logDir = null;
    this.logFile = null;
    
    if (app) {
      this.logDir = path.join(app.getPath('userData'), 'logs');
      this.logFile = path.join(this.logDir, 'updater.log');
      
      // Создаем папку для логов если её нет
      try {
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
      } catch (error) {
        console.error('Ошибка создания папки для логов:', error);
      }
    }
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    // Всегда логируем в консоль
    console.log(logMessage);
    if (data) {
      console.log('  Data:', data);
    }

    // Логируем в файл
    if (this.logFile) {
      try {
        const logEntry = `${logMessage}${data ? '\n  Data: ' + JSON.stringify(data, null, 2) : ''}\n`;
        fs.appendFileSync(this.logFile, logEntry);
      } catch (error) {
        console.error('Ошибка записи в лог файл:', error);
      }
    }

    return { message, data, timestamp };
  }

  readLogs(lines = 100) {
    try {
      if (this.logFile && fs.existsSync(this.logFile)) {
        const logs = fs.readFileSync(this.logFile, 'utf8');
        return logs.split('\n').slice(-lines).join('\n');
      }
      return 'Лог файл не найден';
    } catch (error) {
      return 'Ошибка чтения лог файла: ' + error.message;
    }
  }

  clearLogs() {
    try {
      if (this.logFile && fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
        this.log('🗑️ Лог файл очищен');
        return true;
      }
      return false;
    } catch (error) {
      this.log('❌ Ошибка очистки лог файла:', { error: error.message });
      return false;
    }
  }

  getLogFile() {
    return this.logFile;
  }
}

module.exports = Logger;

