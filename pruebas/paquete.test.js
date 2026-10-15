'use strict';
// El paquete de descarga (npm run paquete): que el ZIP lleve la página y la guía tal
// como están en el repositorio, que el PDF de la guía esté al día con su HTML y que la
// guía nombre lo que el verificador pide.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../herramientas/paquete.js');
const { armarZip, leerZip } = require('../herramientas/zip.js');
const R = require('../src/reglas-ag2025.js');

const leer = (ruta) => fs.readFileSync(path.join(P.RAIZ, ruta));
const CORRA = 'Corra: npm run construir && npm run paquete';

test('el ZIP lleva la página y la guía, en ese orden y con sus nombres', () => {
  const entradas = leerZip(leer(P.ZIP));
  assert.deepEqual(entradas.map((e) => e.nombre), [P.NOMBRES.pagina, P.NOMBRES.guia]);
  for (const e of entradas) assert.equal(e.fecha.getTime(), P.FECHA.getTime(), `${e.nombre} lleva otra fecha`);
});

test('la página del ZIP es la del repositorio', () => {
  const [pagina] = leerZip(leer(P.ZIP));
  assert.ok(pagina.datos.equals(leer(P.PAGINA)), `el ZIP lleva otra versión de ${P.PAGINA}. ${CORRA}`);
});

test('la guía del ZIP es el PDF del repositorio, y el PDF está al día con su HTML', () => {
  const [, guia] = leerZip(leer(P.ZIP));
  const pdf = leer(P.PDF);
  assert.ok(guia.datos.equals(pdf), `el ZIP lleva otra guía. ${CORRA}`);
  const huellas = P.leerHuellas();
  assert.ok(huellas, `falta ${P.HUELLAS}. ${CORRA}`);
  assert.equal(huellas.guia, P.huellaGuia(), `la guía o sus tipografías cambiaron y el PDF no. ${CORRA}`);
  assert.equal(huellas.pdf, P.sha256(pdf), `${P.PDF} no es el que imprimió npm run paquete`);
});

test('la guía es de una o dos hojas carta', () => {
  const pdf = leer(P.PDF);
  const hojas = P.paginasPDF(pdf);
  assert.ok(hojas >= 1 && hojas <= 2, `la guía tiene ${hojas} hojas`);
  const tamanos = [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)];
  assert.equal(tamanos.length, hojas);
  for (const [, ancho, alto] of tamanos) assert.deepEqual([Number(ancho), Number(alto)], [612, 792], 'hoja carta: 8,5 por 11 pulgadas');
});

test('la guía no carga nada de otro sitio y no lleva emojis', () => {
  const html = leer(P.GUIA).toString('utf8');
  const urls = [...html.matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]);
  assert.equal(urls.length, P.FUENTES_GUIA.length);
  for (const u of urls) assert.ok(P.FUENTES_GUIA.includes(path.posix.join('guia', u)), `la guía carga ${u}`);
  assert.ok(!/<(script|link|img|iframe|object)\b/i.test(html), 'la guía no lleva guiones, enlaces a hojas, imágenes ni marcos');
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(html));
});

test('la guía nombra cada casilla que el verificador pide y cada formato que cruza', () => {
  const texto = leer(P.GUIA).toString('utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  // Los números que nombra, también los que caen dentro de un rango «62 a 66».
  const nombrados = new Set(texto.match(/\b\d+\b/g));
  for (const [, desde, hasta] of texto.matchAll(/\b(\d+) a (\d+)\b/g)) {
    for (let n = Number(desde); n <= Number(hasta); n++) nombrados.add(String(n));
  }
  for (const [formulario, dec] of Object.entries(R.DECLARACIONES)) {
    for (const c of dec.casillas) {
      for (const n of c.casilla.match(/\d+/g)) assert.ok(nombrados.has(n), `falta la casilla ${n} del ${formulario}`);
    }
  }
  const formatos = new Set();
  for (const c of R.CRUCES) for (const l of c.lineas) for (const m of JSON.stringify(l.exogena).matchAll(/\b(1\d{3}|2276)\b/g)) formatos.add(m[1]);
  assert.ok(formatos.size >= 8);
  for (const f of formatos) assert.ok(new RegExp(`\\b${f}\\b`).test(texto), `falta el formato ${f}`);
});

test('el escritor de ZIP: lo que escribe se lee igual, comprimido o tal cual', () => {
  const texto = Buffer.from('C1a Retención de renta a terceros\n'.repeat(300));
  const azar = crypto.randomBytes(4000); // no se deja comprimir: va tal cual
  const zip = armarZip([{ nombre: 'a.txt', datos: texto }, { nombre: 'b.bin', datos: azar }], P.FECHA);
  const [a, b] = leerZip(zip);
  assert.equal(a.metodo, 8);
  assert.ok(a.datos.equals(texto));
  assert.equal(b.metodo, 0);
  assert.ok(b.datos.equals(azar));
  // El mismo contenido da el mismo ZIP: la fecha es la del paquete, no la del día.
  assert.ok(zip.equals(armarZip([{ nombre: 'a.txt', datos: texto }, { nombre: 'b.bin', datos: azar }], P.FECHA)));
  assert.throws(() => armarZip([{ nombre: 'Cómo usar.pdf', datos: texto }], P.FECHA), /ASCII/);
});

test('el lector de ZIP no acepta un archivo dañado', () => {
  const zip = Buffer.from(leer(P.ZIP));
  zip[200] ^= 0xff; // un byte del primer archivo comprimido
  assert.throws(() => leerZip(zip));
  assert.throws(() => leerZip(Buffer.from('no es un zip')), /registro de fin/);
});
