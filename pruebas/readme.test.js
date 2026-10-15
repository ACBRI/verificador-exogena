'use strict';
// El README describe las reglas a mano: estas pruebas fallan si se queda atrás
// de lo que dicen los archivos de reglas.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../src/reglas-ag2025.js');

const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');

test('el README explica cada línea de cruce', () => {
  for (const c of R.CRUCES) for (const l of c.lineas) assert.ok(new RegExp(`\\| ${l.id} `).test(readme), `falta la línea ${l.id} en la tabla de cruces`);
});

test('el README cita cada norma de las reglas con su URL', () => {
  for (const [clave, n] of Object.entries(R.NORMAS)) assert.ok(readme.includes(n.url), `falta la URL de ${clave}`);
});

test('el README nombra cada formato que se revisa y cada casilla que se pide', () => {
  for (const f of Object.keys(R.FORMATOS)) assert.ok(readme.includes(f), `falta el formato ${f}`);
  for (const dec of Object.values(R.DECLARACIONES)) {
    for (const c of dec.casillas) {
      const numeros = c.casilla.match(/\d+/g);
      assert.ok(numeros.every((n) => readme.includes(n)), `falta la casilla ${c.casilla}`);
    }
  }
});

test('el README dice la UVT y el umbral de las reglas', () => {
  assert.ok(readme.includes('49.799'));
  assert.ok(readme.includes(`${R.PARAMETROS.umbralUVT.valor} UVT`));
});
