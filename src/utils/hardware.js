const { exec } = require('child_process');
const os = require('os');

function execAsync(command, timeout = 15000) {
  return new Promise((resolve) => {
    exec(command, { encoding: 'utf8', timeout }, (error, stdout) => {
      resolve(error ? '' : stdout.trim());
    });
  });
}

// ============================================
// WINDOWS (using PowerShell instead of deprecated WMIC)
// ============================================
async function getHardwareWindows() {
  const [cpuResult, gpuResult, mbResult, ramResult] = await Promise.all([
    execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors | ConvertTo-Json -Compress"'),
    execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion | ConvertTo-Json -Compress"'),
    execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product | ConvertTo-Json -Compress"'),
    execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, Manufacturer | ConvertTo-Json -Compress"'),
  ]);

  // Parse each result independently to avoid losing all data on single failure
  const safeJsonParse = (str) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const data = {
    cpu: safeJsonParse(cpuResult),
    gpu: safeJsonParse(gpuResult),
    mb: safeJsonParse(mbResult),
    ram: safeJsonParse(ramResult)
  };

  // Normalize to arrays
  const cpuData = data.cpu ? (Array.isArray(data.cpu) ? data.cpu[0] : data.cpu) : {};
  const gpuData = data.gpu ? (Array.isArray(data.gpu) ? data.gpu : [data.gpu]) : [];
  const mbData = data.mb ? (Array.isArray(data.mb) ? data.mb[0] : data.mb) : {};
  const ramData = data.ram ? (Array.isArray(data.ram) ? data.ram : [data.ram]) : [];

  // Parse GPU
  const gpus = gpuData.map(g => ({
    name: g.Name?.trim() || 'Unknown',
    vram: Math.round((g.AdapterRAM || 0) / 1024 / 1024) || 0,
    driver: g.DriverVersion?.trim() || ''
  })).filter(g => g.name !== 'Unknown');

  // Parse RAM
  const ramModules = ramData.map(r => ({
    capacity: Math.round((r.Capacity || 0) / 1024 / 1024 / 1024) || 0,
    speed: r.Speed || 0,
    manufacturer: r.Manufacturer?.trim() || ''
  })).filter(r => r.capacity > 0);

  const totalRam = ramModules.reduce((sum, r) => sum + r.capacity, 0);

  return {
    cpu: {
      name: cpuData.Name?.trim() || os.cpus()[0]?.model || 'Unknown',
      cores: cpuData.NumberOfCores || os.cpus().length,
      threads: cpuData.NumberOfLogicalProcessors || os.cpus().length
    },
    gpu: gpus,
    motherboard: {
      manufacturer: mbData.Manufacturer?.trim() || 'Unknown',
      model: mbData.Product?.trim() || 'Unknown'
    },
    ram: {
      total: totalRam || Math.round(os.totalmem() / 1024 / 1024 / 1024),
      modules: ramModules
    }
  };
}

// ============================================
// MACOS
// ============================================
async function getHardwareMac() {
  const [sysProfile] = await Promise.all([
    execAsync('system_profiler SPHardwareDataType SPDisplaysDataType SPMemoryDataType -json'),
  ]);

  let data = {};
  try {
    data = JSON.parse(sysProfile);
  } catch (e) {
    // fallback
  }

  const hw = data.SPHardwareDataType?.[0] || {};
  const displays = data.SPDisplaysDataType || [];
  const memory = data.SPMemoryDataType?.[0] || {};

  // GPU
  const gpus = [];
  for (const display of displays) {
    if (display.sppci_model) {
      gpus.push({
        name: display.sppci_model,
        vram: parseInt(display.sppci_vram) || 0,
        driver: display.sppci_device_type || ''
      });
    }
    for (const item of display._items || []) {
      gpus.push({
        name: item.sppci_model || 'Unknown',
        vram: parseInt(item.sppci_vram) || 0,
        driver: item.sppci_device_type || ''
      });
    }
  }

  // RAM modules
  const ramModules = [];
  for (const bank of memory._items || []) {
    for (const dimm of bank._items || []) {
      ramModules.push({
        capacity: parseInt(dimm.dimm_size) || 0,
        speed: parseInt(dimm.dimm_speed) || 0,
        manufacturer: dimm.dimm_manufacturer || ''
      });
    }
  }

  return {
    cpu: {
      name: hw.cpu_type || os.cpus()[0]?.model || 'Unknown',
      cores: parseInt(hw.number_processors) || os.cpus().length,
      threads: os.cpus().length
    },
    gpu: gpus.length ? gpus : [{ name: 'Integrated', vram: 0, driver: '' }],
    motherboard: {
      manufacturer: 'Apple',
      model: hw.machine_model || 'Unknown'
    },
    ram: {
      total: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      modules: ramModules
    }
  };
}

// ============================================
// LINUX
// ============================================
async function getHardwareLinux() {
  const [cpuInfo, gpuInfo, mbVendor, mbModel, memInfo] = await Promise.all([
    execAsync('cat /proc/cpuinfo | grep "model name" | head -1'),
    execAsync('lspci | grep -i vga'),
    execAsync('cat /sys/devices/virtual/dmi/id/board_vendor 2>/dev/null'),
    execAsync('cat /sys/devices/virtual/dmi/id/board_name 2>/dev/null'),
    execAsync('cat /proc/meminfo | grep MemTotal'),
  ]);

  // CPU
  const cpuName = cpuInfo.split(':')[1]?.trim() || os.cpus()[0]?.model || 'Unknown';

  // GPU
  const gpuLines = gpuInfo.split('\n').filter(l => l.trim());
  const gpus = gpuLines.map(line => {
    const match = line.match(/:\s*(.+)$/);
    return {
      name: match?.[1]?.trim() || 'Unknown',
      vram: 0,
      driver: ''
    };
  });

  // RAM
  const memMatch = memInfo.match(/(\d+)/);
  const totalRam = memMatch ? Math.round(parseInt(memMatch[1]) / 1024 / 1024) : Math.round(os.totalmem() / 1024 / 1024 / 1024);

  return {
    cpu: {
      name: cpuName,
      cores: os.cpus().length,
      threads: os.cpus().length
    },
    gpu: gpus.length ? gpus : [{ name: 'Unknown', vram: 0, driver: '' }],
    motherboard: {
      manufacturer: mbVendor || 'Unknown',
      model: mbModel || 'Unknown'
    },
    ram: {
      total: totalRam,
      modules: []
    }
  };
}

// ============================================
// MAIN EXPORT
// ============================================
async function getHardwareInfo() {
  let hardware;

  switch (process.platform) {
    case 'win32':
      hardware = await getHardwareWindows();
      break;
    case 'darwin':
      hardware = await getHardwareMac();
      break;
    default:
      hardware = await getHardwareLinux();
  }

  hardware.os = {
    platform: process.platform,
    arch: process.arch,
    version: os.release()
  };

  return hardware;
}

module.exports = { getHardwareInfo };
