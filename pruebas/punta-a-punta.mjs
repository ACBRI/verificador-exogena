#!/usr/bin/env node
// Prueba de punta a punta: abre verificador-exogena.html como lo abriría una
// persona con doble clic (file://) y sin internet: toda petición que no sea del
// propio archivo se corta y se cuenta. Usa los ejemplos, carga XML reales desde
// el disco, pega cifras, agrega explicaciones, revisa que el informe impreso
// quepa en una hoja y descarga el CSV.
//
// Corre en los tres motores de navegador de Playwright, uno detrás de otro:
//
//   Chromium   el motor de Chrome y de Edge (Windows y Mac)
//   Firefox    el de Firefox (Windows y Mac)
//   WebKit     el de Safari (Mac)
//
//   npm install                        (una vez: instala playwright-core, sin navegadores)
//   npx playwright-core install --only-shell chromium firefox webkit
//   npm run punta                      los tres motores
//   npm run punta -- firefox webkit    solo esos
//
// En Linux, WebKit pide además unas bibliotecas del sistema:
// `npx playwright-core install-deps webkit` (con sudo) las instala.
//
// Las capturas de docs/capturas/ salen de Chromium; las de Firefox y WebKit quedan
// en pruebas/salida/capturas-<motor>/ para mirarlas, sin entrar al repositorio.
// Chromium usa el que ya tenga Playwright en ~/.cache/ms-playwright; otro se
// indica con NAVEGADOR=/ruta/al/chrome. La fecha del navegador se fija en el 15
// de octubre de 2026 para que las capturas no cambien de un día a otro.

import { chromium, firefox, webkit } from 'playwright-core';
import { buscarChromium } from '../herramientas/chromium.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagina = pathToFileURL(path.join(raiz, 'verificador-exogena.html')).href;
const salida = path.join(raiz, 'pruebas', 'salida');
const FECHA = new Date('2026-10-15T15:00:00-05:00');

const MOTORES = {
  chromium: { tipo: chromium, nombre: 'Chromium', equivale: 'Chrome y Edge' },
  firefox: { tipo: firefox, nombre: 'Firefox', equivale: 'Firefox' },
  webkit: { tipo: webkit, nombre: 'WebKit', equivale: 'Safari' }
};

// La hoja carta del informe impreso: 8,5 por 11 pulgadas a 96 px por pulgada,
// menos los márgenes de su @page (7 mm arriba, 6 mm abajo y 9 mm a cada lado).
const MM = 96 / 25.4;
const HOJA_UTIL = { ancho: Math.floor(816 - 18 * MM), alto: Math.floor(1056 - 13 * MM) };

function paginasPDF(bytes) {
  return (bytes.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}

// ----------------------------------------------------------------- un motor

async function probar(clave) {
  const motor = MOTORES[clave];
  const capturas = clave === 'chromium' ? path.join(raiz, 'docs', 'capturas') : path.join(salida, `capturas-${clave}`);
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

  /**
   * Un contexto sin internet: lo que no sea el archivo mismo se corta y se anota. En WebKit,
   * el modo sin conexión de Playwright no deja abrir ni el archivo local (Safari sí lo abre sin
   * red), así que ahí la red se corta solo con la intercepción, que aborta toda petición.
   */
  async function contexto(navegador, opciones = {}) {
    const ctx = await navegador.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, locale: 'es-CO' }, opciones));
    if (clave !== 'webkit') await ctx.setOffline(true);
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
    p.on('console', (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      if (capturando && clave === 'webkit' && m.text().startsWith('Refused to apply a stylesheet')) return;
      problemasConsola.push(`${m.type()}: ${m.text()}`);
    });
    p.on('pageerror', (e) => problemasConsola.push('error de la página: ' + e.message));
    await p.goto(pagina);
    return p;
  }

  /**
   * Para tomar una captura, Playwright le inyecta a WebKit una hoja de estilos que la política de
   * seguridad de la página rechaza, y eso sale como error en la consola. Es de la herramienta, no
   * de la página: ese error se descarta solo mientras dura una captura.
   */
  let capturando = false;
  async function capturar(objetivo, nombre) {
    capturando = true;
    try {
      await objetivo.screenshot({ path: path.join(capturas, nombre) });
    } finally {
      capturando = false;
    }
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

  /**
   * Los NIT, valores y porcentajes de los terceros que no caben enteros en su columna. Se mide el
   * texto con un Range y no con scrollWidth, que es entero: un NIT que se pasaba 0,05 px no lo
   * movía, y aun así Firefox y Safari lo cortaban con puntos suspensivos.
   */
  async function cifrasCortadas(p) {
    return p.$$eval('#informe .terceros td.nid, #informe .terceros td.valor, #informe .terceros td.pct', (tds) => tds.filter((td) => {
      const estilo = getComputedStyle(td);
      const util = td.getBoundingClientRect().width - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
        - parseFloat(estilo.borderLeftWidth) - parseFloat(estilo.borderRightWidth);
      const rango = document.createRange();
      rango.selectNodeContents(td);
      return rango.getBoundingClientRect().width > util + 0.01;
    }).map((td) => td.textContent));
  }

  /** La página en modo de impresión, con el ancho útil de la hoja carta: su alto y las cifras cortadas. */
  async function impreso(p) {
    await p.emulateMedia({ media: 'print' });
    await p.setViewportSize({ width: HOJA_UTIL.ancho, height: HOJA_UTIL.alto });
    const alto = await p.evaluate(() => Math.ceil(document.body.getBoundingClientRect().bottom + window.scrollY));
    const cortadas = await cifrasCortadas(p);
    // null y no 'screen': con 'screen' fijado, page.pdf() de Chromium imprime con la hoja de pantalla.
    await p.emulateMedia({ media: null });
    await p.setViewportSize({ width: 1280, height: 900 });
    return { alto, cortadas };
  }

  const opciones = clave === 'chromium' ? { executablePath: buscarChromium() } : {};
  const navegador = await motor.tipo.launch(opciones);
  const version = navegador.version();
  console.log(`\n${motor.nombre} ${version} (el motor de ${motor.equivale})`);
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
    assert.ok(await p.isHidden('#anticipo'), 'la oferta de la exógena 2026 espera al informe');
    const fuentes = await p.evaluate(async () => { await document.fonts.ready; return ['Archivo', 'Literata', 'IBM Plex Mono'].map((f) => document.fonts.check(`16px "${f}"`)); });
    assert.deepEqual(fuentes, [true, true, true], 'las tres tipografías cargan desde la página');
    await capturar(p, 'inicio.png');
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
    assert.deepEqual(await cifrasCortadas(p), [], 'NIT o cifras cortadas en pantalla');
  });

  await paso('las revisiones de los XML están en el informe', async () => {
    const items = await p.$$eval('#informe .revisiones li', (li) => li.map((x) => x.textContent));
    assert.equal(items.length, 10);
    assert.ok(items.some((t) => t.includes('GMF a nombre de la entidad financiera')));
    assert.ok(items.some((t) => t.includes('Dígito de verificación del NIT') && t.includes('línea 25')));
    await capturar(p.locator('#informe'), 'informe.png');
    await capturar(p.locator('#paso-cifras'), 'cifras.png');
  });

  await paso('el informe impreso cabe en una hoja carta', async () => {
    // En los tres motores: lo que ocupa la página impresa con el ancho útil de la hoja.
    const { alto, cortadas } = await impreso(p);
    console.log(`         impreso: ${alto} px de alto; la hoja carta deja ${HOJA_UTIL.alto}`);
    assert.ok(alto <= HOJA_UTIL.alto, `el informe impreso ocupa ${alto} px y la hoja deja ${HOJA_UTIL.alto}`);
    assert.deepEqual(cortadas, [], 'NIT o cifras cortadas en el informe impreso');
    // Solo Chromium imprime a PDF desde Playwright: ahí se cuentan las hojas de verdad.
    if (clave === 'chromium') {
      const pdf = await p.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true });
      fs.writeFileSync(path.join(salida, 'informe-diferencias.pdf'), pdf);
      assert.equal(paginasPDF(pdf), 1);
    }
    await p.emulateMedia({ media: 'print' });
    await p.setViewportSize({ width: 816, height: 1056 });
    await capturar(p.locator('#informe'), 'impresion.png');
    await p.emulateMedia({ media: null });
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

  await paso('la exógena 2026 con anticipo: el botón en pantalla, la línea en el pie impreso y en el resumen', async () => {
    assert.ok(await p.isVisible('#anticipo'));
    const enlace = p.locator('#anticipo a.boton');
    assert.equal((await enlace.textContent()).trim(), 'Quiero la exógena 2026 hecha y cuadrada');
    assert.equal(await enlace.getAttribute('href'), 'https://andresbrinez.com/exogena-2026?origen=verificador');
    assert.equal(await enlace.getAttribute('target'), '_blank');
    assert.equal(await enlace.getAttribute('rel'), 'noopener');
    assert.match(await p.textContent('#informe .hoja-pie'), /La exógena 2026 hecha y cuadrada: andresbrinez\.com\/exogena-2026/);
    assert.match(await p.inputValue('#texto-resumen'), /andresbrinez\.com\/exogena-2026/);
    assert.match(await p.textContent('.pie .firma-pie'), /Código abierto, licencia MIT/);
    assert.equal(await p.getAttribute('.pie .firma-pie a[href^="https://github.com/"]', 'href'), 'https://github.com/ACBRI/verificador-exogena');
    // Al imprimir se va el bloque con el botón; la línea del pie de la hoja se queda.
    await p.emulateMedia({ media: 'print' });
    const [bloque, pieHoja] = await p.evaluate(() => [
      getComputedStyle(document.getElementById('anticipo')).display,
      getComputedStyle(document.querySelector('#informe .hoja-pie')).display
    ]);
    await p.emulateMedia({ media: null });
    assert.equal(bloque, 'none', 'el bloque del anticipo no se imprime');
    assert.notEqual(pieHoja, 'none', 'el pie de la hoja sí se imprime');
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
    await capturar(p.locator('#informe'), 'oscuro.png');
    await p.click('#boton-tema');
    assert.equal(await p.getAttribute('html', 'data-theme'), 'light');
  });

  await paso('empezar otro cliente deja todo en blanco', async () => {
    await p.click('#nuevo-cliente');
    assert.ok(await p.isVisible('#informe-vacio'));
    assert.ok(await p.isHidden('#anticipo'));
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
    await p.waitForFunction(() => /Se leyeron 78 cifras/.test(document.getElementById('estado-pegado').textContent));
    assert.equal(await p.inputValue('#per-350'), 'mensual');
    assert.deepEqual(await fichas(p), [0, 0, 8, 0]);
    assert.match(await p.textContent('#informe .revisiones'), /no encontraron nada/);
    await p.fill('#cliente-nombre', 'Comercializadora Andina de Ejemplo S.A.S.');
    await capturar(p.locator('#informe'), 'cuadra.png');
  });

  await paso('pegar una columna en la tabla del 350 la reparte mes por mes', async () => {
    // Con el portapapeles de verdad: se copia la columna de un cuadro de texto y se pega con el
    // teclado, como desde Excel. El navegador sin ventana tiene su propio portapapeles y no toca
    // el del computador.
    const columna = (valor) => Array.from({ length: 12 }, () => valor).join('\n') + '\n';
    const llenasCon = (valor) => p.$$eval('input[data-campo="t135"]', (xs, v) => xs.filter((x) => x.value === v).length, valor);
    await p.evaluate(() => { const t = document.createElement('textarea'); t.id = 'portapapeles-prueba'; document.body.append(t); });
    await p.fill('#portapapeles-prueba', columna('1.000'));
    await p.focus('#portapapeles-prueba');
    await p.keyboard.press('ControlOrMeta+A');
    await p.keyboard.press('ControlOrMeta+C');
    await p.evaluate(() => document.getElementById('portapapeles-prueba').remove());
    await p.focus('input[data-campo="t135"][data-periodo="M01"]');
    await p.keyboard.press('ControlOrMeta+V');
    await p.waitForFunction(() => document.querySelector('[data-total="t135"]').textContent === '12.000');
    assert.equal(await llenasCon('1.000'), 12);
    await p.waitForFunction(() => Array.from(document.querySelectorAll('#informe .celda-linea .id')).some((x) => x.textContent === 'C1c'));

    // Excel en Windows copia con CRLF. Un pegado armado por código lo prueba donde el motor deja
    // pasar sus datos (Chromium y WebKit); Firefox entrega vacío el de un evento armado por código.
    const pasaDatos = await p.evaluate(() => {
      const datos = new DataTransfer();
      datos.setData('text/plain', 'x');
      return new ClipboardEvent('paste', { clipboardData: datos }).clipboardData.getData('text') === 'x';
    });
    if (pasaDatos) {
      await p.evaluate((texto) => {
        const datos = new DataTransfer();
        datos.setData('text/plain', texto);
        document.querySelector('input[data-campo="t135"][data-periodo="M01"]')
          .dispatchEvent(new ClipboardEvent('paste', { clipboardData: datos, bubbles: true, cancelable: true }));
      }, columna('2.000').replace(/\n/g, '\r\n'));
      assert.equal(await llenasCon('2.000'), 12);
      assert.equal(await p.textContent('[data-total="t135"]'), '24.000');
    }
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
    assert.equal(csv.trim().split(/\r\n/).length, 1 + 13 + 18 + 72);
  });
  await ctx.close();

  console.log('Teléfono');
  // Firefox no emula la etiqueta viewport de los teléfonos (isMobile): ahí basta el ancho y el toque.
  const movil = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true };
  if (clave !== 'firefox') movil.isMobile = true;
  const ctxTel = await contexto(navegador, movil);
  const tel = await abrir(ctxTel);
  await paso('en el teléfono no hay desplazamiento horizontal', async () => {
    await tel.click('#paso-xml [data-ejemplo="diferencias"]');
    await tel.waitForSelector('#informe:not([hidden])');
    const [ancho, vista] = await tel.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(ancho <= vista, `ancho de la página ${ancho} frente a ${vista}`);
    await tel.locator('#informe').scrollIntoViewIfNeeded();
    await tel.evaluate(() => document.getElementById('informe').scrollIntoView());
    await capturar(tel, 'telefono.png');
  });
  await ctxTel.close();

  await navegador.close();

  await paso('ninguna petición salió del computador', async () => {
    assert.deepEqual(red, []);
  });
  await paso('sin errores ni advertencias en la consola', async () => {
    assert.deepEqual(problemasConsola, []);
  });

  const bien = resultados.filter((r) => r[0]).length;
  return { motor, version, bien, total: resultados.length };
}

// ------------------------------------------------------------------ los tres

const pedidos = process.argv.slice(2);
for (const c of pedidos) if (!MOTORES[c]) {
  console.error(`No conozco el motor «${c}». Los que hay: ${Object.keys(MOTORES).join(', ')}.`);
  process.exit(2);
}
const resumen = [];
for (const clave of pedidos.length ? pedidos : Object.keys(MOTORES)) {
  try {
    resumen.push(await probar(clave));
  } catch (error) {
    // No abrió: falta el navegador o una biblioteca del sistema. El resto de motores sigue.
    console.log(`\n${MOTORES[clave].nombre}: no se pudo abrir el navegador\n  ${String(error && error.message).split('\n').slice(0, 6).join('\n  ')}`);
    resumen.push({ motor: MOTORES[clave], version: '-', bien: 0, total: 1 });
  }
}

console.log('');
for (const r of resumen) console.log(`${r.motor.nombre} ${r.version}: ${r.bien} de ${r.total} pasos bien.`);
if (resumen.some((r) => r.bien !== r.total)) process.exit(1);
