{
  "targets": [
    {
      "target_name": "audio_capture_win",
      "sources": [
        "src/module.cpp",
        "src/audio_capture.cpp",
        "src/session_manager.cpp",
        "src/process_utils.cpp"
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
        "ole32.lib",
        "avrt.lib",
        "runtimeobject.lib"
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

