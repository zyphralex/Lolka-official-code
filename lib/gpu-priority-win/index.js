let addon;
try {
    addon = require('./build/Release/gpu_priority_win.node');
} catch (e) {
    console.warn('GPU priority module not available:', e.message);
    addon = { setGPUPriority: () => false };
}

module.exports = addon;
