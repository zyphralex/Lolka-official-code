{
  "targets": [
    {
      "target_name": "key_listener",
      "sources": [
        "src/module.cpp",
        "src/input_hook.cpp"
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
        "user32.lib"
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

