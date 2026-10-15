/*
 * Verificador de exógena: las reglas del año gravable 2025, como datos.
 *
 * Todo lo que depende de la norma vive aquí y no en la lógica: los formatos que
 * se leen, sus conceptos, las casillas de las declaraciones, cómo se arma cada
 * cruce, las causas típicas y los parámetros de las revisiones. Cada cosa dice
 * de qué norma sale. Para el año gravable 2026 se copia este archivo, se cambia
 * lo que cambió (Resoluciones 000233 y 000237 de 2025) y la lógica sigue igual.
 *
 * La estructura de cada formato (atributos, tipos y largos) no se escribe aquí:
 * sale de los esquemas XSD oficiales (src/esquemas-ag2025.js, generado). Las
 * tablas de países, departamentos y municipios salen del prevalidador de la DIAN
 * (src/tablas-ag2025.js, generado).
 *
 * Marcas que usan estas reglas:
 * - norma: la fuente legal o técnica, con su URL en NORMAS.
 * - criterio: decisión de este verificador que la norma no dice; está escrita
 *   para que un contador la revise.
 * - pendiente: dato que no se pudo confirmar en una fuente oficial.
 */
(function (raiz, fabrica) {
  'use strict';
  var modulo = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else raiz.ExoReglas = modulo;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const NORMAS = {
    R162: {
      nombre: 'Resolución DIAN 000162 de 2023',
      que: 'Información exógena del año gravable 2024 y siguientes: obligados, formatos, conceptos, cuantías y anexos técnicos.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0162_2023.htm',
      urlAnexos: 'http://168.61.69.177/documentospdf/PDF/R_DIAN_0162_2023.pdf'
    },
    R188: {
      nombre: 'Resolución DIAN 000188 de 2024',
      que: 'Modifica la 000162 desde el año gravable 2025: conceptos del 1001 y del 1007, GMF (5101) y anexos técnicos del 1005 y del 1010.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0188_2024.htm',
      urlAnexos: 'https://normograma.com/documentospdf/PDF/R_DIAN_0188_2024_ANEXO.pdf'
    },
    C10627: {
      nombre: 'Concepto DIAN 010627 de 2026',
      que: 'El año gravable 2025 se rige por la 000162 de 2023 y la 000188 de 2024; el 2026, por la 000233 y la 000237 de 2025.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_10627_2026.htm'
    },
    R227: {
      nombre: 'Resolución DIAN 000227 de 2025 (Única)',
      que: 'Compila la 000162 y la 000188 (título 3) y los formularios 110, 300 y 350.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm'
    },
    R233: {
      nombre: 'Resolución DIAN 000233 de 2025',
      que: 'Cambios para el año gravable 2026; aclara que la base del concepto 1309 es el valor del IVA.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0233_2025.htm'
    },
    R193: {
      nombre: 'Resolución DIAN 000193 de 2024',
      que: 'UVT de 2025: COP 49.799.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0193_2024.htm'
    },
    PREVALIDADOR: {
      nombre: 'Prevalidador Tributario Informantes AG2025 v3.3.0-26 (DIAN, 19 de marzo de 2026)',
      que: 'Esquemas XSD y tablas de códigos con los que la DIAN valida los formatos del año gravable 2025.',
      url: 'https://storagecdndian.blob.core.windows.net/site/Transaccional/PREVALIDADORES/Prevalidador_Tributario_Informantes_AG2025_v3.3.0-26.zip',
      urlPagina: 'https://www.dian.gov.co/Transaccional/Paginas/Prevalidadores-Informacion-Tributaria.aspx'
    },
    F110: {
      nombre: 'Formulario 110 (Resolución DIAN 000022 de 2023)',
      que: 'Declaración de renta de personas jurídicas, año gravable 2022 y siguientes; instructivo de cada casilla.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0022_2023.htm',
      urlFormulario: 'https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2026/Formulario_110_2026.pdf'
    },
    F300: {
      nombre: 'Formulario 300 (Resolución DIAN 000019 de 2020, art. 3)',
      que: 'Declaración del IVA, año gravable 2020 y siguientes; instructivo de cada casilla.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0019_2020.htm',
      urlFormulario: 'https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2025/Formulario_300_2025.pdf'
    },
    F350: {
      nombre: 'Formulario 350 (Resolución DIAN 000031 de 2024)',
      que: 'Declaración de retenciones en la fuente desde el 1 de agosto de 2024; instructivo de cada casilla.',
      url: 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0031_2024.htm',
      urlFormulario: 'https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2026/Formulario_350_2026.pdf'
    },
    UMBRAL: {
      nombre: 'Mensaje de la DIAN sobre el año gravable 2024, citado por Gerencie',
      que: 'Señalaba pagos del 1001 y del 2276 que superaban lo declarado en más de 20 UVT. Visto solo en el extracto de un buscador; la página ya no abre.',
      url: 'https://www.gerencie.com/qa/que-hacer-cuando-la-dian-informa-de-posibles-inconsistencias-en-la-informacion-exogena-2323/',
      pendiente: true
    }
  };

  const ANIO_GRAVABLE = 2025;

  const PARAMETROS = {
    revisadas: '2026-10-15',
    uvt: { valor: 49799, norma: 'R193', nota: 'UVT de 2025, art. 1 de la Resolución 000193 de 2024.' },
    // Semáforo: verde por debajo de 1 UVT; amarillo por debajo del umbral; rojo desde el umbral.
    verdeUVT: 1,
    umbralUVT: {
      valor: 20,
      norma: 'UMBRAL',
      pendiente: 'El umbral de 20 UVT sale de un mensaje de la DIAN sobre el AG 2024 visto solo en el extracto de un buscador. Es un valor por defecto que el contador cambia.'
    },
    cuantias: {
      pagos1001UVT: { valor: 3, norma: 'R162', donde: 'art. 20, parágrafo 1' },
      saldos1008UVT: { valor: 12, norma: 'R162', donde: 'art. 26, parágrafo 1' },
      saldos1009UVT: { valor: 12, norma: 'R162', donde: 'art. 25, parágrafo 1' },
      terceros1647UVT: { valor: 24, norma: 'R162', donde: 'art. 28, parágrafo 1' }
    },
    nit: {
      cuantiasMenores: '222222222',
      razonCuantiasMenores: 'CUANTÍAS MENORES',
      exteriorDesde: 444444001,
      exteriorHasta: 444449999,
      dian: '800197268',
      norma: 'R162',
      donde: 'arts. 20 a 28 (cuantías menores con tipo de documento 43; exterior sin número fiscal, 444444001 a 444449999)'
    },
    paisColombia: '169',
    maxRegistrosPorArchivo: { valor: 5000, norma: 'R162', donde: 'anexos técnicos, numeral 2.1, casilla CantReg' },
    codificacion: { valor: 'iso-8859-1', norma: 'R162', donde: 'anexos técnicos, numeral 2, punto 2' },
    // Concepto 1309: si la retención es menos del 10 % de la base, la base parece el pago y no el IVA.
    // La retención de IVA es un porcentaje del IVA (15 % en general): sobre el IVA da cerca del 15 %;
    // sobre el pago con IVA del 19 % da cerca del 2,4 %.
    baseReteIVA: { proporcionMinima: 0.10, criterio: true, norma: 'R233' }
  };

  // Tipos de documento de la tabla 1 (con el 43) y de la tabla 2 (sin el 43): artículo 66 de la 000162.
  // Las tablas mismas están en src/tablas-ag2025.js. Las personas naturales llevan apellido y nombre.
  const TIPOS_PERSONA_NATURAL = ['11', '12', '13', '21', '22', '41', '47', '48'];
  const TIPOS_NUMERICOS = ['11', '12', '13', '21', '22', '31', '43'];

  // ------------------------------------------------------------- formatos

  // roles: qué atributo del esquema cumple cada papel. llave: los campos que la
  // especificación técnica declara como llave única. sumaValorTotal: el
  // atributo cuya suma debe dar el ValorTotal de la cabecera (anexos técnicos,
  // numeral 2.1, y hoja DefinicionFormatos del prevalidador).
  const FORMATOS = {
    1001: {
      version: '10', nombre: 'Pagos o abonos en cuenta y retenciones practicadas',
      norma: 'R162', donde: 'art. 20 y anexo 18; conceptos modificados por la Resolución 000188 de 2024, art. 3',
      tablaTipos: 'tabla1', llave: ['cpt', 'tdoc', 'nid'], sumaValorTotal: 'cpt',
      roles: { concepto: 'cpt', tdoc: 'tdoc', nid: 'nid', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz', dir: 'dir', dpto: 'dpto', mun: 'mun', pais: 'pais' },
      direccionSiColombia: ['dir', 'dpto', 'mun'],
      valores: ['pago', 'pnded', 'ided', 'inded', 'retp', 'reta', 'comun', 'ndom'],
      cuantiasMenores: 'permitidas',
      descripcionValores: { pago: 'Pago o abono deducible', pnded: 'Pago o abono no deducible', ided: 'IVA mayor valor del costo deducible', inded: 'IVA mayor valor del costo no deducible', retp: 'Retención de renta practicada', reta: 'Retención de renta asumida', comun: 'Retención de IVA a responsables', ndom: 'Retención de IVA a no domiciliados' }
    },
    1003: {
      version: '7', nombre: 'Retenciones en la fuente que le practicaron',
      norma: 'R162', donde: 'art. 21 y anexo 19',
      tablaTipos: 'tabla2', llave: ['cpt', 'tdoc', 'nid'], sumaValorTotal: 'ret',
      roles: { concepto: 'cpt', tdoc: 'tdoc', nid: 'nid', dv: 'dv', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz', dir: 'dir', dpto: 'dpto', mun: 'mcpo' },
      direccionSiColombia: [],
      valores: ['valor', 'ret'],
      cuantiasMenores: 'no previstas',
      descripcionValores: { valor: 'Base sujeta a retención', ret: 'Retención que le practicaron' }
    },
    1004: {
      version: '8', nombre: 'Descuentos tributarios solicitados',
      norma: 'R162', donde: 'art. 39 y anexo 29',
      tablaTipos: 'tabla1', llave: ['cpt', 'tdoc', 'nit'], sumaValorTotal: 'tdoc',
      roles: { concepto: 'cpt', tdoc: 'tdoc', nid: 'nit', apl1: 'pap', apl2: 'sap', nom1: 'pno', nom2: 'ono', raz: 'raz', dir: 'dir', dpto: 'dpto', mun: 'mun', pais: 'pais' },
      direccionSiColombia: ['dir', 'dpto', 'mun'],
      valores: ['vdesc', 'vdescsol'],
      cuantiasMenores: 'no previstas',
      descripcionValores: { vdesc: 'Descuento tributario total', vdescsol: 'Descuento solicitado en el año' }
    },
    1005: {
      version: '8', nombre: 'IVA descontable',
      norma: 'R188', donde: 'art. 23 de la 000162 y anexo 21 modificado por la 000188',
      tablaTipos: 'tabla1', llave: ['tdoc', 'nid'], sumaValorTotal: 'tdoc',
      roles: { tdoc: 'tdoc', nid: 'nid', dv: 'dv', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz' },
      direccionSiColombia: [],
      valores: ['vimp', 'ivade', 'ivavcg'],
      cuantiasMenores: 'no previstas',
      descripcionValores: { vimp: 'Impuesto descontable', ivade: 'IVA por devoluciones en ventas', ivavcg: 'IVA llevado al costo o gasto (art. 490 E.T.)' }
    },
    1006: {
      version: '8', nombre: 'IVA generado e impuesto nacional al consumo',
      norma: 'R162', donde: 'art. 24 y anexo 22',
      // El anexo 22 nombra un «Concepto» en la llave, pero el 1006 no tiene concepto; el prevalidador usa tipo y número.
      tablaTipos: 'tabla1', llave: ['tdoc', 'nid'], sumaValorTotal: 'tdoc',
      roles: { tdoc: 'tdoc', nid: 'nid', dv: 'dv', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz' },
      direccionSiColombia: [],
      valores: ['imp', 'iva', 'icon'],
      cuantiasMenores: 'permitidas',
      descripcionValores: { imp: 'Impuesto generado', iva: 'IVA recuperado en devoluciones en compras', icon: 'Impuesto nacional al consumo' }
    },
    1007: {
      version: '9', nombre: 'Ingresos recibidos',
      norma: 'R162', donde: 'art. 22 y anexo 20; conceptos 4020 y 4021 modificados por la Resolución 000188 de 2024, art. 4',
      tablaTipos: 'tabla1', llave: ['cpt', 'tdoc', 'nid'], sumaValorTotal: 'cpt',
      roles: { concepto: 'cpt', tdoc: 'tdoc', nid: 'nid', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz', pais: 'pais' },
      direccionSiColombia: [],
      valores: ['ibru', 'dred'],
      cuantiasMenores: 'permitidas',
      descripcionValores: { ibru: 'Ingresos brutos', dred: 'Devoluciones, rebajas y descuentos' }
    },
    1008: {
      version: '7', nombre: 'Cuentas por cobrar al 31 de diciembre',
      norma: 'R162', donde: 'art. 26 y anexo 24',
      tablaTipos: 'tabla1', llave: ['cpt', 'tdoc', 'nid'], sumaValorTotal: 'sal',
      roles: { concepto: 'cpt', tdoc: 'tdoc', nid: 'nid', dv: 'dv', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz', dir: 'dir', dpto: 'dpto', mun: 'mun', pais: 'pais' },
      direccionSiColombia: ['dir', 'dpto', 'mun'],
      valores: ['sal'],
      cuantiasMenores: 'permitidas',
      descripcionValores: { sal: 'Saldo por cobrar al 31 de diciembre' }
    },
    1009: {
      version: '7', nombre: 'Cuentas por pagar al 31 de diciembre',
      norma: 'R162', donde: 'art. 25 y anexo 23',
      tablaTipos: 'tabla1', llave: ['cpt', 'tdoc', 'nid'], sumaValorTotal: 'sal',
      roles: { concepto: 'cpt', tdoc: 'tdoc', nid: 'nid', dv: 'dv', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz', dir: 'dir', dpto: 'dpto', mun: 'mun', pais: 'pais' },
      direccionSiColombia: ['dir', 'dpto', 'mun'],
      valores: ['sal'],
      cuantiasMenores: 'permitidas',
      descripcionValores: { sal: 'Saldo por pagar al 31 de diciembre' }
    },
    1010: {
      version: '9', nombre: 'Socios, accionistas, comuneros y cooperados',
      norma: 'R188', donde: 'art. 19 de la 000162 y anexo 17 modificado por la 000188',
      tablaTipos: 'tabla1', llave: ['tdoc', 'nid'], sumaValorTotal: 'valnom',
      roles: { tdoc: 'tdoc', nid: 'nid', dv: 'dv', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz', dir: 'dir', dpto: 'dpto', mun: 'mun', pais: 'pais' },
      direccionSiColombia: ['dir', 'dpto', 'mun'],
      valores: ['valnom', 'valprm'],
      cuantiasMenores: 'no previstas',
      descripcionValores: { valnom: 'Valor nominal al 31 de diciembre', valprm: 'Prima en colocación de acciones' }
    },
    1011: {
      version: '6', nombre: 'Información de las declaraciones tributarias',
      norma: 'R162', donde: 'arts. 32 a 38 y anexo 28',
      tablaTipos: null, llave: ['cpt'], sumaValorTotal: 'sal',
      roles: { concepto: 'cpt' },
      direccionSiColombia: [],
      valores: ['sal'],
      cuantiasMenores: 'no aplica',
      descripcionValores: { sal: 'Saldo al 31 de diciembre' }
    },
    1012: {
      version: '7', nombre: 'Declaraciones tributarias, acciones, aportes e inversiones',
      norma: 'R162', donde: 'arts. 29 a 31 y anexo 27',
      tablaTipos: 'tabla1', llave: ['cpt', 'tdoc', 'nid'], sumaValorTotal: 'val',
      roles: { concepto: 'cpt', tdoc: 'tdoc', nid: 'nid', dv: 'dv', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz', pais: 'pais' },
      direccionSiColombia: [],
      valores: ['val'],
      cuantiasMenores: 'no previstas',
      descripcionValores: { val: 'Valor al 31 de diciembre' }
    },
    1647: {
      version: '2', nombre: 'Ingresos recibidos para terceros',
      norma: 'R162', donde: 'art. 28 y anexo 26',
      tablaTipos: 'tabla1',
      llave: ['con', 'tdoc', 'nid', 'tdoc2', 'nid2i'], sumaValorTotal: 'vtotal',
      roles: { concepto: 'con', tdoc: 'tdoc', nid: 'nid', dv: 'dv', apl1: 'apl1', apl2: 'apl2', nom1: 'nom1', nom2: 'nom2', raz: 'raz', pais: 'pais' },
      direccionSiColombia: ['dir', 'cdpt', 'cmcp'], paisDireccion: 'paist', dptoDireccion: 'cdpt', munDireccion: 'cmcp',
      valores: ['vtotal', 'ving', 'vret'],
      cuantiasMenores: 'no previstas',
      descripcionValores: { vtotal: 'Valor total de la operación', ving: 'Ingreso transferido al tercero', vret: 'Retención transferida al tercero' }
    },
    2275: {
      version: '2', nombre: 'Ingresos no constitutivos de renta ni ganancia ocasional',
      norma: 'R162', donde: 'art. 40 y anexo 30',
      tablaTipos: 'tabla1', llave: ['cpt', 'tdoc', 'nit'], sumaValorTotal: 'tdoc',
      roles: { concepto: 'cpt', tdoc: 'tdoc', nid: 'nit', apl1: 'pap', apl2: 'sap', nom1: 'pno', nom2: 'ono', raz: 'raz', dir: 'dir', dpto: 'dpto', mun: 'mun', pais: 'pais' },
      direccionSiColombia: ['dir', 'dpto', 'mun'],
      valores: ['vrenta'],
      cuantiasMenores: 'no previstas',
      descripcionValores: { vrenta: 'Valor del ingreso no constitutivo' }
    },
    2276: {
      version: '4', nombre: 'Rentas de trabajo y de pensiones',
      norma: 'R162', donde: 'art. 51 y anexo 45',
      tablaTipos: 'tabla2', llave: ['entinfo', 'tdocb', 'nitb', 'identfc', 'tdocpcc', 'nitpcc'], sumaValorTotal: 'tdocb',
      roles: { tdoc: 'tdocb', nid: 'nitb', apl1: 'pap', apl2: 'sap', nom1: 'pno', nom2: 'ono', dir: 'dir', dpto: 'dpto', mun: 'mun', pais: 'pais' },
      direccionSiColombia: ['dir', 'dpto', 'mun'],
      valores: ['pasa', 'paec', 'pabop', 'vaex', 'paho', 'pase', 'paco', 'papre', 'pavia', 'paga', 'patra', 'vapo', 'potro', 'cein', 'ceco', 'auce', 'peju', 'tingbtp', 'apos', 'apof', 'aprais', 'apov', 'apafc', 'apavc', 'vare', 'ivav', 'rfiva', 'pagahuvt', 'vilap'],
      cuantiasMenores: 'no previstas',
      descripcionValores: { tingbtp: 'Total ingresos brutos por rentas de trabajo y pensiones', vare: 'Retención por rentas de trabajo y pensiones', rfiva: 'Retención de IVA', ivav: 'IVA mayor valor del costo o gasto' }
    }
  };

  // ------------------------------------------------------------- conceptos

  // Los conceptos de los formatos que entran en los cruces, con la descripción
  // corta de la resolución. Una prueba revisa que los códigos sean los mismos
  // del prevalidador. Los del 1004, el 1011 y el 2275 se toman del prevalidador.
  //
  // En el 1001, «costo» dice si el valor de la casilla de pagos deducibles entra
  // en el cruce de costos y deducciones (C6). Es criterio de este verificador:
  // quedan fuera los activos, los anticipos, los movimientos de patrimonio y las
  // bases informativas que no son gasto del año.
  const CONCEPTOS = {
    1001: {
      5002: { d: 'Honorarios', costo: true },
      5003: { d: 'Comisiones', costo: true },
      5004: { d: 'Servicios', costo: true },
      5005: { d: 'Arrendamientos', costo: true },
      5006: { d: 'Intereses y rendimientos financieros causados', costo: true },
      5007: { d: 'Compra de activos movibles (inventarios)', costo: true },
      5008: { d: 'Compra de activos fijos', costo: false, porque: 'es activo: el gasto del año es su depreciación' },
      5010: { d: 'Aportes parafiscales (SENA, cajas, ICBF)', costo: true },
      5011: { d: 'Aportes a EPS y riesgos laborales', costo: true },
      5012: { d: 'Aportes obligatorios a fondos de pensiones', costo: true },
      5013: { d: 'Donaciones en dinero', costo: true },
      5014: { d: 'Donaciones en activos diferentes a dinero', costo: true },
      5015: { d: 'Impuestos solicitados como deducción', costo: true },
      5016: { d: 'Los demás costos y deducciones', costo: true },
      5018: { d: 'Primas de reaseguros', costo: true },
      5019: { d: 'Amortizaciones', costo: true },
      5020: { d: 'Activos fijos reales productivos (art. 158-3 E.T.)', costo: false, porque: 'es activo' },
      5023: { d: 'Pagos al exterior por asistencia técnica', costo: true },
      5024: { d: 'Pagos al exterior por marcas', costo: true },
      5025: { d: 'Pagos al exterior por patentes', costo: true },
      5026: { d: 'Pagos al exterior por regalías', costo: true },
      5027: { d: 'Pagos al exterior por servicios técnicos', costo: true },
      5028: { d: 'Devolución de pagos y retenciones de años anteriores', costo: false, porque: 'corrige operaciones de años anteriores', signoRetenciones: -1 },
      5029: { d: 'Gastos pagados por anticipado por compras', costo: false, porque: 'es un anticipo: el gasto llega con la amortización (5019)' },
      5030: { d: 'Gastos pagados por anticipado por honorarios', costo: false, porque: 'es un anticipo' },
      5031: { d: 'Gastos pagados por anticipado por comisiones', costo: false, porque: 'es un anticipo' },
      5032: { d: 'Gastos pagados por anticipado por servicios', costo: false, porque: 'es un anticipo' },
      5033: { d: 'Gastos pagados por anticipado por arrendamientos', costo: false, porque: 'es un anticipo' },
      5034: { d: 'Gastos pagados por anticipado por intereses', costo: false, porque: 'es un anticipo' },
      5035: { d: 'Gastos pagados por anticipado por otros conceptos', costo: false, porque: 'es un anticipo' },
      5044: { d: 'Pagos por loterías, rifas, apuestas y similares', costo: true },
      5045: { d: 'Retención sobre ingresos de tarjetas débito y crédito', costo: false, porque: 'es una base informativa (parágrafo 11)' },
      5046: { d: 'Enajenación de activos fijos de personas naturales ante tránsito', costo: false, porque: 'es una base informativa (parágrafo 11)' },
      5047: { d: 'Siniestros por lucro cesante', costo: true },
      5048: { d: 'Siniestros por daño emergente', costo: true },
      5053: { d: 'Retenciones practicadas a título de timbre', costo: false, porque: 'es una base informativa (parágrafo 11)', timbre: true },
      5054: { d: 'Devolución de retenciones de timbre de años anteriores', costo: false, porque: 'es una base informativa (parágrafo 11)', timbre: true, signoRetenciones: -1 },
      5055: { d: 'Viáticos', costo: true },
      5056: { d: 'Gastos de representación', costo: true },
      5058: { d: 'Aportes, tasas y contribuciones deducibles', costo: true },
      5059: { d: 'Fondo para revalorización de aportes (cooperativas)', costo: false, porque: 'es distribución de excedentes' },
      5060: { d: 'Redención de inversiones (títulos de capitalización)', costo: false, porque: 'es reembolso de capital' },
      5061: { d: 'Utilidades pagadas cuando el beneficiario no es el fideicomitente', costo: false, porque: 'es distribución de utilidades' },
      5063: { d: 'Intereses y rendimientos financieros efectivamente pagados', costo: true },
      5064: { d: 'Devoluciones de saldos de aportes pensionales', costo: false, porque: 'lo reportan los fondos de pensiones' },
      5065: { d: 'Excedentes pensionales de libre disponibilidad', costo: false, porque: 'lo reportan los fondos de pensiones' },
      5066: { d: 'Impuesto nacional al consumo', costo: true },
      5067: { d: 'Pagos al exterior por consultoría', costo: true },
      5068: { d: 'Dividendos 2016 y anteriores (par. 2, art. 49 E.T.)', costo: false, porque: 'es distribución de utilidades' },
      5069: { d: 'Dividendos 2016 y anteriores (num. 3, art. 49 E.T.)', costo: false, porque: 'es distribución de utilidades' },
      5070: { d: 'Dividendos 2017 y siguientes (par. 2, art. 49 E.T.)', costo: false, porque: 'es distribución de utilidades' },
      5071: { d: 'Dividendos 2017 y siguientes (num. 3, art. 49 E.T.)', costo: false, porque: 'es distribución de utilidades' },
      5072: { d: 'Siniestros por seguros de vida', costo: true },
      5073: { d: 'Desembolsos por depósitos judiciales', costo: false, porque: 'es un movimiento de depósitos' },
      5074: { d: 'Reintegros de depósitos judiciales', costo: false, porque: 'es un movimiento de depósitos' },
      5075: { d: 'Regalías y explotación de la propiedad intelectual', costo: true },
      5076: { d: 'Utilidades distribuidas por diferimiento de ingresos (art. 23-1 E.T.)', costo: false, porque: 'es distribución de utilidades' },
      5079: { d: 'Intereses a vinculados en subcapitalización (art. 118-1 E.T.)', costo: true },
      5080: { d: 'Proveedores del exterior: servicios audiovisuales digitales', costo: true },
      5081: { d: 'Proveedores del exterior: servicios por plataformas digitales', costo: true },
      5082: { d: 'Proveedores del exterior: publicidad en línea', costo: true },
      5083: { d: 'Proveedores del exterior: enseñanza a distancia', costo: true },
      5084: { d: 'Proveedores del exterior: derechos de uso de intangibles', costo: true },
      5085: { d: 'Proveedores del exterior: otros servicios digitales', costo: true },
      5086: { d: 'Retención trasladada a terceros por dividendos (art. 242-1 E.T.)', costo: false, porque: 'la retención es de quien pagó el dividendo', fueraDeRetenciones: true },
      5087: { d: 'Puntos premio redimidos que afectan el gasto', costo: true },
      5088: { d: 'Costos o gastos por diferencia en cambio', costo: true, nitInformante: true },
      5089: { d: 'Compra de acciones o cuotas de sociedades que no cotizan', costo: false, porque: 'es inversión' },
      5090: { d: 'Donación de acciones o cuotas de sociedades que no cotizan', costo: false, porque: 'es movimiento de inversiones' },
      5091: { d: 'Cesión de acciones o cuotas de sociedades que no cotizan', costo: false, porque: 'es movimiento de inversiones' },
      5092: { d: 'Pago que es ingreso en especie para el beneficiario (art. 29-1 E.T.)', costo: true },
      5093: { d: 'Donaciones de bebidas ultraprocesadas a bancos de alimentos', costo: true },
      5094: { d: 'Donaciones de comestibles ultraprocesados a bancos de alimentos', costo: true },
      5095: { d: 'Regalías por explotación de hidrocarburos', costo: true },
      5096: { d: 'Regalías por explotación de gas', costo: true },
      5097: { d: 'Regalías por explotación de carbón', costo: true },
      5098: { d: 'Regalías por explotación de otros minerales y piedras preciosas', costo: true },
      5099: { d: 'Regalías por explotación de sal y materiales de construcción', costo: true },
      5100: { d: 'Prima en colocación de acciones y otros conceptos patrimoniales', costo: false, porque: 'es movimiento de patrimonio' },
      5101: { d: 'Gravamen a los movimientos financieros (GMF)', costo: true, gmf: true },
      5102: { d: 'Apoyos educativos con recursos públicos (van en el formato 5247)', costo: false, porque: 'se informa en el formato 5247' }
    },
    1003: {
      1301: { d: 'Retención por salarios y demás pagos laborales' },
      1302: { d: 'Retención por ventas' },
      1303: { d: 'Retención por servicios' },
      1304: { d: 'Retención por honorarios' },
      1305: { d: 'Retención por comisiones' },
      1306: { d: 'Retención por intereses y rendimientos financieros' },
      1307: { d: 'Retención por arrendamientos' },
      1308: { d: 'Retención por otros conceptos' },
      1309: { d: 'Retención en la fuente en el IVA', iva: true },
      1310: { d: 'Retención por dividendos y participaciones' },
      1311: { d: 'Retención por enajenación de activos fijos ante tránsito' },
      1312: { d: 'Retención por ingresos de tarjetas débito y crédito' },
      1313: { d: 'Retención por loterías, rifas y apuestas' },
      1314: { d: 'Retención por impuesto de timbre', timbre: true },
      1320: { d: 'Retención por dividendos recibidos por sociedades nacionales (art. 242-1 E.T.)' }
    },
    1007: {
      4001: { d: 'Ingresos brutos de actividades ordinarias' },
      4002: { d: 'Otros ingresos brutos' },
      4003: { d: 'Ingresos por intereses y rendimientos financieros' },
      4004: { d: 'Intereses de créditos hipotecarios' },
      4005: { d: 'Ingresos a través de consorcios o uniones temporales' },
      4006: { d: 'Ingresos a través de mandato o administración delegada' },
      4007: { d: 'Ingresos a través de exploración de hidrocarburos, gases y minerales' },
      4008: { d: 'Ingresos a través de fiducia' },
      4009: { d: 'Ingresos a través de terceros (beneficiario)' },
      4011: { d: 'Ingresos a través de joint venture' },
      4012: { d: 'Ingresos a través de cuentas en participación' },
      4013: { d: 'Ingresos a través de convenios de cooperación con entidades públicas' },
      4014: { d: 'Ventas con puntos premio redimidos' },
      4015: { d: 'Puntos premio vencidos o no reclamados', nitInformante: true },
      4016: { d: 'Ventas con puntos premio de años anteriores incluidos en el 4015', nitInformante: true },
      4017: { d: 'Recuperaciones de costos y deducciones (arts. 195 a 198 E.T.)' },
      4018: { d: 'Ingresos por diferencia en cambio', nitInformante: true },
      4019: { d: 'Ingresos constitutivos de ganancia ocasional', gananciaOcasional: true },
      4020: { d: 'Venta de acciones o cuotas que no cotizan, que es renta' },
      4021: { d: 'Venta de acciones o cuotas que no cotizan, que es ganancia ocasional', gananciaOcasional: true }
    },
    1008: {
      1315: { d: 'Cuentas por cobrar a clientes' },
      1316: { d: 'Cuentas por cobrar a socios y vinculados' },
      1317: { d: 'Otras cuentas por cobrar' },
      1318: { d: 'Deterioro fiscal de cartera', resta: true }
    },
    1009: {
      2201: { d: 'Pasivos con proveedores' },
      2202: { d: 'Pasivos con vinculados, accionistas y socios' },
      2203: { d: 'Obligaciones financieras' },
      2204: { d: 'Impuestos, gravámenes y tasas' },
      2206: { d: 'Demás pasivos' },
      2207: { d: 'Pasivo por cálculo actuarial', nitInformante: true },
      2208: { d: 'Pasivos respaldados en documento de fecha cierta' },
      2209: { d: 'Pasivos exclusivos de compañías de seguros' },
      2211: { d: 'Pasivos por depósitos judiciales' },
      2212: { d: 'Ingresos diferidos por puntos premio' },
      2213: { d: 'Ingresos diferidos del art. 23-1 E.T.' },
      2214: { d: 'Aportes parafiscales, salud, pensión y cesantías' },
      2215: { d: 'Pasivos laborales consolidados (sin cesantías)' },
      2216: { d: 'Entidades financieras: acreedor nacional no identificado', nitInformante: true },
      2217: { d: 'Entidades financieras: acreedor del exterior no identificado', nitInformante: true }
    },
    1012: {
      1110: { d: 'Saldo de cuentas corrientes y de ahorro en el país', bancos: true },
      1115: { d: 'Saldo de cuentas corrientes y de ahorro en el exterior', bancos: true },
      1200: { d: 'Bonos', inversion: true },
      1201: { d: 'Certificados de depósito', inversion: true },
      1202: { d: 'Títulos', inversion: true },
      1203: { d: 'Derechos fiduciarios', inversion: true },
      1204: { d: 'Demás inversiones', inversion: true },
      1205: { d: 'Acciones o aportes', inversion: true },
      1206: { d: 'Criptoactivos', inversion: true }
    },
    1647: {
      4070: { d: 'Ingresos recibidos para terceros' }
    }
  };

  // --------------------------------------------------------- declaraciones

  // Las cifras que se le piden al contador. Las casillas son las del formulario
  // vigente para el año gravable 2025, con su instructivo.
  const DECLARACIONES = {
    110: {
      nombre: 'Renta (formulario 110)', norma: 'F110',
      periodicidades: ['anual'],
      casillas: [
        { id: 'r36', casilla: '36', nombre: 'Efectivo y equivalentes al efectivo' },
        { id: 'r37', casilla: '37', nombre: 'Inversiones e instrumentos financieros derivados' },
        { id: 'r38', casilla: '38', nombre: 'Cuentas, documentos y arrendamientos financieros por cobrar' },
        { id: 'r45', casilla: '45', nombre: 'Pasivos' },
        { id: 'r58', casilla: '58', nombre: 'Total ingresos brutos' },
        { id: 'r59', casilla: '59', nombre: 'Devoluciones, rebajas y descuentos en ventas' },
        { id: 'r62', casilla: '62', nombre: 'Costos' },
        { id: 'r63', casilla: '63', nombre: 'Gastos de administración' },
        { id: 'r64', casilla: '64', nombre: 'Gastos de distribución y ventas' },
        { id: 'r65', casilla: '65', nombre: 'Gastos financieros' },
        { id: 'r66', casilla: '66', nombre: 'Otros gastos y deducciones' },
        { id: 'r80', casilla: '80', nombre: 'Ingresos por ganancias ocasionales', opcional: true },
        { id: 'r105', casilla: '105', nombre: 'Autorretenciones', opcional: true },
        { id: 'r106', casilla: '106', nombre: 'Otras retenciones' }
      ]
    },
    300: {
      nombre: 'IVA (formulario 300)', norma: 'F300',
      periodicidades: ['anual', 'bimestral', 'cuatrimestral'],
      casillas: [
        { id: 'i67', casilla: '67', nombre: 'Total impuesto generado por operaciones gravadas' },
        { id: 'i81', casilla: '81', nombre: 'Total impuestos descontables' },
        { id: 'i85', casilla: '85', nombre: 'Retenciones por IVA que le practicaron', opcional: true }
      ]
    },
    350: {
      nombre: 'Retenciones (formulario 350)', norma: 'F350',
      periodicidades: ['anual', 'mensual'],
      casillas: [
        { id: 't130', casilla: '130', nombre: 'Total retenciones renta y complementario' },
        { id: 'tAuto', casilla: '68 a 76 y 121 a 128', nombre: 'Autorretenciones (suma de esas casillas)' },
        { id: 't93', casilla: '93', nombre: 'Retención por rentas de trabajo' },
        { id: 't94', casilla: '94', nombre: 'Retención por rentas de pensiones' },
        { id: 't134', casilla: '134', nombre: 'Total retenciones IVA' },
        { id: 't135', casilla: '135', nombre: 'Retenciones impuesto de timbre', opcional: true }
      ]
    }
  };

  const PERIODOS = {
    anual: [{ id: 'A', nombre: 'Año' }],
    bimestral: ['enero y febrero', 'marzo y abril', 'mayo y junio', 'julio y agosto', 'septiembre y octubre', 'noviembre y diciembre']
      .map((n, k) => ({ id: 'B' + (k + 1), nombre: 'Bimestre ' + (k + 1), detalle: n })),
    cuatrimestral: ['enero a abril', 'mayo a agosto', 'septiembre a diciembre']
      .map((n, k) => ({ id: 'C' + (k + 1), nombre: 'Cuatrimestre ' + (k + 1), detalle: n })),
    mensual: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
      .map((n, k) => ({ id: 'M' + String(k + 1).padStart(2, '0'), nombre: n[0].toUpperCase() + n.slice(1), detalle: n }))
  };

  // ---------------------------------------------------------------- cruces

  // Cada línea de un cruce compara una suma de la exógena con una suma de
  // casillas declaradas. Diferencia = declarado - exógena.
  // exogena: [{ formato, atributos, incluir | excluir (conceptos), signo, usarSignosRetenciones }]
  // declarado: [{ campo, signo }]
  const CRUCES = [
    {
      id: 'C1', nombre: 'Retenciones en la fuente practicadas',
      pregunta: '¿Lo que reportó como retenido a terceros en el 1001 y el 2276 es lo que declaró en los 350 del año?',
      lineas: [
        {
          id: 'C1a', nombre: 'Retención de renta a terceros',
          detalle: '1001: retención practicada y asumida de renta, sin timbre ni retención trasladada; las devoluciones (5028) restan. 350: casilla 130 menos autorretenciones y menos casillas 93 y 94.',
          exogena: [{ formato: '1001', atributos: ['retp', 'reta'], excluirMarcas: ['timbre', 'fueraDeRetenciones'], usarSignosRetenciones: true }],
          declarado: [{ campo: 't130' }, { campo: 'tAuto', signo: -1 }, { campo: 't93', signo: -1 }, { campo: 't94', signo: -1 }],
          causas: ['autorretenciones', 'rentas-trabajo-1001', 'retenciones-exceso', 'retencion-asumida', 'declaracion-corregida', 'cuantias-menores']
        },
        {
          id: 'C1b', nombre: 'Retención por rentas de trabajo y pensiones',
          detalle: '2276: retenciones por rentas de trabajo y pensiones. 350: casillas 93 y 94.',
          exogena: [{ formato: '2276', atributos: ['vare'] }],
          declarado: [{ campo: 't93' }, { campo: 't94' }],
          causas: ['rentas-trabajo-1001', 'declaracion-corregida', 'nomina-2276']
        },
        {
          id: 'C1c', nombre: 'Retención por impuesto de timbre', opcional: true,
          detalle: '1001: concepto 5053, menos 5054, en la casilla de retención de renta. 350: casilla 135.',
          exogena: [{ formato: '1001', atributos: ['retp'], incluirMarcas: ['timbre'], usarSignosRetenciones: true }],
          declarado: [{ campo: 't135' }],
          causas: ['timbre', 'declaracion-corregida']
        }
      ],
      norma: 'R162', donde: 'art. 20 (1001), parágrafos 11 y 12, y art. 51 (2276); formulario 350, casillas 93, 94, 129, 130 y 135'
    },
    {
      id: 'C2', nombre: 'Retención de IVA',
      pregunta: '¿La retención de IVA del 1001 y del 2276 es la que declaró en los 350?',
      lineas: [
        {
          id: 'C2', nombre: 'Retención de IVA practicada',
          detalle: '1001: retención de IVA a responsables y a no domiciliados; las devoluciones (5028) restan. 2276: retención de IVA. 350: casilla 134.',
          exogena: [{ formato: '1001', atributos: ['comun', 'ndom'], usarSignosRetenciones: true }, { formato: '2276', atributos: ['rfiva'] }],
          declarado: [{ campo: 't134' }],
          causas: ['reteiva-exceso', 'reglas-formato', 'declaracion-corregida']
        }
      ],
      norma: 'R162', donde: 'art. 20 y art. 51; formulario 350, casillas 131 a 134'
    },
    {
      id: 'C3', nombre: 'IVA descontable',
      pregunta: '¿El IVA descontable del 1005 es el que declaró en los 300 del año?',
      lineas: [
        {
          id: 'C3', nombre: 'IVA descontable',
          detalle: '1005: impuesto descontable más IVA por devoluciones en ventas. 300: casilla 81.',
          exogena: [{ formato: '1005', atributos: ['vimp', 'ivade'] }],
          declarado: [{ campo: 'i81' }],
          causas: ['iva-al-costo', 'fechas', 'ajuste-descontables', 'prorrateo', 'declaracion-corregida']
        }
      ],
      norma: 'R188', donde: 'art. 23 de la 000162 y anexo 21; formulario 300, casillas 77 a 81'
    },
    {
      id: 'C4', nombre: 'IVA generado',
      pregunta: '¿El IVA generado del 1006 es el que declaró en los 300 del año?',
      lineas: [
        {
          id: 'C4', nombre: 'IVA generado',
          detalle: '1006: impuesto generado más IVA recuperado en devoluciones en compras. El impuesto al consumo no entra: va en el formulario 310. 300: casilla 67.',
          exogena: [{ formato: '1006', atributos: ['imp', 'iva'] }],
          declarado: [{ campo: 'i67' }],
          causas: ['ventas-sin-comprador', 'retiro-inventarios', 'impuesto-consumo', 'declaracion-corregida']
        }
      ],
      norma: 'R162', donde: 'art. 24 y anexo 22; formulario 300, casillas 58 a 67'
    },
    {
      id: 'C5', nombre: 'Ingresos',
      pregunta: '¿Los ingresos del 1007 son los que declaró en la renta?',
      lineas: [
        {
          id: 'C5a', nombre: 'Ingresos brutos',
          detalle: '1007: ingresos brutos, sin los de ganancia ocasional (4019 y 4021). 110: casilla 58.',
          exogena: [{ formato: '1007', atributos: ['ibru'], excluirMarcas: ['gananciaOcasional'] }],
          declarado: [{ campo: 'r58' }],
          causas: ['ingresos-terceros', 'realizacion-fiscal', 'ingresos-sin-tercero', 'terceros', 'declaracion-corregida']
        },
        {
          id: 'C5b', nombre: 'Devoluciones, rebajas y descuentos',
          detalle: '1007: devoluciones, rebajas y descuentos. 110: casilla 59.',
          exogena: [{ formato: '1007', atributos: ['dred'] }],
          declarado: [{ campo: 'r59' }],
          causas: ['fechas', 'declaracion-corregida']
        },
        {
          id: 'C5c', nombre: 'Ingresos por ganancias ocasionales', opcional: true,
          detalle: '1007: conceptos 4019 y 4021. 110: casilla 80.',
          exogena: [{ formato: '1007', atributos: ['ibru'], incluirMarcas: ['gananciaOcasional'] }],
          declarado: [{ campo: 'r80' }],
          causas: ['ganancia-ocasional', 'declaracion-corregida']
        }
      ],
      norma: 'R162', donde: 'art. 22 y anexo 20; formulario 110, casillas 58, 59 y 80'
    },
    {
      id: 'C6', nombre: 'Costos y deducciones',
      pregunta: '¿Los pagos deducibles del 1001 y lo pagado a trabajadores en el 2276 explican los costos y gastos de la renta?',
      lineas: [
        {
          id: 'C6', nombre: 'Costos y gastos deducibles',
          detalle: '1001: pagos deducibles de los conceptos de costo o gasto, más el IVA llevado al costo deducible. 2276: total de ingresos brutos por rentas de trabajo y pensiones, más el IVA llevado al costo. 110: casillas 62 a 66.',
          exogena: [
            { formato: '1001', atributos: ['pago'], incluirMarcas: ['costo'] },
            { formato: '1001', atributos: ['ided'] },
            { formato: '2276', atributos: ['tingbtp', 'ivav'] }
          ],
          declarado: [{ campo: 'r62' }, { campo: 'r63' }, { campo: 'r64' }, { campo: 'r65' }, { campo: 'r66' }],
          causas: ['partidas-sin-tercero', 'inventarios', 'activos-anticipos', 'no-deducibles', 'fechas', 'terceros', 'cuantias-menores', 'declaracion-corregida']
        }
      ],
      norma: 'R162', donde: 'art. 20 (parágrafos 4 y 12) y art. 51; formulario 110, casillas 62 a 67',
      criterio: 'Qué conceptos del 1001 son costo o gasto del año está en la lista de conceptos de este archivo (campo «costo»).'
    },
    {
      id: 'C7', nombre: 'Retenciones que le practicaron',
      pregunta: '¿Las retenciones que le practicaron, según el 1003, son las que imputó en la renta?',
      lineas: [
        {
          id: 'C7a', nombre: 'Retenciones de renta que le practicaron',
          detalle: '1003: retenciones de renta, sin la de IVA (1309) ni la de timbre (1314). 110: casilla 106.',
          exogena: [{ formato: '1003', atributos: ['ret'], excluirMarcas: ['iva', 'timbre'] }],
          declarado: [{ campo: 'r106' }],
          causas: ['certificados', 'otro-reporto', 'autorretenciones-renta', 'declaracion-corregida']
        },
        {
          id: 'C7b', nombre: 'Retenciones de IVA que le practicaron', opcional: true,
          detalle: '1003: concepto 1309. 300: casilla 85.',
          exogena: [{ formato: '1003', atributos: ['ret'], incluirMarcas: ['iva'] }],
          declarado: [{ campo: 'i85' }],
          causas: ['certificados', 'otro-reporto', 'fechas']
        }
      ],
      norma: 'R162', donde: 'art. 21 y anexo 19; formulario 110, casilla 106; formulario 300, casilla 85'
    },
    {
      id: 'C8', nombre: 'Saldos al 31 de diciembre',
      pregunta: '¿Los saldos con terceros del 1008, el 1009 y el 1012 son los del patrimonio de la renta?',
      lineas: [
        {
          id: 'C8a', nombre: 'Cuentas por cobrar',
          detalle: '1008: conceptos 1315, 1316 y 1317, menos el deterioro fiscal (1318). 110: casilla 38.',
          exogena: [{ formato: '1008', atributos: ['sal'], excluirMarcas: ['resta'] }, { formato: '1008', atributos: ['sal'], incluirMarcas: ['resta'], signo: -1 }],
          declarado: [{ campo: 'r38' }],
          causas: ['cuantias-menores', 'deterioro', 'valor-fiscal', 'declaracion-corregida']
        },
        {
          id: 'C8b', nombre: 'Pasivos',
          detalle: '1009: todos los saldos por pagar. 110: casilla 45.',
          exogena: [{ formato: '1009', atributos: ['sal'] }],
          declarado: [{ campo: 'r45' }],
          causas: ['cuantias-menores', 'pasivos-sin-tercero', 'valor-fiscal', 'declaracion-corregida']
        },
        {
          id: 'C8c', nombre: 'Bancos frente al efectivo',
          detalle: '1012: saldos de cuentas corrientes y de ahorro (1110 y 1115). 110: casilla 36, que incluye también la caja.',
          exogena: [{ formato: '1012', atributos: ['val'], incluirMarcas: ['bancos'] }],
          declarado: [{ campo: 'r36' }],
          causas: ['caja', 'valor-fiscal', 'declaracion-corregida']
        },
        {
          id: 'C8d', nombre: 'Inversiones',
          detalle: '1012: conceptos 1200 a 1206. 110: casilla 37.',
          exogena: [{ formato: '1012', atributos: ['val'], incluirMarcas: ['inversion'] }],
          declarado: [{ campo: 'r37' }],
          causas: ['valor-fiscal', 'declaracion-corregida']
        }
      ],
      norma: 'R162', donde: 'arts. 25, 26, 29, 30 y 31; formulario 110, casillas 36, 37, 38 y 45'
    }
  ];

  // --------------------------------------------------------- causas típicas

  // Qué revisar cuando un cruce no cuadra. Las generales salen del documento
  // de diagnóstico de Andrés (02, sección 1.3); las propias de cada cruce, de la
  // norma y de los instructivos de los formularios.
  const CAUSAS = {
    'terceros': { titulo: 'Terceros mal identificados', texto: 'El mismo proveedor con cédula y con NIT, tipos de documento errados o nombres repetidos con números distintos. No cambia el total, pero sí lo que cruzan los terceros.' },
    'cuantias-menores': { titulo: 'Cuantías menores mal usadas', texto: 'Pagos con retención metidos en el NIT 222222222, o topes de 3 y 12 UVT mal aplicados. Los pagos con retención se reportan siempre con su tercero (art. 20, parágrafo 1).' },
    'fechas': { titulo: 'Fechas de causación y de pago', texto: 'Facturas de diciembre causadas en enero, costos causados y no pagados, o IVA descontable tomado en un periodo posterior.' },
    'partidas-sin-tercero': { titulo: 'Partidas que no van en la exógena', texto: 'Depreciaciones, deterioros, pérdidas, provisiones y deducciones especiales están en la renta y no tienen tercero en el 1001. Si las conoce, regístrelas como explicación.' },
    'inventarios': { titulo: 'Variación de inventarios', texto: 'El 1001 reporta las compras (concepto 5007) y la renta, el costo de ventas. La diferencia entre el inventario inicial y el final explica parte del cruce.' },
    'activos-anticipos': { titulo: 'Activos y anticipos', texto: 'Las compras de activos fijos (5008 y 5020) y los gastos pagados por anticipado (5029 a 5035) no son gasto del año: el verificador ya los deja fuera. Si los reportó en otro concepto, aparecen aquí.' },
    'no-deducibles': { titulo: 'Pagos no deducibles', texto: 'Lo que no se pidió como costo o deducción va en la casilla de pagos no deducibles del 1001 y no entra en la casilla 67 de la renta (art. 20, parágrafo 4).' },
    'reglas-formato': { titulo: 'Reglas del formato mal aplicadas', texto: 'Base del reteIVA, GMF reportado a nombre de la DIAN, IVA llevado al costo en dos formatos o pagos de consorcios. Vea las revisiones de los XML.' },
    'declaracion-corregida': { titulo: 'Declaración corregida', texto: 'Si corrigió una declaración, use la última versión válida. Cruzar contra una versión vieja da una diferencia que no existe.' },
    'otro-reporto': { titulo: 'Lo que otro reportó', texto: 'El 1003 sale de los certificados de quien le retuvo. Si el tercero reportó mal, el cliente no lo cambia: hay que pedírselo al tercero.' },
    'autorretenciones': { titulo: 'Autorretenciones', texto: 'Las autorretenciones van en el 350 (casillas 68 a 76 y 121 a 128) y no en el 1001. Escríbalas en su casilla para que el cruce las reste.' },
    'autorretenciones-renta': { titulo: 'Autorretenciones en la renta', texto: 'La casilla 106 lleva solo las retenciones que le practicaron; las autorretenciones van en la 105.' },
    'rentas-trabajo-1001': { titulo: 'Pagos laborales en el formato equivocado', texto: 'Las rentas de trabajo y de pensiones, con su retención, se reportan solo en el 2276 y no en el 1001 (art. 20, parágrafo 12).' },
    'nomina-2276': { titulo: 'Nómina y 2276', texto: 'Revise que el 2276 tenga a todos los trabajadores del año y que la retención por empleado sume lo declarado mes a mes.' },
    'retenciones-exceso': { titulo: 'Retenciones en exceso o anuladas', texto: 'Lo que restó en la casilla 129 del 350 debe verse en el 1001 como devolución (concepto 5028) o como menor retención.' },
    'retencion-asumida': { titulo: 'Retención asumida', texto: 'La retención que la empresa asumió va en su casilla del 1001 (asumida) y también se declara en el 350.' },
    'timbre': { titulo: 'Retención de timbre', texto: 'Va en el 1001 con el concepto 5053, en la casilla de retención de renta, y en el 350 en la casilla 135 (art. 20, parágrafo 11).' },
    'reteiva-exceso': { titulo: 'Retenciones de IVA en exceso', texto: 'Lo restado en la casilla 133 del 350 por retenciones en exceso o anuladas debe verse también en el 1001.' },
    'iva-al-costo': { titulo: 'IVA llevado al costo', texto: 'El IVA que no se descontó y se llevó al costo no va en el impuesto descontable del 1005: va en su casilla propia del 1005 y en el 1001.' },
    'ajuste-descontables': { titulo: 'Ajuste de descontables', texto: 'La casilla 80 del 300 (pérdidas, hurto o castigo de inventarios) resta descontables y no tiene tercero en el 1005.' },
    'prorrateo': { titulo: 'Prorrateo del IVA', texto: 'Si hay operaciones gravadas y excluidas, el IVA descontable se prorratea (art. 490 E.T.) y la parte no descontable va al costo.' },
    'ventas-sin-comprador': { titulo: 'Ventas sin comprador identificado', texto: 'Van acumuladas en un solo registro con el NIT 222222222 (art. 24). Si se omitió ese registro, el 1006 queda corto.' },
    'retiro-inventarios': { titulo: 'IVA por retiro de inventarios', texto: 'El IVA de inventarios retirados para consumo, muestras o donaciones (casilla 65 del 300) no tiene comprador. Si lo conoce, regístrelo como explicación.' },
    'impuesto-consumo': { titulo: 'Impuesto al consumo', texto: 'El impuesto nacional al consumo va en el 1006 en su propia casilla y se declara en el formulario 310, no en el 300.' },
    'ingresos-terceros': { titulo: 'Ingresos para terceros', texto: 'Lo recibido para terceros va en el 1647 y no es ingreso propio en el 1007 ni en la renta (art. 28).' },
    'realizacion-fiscal': { titulo: 'Ingreso contable frente a fiscal', texto: 'La renta usa la realización fiscal (art. 28 E.T.): ingresos diferidos, valoraciones y otros ajustes hacen que el contable y el fiscal difieran.' },
    'ingresos-sin-tercero': { titulo: 'Ingresos reportados con el NIT del informante', texto: 'Recuperaciones sin tercero (4017), diferencia en cambio (4018) y puntos premio (4015 y 4016) se reportan con el NIT de la empresa; revise que estén.' },
    'ganancia-ocasional': { titulo: 'Ganancias ocasionales', texto: 'Los conceptos 4019 y 4021 del 1007 van en la casilla 80 de la renta, no en la 58.' },
    'certificados': { titulo: 'Certificados de retención', texto: 'El 1003 se arma con los certificados recibidos. Si falta uno, o una retención es de otro año, aparece la diferencia.' },
    'deterioro': { titulo: 'Deterioro de cartera', texto: 'La casilla 38 es el valor fiscal, neto del deterioro fiscal; en el 1008 ese deterioro va con el concepto 1318 y el verificador lo resta.' },
    'valor-fiscal': { titulo: 'Valor fiscal frente a contable', texto: 'El patrimonio de la renta va a valor fiscal; las partidas en moneda extranjera y las valoraciones cambian el saldo frente al contable.' },
    'pasivos-sin-tercero': { titulo: 'Pasivos sin tercero', texto: 'Las provisiones no van en la casilla 45. Revise también los pasivos estimados que tenga en el 1009.' },
    'caja': { titulo: 'Dinero en caja', texto: 'La casilla 36 incluye la caja; el 1012 solo los saldos en bancos. Si conoce el saldo de caja, regístrelo como explicación.' }
  };

  // ------------------------------------------------------------ revisiones

  // Las revisiones internas de los XML. La lógica está en verificador.js; aquí,
  // qué revisa cada una, su gravedad y su fuente.
  const REVISIONES = {
    'xml-mal-formado': { titulo: 'XML bien formado', gravedad: 'error', norma: 'R162', donde: 'anexos técnicos, numeral 2: XML 1.0 bien formado y válido según el esquema' },
    'codificacion': { titulo: 'Codificación ISO-8859-1', gravedad: 'advertencia', norma: 'R162', donde: 'anexos técnicos, numeral 2: alfabeto latino número 1, ISO-8859-1' },
    'formato-desconocido': { titulo: 'Formato que el verificador no revisa', gravedad: 'informacion', norma: 'R162', donde: 'art. 66' },
    'version': { titulo: 'Versión del formato para el año gravable 2025', gravedad: 'error', norma: 'C10627', donde: 'el AG 2025 se rige por la 000162 de 2023 y la 000188 de 2024' },
    'estructura': { titulo: 'Estructura según el esquema XSD', gravedad: 'error', norma: 'PREVALIDADOR', donde: 'carpeta xsd del prevalidador; anexos técnicos de cada formato' },
    'cabecera': { titulo: 'Cabecera del archivo', gravedad: 'error', norma: 'R162', donde: 'anexos técnicos, numeral 2.1' },
    'anio': { titulo: 'Archivo del año gravable 2025', gravedad: 'error', norma: 'R162', donde: 'anexos técnicos, numeral 2.1: fechas inicial y final de los registros' },
    'cantidad-registros': { titulo: 'Cantidad de registros', gravedad: 'error', norma: 'R162', donde: 'anexos técnicos, numeral 2.1: CantReg y máximo de 5.000 registros por archivo' },
    'valor-total': { titulo: 'Valor total de la cabecera', gravedad: 'advertencia', norma: 'R162', donde: 'anexos técnicos, numeral 2.1: ValorTotal es la suma de un atributo de los registros' },
    'nombre-archivo': { titulo: 'Nombre del archivo', gravedad: 'advertencia', norma: 'R162', donde: 'anexos técnicos, numeral 1: Dmuisca_ccmmmmmvvaaaacccccccc.xml' },
    'archivo-repetido': { titulo: 'Archivo cargado dos veces', gravedad: 'informacion' },
    'envio-repetido': { titulo: 'Número de envío repetido', gravedad: 'advertencia', norma: 'R162', donde: 'anexos técnicos, numeral 2.1: NumEnvio consecutivo' },
    'reemplazo': { titulo: 'Inserción y reemplazo del mismo formato', gravedad: 'advertencia', norma: 'R162', donde: 'anexos técnicos, numeral 1: concepto 01 inserción, 02 reemplazo' },
    'dv': { titulo: 'Dígito de verificación del NIT', gravedad: 'error', norma: 'R162', donde: 'anexos técnicos: «Para el tipo de documento 31 – Nit, si se conoce debe diligenciarse»; cálculo de módulo 11 de la DIAN' },
    'tipo-documento': { titulo: 'Tipo de documento válido', gravedad: 'error', norma: 'R162', donde: 'art. 66, tablas 1 y 2 de tipos de documento' },
    'numero-identificacion': { titulo: 'Número de identificación', gravedad: 'advertencia', norma: 'PREVALIDADOR', donde: 'validaciones del prevalidador: número sin letras salvo pasaportes y documentos extranjeros' },
    'nit-especial': { titulo: 'NIT especiales (222222222 y 444444001 a 444449999)', gravedad: 'advertencia', norma: 'R162', donde: 'arts. 20 a 28: se usan con el tipo de documento 43' },
    'duplicados': { titulo: 'Registros repetidos', gravedad: 'error', norma: 'R162', donde: 'anexos técnicos: los campos de la llave no se repiten en el mismo año' },
    'cuantias-menores': { titulo: 'Cuantías menores', gravedad: 'error', norma: 'R162', donde: 'art. 20, parágrafo 1: los pagos con retención se reportan con su tercero' },
    'cuantias-menores-formato': { titulo: 'Cuantías menores en un formato que no las prevé', gravedad: 'advertencia', norma: 'R162', donde: 'arts. 19, 21, 23, 28 a 31 y 51' },
    'gmf': { titulo: 'GMF a nombre de la entidad financiera', gravedad: 'error', norma: 'R188', donde: 'art. 3, que agrega el parágrafo 16 al art. 20 de la 000162: el GMF se reporta con el NIT del agente de retención del gravamen' },
    'base-reteiva': { titulo: 'Base del reteIVA (concepto 1309)', gravedad: 'advertencia', norma: 'R233', donde: 'la 000233 aclara, para el AG 2026, que la base del 1309 es el valor del IVA; para el AG 2025 es criterio de este verificador', criterio: true },
    'iva-costo': { titulo: 'IVA llevado al costo en el 1001 y en el 1005', gravedad: 'advertencia', norma: 'R162', donde: 'art. 20, parágrafo 3, y art. 23: en el AG 2025 ese IVA va en los dos formatos', criterio: true },
    'direccion': { titulo: 'Dirección, departamento y municipio', gravedad: 'advertencia', norma: 'R162', donde: 'anexos técnicos: si el país es Colombia, siempre deben diligenciarse' },
    'codigos-dane': { titulo: 'Códigos de país, departamento y municipio', gravedad: 'error', norma: 'PREVALIDADOR', donde: 'tablas de países, departamentos y municipios del prevalidador' },
    'concepto': { titulo: 'Concepto válido para el formato', gravedad: 'error', norma: 'R162', donde: 'tablas de conceptos de cada artículo (y del prevalidador)' },
    'nombre-tercero': { titulo: 'Nombre o razón social del tercero', gravedad: 'advertencia', norma: 'R162', donde: 'anexos técnicos: apellido y nombre para personas naturales; razón social para personas jurídicas' },
    'valores-en-cero': { titulo: 'Registros con todos los valores en cero', gravedad: 'advertencia', norma: 'PREVALIDADOR', donde: 'validaciones del prevalidador: las casillas de valor no pueden ir todas en cero' },
    'nit-informante': { titulo: 'Conceptos que van con el NIT del informante', gravedad: 'advertencia', norma: 'R162', donde: 'arts. 20, 22 y 25 (conceptos 5088, 4015, 4016, 4018, 2207, 2216 y 2217)' },
    'formatos-faltantes': { titulo: 'Formatos que faltan según las declaraciones', gravedad: 'advertencia', norma: 'R162', donde: 'arts. 19 a 26, 29 y 51', criterio: true }
  };

  // Formatos que se esperan cuando una cifra declarada es mayor que cero.
  const FORMATOS_ESPERADOS = [
    { formato: '1001', cuando: ['t130', 't134'], restar: ['tAuto', 't93', 't94'], texto: 'Declaró retenciones a terceros en el 350' },
    { formato: '2276', cuando: ['t93', 't94'], texto: 'Declaró retenciones por rentas de trabajo o pensiones en el 350' },
    { formato: '1003', cuando: ['r106'], texto: 'Imputó retenciones que le practicaron en la renta' },
    { formato: '1005', cuando: ['i81'], texto: 'Declaró impuestos descontables en el 300' },
    { formato: '1006', cuando: ['i67'], texto: 'Declaró IVA generado en el 300' },
    { formato: '1007', cuando: ['r58'], texto: 'Declaró ingresos en la renta' },
    { formato: '1008', cuando: ['r38'], minimoUVT: 12, texto: 'Declaró cuentas por cobrar en la renta' },
    { formato: '1009', cuando: ['r45'], minimoUVT: 12, texto: 'Declaró pasivos en la renta' },
    { formato: '1012', cuando: ['r36', 'r37'], texto: 'Declaró efectivo o inversiones en la renta' },
    { formato: '1010', personaJuridica: true, texto: 'Las personas jurídicas reportan a sus socios o accionistas (art. 19)' }
  ];

  return {
    ANIO_GRAVABLE, NORMAS, PARAMETROS, FORMATOS, CONCEPTOS, DECLARACIONES, PERIODOS,
    CRUCES, CAUSAS, REVISIONES, FORMATOS_ESPERADOS, TIPOS_PERSONA_NATURAL, TIPOS_NUMERICOS
  };
});
