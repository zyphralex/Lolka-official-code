{
  "targets": [
    {
      "target_name": "process_list_win",
      "sources": [
        "src/module.cpp",
        "src/process_list.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "UNICODE",
        "_UNICODE"
      ],
      "libraries": [
        "kernel32.lib",
        "ntdll.lib"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [ "/std:c++17" ]
        }
      },
      "conditions": [
        ["OS=='win'", {
          "defines": [ "WINDOWS_PLATFORM" ]
        }]
      ]
    }
  ]
}

