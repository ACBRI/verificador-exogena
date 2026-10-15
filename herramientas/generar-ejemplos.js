'use strict';
/*
 * Genera los datos de ejemplo: dos empresas ficticias del año gravable 2025.
 *
 * - ejemplos/cuadra: una comercializadora cuya exógena cuadra con sus
 *   declaraciones (las diferencias son solo el redondeo a miles de los
 *   formularios).
 * - ejemplos/diferencias: una empresa de servicios con seis diferencias
 *   sembradas que el verificador debe detectar, cuatro diferencias que tienen
 *   explicación (no deben quedar en rojo) y errores típicos dentro de los XML.
 *
 * Los XML siguen los esquemas oficiales (una prueba los valida con xmllint) y
 * van en ISO-8859-1, como pide la especificación técnica. Todo es ficticio: los
 * NIT de empresas y bancos empiezan por 999 y las cédulas por 1990, rangos que
 * la DIAN y la Registraduría no han asignado; el único NIT real es el de la DIAN.
 *
 *   node herramientas/generar-ejemplos.js
 *
 * La prueba pruebas/ejemplos.test.js vuelve a generar todo y falla si no
 * coincide con lo que hay en la carpeta ejemplos/.
 */
const fs = require('node:fs');
const path = require('node:path');
const V = require('../src/verificador.js');

const RAIZ = path.resolve(__dirname, '..');
const UVT = 49799;

// ------------------------------------------------------------- utilidades

/** Números al azar con semilla fija: los mismos datos en cada corrida. */
function azar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function nit(base) {
  const n = String(base);
  return { nid: n, dv: String(V.digitoVerificacion(n)) };
}

function latin1(texto) {
  const b = Buffer.alloc(texto.length);
  for (let k = 0; k < texto.length; k++) {
    const c = texto.charCodeAt(k);
    b[k] = c <= 255 ? c : 63;
  }
  return b;
}

function escaparXML(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const miles = (n) => Math.round(n / 1000) * 1000;

// Orden de los atributos de cada formato: el del esquema oficial.
const ESQUEMAS = require('../src/esquemas-ag2025.js');
const REGLAS = require('../src/reglas-ag2025.js');

function xmlFormato(formato, registros, envio, opciones = {}) {
  const regla = REGLAS.FORMATOS[formato];
  const esquema = ESQUEMAS[`${formato}-v${regla.version}`];
  const orden = esquema.atributos.map((a) => a.nombre);
  const suma = registros.reduce((s, r) => s + Number(r[regla.sumaValorTotal] || 0), 0) + (opciones.desfaseValorTotal || 0);
  const lineas = [
    '<?xml version="1.0" encoding="ISO-8859-1"?>',
    opciones.conEsquema ? `<mas xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="${formato}.xsd">` : '<mas>',
    '  <Cab>',
    '    <Ano>2026</Ano>',
    `    <CodCpt>1</CodCpt>`,
    `    <Formato>${formato}</Formato>`,
    `    <Version>${regla.version}</Version>`,
    `    <NumEnvio>${envio}</NumEnvio>`,
    `    <FecEnvio>2026-05-${String(14 + (envio % 10)).padStart(2, '0')}T10:${String(10 + envio).padStart(2, '0')}:00</FecEnvio>`,
    '    <FecInicial>2025-01-01</FecInicial>',
    '    <FecFinal>2025-12-31</FecFinal>',
    `    <ValorTotal>${suma}</ValorTotal>`,
    `    <CantReg>${registros.length}</CantReg>`,
    '  </Cab>'
  ];
  for (const r of registros) {
    for (const k of Object.keys(r)) if (!orden.includes(k)) throw new Error(`Atributo ${k} no está en el esquema del ${formato}`);
    const atr = orden.filter((k) => r[k] !== undefined && r[k] !== null && r[k] !== '').map((k) => `${k}="${escaparXML(r[k])}"`);
    lineas.push(`  <${esquema.elemento} ${atr.join(' ')}/>`);
  }
  lineas.push('</mas>', '');
  const nombre = `Dmuisca_01${String(formato).padStart(5, '0')}${String(regla.version).padStart(2, '0')}2026${String(envio).padStart(8, '0')}.xml`;
  return { nombre, bytes: latin1(lineas.join('\n')) };
}

// ------------------------------------------------------------- terceros

function personaJuridica(base, razon, ciudad) {
  const n = nit(base);
  return { tdoc: '31', nid: n.nid, dv: n.dv, raz: razon, dir: ciudad.dir, dpto: ciudad.dpto, mun: ciudad.mun, pais: '169' };
}

function personaNatural(cedula, apl1, apl2, nom1, nom2, ciudad) {
  return { tdoc: '13', nid: String(cedula), apl1, apl2, nom1, nom2, dir: ciudad.dir, dpto: ciudad.dpto, mun: ciudad.mun, pais: '169' };
}

const CIUDADES = {
  bogota: { dir: 'CL 26 69 76 OF 401', dpto: '11', mun: '001' },
  medellin: { dir: 'CR 43A 1 50 LC 12', dpto: '05', mun: '001' },
  cali: { dir: 'AV 6 NORTE 23 45', dpto: '76', mun: '001' },
  barranquilla: { dir: 'CL 72 54 31 BG 3', dpto: '08', mun: '001' },
  bucaramanga: { dir: 'CR 27 36 14', dpto: '68', mun: '001' }
};
const LISTA_CIUDADES = Object.values(CIUDADES);

// Campos de cada formato que salen de los datos del tercero.
function tercero1001(t) {
  const r = { tdoc: t.tdoc, nid: t.nid, apl1: t.apl1, apl2: t.apl2, nom1: t.nom1, nom2: t.nom2, raz: t.raz, pais: t.pais };
  if (t.pais === '169') Object.assign(r, { dir: t.dir, dpto: t.dpto, mun: t.mun });
  return r;
}
function terceroConDv(t) {
  const r = tercero1001(t);
  if (t.tdoc === '31') r.dv = t.dv;
  return r;
}
function tercero1007(t) {
  return { tdoc: t.tdoc, nid: t.nid, apl1: t.apl1, apl2: t.apl2, nom1: t.nom1, nom2: t.nom2, raz: t.raz, pais: t.pais };
}
function tercero100x(t) {
  const r = { tdoc: t.tdoc, nid: t.nid, apl1: t.apl1, apl2: t.apl2, nom1: t.nom1, nom2: t.nom2, raz: t.raz };
  if (t.tdoc === '31') r.dv = t.dv;
  return r;
}

const CUANTIAS = { tdoc: '43', nid: '222222222', raz: 'CUANTÍAS MENORES', pais: '169' };

// ------------------------------------------------------------- empresa

/**
 * Arma los registros de una empresa y sus declaraciones.
 * tipo: 'cuadra' o 'diferencias'.
 */
function empresa(tipo) {
  const dif = tipo === 'diferencias';
  const rnd = azar(dif ? 20251 : 20252);
  const entre = (a, b) => Math.round(a + (b - a) * rnd());
  const ciudad = dif ? CIUDADES.cali : CIUDADES.bogota;
  const propia = nit(dif ? 999200017 : 999100015);
  const info = {
    nombre: dif ? 'Servicios del Valle de Ejemplo S.A.S.' : 'Comercializadora Andina de Ejemplo S.A.S.',
    nit: propia.nid, dv: propia.dv
  };
  const p = dif ? 'Valle' : 'Andina';

  const banco1 = personaJuridica(dif ? 999800023 : 999800011, 'BANCO DE EJEMPLO S.A.', CIUDADES.bogota);
  const banco2 = personaJuridica(dif ? 999800049 : 999800037, 'BANCO AGRARIO DE EJEMPLO S.A.', CIUDADES.medellin);
  const eps = personaJuridica(999810013, 'EPS SALUD DE EJEMPLO S.A.S.', CIUDADES.bogota);
  const arl = personaJuridica(999810021, 'ARL POSITIVA DE EJEMPLO S.A.', CIUDADES.bogota);
  const pension = personaJuridica(999810039, 'FONDO DE PENSIONES DE EJEMPLO S.A.', CIUDADES.bogota);
  const caja = personaJuridica(999810047, 'CAJA DE COMPENSACIÓN DE EJEMPLO', ciudad);
  const municipio = personaJuridica(999700014, dif ? 'MUNICIPIO DE EJEMPLO DEL VALLE' : 'DISTRITO DE EJEMPLO', ciudad);
  const dian = { tdoc: '31', nid: '800197268', dv: '4', raz: 'U.A.E. DIRECCIÓN DE IMPUESTOS Y ADUANAS NACIONALES', dir: 'CR 8 6C 38', dpto: '11', mun: '001', pais: '169' };
  const exterior = { tdoc: '42', nid: 'US8829104', raz: 'EXAMPLE CLOUD SOFTWARE INC', pais: '249' };

  const proveedores = Array.from({ length: 8 }, (_, k) => personaJuridica((dif ? 999210000 : 999110000) + 11 * (k + 1), `PROVEEDOR ${p.toUpperCase()} ${['UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO'][k]} DE EJEMPLO S.A.S.`, LISTA_CIUDADES[k % LISTA_CIUDADES.length]));
  const servicios = Array.from({ length: 6 }, (_, k) => personaJuridica((dif ? 999220000 : 999120000) + 13 * (k + 1), `SERVICIOS ${['LOGÍSTICOS', 'DE ASEO', 'DE VIGILANCIA', 'DE SISTEMAS', 'DE TRANSPORTE', 'DE PUBLICIDAD'][k]} ${p.toUpperCase()} DE EJEMPLO S.A.S.`, LISTA_CIUDADES[(k + 2) % LISTA_CIUDADES.length]));
  const nombres = [
    ['EJEMPLO', 'TORRES', 'ANA', 'LUCÍA'], ['MUESTRA', 'PEÑA', 'CARLOS', 'ANDRÉS'], ['PRUEBA', 'GÓMEZ', 'MARÍA', 'JOSÉ'],
    ['FICTICIO', 'RUIZ', 'JUAN', 'PABLO'], ['MODELO', 'DÍAZ', 'LAURA', ''], ['SIMULADO', 'ROJAS', 'PEDRO', 'NEL'],
    ['DEMOSTRACIÓN', 'LÓPEZ', 'SOFÍA', ''], ['EJEMPLAR', 'MORA', 'DIEGO', 'ALEJANDRO'], ['CASO', 'NÚÑEZ', 'VALENTINA', '']
  ];
  const personas = nombres.map((n, k) => personaNatural((dif ? 1990002000 : 1990001000) + 17 * (k + 1), n[0], n[1], n[2], n[3], LISTA_CIUDADES[k % LISTA_CIUDADES.length]));
  const honorarios = personas.slice(0, 3);
  const arrendador = personas[3];
  const empleados = personas.slice(4, 9);
  const clientes = Array.from({ length: 14 }, (_, k) => (k < 12
    ? personaJuridica((dif ? 999230000 : 999130000) + 19 * (k + 1), `CLIENTE ${p.toUpperCase()} ${String(k + 1).padStart(2, '0')} DE EJEMPLO S.A.S.`, LISTA_CIUDADES[(k + 1) % LISTA_CIUDADES.length])
    : personaNatural((dif ? 1990003000 : 1990004000) + 23 * (k + 1), ['CLIENTE', 'COMPRADOR'][k - 12], ['ARIAS', 'VEGA'][k - 12], ['ELENA', 'MATEO'][k - 12], '', LISTA_CIUDADES[k % LISTA_CIUDADES.length])));
  const socios = [
    personaNatural(dif ? 1990005011 : 1990005003, 'FUNDADOR', 'EJEMPLO', 'RICARDO', '', ciudad),
    personaNatural(dif ? 1990005029 : 1990005037, 'SOCIA', 'EJEMPLO', 'CAROLINA', '', ciudad),
    personaJuridica(dif ? 999300016 : 999300024, 'INVERSIONES FAMILIARES DE EJEMPLO S.A.S.', ciudad)
  ];

  // ------------------------------------------------------------ 1001
  const r1001 = [];
  const r1005 = [];
  const iva = (base) => Math.round(base * 0.19);
  // Compras de mercancía (5007): retención por compras 2,5 %; reteIVA 15 % del IVA en tres proveedores.
  proveedores.forEach((t, k) => {
    const base = entre(dif ? 18e6 : 60e6, dif ? 45e6 : 180e6);
    const retp = Math.round(base * 0.025);
    const comun = k < 3 ? Math.round(iva(base) * 0.15) : 0;
    r1001.push(Object.assign({ cpt: '5007' }, tercero1001(t), { pago: base, pnded: 0, ided: 0, inded: 0, retp, reta: 0, comun, ndom: 0 }));
    r1005.push(Object.assign(tercero100x(t), { vimp: iva(base), ivade: 0 }));
  });
  // Servicios (5004): retención 4 %; reteIVA 15 % del IVA. En la empresa con diferencias, dos bases
  // fijas para que las diferencias sembradas den cifras redondas: 62.500.000 (retención de 2.500.000)
  // y 15.789.474 (IVA de 3.000.000 y reteIVA de 450.000).
  servicios.forEach((t, k) => {
    const base = dif && k === 3 ? 62500000 : dif && k === 0 ? 15789474 : entre(8e6, 30e6);
    r1001.push(Object.assign({ cpt: '5004' }, tercero1001(t), { pago: base, pnded: 0, ided: 0, inded: 0, retp: Math.round(base * 0.04), reta: 0, comun: Math.round(iva(base) * 0.15), ndom: 0 }));
    r1005.push(Object.assign(tercero100x(t), { vimp: iva(base), ivade: 0 }));
  });
  // Honorarios a personas naturales (5002): retención 10 %.
  honorarios.forEach((t) => {
    const base = entre(12e6, 36e6);
    r1001.push(Object.assign({ cpt: '5002' }, tercero1001(t), { pago: base, pnded: 0, ided: 0, inded: 0, retp: Math.round(base * 0.10), reta: 0, comun: 0, ndom: 0 }));
  });
  // Arrendamiento del local (5005): retención 3,5 %.
  const canon = dif ? 4.2e6 * 12 : 6.5e6 * 12;
  r1001.push(Object.assign({ cpt: '5005' }, tercero1001(arrendador), { pago: canon, pnded: 0, ided: 0, inded: 0, retp: Math.round(canon * 0.035), reta: 0, comun: 0, ndom: 0 }));
  // Intereses del crédito (5006) y GMF (5101): el GMF deducible es el 50 %.
  const intereses = entre(9e6, 15e6);
  r1001.push(Object.assign({ cpt: '5006' }, tercero1001(banco1), { pago: intereses, pnded: 0, ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
  const gmf = entre(3e6, 5e6);
  r1001.push(Object.assign({ cpt: '5101' }, tercero1001(dif ? dian : banco1), { pago: Math.round(gmf / 2), pnded: gmf - Math.round(gmf / 2), ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
  // Seguridad social y parafiscales: la parte del empleador es deducible; la del empleado, no.
  const nominaMes = dif ? 16e6 : 21e6;
  const salarios = nominaMes * 12;
  r1001.push(Object.assign({ cpt: '5011' }, tercero1001(eps), { pago: Math.round(salarios * 0.085), pnded: Math.round(salarios * 0.04), ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
  r1001.push(Object.assign({ cpt: '5011' }, tercero1001(arl), { pago: Math.round(salarios * 0.00522), pnded: 0, ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
  r1001.push(Object.assign({ cpt: '5012' }, tercero1001(pension), { pago: Math.round(salarios * 0.12), pnded: Math.round(salarios * 0.04), ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
  r1001.push(Object.assign({ cpt: '5010' }, tercero1001(caja), { pago: Math.round(salarios * 0.04), pnded: 0, ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
  // Impuestos deducibles (5015): industria y comercio al municipio.
  const ica = entre(4e6, 8e6);
  r1001.push(Object.assign({ cpt: '5015' }, tercero1001(municipio), { pago: ica, pnded: 0, ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
  // Proveedor del exterior por plataformas digitales (5081): reteIVA a no domiciliados del 100 % del IVA.
  const nube = 7.2e6;
  r1001.push(Object.assign({ cpt: '5081' }, tercero1001(exterior), { pago: nube, pnded: 0, ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: iva(nube) }));
  r1005.push(Object.assign(tercero100x(exterior), { vimp: iva(nube), ivade: 0 }));
  // Cuantías menores (5016): gastos menores sin retención.
  const menores = entre(2e6, 4e6);
  r1001.push(Object.assign({ cpt: '5016' }, CUANTIAS, { dir: ciudad.dir, dpto: ciudad.dpto, mun: ciudad.mun, pago: menores, pnded: 0, ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));

  if (dif) {
    // Compra de un activo fijo (5008) y un seguro pagado por anticipado (5035) con su amortización (5019):
    // el verificador no cuenta el activo ni el anticipo como gasto del año.
    const equipo = 14.5e6;
    r1001.push(Object.assign({ cpt: '5008' }, tercero1001(proveedores[4]), { pago: equipo, pnded: 0, ided: 0, inded: 0, retp: Math.round(equipo * 0.025), reta: 0, comun: 0, ndom: 0 }));
    const aseguradora = personaJuridica(999820018, 'SEGUROS GENERALES DE EJEMPLO S.A.', CIUDADES.bogota);
    r1001.push(Object.assign({ cpt: '5035' }, tercero1001(aseguradora), { pago: 6.6e6, pnded: 0, ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
    r1001.push(Object.assign({ cpt: '5019' }, tercero1001(aseguradora), { pago: 3.3e6, pnded: 0, ided: 0, inded: 0, retp: 0, reta: 0, comun: 0, ndom: 0 }));
    // IVA llevado al costo en el 1001 que no aparece en el 1005 (revisión «IVA llevado al costo»).
    r1001.push(Object.assign({ cpt: '5016' }, tercero1001(servicios[5]), { pago: 4.5e6, pnded: 0, ided: 855000, inded: 0, retp: 180000, reta: 0, comun: 0, ndom: 0 }));
    // Pago con retención dentro de cuantías menores (revisión «Cuantías menores»).
    r1001.push(Object.assign({ cpt: '5004' }, CUANTIAS, { dir: ciudad.dir, dpto: ciudad.dpto, mun: ciudad.mun, pago: 875000, pnded: 0, ided: 0, inded: 0, retp: 35000, reta: 0, comun: 0, ndom: 0 }));
    // Tercero de Colombia sin dirección (revisión «Dirección»).
    const sinDireccion = personaJuridica(999240015, 'PAPELERÍA RÁPIDA DE EJEMPLO S.A.S.', ciudad);
    r1001.push(Object.assign({ cpt: '5016' }, tercero1001(sinDireccion), { dir: undefined, pago: 1.9e6, pnded: 0, ided: 0, inded: 0, retp: 47500, reta: 0, comun: 0, ndom: 0 }));
  }

  // ------------------------------------------------------------ 2276
  const r2276 = empleados.map((t, k) => {
    const pasa = Math.round(salarios * [0.30, 0.22, 0.18, 0.16, 0.14][k]);
    const papre = Math.round(pasa * 0.18);
    const cein = Math.round(pasa * 0.0833 * 1.12);
    const tingbtp = pasa + papre + cein;
    const vare = k === 0 ? Math.round(pasa * 0.06) : k === 1 ? Math.round(pasa * 0.015) : 0;
    const r = { entinfo: '1', tdocb: t.tdoc, nitb: t.nid, pap: t.apl1, sap: t.apl2, pno: t.nom1, ono: t.nom2, dir: t.dir, dpto: t.dpto, mun: t.mun, pais: t.pais };
    for (const c of REGLAS.FORMATOS['2276'].valores) r[c] = 0;
    return Object.assign(r, { pasa, papre, cein, tingbtp, apos: Math.round(pasa * 0.04), apof: Math.round(pasa * 0.04), vare });
  });

  // ------------------------------------------------------------ ingresos: 1007, 1006, 1003, 1008
  const r1007 = [];
  const r1006 = [];
  const r1003 = [];
  const r1008 = [];
  clientes.forEach((t, k) => {
    const ventas = entre(dif ? 25e6 : 80e6, dif ? 95e6 : 260e6);
    const devoluciones = k % 5 === 0 ? Math.round(ventas * 0.02) : 0;
    r1007.push(Object.assign({ cpt: '4001' }, tercero1007(t), { ibru: ventas, dred: devoluciones }));
    r1006.push(Object.assign(tercero100x(t), { imp: iva(ventas - devoluciones), iva: 0, icon: 0 }));
    if (t.tdoc === '31' && k < 9) {
      const conDv = terceroConDv(t);
      const base1003 = { tdoc: conDv.tdoc, nid: conDv.nid, dv: conDv.dv, raz: conDv.raz, dir: conDv.dir, dpto: conDv.dpto, mcpo: conDv.mun };
      r1003.push(Object.assign({ cpt: '1302' }, base1003, { valor: ventas, ret: Math.round(ventas * 0.025) }));
      if (k < 4) {
        const ivaVentas = iva(ventas);
        // La base del reteIVA es el valor del IVA; en la empresa con diferencias, un cliente reporta el valor del pago.
        const baseIVA = dif && k === 1 ? ventas : ivaVentas;
        r1003.push(Object.assign({ cpt: '1309' }, base1003, { valor: baseIVA, ret: Math.round(ivaVentas * 0.15) }));
      }
    }
    if (k % 2 === 0) {
      const saldo = Math.round(ventas * 0.12);
      r1008.push(Object.assign({ cpt: '1315' }, terceroConDv(t), { sal: saldo }));
    }
  });
  // Ventas a consumidores no identificados: cuantías menores en el 1007 y en el 1006.
  const mostrador = entre(dif ? 9e6 : 30e6, dif ? 14e6 : 45e6);
  r1007.push(Object.assign({ cpt: '4001' }, CUANTIAS, { ibru: mostrador, dred: 0 }));
  r1006.push(Object.assign({ tdoc: '43', nid: '222222222', raz: 'CUANTÍAS MENORES' }, { imp: iva(mostrador), iva: 0, icon: 0 }));
  // Intereses que pagó el banco (4003).
  r1007.push(Object.assign({ cpt: '4003' }, tercero1007(banco2), { ibru: entre(1.2e6, 2.4e6), dred: 0 }));
  r1003.push({ cpt: '1306', tdoc: '31', nid: banco2.nid, dv: banco2.dv, raz: banco2.raz, dir: banco2.dir, dpto: banco2.dpto, mcpo: banco2.mun, valor: 1.6e6, ret: 112000 });
  // Cuentas por cobrar a empleados (1317) y deterioro fiscal de un cliente (1318).
  r1008.push(Object.assign({ cpt: '1317' }, terceroConDv(empleados[0]), { sal: 2.4e6 }));
  r1008.push(Object.assign({ cpt: '1318' }, terceroConDv(clientes[2]), { sal: 1.15e6 }));

  // Ingresos recibidos para terceros reportados como propios en el 1007 (diferencia sembrada en C5).
  if (dif) {
    const mandante = personaJuridica(999250012, 'MANDANTE DE EJEMPLO S.A.S.', CIUDADES.medellin);
    r1007.push(Object.assign({ cpt: '4001' }, tercero1007(mandante), { ibru: 12e6, dred: 0 }));
    // Un cliente con tipo de documento que no existe (revisión «Tipo de documento»).
    r1008.push(Object.assign({ cpt: '1317' }, terceroConDv(clientes[3]), { tdoc: '33', dv: undefined, sal: 1.8e6 }));
  }

  // ------------------------------------------------------------ 1009
  const r1009 = [];
  proveedores.slice(0, 5).forEach((t, k) => r1009.push(Object.assign({ cpt: '2201' }, terceroConDv(t), { sal: entre(3e6, 12e6) + k })));
  r1009.push(Object.assign({ cpt: '2203' }, terceroConDv(banco1), { sal: dif ? 48e6 : 85e6 }));
  r1009.push(Object.assign({ cpt: '2204' }, terceroConDv(dian), { sal: entre(9e6, 16e6) }));
  r1009.push(Object.assign({ cpt: '2214' }, terceroConDv(pension), { sal: Math.round(nominaMes * 0.16) }));
  r1009.push(Object.assign({ cpt: '2214' }, terceroConDv(eps), { sal: Math.round(nominaMes * 0.125) }));
  r1009.push(Object.assign({ cpt: '2206' }, CUANTIAS, { dir: ciudad.dir, dpto: ciudad.dpto, mun: ciudad.mun, sal: 410000 }));
  if (dif) {
    // NIT con dígito de verificación errado y municipio que no existe (revisiones «Dígito» y «Códigos DANE»).
    const proveedorDv = Object.assign(terceroConDv(proveedores[6]), { dv: String((Number(proveedores[6].dv) + 3) % 10) });
    r1009.push(Object.assign({ cpt: '2201' }, proveedorDv, { sal: 2.7e6 }));
    r1009.push(Object.assign({ cpt: '2206' }, terceroConDv(servicios[1]), { mun: '999', sal: 1.3e6 }));
  }

  // ------------------------------------------------------------ 1010 y 1012
  const r1010 = socios.map((t, k) => Object.assign(terceroConDv(t), { valnom: [60e6, 30e6, 10e6][k], valprm: k === 2 ? 5e6 : 0, por: [60, 30, 10][k], dec: 0 }));
  if (dif) r1010.push(Object.assign({}, r1010[1])); // socio repetido (revisión «Registros repetidos»)
  const r1012 = [
    Object.assign({ cpt: '1110' }, tercero1007(banco1), { dv: banco1.dv, val: entre(dif ? 25e6 : 60e6, dif ? 40e6 : 95e6) }),
    Object.assign({ cpt: '1110' }, tercero1007(banco2), { dv: banco2.dv, val: entre(4e6, 9e6) }),
    Object.assign({ cpt: '1201' }, tercero1007(banco1), { dv: banco1.dv, val: dif ? 20e6 : 50e6 })
  ];

  // ------------------------------------------------------------ cifras de la exógena (con las reglas del verificador)
  const sum = (lista, campos, filtro = () => true) => lista.filter(filtro).reduce((s, r) => s + campos.reduce((x, c) => x + Number(r[c] || 0), 0), 0);
  const marcas1001 = (c) => REGLAS.CONCEPTOS['1001'][c] || {};
  const ret2276 = sum(r2276, ['vare']);
  const costos = sum(r1001, ['pago'], (r) => marcas1001(r.cpt).costo) + sum(r1001, ['ided']) + sum(r2276, ['tingbtp', 'ivav']);
  const ingresos = sum(r1007, ['ibru']);
  const devol = sum(r1007, ['dred']);
  const ivaGenerado = sum(r1006, ['imp', 'iva']);
  const ivaDescontable = sum(r1005, ['vimp', 'ivade']);
  const ret1003 = sum(r1003, ['ret'], (r) => r.cpt !== '1309' && r.cpt !== '1314');
  const reteIVA1003 = sum(r1003, ['ret'], (r) => r.cpt === '1309');
  const cxc = sum(r1008, ['sal'], (r) => r.cpt !== '1318') - sum(r1008, ['sal'], (r) => r.cpt === '1318');
  const pasivos = sum(r1009, ['sal']);
  const bancos = sum(r1012, ['val'], (r) => r.cpt === '1110' || r.cpt === '1115');
  const inversiones = sum(r1012, ['val'], (r) => Number(r.cpt) >= 1200 && Number(r.cpt) <= 1206);
  const autorretencion = Math.round(ingresos * (dif ? 0.008 : 0.004));

  // Diferencias sembradas en la empresa con diferencias (lo que la contabilidad y las declaraciones tienen distinto).
  const s = dif ? {
    C1a: 2250000, // la retención de un proveedor de servicios se digitó con un cero de menos en el 1001
    C2: 450000, // la retención de IVA de un proveedor no quedó en el 1001
    C3: -3800000, // IVA descontable de una factura de diciembre tomado en el 300 de 2026
    C5a: -12000000, // ingresos recibidos para terceros reportados como propios en el 1007
    C7a: 600000, // un certificado de retención que no llegó: la renta lo imputó y el 1003 no lo tiene
    C8a: 9000000, // el saldo de un cliente no quedó en el 1008
    C4: 1140000, // explicada: IVA por retiro de inventarios (casilla 65 del 300)
    C6: 18500000, // explicada: depreciaciones del año
    C7b: -380000, // explicada: retención de IVA de diciembre imputada en el 300 de 2026
    C8c: 3200000 // explicada: saldo en caja
  } : {};
  const d = (k) => s[k] || 0;
  // Lo que declaró la empresa en los 350: la retención real. Se calcula antes de sembrar los errores del 1001.
  const verdad = {
    ret1001: sum(r1001, ['retp', 'reta'], (r) => !marcas1001(r.cpt).timbre && !marcas1001(r.cpt).fueraDeRetenciones),
    reteIVA: sum(r1001, ['comun', 'ndom']) + sum(r2276, ['rfiva'])
  };
  if (dif) {
    // C1a: el 1001 tiene la retención del proveedor de servicios 4 digitada con un cero de menos (2.500.000 -> 250.000).
    const reg = r1001.find((r) => r.cpt === '5004' && r.nid === servicios[3].nid);
    if (reg.retp !== 2500000) throw new Error('La base fija del proveedor de servicios 4 cambió');
    reg.retp = 250000;
    // C2: la retención de IVA del proveedor de servicios 1 (450.000) no quedó en el 1001.
    const reg2 = r1001.find((r) => r.cpt === '5004' && r.nid === servicios[0].nid);
    if (reg2.comun !== 450000) throw new Error('La base fija del proveedor de servicios 1 cambió');
    reg2.comun = 0;
  }

  // ------------------------------------------------------------ declaraciones
  const pesosMes = Array.from({ length: 12 }, () => 0.75 + 0.5 * rnd());
  const totalPesos = pesosMes.reduce((a, b) => a + b, 0);
  /** Reparte un total del año en periodos y redondea cada uno a miles, como en los formularios. */
  function repartir(total, n) {
    const w = n === 12 ? pesosMes : Array.from({ length: n }, (_, k) => pesosMes.slice(k * (12 / n), (k + 1) * (12 / n)).reduce((a, b) => a + b, 0));
    const suma = n === 12 ? totalPesos : w.reduce((a, b) => a + b, 0);
    let acumulado = 0;
    return w.map((x, k) => {
      if (k === n - 1) return miles(total - acumulado);
      const v = miles((total * x) / suma);
      acumulado += v;
      return v;
    });
  }

  const valores = {};
  const anual = (campo, v) => { valores[campo] = { A: miles(v) }; };
  const porPeriodo = (campo, total, ids) => {
    const partes = repartir(total, ids.length);
    valores[campo] = Object.fromEntries(ids.map((id, k) => [id, partes[k]]));
  };
  const B = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const M = Array.from({ length: 12 }, (_, k) => 'M' + String(k + 1).padStart(2, '0'));

  anual('r36', bancos + d('C8c'));
  anual('r37', inversiones);
  anual('r38', cxc + d('C8a'));
  anual('r45', pasivos);
  anual('r58', ingresos + d('C5a'));
  anual('r59', devol);
  // Costos y gastos repartidos en las casillas 62 a 66 (la suma es lo que cuenta en el cruce).
  const totalCostos = costos + d('C6');
  const compras = sum(r1001, ['pago'], (r) => r.cpt === '5007');
  const financieros = sum(r1001, ['pago'], (r) => r.cpt === '5006' || r.cpt === '5101');
  const ventas64 = Math.round((totalCostos - compras - financieros) * 0.25);
  const otros66 = Math.round((totalCostos - compras - financieros) * 0.05);
  anual('r62', compras);
  anual('r64', ventas64);
  anual('r65', financieros);
  anual('r66', otros66);
  anual('r63', totalCostos - compras - ventas64 - financieros - otros66);
  anual('r106', ret1003 + d('C7a'));

  porPeriodo('i67', ivaGenerado + d('C4'), B);
  porPeriodo('i81', ivaDescontable + d('C3'), B);
  porPeriodo('i85', reteIVA1003 + d('C7b'), B);

  porPeriodo('tAuto', autorretencion, M);
  porPeriodo('t93', ret2276, M);
  // La casilla 130 suma todo: retenciones a terceros, rentas de trabajo y autorretenciones.
  const t130 = valores.tAuto;
  const t93 = valores.t93;
  const terceros = repartir(verdad.ret1001, 12);
  valores.t130 = Object.fromEntries(M.map((id, k) => [id, terceros[k] + t130[id] + t93[id]]));
  porPeriodo('t134', verdad.reteIVA, M);

  // Explicaciones que el contador ya conoce (solo en la empresa con diferencias).
  const explicaciones = dif ? [
    { linea: 'C4', descripcion: 'IVA por retiro de inventarios para obsequios (casilla 65 del 300)', valor: d('C4') },
    { linea: 'C6', descripcion: 'Depreciación del año: gasto sin tercero en la exógena', valor: d('C6') },
    { linea: 'C7b', descripcion: 'Retención de IVA de diciembre imputada en el primer bimestre de 2026', valor: d('C7b') },
    { linea: 'C8c', descripcion: 'Saldo en caja general al 31 de diciembre', valor: d('C8c') }
  ] : [];

  const archivosXML = [];
  let envio = 1;
  const agregar = (formato, registros, opciones) => archivosXML.push(xmlFormato(formato, registros, envio++, opciones));
  if (!dif) {
    // La empresa que cuadra parte el 1001 en dos envíos, como cuando un programa los fracciona.
    agregar('1001', r1001.slice(0, 20), { conEsquema: true });
    agregar('1001', r1001.slice(20), { conEsquema: true });
  } else agregar('1001', r1001);
  agregar('1003', r1003, { conEsquema: !dif });
  agregar('1005', r1005, { conEsquema: !dif });
  agregar('1006', r1006, { conEsquema: !dif, desfaseValorTotal: dif ? 31 : 0 });
  agregar('1007', r1007, { conEsquema: !dif });
  agregar('1008', r1008, { conEsquema: !dif });
  agregar('1009', r1009, { conEsquema: !dif });
  agregar('1010', r1010, { conEsquema: !dif });
  agregar('1012', r1012, { conEsquema: !dif });
  agregar('2276', r2276, { conEsquema: !dif });

  return {
    info, archivosXML, explicaciones, sembradas: s,
    declaraciones: { periodicidad: { 300: 'bimestral', 350: 'mensual' }, valores }
  };
}

// ------------------------------------------------------------- archivos

function csvDeclaraciones(declaraciones) {
  // La plantilla oficial de la página, llena con los valores.
  const plantilla = V.plantillaCSV(declaraciones.periodicidad).replace(/^﻿/, '').trim().split(/\r\n/);
  const filas = [plantilla[0]];
  for (const linea of plantilla.slice(1)) {
    const celdas = linea.split(';');
    const form = (/(110|300|350)/.exec(celdas[0]) || [])[1];
    const casilla = REGLAS.DECLARACIONES[form].casillas.find((c) => c.casilla === celdas[1].replace(/^"|"$/g, ''));
    const per = REGLAS.PERIODOS[declaraciones.periodicidad[form] || 'anual'].find((x) => x.nombre === celdas[3]);
    const v = declaraciones.valores[casilla.id] && declaraciones.valores[casilla.id][per.id];
    celdas[4] = v === undefined ? '' : String(v);
    filas.push(celdas.join(';'));
  }
  return '﻿' + filas.join('\r\n') + '\r\n';
}

function csvExplicaciones(explicaciones) {
  const filas = ['Línea;Explicación;Valor'];
  for (const e of explicaciones) filas.push(`${e.linea};${e.descripcion};${e.valor}`);
  return '﻿' + filas.join('\r\n') + '\r\n';
}

/** Todos los archivos de ejemplo: { 'ejemplos/cuadra/...': Buffer }. */
function generar() {
  const salida = {};
  for (const tipo of ['cuadra', 'diferencias']) {
    const e = empresa(tipo);
    const carpeta = `ejemplos/${tipo}`;
    for (const a of e.archivosXML) salida[`${carpeta}/${a.nombre}`] = a.bytes;
    salida[`${carpeta}/declaraciones.csv`] = Buffer.from(csvDeclaraciones(e.declaraciones), 'utf8');
    if (e.explicaciones.length) salida[`${carpeta}/explicaciones.csv`] = Buffer.from(csvExplicaciones(e.explicaciones), 'utf8');
    salida[`${carpeta}/empresa.json`] = Buffer.from(JSON.stringify({ nombre: e.info.nombre, nit: e.info.nit, dv: e.info.dv, personaJuridica: true, sembradas: e.sembradas }, null, 2) + '\n', 'utf8');
  }
  return salida;
}

module.exports = { generar, empresa, xmlFormato, latin1, UVT };

if (require.main === module) {
  const archivos = generar();
  for (const tipo of ['cuadra', 'diferencias']) {
    const carpeta = path.join(RAIZ, 'ejemplos', tipo);
    fs.rmSync(carpeta, { recursive: true, force: true });
    fs.mkdirSync(carpeta, { recursive: true });
  }
  for (const [ruta, bytes] of Object.entries(archivos)) fs.writeFileSync(path.join(RAIZ, ruta), bytes);
  console.log(`Escritos ${Object.keys(archivos).length} archivos en ejemplos/`);
}
