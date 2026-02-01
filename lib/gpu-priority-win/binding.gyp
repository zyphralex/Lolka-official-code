{
  "targets": [{
    "target_name": "gpu_priority_win",
    "sources": ["src/gpu_priority.cpp"],
    "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
    "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
    "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
    "libraries": ["gdi32.lib", "d3d11.lib", "dxgi.lib"]
  }]
}
