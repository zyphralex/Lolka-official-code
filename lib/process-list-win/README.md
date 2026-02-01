# process-list-win

Native Windows process enumeration module with executable paths.

## Description

This is a native Node.js addon for Windows that provides process enumeration with full executable paths using Windows API. It's designed to be more reliable than `ps-list` for getting process executable paths.

## Usage

```javascript
const { getProcessList } = require('process-list-win');

const processes = getProcessList();
console.log(processes);
// [
//   { 
//     pid: 1234, 
//     name: 'chrome.exe', 
//     path: 'Application/chrome.exe',
//     arguments: '--type=renderer --lang=en-US'
//   },
//   { 
//     pid: 5678, 
//     name: 'svchost.exe', 
//     path: 'System32/svchost.exe',
//     arguments: '-k NetworkService -p'
//   },
//   { 
//     pid: 9012, 
//     name: 'System', 
//     path: null,
//     arguments: null  // System processes may not have accessible info
//   },
//   ...
// ]
```

## API

### `getProcessList()`

Returns an array of process objects with their command-line information.

**Returns:** `Array<{pid: number, name: string, path: string|null, arguments: string|null}>`

- `pid`: Process ID
- `name`: Process executable name
- `path`: Short path format (last folder + executable), e.g., `"Application/chrome.exe"`, or `null` if not accessible
- `arguments`: Command-line arguments (without the executable path), e.g., `"-game garrysmod -console"`, or `null` if not accessible

## Building

```bash
npm install
```

The module will automatically build during installation using node-gyp.

## Requirements

- Windows OS
- Node.js with N-API support
- Visual Studio Build Tools (for compilation)

## Technical Details

Uses the following Windows APIs:
- `CreateToolhelp32Snapshot` - Create process snapshot
- `Process32FirstW` / `Process32NextW` - Iterate processes
- `OpenProcess` - Open process handle
- `QueryFullProcessImageNameW` - Get full executable path
- `NtQueryInformationProcess` - Get process PEB address (for arguments)
- `ReadProcessMemory` - Read command line from process memory

