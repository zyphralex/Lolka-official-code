// Обновляем статус через IPC
document.addEventListener('DOMContentLoaded', () => {
  // Отключаем контекстное меню на splash screen
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  if (window.electronAPI) {
    // Получаем и отображаем версию приложения
    window.electronAPI
      .getAppVersion()
      .then((version) => {
        document.getElementById('version').textContent = 'v' + version;
      })
      .catch(() => {
        document.getElementById('version').textContent = 'v1.0.0';
      });

    // Слушаем обновления статуса автообновления
    if (window.electronAPI.updater) {
      window.electronAPI.updater.onUpdaterLog((logData) => {
        updateStatus(logData);
      });

      // Слушаем прогресс скачивания
      window.electronAPI.updater.onDownloadProgress((progress) => {
        showDownloadProgress(progress);
      });

      // Слушаем завершение скачивания
      window.electronAPI.updater.onUpdateDownloaded((info) => {
        showUpdateReady();
      });
    }
  }
});

function updateStatus(logData) {
  const statusEl = document.getElementById('status');

  switch (logData.type) {
    case 'checking':
      statusEl.innerHTML = 'Проверка обновлений... <span class="spinner"></span>';
      hideProgress();
      break;

    case 'not-available':
      statusEl.innerHTML = 'Все актуально! ✅';
      hideProgress();
      // Splash закроется автоматически когда main window будет ready
      break;

    case 'available':
      statusEl.innerHTML = 'Найдено обновление, скачиваем... 📥';
      break;

    case 'error':
      statusEl.innerHTML = 'Ошибка проверки обновлений ❌';
      hideProgress();
      // Splash закроется автоматически когда main window будет ready
      break;
  }
}

function showDownloadProgress(progress) {
  const statusEl = document.getElementById('status');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  statusEl.innerHTML = 'Скачивание обновления... 📥';
  progressContainer.classList.add('visible');

  // Обновляем прогресс бар
  progressFill.style.width = progress.percent + '%';

  // Форматируем размер файлов
  const downloaded = formatBytes(progress.transferred);
  const total = formatBytes(progress.total);
  const percent = Math.round(progress.percent);

  progressText.textContent = `${percent}% (${downloaded} / ${total})`;
}

function showUpdateReady() {
  const statusEl = document.getElementById('status');
  const progressText = document.getElementById('progress-text');

  statusEl.innerHTML = 'Обновление готово, перезапускаем... 🔄';
  progressText.textContent = 'Установка обновления...';

  // Приложение перезапустится автоматически через electron-updater
}

function hideProgress() {
  const progressContainer = document.getElementById('progress-container');
  progressContainer.classList.remove('visible');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
