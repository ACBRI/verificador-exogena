'use strict';
/*
 * Genera los dos archivos de datos oficiales que usa el verificador, a partir de
 * lo que la DIAN publicó para el año gravable 2025:
 *
 * - src/esquemas-ag2025.js: la estructura de cada formato (elemento, cabecera y
 *   atributos con su tipo, largo y patrón), leída de los esquemas XSD de
 *   norma/xsd-ag2025. Esos XSD vienen del Prevalidador Tributario Informantes
 *   AG2025 v3.3.0-26 y coinciden con los anexos técnicos de la Resolución
 *   000162 de 2023 y de la Resolución 000188 de 2024.
 * - src/tablas-ag2025.js: tipos de documento, países, departamentos,
 *   municipios y conceptos de los formatos 1004, 1011 y 2275, leídos de
 *   norma/prevalidador-ag2025/tablas.json (las hojas Tablas y Filtros del mismo
 *   prevalidador).
 *
 *   node herramientas/datos-oficiales.js
 *
 * La prueba pruebas/datos-oficiales.test.js los vuelve a generar y falla si no
 * coinciden con los del repositorio: nadie los edita a mano.
 */
const fs = require('node:fs');
const path = require('node:path');
const X = require('../src/xml.js');

const RAIZ = path.resolve(__dirname, '..');
const XS = 'xs:';

function hijosLlamados(el, nombre) {
  return el.hijos.filter((h) => h.nombre === nombre);
}

function documentacion(el) {
  const anot = hijosLlamados(el, XS + 'annotation')[0];
  if (!anot) return '';
  const doc = hijosLlamados(anot, XS + 'documentation')[0];
  return doc ? doc.texto.replace(/\s+/g, ' ').trim() : '';
}

function restriccion(el) {
  const simple = hijosLlamados(el, XS + 'simpleType')[0];
  if (!simple) return null;
  return hijosLlamados(simple, XS + 'restriction')[0] || null;
}

function facetas(r) {
  const f = {};
  if (!r) return f;
  f.base = r.atributos.base.replace(XS, '');
  for (const h of r.hijos) {
    const v = h.atributos.value;
    switch (h.nombre) {
      case XS + 'pattern': f.patron = v; break;
      case XS + 'minLength': f.minLargo = Number(v); break;
      case XS + 'maxLength': f.maxLargo = Number(v); break;
      case XS + 'minInclusive': f.min = Number(v); break;
      case XS + 'maxInclusive': f.max = Number(v); break;
      case XS + 'totalDigits': f.digitos = Number(v); break;
      default: throw new Error('Faceta no prevista en el esquema: ' + h.nombre);
    }
  }
  return f;
}

/** Lee un XSD de la exógena y devuelve su estructura. */
function leerEsquema(ruta) {
  const { texto } = X.decodificar(fs.readFileSync(ruta));
  const schema = X.leer(texto);
  const globales = hijosLlamados(schema, XS + 'element');
  const tipos = hijosLlamados(schema, XS + 'complexType');
  const mas = globales.find((e) => e.atributos.name === 'mas');
  const cabTipo = tipos.find((t) => t.atributos.name === 'CabType');
  if (!mas || !cabTipo) throw new Error('El esquema no tiene «mas» o «CabType»: ' + ruta);

  const secuenciaMas = hijosLlamados(hijosLlamados(mas, XS + 'complexType')[0], XS + 'sequence')[0];
  const refRegistro = hijosLlamados(secuenciaMas, XS + 'element').find((e) => e.atributos.ref);
  const elemento = refRegistro.atributos.ref;
  const maxRegistros = refRegistro.atributos.maxOccurs === 'unbounded' ? null : Number(refRegistro.atributos.maxOccurs);

  const cab = hijosLlamados(hijosLlamados(cabTipo, XS + 'sequence')[0], XS + 'element').map((e) => {
    const c = { nombre: e.atributos.name };
    if (e.atributos.type) c.base = e.atributos.type.replace(XS, '');
    if (e.atributos.fixed) c.fijo = e.atributos.fixed;
    Object.assign(c, facetas(restriccion(e)));
    return c;
  });
  const formato = cab.find((c) => c.nombre === 'Formato').fijo;
  const version = cab.find((c) => c.nombre === 'Version').fijo;

  const registro = globales.find((e) => e.atributos.name === elemento);
  const tipoRegistro = hijosLlamados(registro, XS + 'complexType')[0];
  const atributos = hijosLlamados(tipoRegistro, XS + 'attribute').map((a) => {
    const d = { nombre: a.atributos.name, requerido: a.atributos.use === 'required' };
    if (a.atributos.type) d.base = a.atributos.type.replace(XS, '');
    Object.assign(d, facetas(restriccion(a)));
    d.descripcion = documentacion(a);
    return d;
  });
  return { formato, version, elemento, maxRegistros, documentacion: documentacion(registro), cab, atributos };
}

function modulo(nombreGlobal, encabezado, datos) {
  const cuerpo = JSON.stringify(datos, null, 1).replace(/\n/g, '\n  ');
  return `/*
${encabezado.map((l) => (l ? ' * ' + l : ' *')).join('\n')}
 */
(function (raiz, fabrica) {
  'use strict';
  var modulo = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else raiz.${nombreGlobal} = modulo;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return ${cuerpo};
});
`;
}

function generarEsquemas() {
  const carpeta = path.join(RAIZ, 'norma', 'xsd-ag2025');
  const esquemas = {};
  for (const f of fs.readdirSync(carpeta).filter((x) => x.endsWith('.xsd')).sort()) {
    const e = leerEsquema(path.join(carpeta, f));
    if (path.basename(f, '.xsd') !== e.formato) throw new Error(`El archivo ${f} trae el formato ${e.formato}`);
    esquemas[`${e.formato}-v${e.version}`] = e;
  }
  return modulo('ExoEsquemas', [
    'Verificador de exógena: estructura de los formatos del año gravable 2025.',
    '',
    'ARCHIVO GENERADO por herramientas/datos-oficiales.js a partir de los esquemas',
    'XSD oficiales de norma/xsd-ag2025 (Prevalidador Tributario Informantes AG2025',
    'v3.3.0-26 de la DIAN; coinciden con los anexos técnicos de la Resolución',
    '000162 de 2023 y de la Resolución 000188 de 2024). No se edita a mano.'
  ], esquemas);
}

/** Código sin ceros a la izquierda, para comparar con lo que trae el XML (el esquema los pide como enteros). */
function sinCeros(codigo) {
  const s = String(codigo).trim();
  return /^\d+$/.test(s) ? String(Number(s)) : s;
}

function generarTablas() {
  const fuente = JSON.parse(fs.readFileSync(path.join(RAIZ, 'norma', 'prevalidador-ag2025', 'tablas.json'), 'utf8'));
  const t = fuente.tablas;
  const aMapa = (lista) => Object.fromEntries(lista.map(([c, d]) => [sinCeros(c), d.replace(/\s+/g, ' ').trim()]));
  const datos = {
    fuente: fuente._fuente,
    tiposDocumento: { tabla1: aMapa(t.DTiposDocto), tabla2: aMapa(t.DTiposDoctoBB) },
    paises: aMapa(t.D_2_107),
    departamentos: aMapa(t.D_2_108),
    municipios: Object.fromEntries(fuente.municipios.map(([d, m, n]) => [`${sinCeros(d)}-${sinCeros(m)}`, n])),
    entidadInformante2276: aMapa(t.DEntidadInfor),
    conceptosPrevalidador: {
      1001: aMapa(t.DConcepto3),
      1003: aMapa(t.DConcepto5),
      1004: aMapa(t.DConcepto9),
      1007: aMapa(t.DConcepto_F1007_V9),
      1008: aMapa(t.DConcepto7_2),
      1009: aMapa(t.DConcepto8),
      1011: aMapa(t.DConceptos_F1011_V6_2013),
      1012: aMapa(t.DConcepto16),
      1647: aMapa(t.DConcepto_F1647),
      2275: aMapa(t.DConcepto2275)
    },
    definicionFormatos: fuente.definicionFormatos
  };
  return modulo('ExoTablas', [
    'Verificador de exógena: tablas oficiales del año gravable 2025.',
    '',
    'ARCHIVO GENERADO por herramientas/datos-oficiales.js a partir de',
    'norma/prevalidador-ag2025/tablas.json, que reúne las tablas del Prevalidador',
    'Tributario Informantes AG2025 v3.3.0-26 de la DIAN. No se edita a mano.'
  ], datos);
}

function generar() {
  return {
    'src/esquemas-ag2025.js': generarEsquemas(),
    'src/tablas-ag2025.js': generarTablas()
  };
}

module.exports = { generar, leerEsquema };

if (require.main === module) {
  for (const [ruta, contenido] of Object.entries(generar())) {
    fs.writeFileSync(path.join(RAIZ, ruta), contenido);
    console.log('Escrito ' + ruta);
  }
}
