'use strict';
// Las reglas son datos: estas pruebas revisan que digan lo mismo que los
// esquemas y las tablas oficiales, y que no se refieran a nada que no exista.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../src/reglas-ag2025.js');
const E = require('../src/esquemas-ag2025.js');
const T = require('../src/tablas-ag2025.js');

const atributosDe = (formato) => E[`${formato}-v${R.FORMATOS[formato].version}`].atributos.map((a) => a.nombre);

describe('formatos', () => {
  test('cada formato tiene su esquema oficial con la misma versión', () => {
    for (const [formato, regla] of Object.entries(R.FORMATOS)) {
      assert.ok(E[`${formato}-v${regla.version}`], `falta el esquema del ${formato} versión ${regla.version}`);
      assert.ok(R.NORMAS[regla.norma], `norma desconocida en el ${formato}`);
    }
    assert.deepEqual(Object.keys(R.FORMATOS).sort(), Object.keys(E).map((k) => k.split('-')[0]).sort());
  });

  test('roles, llave, valores y ValorTotal usan atributos que existen', () => {
    for (const [formato, regla] of Object.entries(R.FORMATOS)) {
      const atr = atributosDe(formato);
      for (const [rol, a] of Object.entries(regla.roles)) assert.ok(atr.includes(a), `${formato}: el rol ${rol} apunta a «${a}», que no existe`);
      for (const a of regla.llave) assert.ok(atr.includes(a), `${formato}: la llave usa «${a}»`);
      for (const a of regla.valores) assert.ok(atr.includes(a), `${formato}: el valor «${a}» no existe`);
      for (const a of regla.direccionSiColombia) assert.ok(atr.includes(a), `${formato}: la dirección usa «${a}»`);
      for (const a of [regla.paisDireccion, regla.dptoDireccion, regla.munDireccion].filter(Boolean)) assert.ok(atr.includes(a));
      assert.ok(atr.includes(regla.sumaValorTotal), `${formato}: ValorTotal suma «${regla.sumaValorTotal}»`);
      if (regla.tablaTipos) assert.ok(T.tiposDocumento[regla.tablaTipos]);
      for (const a of Object.keys(regla.descripcionValores)) assert.ok(regla.valores.includes(a));
    }
  });

  test('el atributo del ValorTotal y el elemento son los del prevalidador', () => {
    for (const d of T.definicionFormatos) {
      const regla = R.FORMATOS[d.formato];
      assert.equal(regla.sumaValorTotal, d.sumaValorTotal, `ValorTotal del ${d.formato}`);
      assert.equal(E[`${d.formato}-v${regla.version}`].elemento, d.elemento, `elemento del ${d.formato}`);
      assert.match(d.nombre, new RegExp(`\\(V-${regla.version}\\)`), `versión del ${d.formato} en el prevalidador`);
    }
  });
});

describe('conceptos', () => {
  test('los conceptos de la resolución son los mismos códigos del prevalidador', () => {
    for (const [formato, lista] of Object.entries(R.CONCEPTOS)) {
      const prevalidador = T.conceptosPrevalidador[formato];
      assert.ok(prevalidador, `el prevalidador no tiene tabla para el ${formato}`);
      assert.deepEqual(Object.keys(lista).sort(), Object.keys(prevalidador).sort(), `conceptos del ${formato}`);
    }
  });

  test('cada concepto del 1001 dice si es costo, y los que no, por qué', () => {
    for (const [codigo, c] of Object.entries(R.CONCEPTOS['1001'])) {
      assert.equal(typeof c.costo, 'boolean', `5001: ${codigo}`);
      if (!c.costo) assert.ok(c.porque, `${codigo} no dice por qué no es costo`);
    }
  });
});

describe('declaraciones y cruces', () => {
  const campos = new Set();
  for (const dec of Object.values(R.DECLARACIONES)) for (const c of dec.casillas) {
    assert.ok(!campos.has(c.id), `campo repetido: ${c.id}`);
    campos.add(c.id);
  }

  test('las periodicidades existen', () => {
    for (const dec of Object.values(R.DECLARACIONES)) {
      for (const p of dec.periodicidades) assert.ok(R.PERIODOS[p], p);
      assert.ok(R.NORMAS[dec.norma]);
    }
    assert.equal(R.PERIODOS.mensual.length, 12);
    assert.equal(R.PERIODOS.bimestral.length, 6);
    assert.equal(R.PERIODOS.cuatrimestral.length, 3);
  });

  test('son ocho cruces, de C1 a C8, con líneas de identificador único', () => {
    assert.deepEqual(R.CRUCES.map((c) => c.id), ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']);
    const ids = R.CRUCES.flatMap((c) => c.lineas.map((l) => l.id));
    assert.equal(new Set(ids).size, ids.length);
  });

  test('cada línea usa formatos, atributos, marcas, campos y causas que existen', () => {
    const marcas = new Set();
    for (const lista of Object.values(R.CONCEPTOS)) for (const c of Object.values(lista)) for (const k of Object.keys(c)) marcas.add(k);
    for (const c of R.CRUCES) {
      assert.ok(R.NORMAS[c.norma], c.id);
      for (const l of c.lineas) {
        assert.ok(l.exogena.length && l.declarado.length, l.id);
        for (const t of l.exogena) {
          assert.ok(R.FORMATOS[t.formato], `${l.id}: formato ${t.formato}`);
          for (const a of t.atributos) assert.ok(atributosDe(t.formato).includes(a), `${l.id}: atributo ${a} del ${t.formato}`);
          for (const m of [...(t.incluirMarcas || []), ...(t.excluirMarcas || [])]) assert.ok(marcas.has(m), `${l.id}: marca ${m}`);
          if (t.incluirMarcas || t.excluirMarcas || t.usarSignosRetenciones) assert.ok(R.CONCEPTOS[t.formato], `${l.id}: el ${t.formato} no tiene lista de conceptos`);
        }
        for (const d of l.declarado) assert.ok(campos.has(d.campo), `${l.id}: campo ${d.campo}`);
        for (const k of l.causas) assert.ok(R.CAUSAS[k], `${l.id}: causa ${k}`);
      }
    }
  });

  test('todas las causas se usan en algún cruce', () => {
    const usadas = new Set(R.CRUCES.flatMap((c) => c.lineas.flatMap((l) => l.causas)));
    for (const k of Object.keys(R.CAUSAS)) assert.ok(usadas.has(k), `causa sin usar: ${k}`);
  });

  test('los formatos esperados se refieren a campos y formatos que existen', () => {
    for (const e of R.FORMATOS_ESPERADOS) {
      assert.ok(R.FORMATOS[e.formato]);
      for (const c of [...(e.cuando || []), ...(e.restar || [])]) assert.ok(campos.has(c), c);
    }
  });
});

describe('revisiones y normas', () => {
  test('cada revisión tiene título, gravedad y norma conocida', () => {
    for (const [k, r] of Object.entries(R.REVISIONES)) {
      assert.ok(r.titulo, k);
      assert.ok(['error', 'advertencia', 'informacion'].includes(r.gravedad), k);
      if (r.norma) assert.ok(R.NORMAS[r.norma], `${k}: norma ${r.norma}`);
    }
  });

  test('el código usa todas las revisiones y solo esas', () => {
    const codigo = fs.readFileSync(path.join(__dirname, '..', 'src', 'verificador.js'), 'utf8');
    const usadas = new Set([...codigo.matchAll(/(?:agregar|nuevoHallazgo)\('([a-z-]+)'/g)].map((m) => m[1]));
    assert.deepEqual([...usadas].sort(), Object.keys(R.REVISIONES).sort());
  });

  test('cada revisión y cada línea de cruce tiene su prueba', () => {
    const pruebas = fs.readFileSync(path.join(__dirname, 'verificador.test.js'), 'utf8');
    for (const k of Object.keys(R.REVISIONES)) assert.ok(pruebas.includes(`'${k}'`), `la revisión ${k} no tiene prueba`);
    for (const c of R.CRUCES) for (const l of c.lineas) assert.ok(pruebas.includes(`'${l.id}'`), `la línea ${l.id} no tiene prueba`);
  });

  test('las normas tienen nombre, qué dicen y URL', () => {
    for (const [k, n] of Object.entries(R.NORMAS)) {
      assert.ok(n.nombre && n.que, k);
      assert.match(n.url, /^https?:\/\//, k);
    }
  });

  test('la UVT de 2025 y los umbrales', () => {
    assert.equal(R.PARAMETROS.uvt.valor, 49799);
    assert.equal(R.PARAMETROS.umbralUVT.valor, 20);
    assert.ok(R.PARAMETROS.umbralUVT.pendiente, 'el umbral debe seguir marcado como pendiente de confirmar');
    assert.equal(R.PARAMETROS.verdeUVT, 1);
  });
});
