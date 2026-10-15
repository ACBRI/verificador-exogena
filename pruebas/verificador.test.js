'use strict';
// Pruebas de la lógica: lectura de cada archivo, cada revisión interna y cada
// cruce, con archivos pequeños hechos a la medida. Se corren con `node --test`.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const V = require('../src/verificador.js');
const R = require('../src/reglas-ag2025.js');
const { xmlFormato, latin1 } = require('../herramientas/generar-ejemplos.js');

const UVT = R.PARAMETROS.uvt.valor;

// ------------------------------------------------------------ ayudas

function conDv(n) {
  return { nid: String(n), dv: String(V.digitoVerificacion(String(n))) };
}
const DIR = { dir: 'CL 26 69 76 OF 401', dpto: '11', mun: '001', pais: '169' };
const PJ = (n, raz = 'TERCERO DE PRUEBA S.A.S.') => Object.assign({ tdoc: '31', raz }, conDv(n));
const PN = (cedula) => ({ tdoc: '13', nid: String(cedula), apl1: 'PRUEBA', apl2: 'UNO', nom1: 'ANA', nom2: '' });
const cero = (campos) => Object.fromEntries(campos.map((c) => [c, 0]));

const BASE = {
  1001: () => Object.assign({ cpt: '5004' }, PJ(999000011), DIR, cero(['pago', 'pnded', 'ided', 'inded', 'retp', 'reta', 'comun', 'ndom'])),
  1003: () => Object.assign({ cpt: '1302' }, PJ(999000029), { dir: DIR.dir, dpto: '11', mcpo: '001', valor: 0, ret: 0 }),
  1005: () => Object.assign(PJ(999000037), { vimp: 0, ivade: 0 }),
  1006: () => Object.assign(PJ(999000045), { imp: 0, iva: 0, icon: 0 }),
  1007: () => Object.assign({ cpt: '4001' }, PJ(999000053), { pais: '169', ibru: 0, dred: 0 }),
  1008: () => Object.assign({ cpt: '1315' }, PJ(999000061), DIR, { sal: 0 }),
  1009: () => Object.assign({ cpt: '2201' }, PJ(999000079), DIR, { sal: 0 }),
  1010: () => Object.assign(PJ(999000087), DIR, { valnom: 1000000, valprm: 0, por: 100, dec: 0 }),
  1011: () => ({ cpt: '1105', sal: 1000 }),
  1012: () => Object.assign({ cpt: '1110' }, PJ(999000095), { pais: '169', val: 0 }),
  2276: () => Object.assign({ entinfo: '1', tdocb: '13', nitb: '1990000017', pap: 'PRUEBA', pno: 'LUIS' }, DIR, cero(R.FORMATOS['2276'].valores))
};

const E = require('../src/esquemas-ag2025.js');
/** Un registro del formato con valores por defecto válidos; los campos que el formato no tiene se descartan. */
const reg = (formato, cambios = {}) => {
  const r = Object.assign(BASE[formato](), cambios);
  const permitidos = E[`${formato}-v${R.FORMATOS[formato].version}`].atributos.map((a) => a.nombre);
  for (const k of Object.keys(r)) if (r[k] === undefined || !permitidos.includes(k)) delete r[k];
  return r;
};

let envio = 0;
/** Lee un archivo armado con los registros dados. cambiar: [[de, a]] reemplazos sobre el texto del XML. */
function archivo(formato, registros, { cambiar = [], nombre, opciones = {} } = {}) {
  envio++;
  const x = xmlFormato(formato, registros, envio, opciones);
  let texto = x.bytes.toString('latin1');
  for (const [de, a] of cambiar) texto = texto.replace(de, a);
  return V.leerArchivo(nombre || x.nombre, latin1(texto));
}

function verificar(archivos, valores = {}, otros = {}) {
  return V.verificar(Object.assign({ archivos, declaraciones: { periodicidad: otros.periodicidad || {}, valores }, explicaciones: otros.explicaciones || {}, parametros: otros.parametros || {}, contexto: otros.contexto || {} }));
}

const linea = (res, id) => res.cruces.flatMap((c) => c.lineas).find((l) => l.id === id);
const hallazgos = (res, revision) => res.hallazgos.filter((h) => h.revision === revision);
const anual = (v) => ({ A: v });

// ------------------------------------------------------------ utilidades

describe('cifras y dígito de verificación', () => {
  test('lee cifras escritas o pegadas desde Excel', () => {
    const casos = [
      ['1.234.567', 1234567], ['1,234,567', 1234567], ['$ 1.234.567', 1234567], ['COP 2.000', 2000],
      ['(1.234)', -1234], ['-1234', -1234], ['1234,5', 1235], ['1.234', 1234], ['1.234,56', 1235],
      ['1 234 567', 1234567], ['0', 0], [1234.4, 1234], ['+15', 15]
    ];
    for (const [entrada, esperado] of casos) assert.equal(V.leerCifra(entrada), esperado, String(entrada));
    for (const vacio of ['', '   ', null, undefined, 'abc', '1.2.3,4,5', '-']) assert.equal(V.leerCifra(vacio), null, String(vacio));
  });

  test('dígito de verificación con el módulo 11 de la DIAN', () => {
    assert.equal(V.digitoVerificacion('800197268'), 4); // DIAN
    assert.equal(V.digitoVerificacion('890903938'), 8);
    assert.equal(V.digitoVerificacion('860034313'), 7);
    assert.equal(V.digitoVerificacion('12A'), null);
  });
});

// ------------------------------------------------------- leer un archivo

describe('lectura de un archivo', () => {
  test('un archivo correcto se lee sin hallazgos', () => {
    const a = archivo('1001', [reg('1001', { pago: 1000000, retp: 40000 })]);
    assert.equal(a.estado, 'leido');
    assert.equal(a.formato, '1001');
    assert.equal(a.version, '10');
    assert.equal(a.registros.length, 1);
    assert.equal(a.incluido, true);
    assert.deepEqual(a.hallazgos, []);
  });

  test('XML mal formado', () => {
    const a = V.leerArchivo('roto.xml', Buffer.from('<mas><Cab></mas>'));
    assert.equal(a.estado, 'error');
    assert.equal(a.hallazgos[0].revision, 'xml-mal-formado');
    assert.equal(a.hallazgos[0].ejemplos[0].linea, 1);
  });

  test('raíz que no es <mas> o sin cabecera', () => {
    assert.ok(V.leerArchivo('x.xml', Buffer.from('<otra/>')).hallazgos.some((h) => h.revision === 'estructura'));
    const sinCab = V.leerArchivo('x.xml', Buffer.from('<mas><pagos/></mas>'));
    assert.ok(sinCab.hallazgos.some((h) => /Falta la cabecera/.test(h.mensaje)));
  });

  test('formato que el verificador no revisa', () => {
    const a = archivo('1007', [reg('1007', { ibru: 5 })], { cambiar: [['<Formato>1007</Formato>', '<Formato>1019</Formato>']] });
    assert.equal(a.estado, 'no revisado');
    assert.equal(a.hallazgos[0].revision, 'formato-desconocido');
    assert.equal(a.hallazgos[0].gravedad, 'informacion');
  });

  test('versión distinta a la del año gravable 2025', () => {
    const a = archivo('1001', [reg('1001', { pago: 10 })], { cambiar: [['<Version>10</Version>', '<Version>11</Version>']] });
    assert.equal(a.estado, 'version distinta');
    assert.equal(a.incluido, false);
    assert.equal(a.hallazgos[0].revision, 'version');
    assert.match(a.hallazgos[0].mensaje, /versión 10.*versión 11/);
  });

  test('archivo de otro año gravable', () => {
    const a = archivo('1007', [reg('1007', { ibru: 5 })], { cambiar: [['2025-12-31', '2024-12-31'], ['2025-01-01', '2024-01-01']] });
    assert.equal(a.incluido, false);
    assert.equal(hallazgosArchivo(a, 'anio').length, 2);
  });

  test('cabecera incompleta, desordenada o con concepto inválido', () => {
    const sinCant = archivo('1007', [reg('1007', { ibru: 5 })], { cambiar: [[/\s*<CantReg>\d+<\/CantReg>/, '']] });
    assert.ok(sinCant.hallazgos.some((h) => h.revision === 'cabecera' && /Falta <CantReg>/.test(h.mensaje)));
    const codcpt = archivo('1007', [reg('1007', { ibru: 5 })], { cambiar: [['<CodCpt>1</CodCpt>', '<CodCpt>3</CodCpt>']] });
    assert.ok(codcpt.hallazgos.some((h) => h.revision === 'cabecera' && /CodCpt/.test(h.mensaje)));
    const orden = archivo('1007', [reg('1007', { ibru: 5 })], { cambiar: [[/(<Ano>2026<\/Ano>)\s*(<CodCpt>1<\/CodCpt>)/, '$2$1']] });
    assert.ok(orden.hallazgos.some((h) => h.revision === 'cabecera' && /orden/.test(h.mensaje)));
    const fecha = archivo('1007', [reg('1007', { ibru: 5 })], { cambiar: [['<FecEnvio>2026-05-', '<FecEnvio>2026-13-']] });
    assert.ok(fecha.hallazgos.some((h) => h.revision === 'cabecera' && /FecEnvio/.test(h.mensaje)));
  });

  test('estructura de los registros contra el esquema', () => {
    const a = archivo('1001', [reg('1001', { pago: 100 })], {
      cambiar: [['pago="100"', 'pago="100.50" extra="1"'], [/ ndom="0"/, ''], ['nid="999000011"', 'nid="999 000 011"']]
    });
    const motivos = a.hallazgos.filter((h) => h.revision === 'estructura').map((h) => h.mensaje).join('\n');
    assert.match(motivos, /«extra»/);
    assert.match(motivos, /Falta el atributo obligatorio «ndom»/);
    assert.match(motivos, /«pago».*patrón/);
    assert.match(motivos, /«nid».*patrón/);
    const largo = archivo('1001', [reg('1001', { raz: 'X'.repeat(451) })]);
    assert.ok(largo.hallazgos.some((h) => h.revision === 'estructura' && /450 caracteres/.test(h.mensaje)));
    assert.equal(largo.estado, 'leido', 'un error de estructura no saca el archivo de los cruces');
  });

  test('cantidad de registros', () => {
    const a = archivo('1007', [reg('1007', { ibru: 5 })], { cambiar: [['<CantReg>1</CantReg>', '<CantReg>2</CantReg>']] });
    assert.ok(hallazgosArchivo(a, 'cantidad-registros').some((h) => /dice 2 y el archivo trae 1/.test(h.mensaje)));
    const muchos = Array.from({ length: 5001 }, (_, k) => reg('1007', { tdoc: '13', nid: String(1990000000 + k), dv: undefined, raz: undefined, apl1: 'A', nom1: 'B', ibru: 1 }));
    const b = archivo('1007', muchos);
    assert.ok(hallazgosArchivo(b, 'cantidad-registros').some((h) => /máximo por archivo es 5000/.test(h.mensaje)));
  });

  test('valor total de la cabecera', () => {
    const a = archivo('1009', [reg('1009', { sal: 700000 })], { opciones: { desfaseValorTotal: 5 } });
    const h = hallazgosArchivo(a, 'valor-total');
    assert.equal(h.length, 1);
    assert.equal(h[0].gravedad, 'advertencia');
    assert.match(h[0].mensaje, /«sal»/);
  });

  test('nombre del archivo que no coincide con la cabecera', () => {
    const a = archivo('1007', [reg('1007', { ibru: 5 })], { nombre: 'Dmuisca_010100110202600000099.xml' });
    const h = hallazgosArchivo(a, 'nombre-archivo');
    assert.match(h[0].mensaje, /formato, la versión, el número de envío/);
    assert.equal(hallazgosArchivo(archivo('1007', [reg('1007', { ibru: 5 })], { nombre: 'mi-1007.xml' }), 'nombre-archivo').length, 0);
  });

  test('codificación distinta de ISO-8859-1', () => {
    const texto = xmlFormato('1007', [reg('1007', { ibru: 5 })], 1).bytes.toString('latin1').replace('ISO-8859-1', 'UTF-8');
    const a = V.leerArchivo('utf8.xml', Buffer.from(texto, 'utf8'));
    assert.equal(hallazgosArchivo(a, 'codificacion').length, 1);
    assert.equal(a.estado, 'leido');
  });
});

function hallazgosArchivo(a, revision) {
  return a.hallazgos.filter((h) => h.revision === revision);
}

// ------------------------------------------------------------ consolidar

describe('varios archivos del mismo formato', () => {
  test('el mismo archivo dos veces se cuenta una vez', () => {
    const regs = [reg('1007', { ibru: 1000000 })];
    const x = xmlFormato('1007', regs, 1);
    const a = V.leerArchivo('uno.xml', x.bytes);
    const b = V.leerArchivo('copia.xml', x.bytes);
    const res = verificar([a, b], { r58: anual(1000000) });
    assert.equal(hallazgos(res, 'archivo-repetido').length, 1);
    assert.equal(linea(res, 'C5a').exogena, 1000000);
  });

  test('dos envíos distintos se suman; el mismo número de envío se avisa', () => {
    const a = archivo('1007', [reg('1007', { ibru: 1000000 })]);
    const b = archivo('1007', [reg('1007', Object.assign(PJ(999000118), { ibru: 2000000 }))]);
    const res = verificar([a, b], { r58: anual(3000000) });
    assert.equal(linea(res, 'C5a').exogena, 3000000);
    assert.equal(hallazgos(res, 'envio-repetido').length, 0);
    const c = archivo('1007', [reg('1007', Object.assign(PJ(999000126), { ibru: 5 }))], { cambiar: [[/<NumEnvio>\d+</, `<NumEnvio>${a.cab.NumEnvio}<`]] });
    assert.equal(hallazgos(verificar([a, c]), 'envio-repetido').length, 1);
  });

  test('inserción y reemplazo del mismo formato', () => {
    const a = archivo('1007', [reg('1007', { ibru: 1 })]);
    const b = archivo('1007', [reg('1007', Object.assign(PJ(999000134), { ibru: 1 }))], { cambiar: [['<CodCpt>1</CodCpt>', '<CodCpt>2</CodCpt>']] });
    assert.equal(hallazgos(verificar([a, b]), 'reemplazo').length, 1);
  });
});

// ------------------------------------------------------- revisiones internas

describe('revisiones internas de los XML', () => {
  test('dígito de verificación errado o sobrante', () => {
    const malo = Object.assign(reg('1009', { sal: 900000 }), { dv: String((Number(conDv(999000079).dv) + 1) % 10) });
    const pn = reg('1009', Object.assign(PN(1990000025), { dv: '3', raz: undefined, sal: 800000 }));
    const res = verificar([archivo('1009', [malo, pn])]);
    const h = hallazgos(res, 'dv');
    assert.equal(h.find((x) => x.gravedad === 'error').cantidad, 1);
    assert.equal(h.find((x) => x.gravedad === 'advertencia').cantidad, 1);
    assert.equal(h.find((x) => x.gravedad === 'error').ejemplos[0].esperado, conDv(999000079).dv);
  });

  test('tipos de documento de la tabla 1 y de la tabla 2', () => {
    const res = verificar([
      archivo('1007', [reg('1007', { tdoc: '33', ibru: 5 })]),
      archivo('1003', [reg('1003', { tdoc: '43', nid: '444444001', dv: undefined, valor: 10, ret: 1 })])
    ]);
    const h = hallazgos(res, 'tipo-documento');
    assert.equal(h.length, 2);
    assert.ok(h.some((x) => /tabla 2/.test(x.mensaje)));
  });

  test('número de identificación con letras para un documento numérico', () => {
    const res = verificar([archivo('1007', [reg('1007', Object.assign(PN('AB12345'), { raz: undefined, dv: undefined, ibru: 5 }))])]);
    assert.equal(hallazgos(res, 'numero-identificacion').length, 1);
  });

  test('NIT especiales y el tipo de documento 43', () => {
    const res = verificar([archivo('1007', [
      reg('1007', { tdoc: '31', nid: '222222222', raz: 'CUANTÍAS MENORES', ibru: 5 }),
      reg('1007', { tdoc: '43', nid: '123456', raz: 'OTRO', ibru: 5 }),
      reg('1007', { tdoc: '43', nid: '444444001', raz: 'EXTERIOR', pais: '249', ibru: 5 })
    ])]);
    const h = hallazgos(res, 'nit-especial');
    assert.equal(h.reduce((s, x) => s + x.cantidad, 0), 2);
  });

  test('registros repetidos según la llave del formato', () => {
    const res = verificar([archivo('1001', [reg('1001', { pago: 1000 }), reg('1001', { pago: 2000 }), reg('1001', { cpt: '5002', pago: 3000 })])]);
    const h = hallazgos(res, 'duplicados');
    assert.equal(h[0].cantidad, 1);
    assert.equal(h[0].gravedad, 'error');
  });

  test('cuantías menores: con retención y con otra razón social', () => {
    const cm = { tdoc: '43', nid: '222222222', dv: undefined, raz: 'CUANTIAS MENORES' };
    const res = verificar([archivo('1001', [
      reg('1001', Object.assign({}, cm, { pago: 100000, retp: 4000 })),
      reg('1001', Object.assign({}, cm, { cpt: '5016', raz: 'MENORES VARIOS', pago: 50000 }))
    ])]);
    const h = hallazgos(res, 'cuantias-menores');
    assert.ok(h.some((x) => x.gravedad === 'error' && /con retención/.test(x.mensaje)));
    assert.ok(h.some((x) => x.gravedad === 'advertencia' && /CUANTÍAS MENORES/.test(x.mensaje)));
    assert.equal(h.find((x) => x.gravedad === 'advertencia').cantidad, 1, 'sin tilde también vale');
  });

  test('cuantías menores en un formato que no las prevé', () => {
    const res = verificar([archivo('1005', [reg('1005', { tdoc: '43', nid: '222222222', dv: undefined, raz: 'CUANTÍAS MENORES', vimp: 1000 })])]);
    assert.equal(hallazgos(res, 'cuantias-menores-formato').length, 1);
  });

  test('GMF a nombre de la DIAN', () => {
    const dian = Object.assign(PJ(800197268, 'DIAN'), { cpt: '5101', pago: 50000, pnded: 50000 });
    const banco = Object.assign(PJ(999800011, 'BANCO'), { cpt: '5101', pago: 50000, pnded: 50000 });
    assert.equal(hallazgos(verificar([archivo('1001', [reg('1001', dian)])]), 'gmf').length, 1);
    assert.equal(hallazgos(verificar([archivo('1001', [reg('1001', banco)])]), 'gmf').length, 0);
  });

  test('base del reteIVA (concepto 1309)', () => {
    const conPago = reg('1003', { cpt: '1309', valor: 10000000, ret: 285000 });
    const conIVA = reg('1003', Object.assign({ cpt: '1309', valor: 1900000, ret: 285000 }, PJ(999000142)));
    const h = hallazgos(verificar([archivo('1003', [conPago, conIVA])]), 'base-reteiva');
    assert.equal(h.length, 1);
    assert.equal(h[0].cantidad, 1);
  });

  test('IVA llevado al costo en el 1001 y en el 1005', () => {
    const a1001 = archivo('1001', [reg('1001', { pago: 5000000, ided: 950000 })]);
    assert.equal(hallazgos(verificar([a1001, archivo('1005', [reg('1005', { vimp: 10 })])]), 'iva-costo').length, 1);
    assert.equal(hallazgos(verificar([a1001, archivo('1005', [reg('1005', { vimp: 10, ivavcg: 950000 })])]), 'iva-costo').length, 0);
  });

  test('dirección cuando el país es Colombia', () => {
    const res = verificar([archivo('1001', [
      reg('1001', { dir: undefined, pago: 10 }),
      reg('1001', Object.assign({ tdoc: '42', nid: 'US1234', dv: undefined, raz: 'EXTERIOR INC', pais: '249', dir: undefined, dpto: undefined, mun: undefined, cpt: '5081', pago: 10 }))
    ])]);
    const h = hallazgos(res, 'direccion');
    assert.equal(h.length, 1);
    assert.equal(h[0].cantidad, 1);
  });

  test('códigos de país, departamento y municipio', () => {
    const res = verificar([archivo('1009', [
      reg('1009', { pais: '3', sal: 10 }),
      reg('1009', Object.assign(PJ(999000150), { dpto: '40', sal: 10 })),
      reg('1009', Object.assign(PJ(999000168), { dpto: '05', mun: '999', sal: 10 }))
    ])]);
    const h = hallazgos(res, 'codigos-dane');
    assert.equal(h.length, 3);
  });

  test('conceptos que no existen en el año gravable 2025', () => {
    const res = verificar([
      archivo('1001', [reg('1001', { cpt: '5001', pago: 10 })]),
      archivo('1011', [reg('1011', { cpt: '9999' })]),
      archivo('2276', [reg('2276', { entinfo: '9', pasa: 10, tingbtp: 10 })])
    ]);
    const h = hallazgos(res, 'concepto');
    assert.equal(h.length, 3);
    assert.ok(h.some((x) => /5001/.test(x.mensaje)));
  });

  test('nombre o razón social del tercero', () => {
    const res = verificar([archivo('1007', [
      reg('1007', Object.assign(PN(1990000033), { apl1: undefined, raz: undefined, dv: undefined, ibru: 5 })),
      reg('1007', Object.assign(PJ(999000176), { raz: undefined, ibru: 5 }))
    ])]);
    assert.equal(hallazgos(res, 'nombre-tercero').length, 2);
  });

  test('registros con todos los valores en cero', () => {
    assert.equal(hallazgos(verificar([archivo('1007', [reg('1007', { ibru: 0, dred: 0 })])]), 'valores-en-cero').length, 1);
  });

  test('conceptos que van con el NIT del informante', () => {
    const cliente = conDv(999555001).nid;
    const res = verificar([archivo('1007', [reg('1007', { cpt: '4018', ibru: 10 }), reg('1007', Object.assign(PJ(999555001), { cpt: '4018', ibru: 10 }))])], {}, { contexto: { nitCliente: cliente } });
    const h = hallazgos(res, 'nit-informante');
    assert.equal(h.length, 1);
    assert.equal(h[0].cantidad, 1);
    assert.equal(hallazgos(verificar([archivo('1007', [reg('1007', { cpt: '4018', ibru: 10 })])]), 'nit-informante').length, 0, 'sin NIT del cliente no se revisa');
  });

  test('formatos que faltan según las declaraciones', () => {
    const res = verificar([archivo('1007', [reg('1007', { ibru: 10 })])], { t130: anual(5000000), t93: anual(1000000), i67: anual(2000000), r45: anual(100 * UVT), r38: anual(5 * UVT) }, { contexto: { personaJuridica: true } });
    const faltan = hallazgos(res, 'formatos-faltantes').map((h) => h.formato).sort();
    // r38 por debajo de 12 UVT no exige el 1008.
    assert.deepEqual(faltan, ['1001', '1006', '1009', '1010', '2276']);
  });
});

// ------------------------------------------------------------------ cruces

describe('cruces', () => {
  test('C1: retenciones de renta, de rentas de trabajo y de timbre', () => {
    const a1001 = archivo('1001', [
      reg('1001', { pago: 1000000, retp: 100000, reta: 20000 }),
      reg('1001', Object.assign(PJ(999000184), { cpt: '5053', pnded: 50000, retp: 5000 })),
      reg('1001', Object.assign(PJ(999000192), { cpt: '5054', pnded: 10000, retp: 1000 })),
      reg('1001', Object.assign(PJ(999000206), { cpt: '5086', retp: 7000 })),
      reg('1001', Object.assign(PJ(999000214), { cpt: '5028', pnded: 30000, retp: 3000 }))
    ]);
    const a2276 = archivo('2276', [reg('2276', { pasa: 30000000, tingbtp: 30000000, vare: 900000 })]);
    // 350: 130 = terceros (117.000) + autorretenciones (50.000) + rentas de trabajo (900.000).
    const res = verificar([a1001, a2276], { t130: anual(117000 + 50000 + 900000), tAuto: anual(50000), t93: anual(900000), t135: anual(4000) });
    const c1a = linea(res, 'C1a');
    assert.equal(c1a.exogena, 117000);
    assert.equal(c1a.declarado, 117000);
    assert.equal(c1a.estado, 'verde');
    assert.equal(linea(res, 'C1b').exogena, 900000);
    assert.equal(linea(res, 'C1b').estado, 'verde');
    assert.equal(linea(res, 'C1c').exogena, 4000);
    assert.equal(linea(res, 'C1c').estado, 'verde');
    // Sin la casilla 135 y sin timbre, la línea C1c no aparece.
    const sinTimbre = verificar([archivo('1001', [reg('1001', { pago: 10, retp: 1 })])], { t130: anual(1) });
    assert.equal(linea(sinTimbre, 'C1c'), undefined);
  });

  test('C2: retención de IVA del 1001 y del 2276', () => {
    const res = verificar([
      archivo('1001', [reg('1001', { comun: 150000, ndom: 190000 }), reg('1001', Object.assign(PJ(999000222), { cpt: '5028', pnded: 1, comun: 10000 }))]),
      archivo('2276', [reg('2276', { paho: 1000000, tingbtp: 1000000, rfiva: 28500 })])
    ], { t134: anual(150000 + 190000 - 10000 + 28500) });
    assert.equal(linea(res, 'C2').exogena, 358500);
    assert.equal(linea(res, 'C2').estado, 'verde');
  });

  test('C3: IVA descontable sin el IVA llevado al costo', () => {
    const res = verificar([archivo('1005', [reg('1005', { vimp: 1900000, ivade: 100000, ivavcg: 380000 })])], { i81: anual(2000000) });
    assert.equal(linea(res, 'C3').exogena, 2000000);
    assert.equal(linea(res, 'C3').estado, 'verde');
  });

  test('C4: IVA generado sin el impuesto al consumo', () => {
    const res = verificar([archivo('1006', [reg('1006', { imp: 1900000, iva: 50000, icon: 80000 })])], { i67: anual(1950000) });
    assert.equal(linea(res, 'C4').exogena, 1950000);
    assert.equal(linea(res, 'C4').estado, 'verde');
  });

  test('C5: ingresos, devoluciones y ganancias ocasionales', () => {
    const res = verificar([archivo('1007', [
      reg('1007', { ibru: 50000000, dred: 1000000 }),
      reg('1007', Object.assign(PJ(999000230), { cpt: '4019', ibru: 8000000 })),
      reg('1007', Object.assign(PJ(999000249), { cpt: '4021', ibru: 2000000 }))
    ])], { r58: anual(50000000), r59: anual(1000000), r80: anual(10000000) });
    assert.equal(linea(res, 'C5a').exogena, 50000000);
    assert.equal(linea(res, 'C5b').exogena, 1000000);
    assert.equal(linea(res, 'C5c').exogena, 10000000);
    for (const id of ['C5a', 'C5b', 'C5c']) assert.equal(linea(res, id).estado, 'verde', id);
  });

  test('C6: costos y deducciones sin activos ni anticipos, con el 2276', () => {
    const res = verificar([
      archivo('1001', [
        reg('1001', { pago: 10000000, ided: 500000, inded: 300000, pnded: 2000000 }),
        reg('1001', Object.assign(PJ(999000257), { cpt: '5008', pago: 40000000 })),
        reg('1001', Object.assign(PJ(999000265), { cpt: '5035', pago: 6000000 })),
        reg('1001', Object.assign(PJ(999000273), { cpt: '5019', pago: 3000000 })),
        reg('1001', Object.assign(PJ(999000281), { cpt: '5007', pago: 25000000 }))
      ]),
      archivo('2276', [reg('2276', { pasa: 20000000, papre: 4000000, tingbtp: 24000000, ivav: 100000 })])
    ], { r62: anual(25000000), r63: anual(10500000 + 3000000 + 24100000), r64: anual(0), r65: anual(0), r66: anual(0) });
    const c6 = linea(res, 'C6');
    assert.equal(c6.exogena, 10000000 + 500000 + 3000000 + 25000000 + 24000000 + 100000);
    assert.equal(c6.estado, 'verde');
  });

  test('C7: retenciones que le practicaron (renta e IVA)', () => {
    const res = verificar([archivo('1003', [
      reg('1003', { valor: 40000000, ret: 1000000 }),
      reg('1003', Object.assign(PJ(999000290), { cpt: '1309', valor: 1900000, ret: 285000 })),
      reg('1003', Object.assign(PJ(999000303), { cpt: '1314', valor: 1000000, ret: 15000 }))
    ])], { r106: anual(1000000), i85: anual(285000) });
    assert.equal(linea(res, 'C7a').exogena, 1000000);
    assert.equal(linea(res, 'C7b').exogena, 285000);
    assert.equal(linea(res, 'C7a').estado, 'verde');
    assert.equal(linea(res, 'C7b').estado, 'verde');
  });

  test('C8: cuentas por cobrar menos deterioro, pasivos, bancos e inversiones', () => {
    const res = verificar([
      archivo('1008', [reg('1008', { sal: 8000000 }), reg('1008', Object.assign(PJ(999000311), { cpt: '1317', sal: 2000000 })), reg('1008', Object.assign(PJ(999000338), { cpt: '1318', sal: 500000 }))]),
      archivo('1009', [reg('1009', { sal: 6000000 }), reg('1009', Object.assign(PJ(999000346), { cpt: '2204', sal: 1500000 }))]),
      archivo('1012', [reg('1012', { val: 12000000 }), reg('1012', Object.assign(PJ(999000354), { cpt: '1201', val: 30000000 })), reg('1012', Object.assign(PJ(999000362), { cpt: '1205', val: 5000000 }))])
    ], { r38: anual(9500000), r45: anual(7500000), r36: anual(12000000), r37: anual(35000000) });
    assert.equal(linea(res, 'C8a').exogena, 9500000);
    assert.equal(linea(res, 'C8b').exogena, 7500000);
    assert.equal(linea(res, 'C8c').exogena, 12000000);
    assert.equal(linea(res, 'C8d').exogena, 35000000);
    for (const id of ['C8a', 'C8b', 'C8c', 'C8d']) assert.equal(linea(res, id).estado, 'verde', id);
  });

  test('semáforo: verde por debajo de 1 UVT, amarillo por debajo del umbral, rojo desde el umbral', () => {
    const a = archivo('1009', [reg('1009', { sal: 100000000 })]);
    const estado = (dif, otros) => linea(verificar([a], { r45: anual(100000000 + dif) }, otros), 'C8b');
    assert.equal(estado(UVT - 1).estado, 'verde');
    assert.equal(estado(UVT).estado, 'amarillo');
    assert.equal(estado(-(20 * UVT - 1)).estado, 'amarillo');
    assert.equal(estado(20 * UVT).estado, 'rojo');
    assert.equal(estado(20 * UVT).uvt, 20);
    // El umbral se cambia.
    assert.equal(estado(6 * UVT, { parametros: { umbralUVT: 5 } }).estado, 'rojo');
    assert.equal(estado(6 * UVT, { parametros: { umbralUVT: 50 } }).estado, 'amarillo');
    // Y la UVT también.
    assert.equal(estado(60000, { parametros: { uvt: 100000 } }).estado, 'verde');
  });

  test('explicaciones: lo explicado se descuenta y la línea queda «Explicada»', () => {
    const a = archivo('1012', [reg('1012', { val: 10000000 })]);
    const res = verificar([a], { r36: anual(13200000) }, { explicaciones: { C8c: [{ descripcion: 'Caja general', valor: 3200000 }] } });
    const c8c = linea(res, 'C8c');
    assert.equal(c8c.diferencia, 3200000);
    assert.equal(c8c.resto, 0);
    assert.equal(c8c.estado, 'verde');
    assert.equal(c8c.explicada, true);
    assert.equal(V.nombreEstado(c8c), 'Explicada');
    const parcial = linea(verificar([a], { r36: anual(13200000) }, { explicaciones: { C8c: [{ descripcion: 'Caja', valor: 3000000 }] } }), 'C8c');
    assert.equal(parcial.estado, 'amarillo');
  });

  test('sin datos: falta la cifra declarada o falta el formato', () => {
    const res = verificar([archivo('1009', [reg('1009', { sal: 10 })])], { r58: anual(1000) });
    assert.equal(linea(res, 'C8b').estado, 'sin datos');
    assert.match(linea(res, 'C8b').motivo, /casilla 45 del 110/);
    assert.equal(linea(res, 'C5a').estado, 'sin datos');
    assert.match(linea(res, 'C5a').motivo, /formato 1007/);
    assert.equal(res.cruces.find((c) => c.id === 'C3').estado, 'sin datos');
  });

  test('los 10 terceros que más pesan en la exógena de la línea', () => {
    const regs = Array.from({ length: 12 }, (_, k) => reg('1009', Object.assign(PJ(999100000 + 7 * k, `ACREEDOR ${k}`), { sal: (k + 1) * 1000000 })));
    const res = verificar([archivo('1009', regs)], { r45: anual(1) });
    const t = linea(res, 'C8b').terceros;
    assert.equal(t.length, 10);
    assert.equal(t[0].nombre, 'ACREEDOR 11');
    assert.equal(t[0].valor, 12000000);
    assert.ok(Math.abs(t[0].participacion - 12 / 78) < 1e-9);
    assert.equal(t[9].nombre, 'ACREEDOR 2');
  });

  test('detalle por periodo: avisa los periodos sin cifra', () => {
    const valores = { t134: { M01: 100, M02: 100 } };
    const res = verificar([archivo('1001', [reg('1001', { comun: 200 })])], valores, { periodicidad: { 350: 'mensual' } });
    const c2 = linea(res, 'C2');
    assert.equal(c2.declarado, 200);
    assert.equal(c2.periodos.length, 12);
    assert.match(c2.notas.join(' '), /Sin cifra en Marzo, Abril/);
  });

  test('periodicidad: solo cuentan los periodos de la periodicidad elegida', () => {
    const valores = { i67: { A: 999, B1: 100, B2: 100, C1: 50 } };
    assert.equal(V.valorCampo({ periodicidad: { 300: 'bimestral' }, valores }, 'i67'), 200);
    assert.equal(V.valorCampo({ periodicidad: { 300: 'cuatrimestral' }, valores }, 'i67'), 50);
    assert.equal(V.valorCampo({ periodicidad: {}, valores }, 'i67'), 999);
    assert.equal(V.valorCampo({ periodicidad: {}, valores: {} }, 'i67'), null);
  });
});

// ---------------------------------------------------------------- salidas

describe('salidas', () => {
  function ejemplo() {
    return verificar([
      archivo('1009', [reg('1009', Object.assign(PJ(999000370, 'ACREEDOR; CON PUNTO Y COMA'), { sal: 30000000 }))]),
      archivo('1001', [reg('1001', { pago: 1000, retp: 100 }), reg('1001', { pago: 2000 })])
    ], { r45: anual(31000000), t130: anual(100) }, { explicaciones: { C8b: [{ descripcion: 'Pasivo sin tercero', valor: 500000 }] }, contexto: { nombreCliente: 'Cliente de prueba', nitCliente: '999000397' } });
  }

  test('CSV con todo, para Excel', () => {
    const csv = V.aCSV(ejemplo());
    assert.ok(csv.startsWith('﻿'));
    for (const seccion of ['CRUCES', 'EXPLICACIONES', 'TERCEROS QUE MÁS PESAN', 'REVISIONES DE LOS XML', 'ARCHIVOS']) assert.ok(csv.includes(seccion), seccion);
    assert.ok(csv.includes('"ACREEDOR; CON PUNTO Y COMA"'));
    assert.ok(csv.includes('Pasivo sin tercero;500000'));
    assert.match(csv, /C8b Pasivos;30000000;31000000;1000000;20,08;500000;500000;Revisar/);
  });

  test('resumen sin NIT ni nombres de terceros', () => {
    const res = ejemplo();
    const texto = V.resumenSinNIT(res);
    assert.ok(!/\d{9}/.test(texto.replace(/\$[\d.]+/g, '')), 'no debe traer números de identificación');
    assert.ok(!texto.includes('ACREEDOR'));
    assert.ok(!texto.includes('Cliente de prueba'));
    assert.match(texto, /contacto@andresbrinez\.com/);
    assert.match(texto, /C8b Pasivos: Revisar/);
  });

  test('plantilla para Excel y lectura de lo pegado', () => {
    const periodicidad = { 300: 'bimestral', 350: 'mensual' };
    const plantilla = V.plantillaCSV(periodicidad).replace(/^﻿/, '').trim().split(/\r\n/);
    assert.equal(plantilla[0], 'Declaración;Casilla;Concepto;Periodo;Valor');
    assert.equal(plantilla.length, 1 + 14 + 3 * 6 + 6 * 12);
    // Se llenan dos filas y se pegan con tabuladores, como salen de Excel.
    const filas = plantilla.map((l) => l.split(';'));
    const r58 = filas.find((f) => f[0] === 'Renta 110' && f[1] === '58');
    r58[4] = '$ 1.234.567.000';
    const marzo = filas.find((f) => f[0] === 'Retenciones 350' && f[1] === '130' && f[3] === 'Marzo');
    marzo[4] = '2.500.000';
    const bim = filas.find((f) => f[0] === 'IVA 300' && f[1] === '81' && f[3] === 'Bimestre 6');
    bim[4] = '(1.000)';
    const pegado = filas.map((f) => f.join('\t')).join('\n');
    const r = V.leerPegado(pegado, {});
    assert.deepEqual(r.avisos, []);
    assert.equal(r.leidas, 3);
    assert.deepEqual(r.valores.r58, { A: 1234567000 });
    assert.deepEqual(r.valores.t130, { M03: 2500000 });
    assert.deepEqual(r.valores.i81, { B6: -1000 });
    assert.deepEqual(r.periodicidad, periodicidad);
  });

  test('lo pegado que no se reconoce se avisa', () => {
    const r = V.leerPegado('Renta 110;999;X;Año;5\nOtra;1;X;Año;5\nIVA 300;67;X;Mes raro;5\nRenta 110;58;X;Año;cinco', {});
    assert.equal(r.leidas, 0);
    assert.equal(r.avisos.length, 4);
  });
});
