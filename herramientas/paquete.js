'use strict';
/*
 * El paquete de descarga: un ZIP con la página y la guía en PDF. Aquí está qué
 * entra, con qué nombres y con qué fecha; lo arma `npm run paquete`
 * (herramientas/armar-paquete.mjs) y lo revisa pruebas/paquete.test.js.
 *
 * La guía se imprime con un navegador, y un PDF no sale igual byte por byte dos
 * veces (lleva la hora en que se imprimió). Por eso se guarda la huella de lo
 * que la produce (el HTML de la guía y sus tipografías) en paquete/huellas.json:
 * si la guía cambia y el PDF no, la prueba lo dice.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { armarZip } = require('./zip.js');

const RAIZ = path.resolve(__dirname, '..');
const GUIA = 'guia/como-usar-el-verificador.html';
// Lo que la guía carga, además de su HTML: si cambia una tipografía, cambia el PDF.
const FUENTES_GUIA = [
  'fuentes/archivo-latin.woff2',
  'fuentes/literata-latin.woff2',
  'fuentes/plex-mono-400-latin.woff2',
  'fuentes/plex-mono-500-latin.woff2'
];
const PAGINA = 'verificador-exogena.html';
const PDF = 'paquete/como-usar-el-verificador.pdf';
const ZIP = 'paquete/verificador-exogena-ag2025.zip';
const HUELLAS = 'paquete/huellas.json';
// La fecha de los archivos dentro del ZIP: la de las reglas del año gravable 2025
// (README, «Todas consultadas el 15 de octubre de 2026»). Se cambia con cada versión.
const FECHA = new Date(2026, 9, 15, 0, 0, 0);
// Los nombres dentro del ZIP: en ASCII, porque el «Extraer todo» de Windows no
// siempre respeta las tildes de un nombre.
const NOMBRES = { pagina: 'verificador-exogena.html', guia: 'como-usar-el-verificador.pdf' };

const leer = (ruta) => fs.readFileSync(path.join(RAIZ, ruta));
const sha256 = (datos) => crypto.createHash('sha256').update(datos).digest('hex');

/** La huella de todo lo que produce el PDF de la guía. */
function huellaGuia() {
  const h = crypto.createHash('sha256');
  for (const ruta of [GUIA, ...FUENTES_GUIA]) h.update(ruta + '\0').update(leer(ruta)).update('\0');
  return h.digest('hex');
}

/** Lo que va dentro del ZIP, en orden: primero la página, que es lo que se abre. */
function entradas(pdf = leer(PDF)) {
  return [
    { nombre: NOMBRES.pagina, datos: leer(PAGINA) },
    { nombre: NOMBRES.guia, datos: pdf }
  ];
}

function armarPaquete(pdf) {
  return armarZip(entradas(pdf), FECHA);
}

function leerHuellas() {
  const ruta = path.join(RAIZ, HUELLAS);
  return fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, 'utf8')) : null;
}

/** Las hojas de un PDF, contadas por sus objetos /Type /Page. */
function paginasPDF(bytes) {
  return (bytes.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}

module.exports = {
  RAIZ, GUIA, FUENTES_GUIA, PAGINA, PDF, ZIP, HUELLAS, FECHA, NOMBRES,
  sha256, huellaGuia, entradas, armarPaquete, leerHuellas, paginasPDF
};
