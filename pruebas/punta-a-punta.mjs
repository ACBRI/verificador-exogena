#!/usr/bin/env node
// Prueba de punta a punta: abre verificador-exogena.html en un Chromium sin
// cabeza, como lo abriría una persona con doble clic (file://) y sin internet:
// toda petición que no sea del propio archivo se corta y se cuenta. Usa los
// ejemplos, carga XML reales desde el disco, pega cifras, agrega
// explicaciones, imprime a PDF y descarga el CSV. Deja las capturas en
// docs/capturas/.
//
//   npm install            (una vez: instala playwright-core, sin navegadores)
//   npm run punta
//
// Usa el Chromium que ya tenga Playwright en ~/.cache/ms-playwright; otro se
// indica con NAVEGADOR=/ruta/al/chrome. La fecha del navegador se fija en el
// 15 de octubre de 2026 para que las capturas no cambien de un día a otro.

import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagina = pathToFileURL(path.join(raiz, 'verificador-exogena.html')).href;
const capturas = path.join(raiz, 'docs', 'capturas');
const salida = path.join(raiz, 'pruebas', 'salida');
const FECHA = new Date('2026-10-15T15:00:00-05:00');

function buscarNavegador() {
  if (process.env.NAVEGADOR) return process.env.NAVEGADOR;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const carpetas = fs.readdirSync(base).sort().reverse();
  for (const c of carpetas.filter((x) => x.startsWith('chromium_headless_shell-'))) {
    const ruta = path.join(base, c, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (fs.existsSync(ruta)) return ruta;
  }
  for (const c of carpetas.filter((x) => x.startsWith('chromium-'))) {
    const ruta = path.join(base, c, 'chrome-linux', 'chrome');
    if (fs.existsSync(ruta)) return ruta;
  }
  return undefined;
}

// ----------------------------------------------------------- registro

const resultados = [];
const red = [];
const problemasConsola = [];

async function paso(nombre, fn) {
  try {
    await fn();
    resultados.push([true, nombre]);
    console.log('  bien   ' + nombre);
  } catch (error) {
    resultados.push([false, nombre, error]);
    console.log('  FALLA  ' + nombre + '\n         ' + String(error && error.message).split('\n').join('\n         '));
  }
}

/** Un contexto sin internet: lo que no sea el archivo mismo se corta y se anota. */
async function contexto(navegador, opciones = {}) {
  const ctx = await navegador.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, locale: 'es-CO' }, opciones));
  await ctx.setOffline(true);
  await ctx.route('**/*', (ruta) => {
    const url = ruta.request().url();
    if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('blob:')) return ruta.continue();
    red.push(url);
    return ruta.abort();
  });
  return ctx;
}

async function abrir(ctx) {
  const p = await ctx.newPage();
  await p.clock.setFixedTime(FECHA);
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problemasConsola.push(`${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => problemasConsola.push('error de la página: ' + e.message));
  await p.goto(pagina);
  return p;
}

/** El estado de cada línea del informe: { C1a: 'No cuadra', C2: 'Revisar', ... }. */
async function estados(p) {
  return p.$$eval('#informe table.cruces tbody tr:not(.fila-cruce)', (filas) => Object.fromEntries(filas.map((f) => [
    f.querySelector('.celda-linea .id').textContent.trim(),
    f.querySelector('.semaforo').textContent.trim()
  ])));
}

async function fichas(p) {
  return p.$$eval('#informe .ficha .ficha-valor', (v) => v.map((x) => Number(x.textContent)));
}

function paginasPDF(bytes) {
  return (bytes.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}

// --------------------------------------------------------------- pruebas

const ejecutable = buscarNavegador();
const navegador = await chromium.launch(ejecutable ? { executablePath: ejecutable } : {});
fs.mkdirSync(capturas, { recursive: true });
fs.mkdirSync(salida, { recursive: true });

console.log('Escritorio, sin internet');
const ctx = await contexto(navegador);
const p = await abrir(ctx);

await paso('abre con doble clic, con su política de seguridad y sin pedir nada afuera', async () => {
  assert.equal(await p.title(), 'Verificador de exógena');
  const csp = await p.getAttribute('meta[http-equiv="Content-Security-Policy"]', 'content');
  assert.match(csp, /connect-src 'none'/);
  assert.ok(await p.isVisible('#informe-vacio'));
  const fuentes = await p.evaluate(async () => { await document.fonts.ready; return ['Archivo', 'Literata', 'IBM Plex Mono'].map((f) => document.fonts.check(`16px "${f}"`)); });
  assert.deepEqual(fuentes, [true, true, true], 'las tres tipografías cargan desde la página');
  await p.screenshot({ path: path.join(capturas, 'inicio.png') });
});

await paso('la empresa con diferencias: seis diferencias detectadas y cuatro explicadas', async () => {
  await p.click('#paso-xml [data-ejemplo="diferencias"]');
  await p.waitForSelector('#informe:not([hidden])');
  const e = await estados(p);
  assert.deepEqual(e, {
    C1a: 'No cuadra', C1b: 'Cuadra', C2: 'Revisar', C3: 'No cuadra', C4: 'Explicada', C5a: 'No cuadra', C5b: 'Cuadra',
    C6: 'Explicada', C7a: 'Revisar', C7b: 'Explicada', C8a: 'No cuadra', C8b: 'Cuadra', C8c: 'Explicada', C8d: 'Cuadra'
  });
  // Las fichas cuentan cruces: C1, C3, C5 y C8 no cuadran; C2 y C7, a revisar; C4 y C6 cuadran.
  assert.deepEqual(await fichas(p), [4, 2, 2, 6]);
});

await paso('cada diferencia trae qué revisar y los terceros que más pesan', async () => {
  const bloques = await p.$$eval('#informe .detalle', (ds) => ds.map((d) => ({
    titulo: d.querySelector('h4').textContent,
    causas: d.querySelectorAll('.causas li').length,
    terceros: d.querySelectorAll('.terceros tr').length
  })));
  assert.equal(bloques.length, 6);
  for (const b of bloques) assert.ok(b.causas >= 3 && b.terceros >= 9, b.titulo);
  assert.equal(bloques.find((b) => b.titulo.startsWith('C1a')).terceros, 10);
});

await paso('las revisiones de los XML están en el informe', async () => {
  const items = await p.$$eval('#informe .revisiones li', (li) => li.map((x) => x.textContent));
  assert.equal(items.length, 10);
  assert.ok(items.some((t) => t.includes('GMF a nombre de la entidad financiera')));
  assert.ok(items.some((t) => t.includes('Dígito de verificación del NIT') && t.includes('línea 25')));
  await p.locator('#informe').screenshot({ path: path.join(capturas, 'informe.png') });
  await p.locator('#paso-cifras').screenshot({ path: path.join(capturas, 'cifras.png') });
});

await paso('el informe impreso cabe en una hoja carta', async () => {
  const pdf = await p.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(path.join(salida, 'informe-diferencias.pdf'), pdf);
  assert.equal(paginasPDF(pdf), 1);
  await p.emulateMedia({ media: 'print' });
  await p.setViewportSize({ width: 816, height: 1056 });
  await p.locator('#informe').screenshot({ path: path.join(capturas, 'impresion.png') });
  await p.emulateMedia({ media: 'screen' });
  await p.setViewportSize({ width: 1280, height: 900 });
});

await paso('el CSV trae todo y el resumen no trae NIT', async () => {
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#descargar-csv')]);
  assert.equal(descarga.suggestedFilename(), 'verificador-exogena-ag2025-999200017.csv');
  const csv = fs.readFileSync(await descarga.path(), 'utf8');
  assert.ok(csv.startsWith('﻿'));
  for (const s of ['CRUCES', 'EXPLICACIONES', 'TERCEROS QUE MÁS PESAN', 'REVISIONES DE LOS XML', 'ARCHIVOS', 'C1a Retención de renta a terceros']) assert.ok(csv.includes(s), s);
  const resumen = await p.inputValue('#texto-resumen');
  assert.ok(resumen.includes('contacto@andresbrinez.com'));
  assert.ok(!resumen.includes('999200017') && !resumen.includes('CLIENTE VALLE'));
});

await paso('una explicación nueva vuelve la línea «Explicada», y quitarla la devuelve', async () => {
  const c2 = p.locator('#informe .detalle', { hasText: 'C2 Retención de IVA practicada' });
  await c2.locator('.form-explicacion input').first().fill('Retención de IVA de un proveedor que no quedó en el 1001');
  await c2.locator('.form-explicacion button').click();
  assert.equal((await estados(p)).C2, 'Explicada');
  await p.locator('#informe .explicadas li', { hasText: 'proveedor que no quedó' }).locator('button').click();
  assert.equal((await estados(p)).C2, 'Revisar');
});

await paso('el umbral se cambia y el semáforo se rehace', async () => {
  await p.fill('#p-umbral', '5');
  await p.waitForFunction(() => document.querySelector('#informe .ficha-valor').textContent === '6');
  assert.equal((await estados(p)).C2, 'No cuadra');
  await p.fill('#p-umbral', '20');
  await p.waitForFunction(() => document.querySelector('#informe .ficha-valor').textContent === '4');
});

await paso('el modo oscuro se puede elegir', async () => {
  await p.click('#boton-tema');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'dark');
  await p.locator('#informe').screenshot({ path: path.join(capturas, 'oscuro.png') });
  await p.click('#boton-tema');
  assert.equal(await p.getAttribute('html', 'data-theme'), 'light');
});

await paso('empezar otro cliente deja todo en blanco', async () => {
  await p.click('#nuevo-cliente');
  assert.ok(await p.isVisible('#informe-vacio'));
  assert.equal(await p.inputValue('#cliente-nombre'), '');
  assert.equal(await p.$$eval('#declaraciones input', (xs) => xs.filter((x) => x.value).length), 0);
});

await paso('carga XML reales desde el disco y cifras pegadas desde Excel', async () => {
  const dir = path.join(raiz, 'ejemplos', 'cuadra');
  const xml = fs.readdirSync(dir).filter((f) => f.endsWith('.xml')).map((f) => path.join(dir, f));
  await p.setInputFiles('#archivos-xml', xml);
  await p.waitForSelector('#lista-archivos:not([hidden])');
  assert.equal(await p.$$eval('#cuerpo-archivos tr', (f) => f.length), 11);
  await p.click('#pegar summary');
  // Excel copia con tabuladores: se pega la plantilla llena así.
  const pegado = fs.readFileSync(path.join(dir, 'declaraciones.csv'), 'utf8').replace(/^﻿/, '').replace(/;/g, '\t');
  await p.fill('#texto-pegado', pegado);
  await p.click('#leer-pegado');
  await p.waitForFunction(() => /Se leyeron 79 cifras/.test(document.getElementById('estado-pegado').textContent));
  assert.equal(await p.inputValue('#per-350'), 'mensual');
  assert.deepEqual(await fichas(p), [0, 0, 8, 0]);
  assert.match(await p.textContent('#informe .revisiones'), /no encontraron nada/);
  await p.fill('#cliente-nombre', 'Comercializadora Andina de Ejemplo S.A.S.');
  await p.locator('#informe').screenshot({ path: path.join(capturas, 'cuadra.png') });
});

await paso('pegar una columna en la tabla del 350 la reparte mes por mes', async () => {
  const llenas = await p.evaluate(() => {
    const destino = document.querySelector('input[data-campo="t135"][data-periodo="M01"]');
    const datos = new DataTransfer();
    datos.setData('text/plain', Array.from({ length: 12 }, () => '1.000').join('\r\n') + '\r\n');
    destino.dispatchEvent(new ClipboardEvent('paste', { clipboardData: datos, bubbles: true, cancelable: true }));
    return Array.from(document.querySelectorAll('input[data-campo="t135"]')).filter((x) => x.value === '1.000').length;
  });
  assert.equal(llenas, 12);
  assert.equal(await p.textContent('[data-total="t135"]'), '12.000');
  await p.waitForFunction(() => Array.from(document.querySelectorAll('#informe .celda-linea .id')).some((x) => x.textContent === 'C1c'));
});

await paso('una cifra escrita a mano rehace el cruce', async () => {
  const campo = p.locator('input[data-campo="r45"]');
  const antes = await campo.inputValue();
  await campo.fill('1.000.000.000');
  await p.waitForFunction(() => document.querySelectorAll('#informe .ficha-valor')[0].textContent === '1');
  assert.equal((await estados(p)).C8b, 'No cuadra');
  await campo.fill(antes);
  await p.waitForFunction(() => document.querySelectorAll('#informe .ficha-valor')[0].textContent === '0');
});

await paso('la plantilla para Excel se descarga con sus columnas', async () => {
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#descargar-plantilla')]);
  const csv = fs.readFileSync(await descarga.path(), 'utf8');
  assert.equal(csv.replace(/^﻿/, '').split(/\r\n/)[0], 'Declaración;Casilla;Concepto;Periodo;Valor');
  assert.equal(csv.trim().split(/\r\n/).length, 1 + 14 + 18 + 72);
});
await ctx.close();

console.log('Teléfono');
const ctxTel = await contexto(navegador, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const tel = await abrir(ctxTel);
await paso('en el teléfono no hay desplazamiento horizontal', async () => {
  await tel.click('#paso-xml [data-ejemplo="diferencias"]');
  await tel.waitForSelector('#informe:not([hidden])');
  const [ancho, vista] = await tel.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(ancho <= vista, `ancho de la página ${ancho} frente a ${vista}`);
  await tel.locator('#informe').scrollIntoViewIfNeeded();
  await tel.evaluate(() => document.getElementById('informe').scrollIntoView());
  await tel.screenshot({ path: path.join(capturas, 'telefono.png') });
});
await ctxTel.close();

await navegador.close();

await paso('ninguna petición salió del computador', async () => {
  assert.deepEqual(red, []);
});
await paso('sin errores ni advertencias en la consola', async () => {
  assert.deepEqual(problemasConsola, []);
});

const fallas = resultados.filter((r) => !r[0]);
console.log(`\n${resultados.length - fallas.length} de ${resultados.length} pasos bien.`);
if (fallas.length) process.exit(1);
