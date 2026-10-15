// El Chromium que ya tenga Playwright en ~/.cache/ms-playwright (primero el que no
// tiene ventana), u otro indicado con NAVEGADOR=/ruta/al/chrome. Lo usan la prueba
// de punta a punta y el que arma el paquete.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function buscarChromium() {
  if (process.env.NAVEGADOR) return process.env.NAVEGADOR;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const carpetas = fs.readdirSync(base).sort().reverse();
  for (const c of carpetas.filter((x) => x.startsWith('chromium_headless_shell-'))) {
    const ruta = path.join(base, c, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (fs.existsSync(ruta)) return ruta;
  }
  for (const c of carpetas.filter((x) => x.startsWith('chromium-'))) {
    // chrome-linux64 en las versiones de Chrome for Testing; chrome-linux en las de antes.
    for (const carpeta of ['chrome-linux64', 'chrome-linux']) {
      const ruta = path.join(base, c, carpeta, 'chrome');
      if (fs.existsSync(ruta)) return ruta;
    }
  }
  // Ninguno a mano: Playwright usa el suyo.
  return undefined;
}
