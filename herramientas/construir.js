'use strict';
/*
 * Arma la página en un solo archivo, verificador-exogena.html, que funciona sin
 * internet: estilos, tipografías, logotipo, reglas, lógica, datos de ejemplo y
 * pantalla van dentro. No queda nada que bajar de otro sitio.
 *
 *   node herramientas/construir.js
 *
 * La política de seguridad (Content-Security-Policy) solo deja correr el código
 * de la página, identificado por su huella SHA-256, y le prohíbe conectarse a
 * cualquier parte (connect-src 'none'). La prueba pruebas/construccion.test.js
 * vuelve a armar el archivo y falla si no coincide con el del repositorio.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.resolve(__dirname, '..');
const leer = (ruta) => fs.readFileSync(path.join(RAIZ, ruta), 'utf8');
const SALIDA = 'verificador-exogena.html';

// El orden importa: cada módulo usa los anteriores.
const MODULOS = ['src/xml.js', 'src/esquemas-ag2025.js', 'src/tablas-ag2025.js', 'src/reglas-ag2025.js', 'src/verificador.js'];

const TEMA = `(function () {
  'use strict';
  try {
    var tema = window.localStorage.getItem('verificador-exogena-tema');
    if (tema === 'light' || tema === 'dark') document.documentElement.setAttribute('data-theme', tema);
  } catch (e) {
    // Sin almacenamiento (ventana privada o archivo local bloqueado): queda el modo del sistema.
  }
})();`;

const RANGO_LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

function fuentes() {
  const una = (familia, archivo, peso) => {
    const datos = fs.readFileSync(path.join(RAIZ, 'fuentes', archivo)).toString('base64');
    return `@font-face {
  font-family: '${familia}';
  font-style: normal;
  font-weight: ${peso};
  font-display: swap;
  src: url(data:font/woff2;base64,${datos}) format('woff2');
  unicode-range: ${RANGO_LATIN};
}`;
  };
  return [
    '/* Tipografías del sitio de Andrés Briñez (SIL Open Font License 1.1), dentro de la página para que funcione sin internet. */',
    una('Archivo', 'archivo-latin.woff2', '100 900'),
    una('Literata', 'literata-latin.woff2', '400 900'),
    una('IBM Plex Mono', 'plex-mono-400-latin.woff2', '400'),
    una('IBM Plex Mono', 'plex-mono-500-latin.woff2', '500')
  ].join('\n');
}

/** El logotipo de noche, sin comentarios y como adorno (el nombre va al lado en texto). */
function logo() {
  return leer('fuentes/logo-noche.svg')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+xmlns="[^"]*"/, '')
    .replace(/\s+role="img"\s+aria-label="[^"]*"/, ' aria-hidden="true" focusable="false"')
    .replace(/>\s+</g, '><')
    .trim();
}

function favicon() {
  const svg = leer('fuentes/favicon.svg').replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim();
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function ejemplos() {
  const datos = {};
  for (const tipo of ['diferencias', 'cuadra']) {
    const dir = path.join(RAIZ, 'ejemplos', tipo);
    const empresa = JSON.parse(fs.readFileSync(path.join(dir, 'empresa.json'), 'utf8'));
    const archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.xml')).sort()
      .map((f) => ({ nombre: f, base64: fs.readFileSync(path.join(dir, f)).toString('base64') }));
    const explicaciones = [];
    const rutaExp = path.join(dir, 'explicaciones.csv');
    if (fs.existsSync(rutaExp)) {
      for (const l of fs.readFileSync(rutaExp, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1)) {
        const [linea, descripcion, valor] = l.split(';');
        explicaciones.push({ linea, descripcion, valor: Number(valor) });
      }
    }
    datos[tipo] = {
      nombre: empresa.nombre, nit: empresa.nit, archivos, explicaciones,
      declaraciones: fs.readFileSync(path.join(dir, 'declaraciones.csv'), 'utf8').replace(/^﻿/, '')
    };
  }
  return `/* Datos de ejemplo: dos empresas ficticias (carpeta ejemplos/). */\nwindow.ExoEjemplos = ${JSON.stringify(datos)};`;
}

function huella(texto) {
  return "'sha256-" + crypto.createHash('sha256').update(texto, 'utf8').digest('base64') + "'";
}

/** Arma la página y la devuelve como texto. */
function construir() {
  const scripts = MODULOS.map(leer).concat(ejemplos(), leer('src/app.js')).join('\n;\n');
  for (const [peligro, nombre] of [[/<\/script/i, '</script'], [/<!--/, 'apertura de comentario HTML']]) {
    if (peligro.test(scripts)) throw new Error(`El código trae «${nombre}», que cortaría el <script> de la página.`);
  }
  const estilos = leer('src/estilos.css').replace('/*FUENTES*/', fuentes());
  if (/<\/style/i.test(estilos)) throw new Error('Los estilos traen «</style».');
  const csp = [
    "default-src 'none'",
    `script-src ${huella(TEMA)} ${huella(scripts)}`,
    `style-src ${huella(estilos)}`,
    'font-src data:',
    'img-src data: blob:',
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "manifest-src 'none'",
    "media-src 'none'"
  ].join('; ');
  let html = leer('src/pagina.html');
  const reemplazos = {
    '<!--CSP-->': `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    '<!--FAVICON-->': favicon(),
    '<!--TEMA-->': TEMA,
    '<!--ESTILOS-->': estilos,
    '<!--LOGO-->': logo(),
    '<!--SCRIPTS-->': scripts
  };
  for (const [marca, valor] of Object.entries(reemplazos)) {
    if (!html.includes(marca)) throw new Error('Falta la marca ' + marca + ' en src/pagina.html');
    html = html.split(marca).join(valor);
  }
  return html;
}

module.exports = { construir, SALIDA };

if (require.main === module) {
  const html = construir();
  fs.writeFileSync(path.join(RAIZ, SALIDA), html);
  console.log(`Escrito ${SALIDA} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
}
