'use strict';
// La página de un solo archivo: que esté al día con el código, que no baje nada
// de ningún sitio y que su política de seguridad cubra exactamente su código.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { construir, SALIDA } = require('../herramientas/construir.js');

const RAIZ = path.resolve(__dirname, '..');
const html = construir();

test(`${SALIDA} está al día con src/, ejemplos/ y fuentes/`, () => {
  const enDisco = fs.readFileSync(path.join(RAIZ, SALIDA), 'utf8');
  assert.ok(enDisco === html, `${SALIDA} no coincide con lo que arma el código. Corra: npm run construir`);
});

test('la política de seguridad prohíbe conectarse y solo deja correr el código de la página', () => {
  const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  assert.ok(m, 'falta la política de seguridad');
  const csp = Object.fromEntries(m[1].split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  assert.deepEqual(csp['default-src'], ["'none'"]);
  assert.deepEqual(csp['connect-src'], ["'none'"]);
  assert.deepEqual(csp['form-action'], ["'none'"]);
  assert.ok(!m[1].includes('unsafe-inline') && !m[1].includes('unsafe-eval'));
  const huella = (t) => "'sha256-" + crypto.createHash('sha256').update(t, 'utf8').digest('base64') + "'";
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  const estilos = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((x) => x[1]);
  assert.equal(scripts.length, 2);
  assert.equal(estilos.length, 1);
  assert.deepEqual(csp['script-src'].sort(), scripts.map(huella).sort());
  assert.deepEqual(csp['style-src'], estilos.map(huella));
  assert.ok(!/<script[^>]+src=/.test(html), 'no hay scripts externos');
});

test('no se refiere a ningún recurso de otro sitio', () => {
  assert.ok(!/<link[^>]+rel="stylesheet"/.test(html));
  assert.ok(!/@import/.test(html));
  const urls = [...html.matchAll(/url\(([^)]*)\)/g)].map((x) => x[1]);
  assert.ok(urls.length >= 4);
  for (const u of urls) assert.ok(u.startsWith('data:'), `url() que no es data: ${u.slice(0, 40)}`);
  const srcs = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((x) => x[1]);
  for (const s of srcs) {
    // Los enlaces de texto (normas, sitio de Andrés) se abren solo si la persona los toca.
    if (/^https?:\/\//.test(s)) assert.ok(new RegExp(`<a [^>]*href="${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html), `recurso externo: ${s}`);
    else assert.ok(/^(data:|#|mailto:)/.test(s), `referencia inesperada: ${s}`);
  }
});

test('trae las cuatro tipografías, el logotipo y los datos de ejemplo', () => {
  assert.equal((html.match(/@font-face/g) || []).length, 4);
  for (const familia of ['Archivo', 'Literata', 'IBM Plex Mono']) assert.ok(html.includes(`font-family: '${familia}'`));
  assert.ok(html.includes('<circle cx="46" cy="19" r="5" fill="#F07A3B"/>'), 'el sol del logotipo');
  assert.ok(html.includes('window.ExoEjemplos'));
  assert.ok(Buffer.byteLength(html) < 2 * 1024 * 1024, 'la página pesa menos de 2 MB');
});

test('ni la página ni el código llevan emojis', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  assert.ok(!emoji.test(html));
});
