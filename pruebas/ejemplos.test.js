'use strict';
// Las dos empresas de ejemplo: que estén al día, que sus XML cumplan los
// esquemas oficiales y que el verificador encuentre lo que se sembró.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const V = require('../src/verificador.js');
const { generar } = require('../herramientas/generar-ejemplos.js');

const RAIZ = path.resolve(__dirname, '..');

function cargar(tipo) {
  const dir = path.join(RAIZ, 'ejemplos', tipo);
  const archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.xml')).sort().map((f) => V.leerArchivo(f, fs.readFileSync(path.join(dir, f))));
  const pegado = V.leerPegado(fs.readFileSync(path.join(dir, 'declaraciones.csv'), 'utf8'), {});
  assert.deepEqual(pegado.avisos, [], `la plantilla de ${tipo} se lee sin avisos`);
  const explicaciones = {};
  const rutaExp = path.join(dir, 'explicaciones.csv');
  if (fs.existsSync(rutaExp)) {
    for (const l of fs.readFileSync(rutaExp, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1)) {
      const [linea, descripcion, valor] = l.split(';');
      (explicaciones[linea] = explicaciones[linea] || []).push({ descripcion, valor: Number(valor) });
    }
  }
  const empresa = JSON.parse(fs.readFileSync(path.join(dir, 'empresa.json'), 'utf8'));
  const declaraciones = { periodicidad: pegado.periodicidad, valores: pegado.valores };
  const contexto = { nitCliente: empresa.nit, nombreCliente: empresa.nombre, personaJuridica: true };
  return { archivos, declaraciones, explicaciones, contexto, empresa };
}

const linea = (res, id) => res.cruces.flatMap((c) => c.lineas).find((l) => l.id === id);

test('los ejemplos de la carpeta ejemplos/ son los que produce el generador', () => {
  const generados = generar();
  const enDisco = [];
  for (const tipo of ['cuadra', 'diferencias']) for (const f of fs.readdirSync(path.join(RAIZ, 'ejemplos', tipo))) enDisco.push(`ejemplos/${tipo}/${f}`);
  assert.deepEqual(enDisco.sort(), Object.keys(generados).sort(), 'los mismos archivos; corra: npm run ejemplos');
  for (const [ruta, bytes] of Object.entries(generados)) {
    assert.ok(Buffer.compare(fs.readFileSync(path.join(RAIZ, ruta)), bytes) === 0, `${ruta} no coincide; corra: npm run ejemplos`);
  }
});

test('los XML de ejemplo cumplen los esquemas XSD oficiales (xmllint)', () => {
  let xmllint;
  try {
    xmllint = execFileSync('xmllint', ['--version'], { stdio: 'pipe' }) && 'xmllint';
  } catch (e) {
    assert.fail('Esta prueba necesita xmllint (paquete libxml2-utils en Ubuntu).');
  }
  for (const tipo of ['cuadra', 'diferencias']) {
    const dir = path.join(RAIZ, 'ejemplos', tipo);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.xml'))) {
      const formato = String(Number(/^Dmuisca_\d{2}(\d{5})/.exec(f)[1]));
      const xsd = path.join(RAIZ, 'norma', 'xsd-ag2025', `${formato}.xsd`);
      const salida = execFileSync(xmllint, ['--noout', '--schema', xsd, path.join(dir, f)], { stdio: 'pipe' }).toString() + '';
      assert.equal(salida, '', `${tipo}/${f}`);
    }
  }
});

describe('la empresa que cuadra', () => {
  const e = cargar('cuadra');
  const res = V.verificar({ archivos: e.archivos, declaraciones: e.declaraciones, explicaciones: e.explicaciones, parametros: {}, contexto: e.contexto });

  test('los ocho cruces en verde, sin explicaciones', () => {
    assert.deepEqual(res.resumen, { rojo: 0, amarillo: 0, verde: 8, 'sin datos': 0 });
    for (const c of res.cruces) for (const l of c.lineas) {
      assert.equal(l.estado, 'verde', l.id);
      assert.ok(Math.abs(l.diferencia) < 49799, `${l.id}: solo el redondeo a miles`);
      assert.equal(l.explicaciones.length, 0);
    }
  });

  test('ninguna revisión de los XML encuentra algo', () => {
    assert.deepEqual(res.hallazgos, []);
  });

  test('el 1001 viene en dos envíos y se suman', () => {
    const del1001 = e.archivos.filter((a) => a.formato === '1001');
    assert.equal(del1001.length, 2);
    assert.equal(res.porFormato['1001'].registros.length, del1001[0].registros.length + del1001[1].registros.length);
  });
});

describe('la empresa con diferencias', () => {
  const e = cargar('diferencias');
  const entrada = { archivos: e.archivos, declaraciones: e.declaraciones, explicaciones: e.explicaciones, parametros: {}, contexto: e.contexto };
  const res = V.verificar(entrada);

  test('detecta las seis diferencias sembradas', () => {
    const esperado = { C1a: 'rojo', C2: 'amarillo', C3: 'rojo', C5a: 'rojo', C7a: 'amarillo', C8a: 'rojo' };
    for (const [id, estado] of Object.entries(esperado)) {
      const l = linea(res, id);
      assert.equal(l.estado, estado, id);
      // La diferencia es la sembrada, más o menos el redondeo de los formularios.
      assert.ok(Math.abs(l.diferencia - e.empresa.sembradas[id]) < 13000, `${id}: ${l.diferencia} frente a ${e.empresa.sembradas[id]}`);
    }
  });

  test('no marca rojo en las cuatro que tienen explicación', () => {
    for (const id of ['C4', 'C6', 'C7b', 'C8c']) {
      const l = linea(res, id);
      assert.equal(l.estado, 'verde', id);
      assert.equal(l.explicada, true, id);
      assert.equal(V.nombreEstado(l), 'Explicada', id);
    }
  });

  test('sin las explicaciones, esas cuatro diferencias sí aparecen', () => {
    const sin = V.verificar(Object.assign({}, entrada, { explicaciones: {} }));
    for (const id of ['C4', 'C6', 'C7b', 'C8c']) assert.notEqual(linea(sin, id).estado, 'verde', id);
  });

  test('las demás líneas cuadran', () => {
    for (const id of ['C1b', 'C5b', 'C8b', 'C8d']) assert.equal(linea(res, id).estado, 'verde', id);
  });

  test('encuentra los errores sembrados dentro de los XML', () => {
    const porRevision = {};
    for (const h of res.hallazgos) porRevision[h.revision] = (porRevision[h.revision] || 0) + h.cantidad;
    assert.deepEqual(porRevision, {
      'gmf': 1, 'cuantias-menores': 1, 'tipo-documento': 1, 'dv': 1, 'codigos-dane': 1, 'duplicados': 1,
      'valor-total': 1, 'direccion': 1, 'base-reteiva': 1, 'iva-costo': 1
    });
  });

  test('los diez terceros que más pesan en la exógena de C1a, de mayor a menor', () => {
    const c1a = linea(res, 'C1a');
    assert.equal(c1a.terceros.length, 10);
    for (let k = 1; k < 10; k++) assert.ok(Math.abs(c1a.terceros[k - 1].valor) >= Math.abs(c1a.terceros[k].valor));
    const mayor = res.porFormato['1001'].registros.reduce((m, r) => (Number(r.atr.retp) > Number(m.atr.retp) ? r : m));
    assert.equal(c1a.terceros[0].nid, mayor.atr.nid);
    const suma = c1a.terceros.reduce((s, t) => s + t.participacion, 0);
    assert.ok(suma > 0.5 && suma <= 1.000001);
  });
});
