const { ipcMain, desktopCapturer } = require('electron');

function registerDesktopSourcesHandlers(windowManager) {
  // Обработчик для получения источников screen share
  ipcMain.handle('get-desktop-sources', async (event, options = {}) => {
    try {
      console.log('Requesting desktop capture sources...');
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 1280, height: 720 },
        fetchWindowIcons: true,
        ...options,
      });

      console.log(`Found sources: ${sources.length}`);

      // Преобразуем в формат для передачи в renderer
      const sourcesData = sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
        display_id: source.display_id,
        appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
      }));

      return sourcesData;
    } catch (error) {
      console.error('Error getting desktop capture sources:', error);
      return [];
    }
  });

  // Установить выбранный источник для navigator.mediaDevices.getDisplayMedia()
  ipcMain.handle('set-display-media-selected-source', (event, sourceId) => {
    try {
      windowManager.setSelectedDisplayMediaSourceId(sourceId);
      return true;
    } catch (error) {
      console.error('Failed to set display media selected source:', error);
      return false;
    }
  });
}

module.exports = { registerDesktopSourcesHandlers };

