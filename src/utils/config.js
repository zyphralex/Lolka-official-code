const path = require('path');
const fs = require('fs');

// Константы
// const LOLKA_APP_URL = 'http://localhost';
const LOLKA_APP_URL = 'https://lolka.app';

// Загружаем переменные из .env файла
function loadEnvFile(appPath) {
  try {
    const envPath = path.join(appPath, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      });
      console.log('.env file loaded');
    }
  } catch (error) {
    console.log('Failed to load .env file:', error.message);
  }
}

module.exports = {
  LOLKA_APP_URL,
  loadEnvFile,
};
