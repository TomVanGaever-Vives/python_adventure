/*
 * Maak een .hex-bestand voor een echte micro:bit (V1 én V2: "universal hex")
 * met @microbit/microbit-fs en de officiële MicroPython-firmware (lokaal in vendor/).
 */
(function () {
  'use strict';

  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => { delete loaded[src]; reject(new Error('Kon ' + src + ' niet laden')); };
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }

  async function buildUniversalHex(code) {
    await Promise.all([
      loadScript('vendor/microbit-fs/microbit-fs.umd.min.js'),
      loadScript('vendor/micropython/firmware-v1.js'),
      loadScript('vendor/micropython/firmware-v2.js'),
    ]);
    const fsLib = window.microbitFs;
    const fs = new fsLib.MicropythonFsHex([
      { hex: window.MICROPYTHON_HEX_V1, boardId: fsLib.microbitBoardId.V1 },
      { hex: window.MICROPYTHON_HEX_V2, boardId: fsLib.microbitBoardId.V2 },
    ]);
    fs.write('main.py', code.endsWith('\n') ? code : code + '\n');
    return fs.getUniversalHex();
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  window.MBHex = { buildUniversalHex, download };
})();
