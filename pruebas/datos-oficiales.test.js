'use strict';
// Los datos que salen de la norma no se editan a mano: estas pruebas los
// vuelven a generar desde los XSD y las tablas oficiales y los comparan.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { generar } = require('../herramientas/datos-oficiales.js');

const RAIZ = path.resolve(__dirname, '..');

test('src/esquemas-ag2025.js y src/tablas-ag2025.js están al día con norma/', () => {
  for (const [ruta, contenido] of Object.entries(generar())) {
    const enDisco = fs.readFileSync(path.join(RAIZ, ruta), 'utf8');
    assert.equal(enDisco, contenido, `${ruta} no coincide con lo que sale de norma/. Corra: npm run datos`);
  }
});

test('los esquemas son las versiones del año gravable 2025', () => {
  const E = require('../src/esquemas-ag2025.js');
  // Resolución 000162 de 2023, art. 66, con los cambios de la 000188 de 2024 (aplica desde el AG 2025).
  assert.deepEqual(Object.keys(E).sort(), [
    '1001-v10', '1003-v7', '1004-v8', '1005-v8', '1006-v8', '1007-v9', '1008-v7', '1009-v7',
    '1010-v9', '1011-v6', '1012-v7', '1647-v2', '2275-v2', '2276-v4'
  ]);
  assert.equal(E['1001-v10'].elemento, 'pagos');
  assert.equal(E['1001-v10'].maxRegistros, 5000);
  assert.deepEqual(E['1001-v10'].atributos.map((a) => a.nombre), [
    'cpt', 'tdoc', 'nid', 'apl1', 'apl2', 'nom1', 'nom2', 'raz', 'dir', 'dpto', 'mun', 'pais',
    'pago', 'pnded', 'ided', 'inded', 'retp', 'reta', 'comun', 'ndom'
  ]);
  // El 1003 pide la dirección siempre, con al menos 8 caracteres, y llama «mcpo» al municipio.
  const dir = E['1003-v7'].atributos.find((a) => a.nombre === 'dir');
  assert.equal(dir.requerido, true);
  assert.equal(dir.minLargo, 8);
  assert.ok(E['1003-v7'].atributos.some((a) => a.nombre === 'mcpo'));
  // El 1005 versión 8 trae el IVA llevado al costo (ivavcg), que la versión 9 del AG 2026 quita.
  assert.ok(E['1005-v8'].atributos.some((a) => a.nombre === 'ivavcg'));
});

test('las tablas del prevalidador traen lo que se espera', () => {
  const T = require('../src/tablas-ag2025.js');
  assert.equal(T.paises['169'], 'COLOMBIA');
  assert.equal(Object.keys(T.departamentos).length, 33);
  assert.equal(Object.keys(T.municipios).length, 1122);
  assert.equal(T.municipios['11-1'], 'Bogotá, D.C.');
  assert.deepEqual(Object.keys(T.tiposDocumento.tabla1).sort(), ['11', '12', '13', '21', '22', '31', '41', '42', '43', '47', '48']);
  assert.ok(!('43' in T.tiposDocumento.tabla2));
});
