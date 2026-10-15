/*
 * Verificador de exógena: estructura de los formatos del año gravable 2025.
 *
 * ARCHIVO GENERADO por herramientas/datos-oficiales.js a partir de los esquemas
 * XSD oficiales de norma/xsd-ag2025 (Prevalidador Tributario Informantes AG2025
 * v3.3.0-26 de la DIAN; coinciden con los anexos técnicos de la Resolución
 * 000162 de 2023 y de la Resolución 000188 de 2024). No se edita a mano.
 */
(function (raiz, fabrica) {
  'use strict';
  var modulo = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else raiz.ExoEsquemas = modulo;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
   "1001-v10": {
    "formato": "1001",
    "version": "10",
    "elemento": "pagos",
    "maxRegistros": 5000,
    "documentacion": "Pagos o Abonos en Cuenta y Retenciones practicadas - Formato 1001 v10",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1001",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "10"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del informado"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del informado"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del informado"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del informado"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Informado"
     },
     {
      "nombre": "dir",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 200,
      "descripcion": "Dirección"
     },
     {
      "nombre": "dpto",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Código del Departamento"
     },
     {
      "nombre": "mun",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 999,
      "descripcion": "Código del Municipio"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "País de Residencia o domicilio"
     },
     {
      "nombre": "pago",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pago o Abono en cuenta"
     },
     {
      "nombre": "pnded",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pago o abono en cuenta NO deducible"
     },
     {
      "nombre": "ided",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "IVA mayor valor del costo o gasto deducible"
     },
     {
      "nombre": "inded",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "IVA mayor valor del costo o gasto no deducible"
     },
     {
      "nombre": "retp",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Retención en la fuente practicada Renta"
     },
     {
      "nombre": "reta",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Retención en la fuente asumida Renta"
     },
     {
      "nombre": "comun",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Retención en la fuente practicada Iva Regimen comun"
     },
     {
      "nombre": "ndom",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Retención en la fuente practicada Iva no domiciliados"
     }
    ]
   },
   "1003-v7": {
    "formato": "1003",
    "version": "7",
    "elemento": "rets",
    "maxRegistros": null,
    "documentacion": "Elemento que encapsula la información del formulario 1003 RETENCIONES EN LA FUENTE QUE LE PRACTICARON",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1003",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "7"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "dv",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 9,
      "descripcion": "Digito de Verificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del informado"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del informado"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del informado"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del informado"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Informado"
     },
     {
      "nombre": "dir",
      "requerido": true,
      "base": "string",
      "minLargo": 8,
      "maxLargo": 200,
      "descripcion": "Dirección"
     },
     {
      "nombre": "dpto",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Departamento"
     },
     {
      "nombre": "mcpo",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 999,
      "descripcion": "Municipio"
     },
     {
      "nombre": "valor",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Valor acumulado del pago o abono sujeto a Retención en la fuente"
     },
     {
      "nombre": "ret",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Retención en la fuente que le practicaron"
     }
    ]
   },
   "1004-v8": {
    "formato": "1004",
    "version": "8",
    "elemento": "descuentos",
    "maxRegistros": null,
    "documentacion": "Elemento que encapsula la información del formulario 1004 DESCUENTOS TRIBUTARIOS SOLICITADOS",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1004",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "8"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{0,4}",
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{0,2}",
      "descripcion": "Tipo de documento del Tercero"
     },
     {
      "nombre": "nit",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 1,
      "maxLargo": 20,
      "descripcion": "Número de Identificación del Tercero"
     },
     {
      "nombre": "pap",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido"
     },
     {
      "nombre": "sap",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido"
     },
     {
      "nombre": "pno",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre"
     },
     {
      "nombre": "ono",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social"
     },
     {
      "nombre": "dir",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 250,
      "descripcion": "Dirección"
     },
     {
      "nombre": "dpto",
      "requerido": false,
      "base": "string",
      "patron": "[0-9]{0,2}",
      "descripcion": "Código departamento"
     },
     {
      "nombre": "mun",
      "requerido": false,
      "base": "string",
      "patron": "[0-9]{0,3}",
      "descripcion": "Código Código municipio"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "string",
      "patron": "[0-9]{1,4}",
      "descripcion": "Código País"
     },
     {
      "nombre": "email",
      "requerido": false,
      "base": "string",
      "patron": "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~\\-]+@[A-Za-z0-9]+([.-][A-Za-z0-9]+)*\\.[A-Za-z]{2,3}",
      "minLargo": 0,
      "maxLargo": 50,
      "descripcion": "Correo Electrónico"
     },
     {
      "nombre": "vdesc",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor del descuento tributario total del año"
     },
     {
      "nombre": "vdescsol",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor del descuento tributario efectivamente solicitado en el año gravable"
     }
    ]
   },
   "1005-v8": {
    "formato": "1005",
    "version": "8",
    "elemento": "impventas",
    "maxRegistros": null,
    "documentacion": "Impuesto a las Ventas por Pagar (Descontable) - Formato 1005 v8",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1005",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "8"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "dv",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 9,
      "descripcion": "Digito de Verificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del informado"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del informado"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del informado"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del informado"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Informado"
     },
     {
      "nombre": "vimp",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,18}",
      "descripcion": "Impuesto descontable"
     },
     {
      "nombre": "ivade",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,18}",
      "descripcion": "IVA resultante por devoluciones en ventas anuladas, rescindidas o resueltas"
     },
     {
      "nombre": "ivavcg",
      "requerido": false,
      "base": "double",
      "patron": "[0-9]{0,18}",
      "descripcion": "IVA resultante por devoluciones en ventas anuladas, rescindidas o resueltas"
     }
    ]
   },
   "1006-v8": {
    "formato": "1006",
    "version": "8",
    "elemento": "impoventas",
    "maxRegistros": null,
    "documentacion": "Impuestos a las Ventas por Pagar (Generado) - Formato 1006 v8",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1006",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "8"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "dv",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 9,
      "descripcion": "Digito de Verificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del informado"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del informado"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del informado"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del informado"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Informado"
     },
     {
      "nombre": "imp",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Impuesto generado"
     },
     {
      "nombre": "iva",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "IVA recuperado en devoluciones en compras anuladas, rescindidas o resueltas"
     },
     {
      "nombre": "icon",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Impuesto al consumo"
     }
    ]
   },
   "1007-v9": {
    "formato": "1007",
    "version": "9",
    "elemento": "ingresos",
    "maxRegistros": null,
    "documentacion": "INGRESOS RECIBIDOS - Formato 1007v9",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1007",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "9"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del informado"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del informado"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del informado"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del informado"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Informado"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "País de Residencia o domicilio"
     },
     {
      "nombre": "ibru",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Ingresos brutos recibidos"
     },
     {
      "nombre": "dred",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Devoluciones, rebajas y descuentos"
     }
    ]
   },
   "1008-v7": {
    "formato": "1008",
    "version": "7",
    "elemento": "saldoscc",
    "maxRegistros": null,
    "documentacion": "Elemento que encapsula la información del formulario 1008 SALDOS DE CUENTAS POR COBRAR AL 31 DE DICIEMBRE",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1008",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "7"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "dv",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 9,
      "descripcion": "Digito de Verificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del Deudor"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del Deudor"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del Deudor"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del Deudor"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Deudor"
     },
     {
      "nombre": "dir",
      "requerido": false,
      "base": "string",
      "minLargo": 2,
      "maxLargo": 200,
      "descripcion": "Dirección"
     },
     {
      "nombre": "dpto",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Código del Departamento"
     },
     {
      "nombre": "mun",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 999,
      "descripcion": "Código del Municipio"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "País de Residencia o domicilio"
     },
     {
      "nombre": "sal",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Saldo cuentas por Cobrar al 31 de diciembre"
     }
    ]
   },
   "1009-v7": {
    "formato": "1009",
    "version": "7",
    "elemento": "saldoscp",
    "maxRegistros": null,
    "documentacion": "Elemento que encapsula la información del formulario 1009 SALDOS DE CUENTAS POR PAGAR AL 31 DE DICIEMBRE",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1009",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "7"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "dv",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 9,
      "descripcion": "Digito de Verificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del Deudor"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del Deudor"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del Deudor"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del Deudor"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Deudor"
     },
     {
      "nombre": "dir",
      "requerido": false,
      "base": "string",
      "minLargo": 2,
      "maxLargo": 200,
      "descripcion": "Dirección"
     },
     {
      "nombre": "dpto",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Código del Departamento"
     },
     {
      "nombre": "mun",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 999,
      "descripcion": "Código del Municipio"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "País de Residencia o domicilio"
     },
     {
      "nombre": "sal",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Saldo cuentas por pagar al 31 de diciembre"
     }
    ]
   },
   "1010-v9": {
    "formato": "1010",
    "version": "9",
    "elemento": "socios",
    "maxRegistros": null,
    "documentacion": "Información de socios, accionistas, comuneros y/o cooperados - Formato 1010 v9",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1010",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "9"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "dv",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 9,
      "descripcion": "Digito de Verificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del Accionista"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del Accionista"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del Accionista"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del Accionista"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Accionista"
     },
     {
      "nombre": "dir",
      "requerido": false,
      "base": "string",
      "minLargo": 2,
      "maxLargo": 200,
      "descripcion": "Dirección"
     },
     {
      "nombre": "dpto",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Código del Departamento"
     },
     {
      "nombre": "mun",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 999,
      "descripcion": "Código del Municipio"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "País de Residencia o domicilio"
     },
     {
      "nombre": "valnom",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor nominal de la acción, aporte o derecho social a diciembre 31"
     },
     {
      "nombre": "valprm",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor prima en colocación de acciones a diciembre 31"
     },
     {
      "nombre": "por",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Porcentaje de participación"
     },
     {
      "nombre": "dec",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Porcentaje de participación (posición decimal)"
     }
    ]
   },
   "1011-v6": {
    "formato": "1011",
    "version": "6",
    "elemento": "decl",
    "maxRegistros": null,
    "documentacion": "Elemento que encapsula la información del formulario 1011 INFORMACION DE LAS DECLARACIONES TRIBUTARIAS",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1011",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "6"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "Concepto"
     },
     {
      "nombre": "sal",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Saldos al 31 de diciembre"
     }
    ]
   },
   "1012-v7": {
    "formato": "1012",
    "version": "7",
    "elemento": "dectri",
    "maxRegistros": null,
    "documentacion": "Elemento que encapsula la información del formulario 1012 INFORMACION DE LAS DECLARACIONES TRIBUTARIAS, ACCIONES Y APORTES E INVERSIONES EN BONOS, CERTIFICADOS, TITULOS Y DEMAS INVERSIONES TRIBUTARIAS",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1012",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "7"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 99,
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Número de Identificación"
     },
     {
      "nombre": "dv",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 9,
      "descripcion": "Digito de Verificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del Informado"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del Informado"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre del Informado"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres del Informado"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social del Informado"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "int",
      "min": 0,
      "max": 9999,
      "descripcion": "País de Residencia o domicilio"
     },
     {
      "nombre": "val",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,20}",
      "descripcion": "Valor al 31 de diciembre"
     }
    ]
   },
   "1647-v2": {
    "formato": "1647",
    "version": "2",
    "elemento": "ingresos",
    "maxRegistros": null,
    "documentacion": "Elemento que encapsula la información del formulario 1647v1Información de Ingresos Recibidos para Terceros",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "1647",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "2"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "long"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "con",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{1,4}",
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{1,2}",
      "descripcion": "Tipo de Documento"
     },
     {
      "nombre": "nid",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 1,
      "maxLargo": 20,
      "descripcion": "Número de Identificación del informado"
     },
     {
      "nombre": "dv",
      "requerido": false,
      "base": "int",
      "min": 0,
      "max": 9,
      "descripcion": "Digito de Verificación"
     },
     {
      "nombre": "apl1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido del informado"
     },
     {
      "nombre": "apl2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido del informado"
     },
     {
      "nombre": "nom1",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer nombre del informado"
     },
     {
      "nombre": "nom2",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros nombres del informado"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón social del informado"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "string",
      "patron": "[0-9]{0,4}",
      "descripcion": "País de Residencia o domicilio"
     },
     {
      "nombre": "vtotal",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor total de la operación"
     },
     {
      "nombre": "ving",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor ingreso reintegrado transferido distribuido al tercero"
     },
     {
      "nombre": "vret",
      "requerido": true,
      "base": "double",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor Retención reintegrada transferida distribuida al tercero"
     },
     {
      "nombre": "tdoc2",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{1,2}",
      "descripcion": "Tipo de documento del tercero beneficiario ingreso"
     },
     {
      "nombre": "nid2i",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "Identificación del tercero beneficiario ingreso"
     },
     {
      "nombre": "apl1i",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer apellido del tercero para quien se recibió ingreso"
     },
     {
      "nombre": "apl2i",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo apellido del tercero para quien se recibió ingreso"
     },
     {
      "nombre": "nom1i",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer nombre del tercero para quien se recibió ingreso"
     },
     {
      "nombre": "nom2i",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros nombres del tercero para quien se recibió ingreso"
     },
     {
      "nombre": "razi",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón social del tercero para quien se recibió ingreso"
     },
     {
      "nombre": "dir",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 200,
      "descripcion": "Dirección"
     },
     {
      "nombre": "cdpt",
      "requerido": false,
      "base": "string",
      "patron": "[0-9]{0,2}",
      "descripcion": "Código del Departamento"
     },
     {
      "nombre": "cmcp",
      "requerido": false,
      "base": "string",
      "patron": "[0-9]{0,3}",
      "descripcion": "Código del Municipio"
     },
     {
      "nombre": "paist",
      "requerido": true,
      "base": "string",
      "patron": "[0-9]{0,4}",
      "descripcion": "País de Residencia o domicilio"
     }
    ]
   },
   "2275-v2": {
    "formato": "2275",
    "version": "2",
    "elemento": "ingresos",
    "maxRegistros": null,
    "documentacion": "Elemento que encapsula la información del formulario 2275 INGRESOS NO CONSTITUTIVOS DE RENTA NI GANANCIA OCASIONAL",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "2275",
      "base": "positiveInteger",
      "digitos": 4
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "2"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "cpt",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{0,4}",
      "descripcion": "Concepto"
     },
     {
      "nombre": "tdoc",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{0,2}",
      "descripcion": "Tipo de documento del Tercero"
     },
     {
      "nombre": "nit",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 1,
      "maxLargo": 20,
      "descripcion": "Número de Identificación del Tercero"
     },
     {
      "nombre": "pap",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Apellido"
     },
     {
      "nombre": "sap",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo Apellido"
     },
     {
      "nombre": "pno",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Primer Nombre"
     },
     {
      "nombre": "ono",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros Nombres"
     },
     {
      "nombre": "raz",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 450,
      "descripcion": "Razón Social"
     },
     {
      "nombre": "dir",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 200,
      "descripcion": "Dirección"
     },
     {
      "nombre": "dpto",
      "requerido": false,
      "base": "string",
      "patron": "[0-9]{0,2}",
      "descripcion": "Código departamento"
     },
     {
      "nombre": "mun",
      "requerido": false,
      "base": "string",
      "patron": "[0-9]{0,3}",
      "descripcion": "Código municipio"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "string",
      "patron": "[0-9]{1,4}",
      "descripcion": "Código País"
     },
     {
      "nombre": "email",
      "requerido": false,
      "base": "string",
      "patron": "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~\\-]+@[A-Za-z0-9]+([.-][A-Za-z0-9]+)*\\.[A-Za-z]{2,3}",
      "minLargo": 0,
      "maxLargo": 50,
      "descripcion": "Correo Electrónico"
     },
     {
      "nombre": "vrenta",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor del ingreso no constitutivo de renta ni ganancia ocasional solicitado"
     }
    ]
   },
   "2276-v4": {
    "formato": "2276",
    "version": "4",
    "elemento": "rentra",
    "maxRegistros": null,
    "documentacion": "InformaciÃ³n de rentas de trabajo y pensiones - Formato 2276v4",
    "cab": [
     {
      "nombre": "Ano",
      "base": "gYear"
     },
     {
      "nombre": "CodCpt",
      "base": "int",
      "min": 0,
      "max": 99
     },
     {
      "nombre": "Formato",
      "fijo": "2276",
      "base": "positiveInteger"
     },
     {
      "nombre": "Version",
      "base": "positiveInteger",
      "fijo": "4"
     },
     {
      "nombre": "NumEnvio",
      "base": "positiveInteger",
      "digitos": 8,
      "max": 99999999
     },
     {
      "nombre": "FecEnvio",
      "base": "dateTime"
     },
     {
      "nombre": "FecInicial",
      "base": "date"
     },
     {
      "nombre": "FecFinal",
      "base": "date"
     },
     {
      "nombre": "ValorTotal",
      "base": "double"
     },
     {
      "nombre": "CantReg",
      "base": "positiveInteger",
      "digitos": 4,
      "max": 9999
     }
    ],
    "atributos": [
     {
      "nombre": "entinfo",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{1,2}",
      "descripcion": "Entidad Informante"
     },
     {
      "nombre": "tdocb",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{1,2}",
      "descripcion": "Tipo de documento del beneficiario"
     },
     {
      "nombre": "nitb",
      "requerido": true,
      "base": "string",
      "patron": "[a-zA-Z0-9]+",
      "minLargo": 1,
      "maxLargo": 20,
      "descripcion": "NÃºmero de identificaciÃ³n del beneficiario"
     },
     {
      "nombre": "pap",
      "requerido": true,
      "base": "string",
      "minLargo": 1,
      "maxLargo": 60,
      "descripcion": "Primer apellido del beneficiario"
     },
     {
      "nombre": "sap",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Segundo apellido del beneficiario"
     },
     {
      "nombre": "pno",
      "requerido": true,
      "base": "string",
      "minLargo": 1,
      "maxLargo": 60,
      "descripcion": "Primer nombre del beneficiario"
     },
     {
      "nombre": "ono",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 60,
      "descripcion": "Otros nombres del beneficiario"
     },
     {
      "nombre": "dir",
      "requerido": false,
      "base": "string",
      "minLargo": 0,
      "maxLargo": 200,
      "descripcion": "DirecciÃ³n del beneficiario"
     },
     {
      "nombre": "dpto",
      "requerido": false,
      "base": "int",
      "patron": "[0-9]{0,2}",
      "descripcion": "Departamentodel beneficiario"
     },
     {
      "nombre": "mun",
      "requerido": false,
      "base": "int",
      "patron": "[0-9]{0,3}",
      "descripcion": "Municipio del beneficiario"
     },
     {
      "nombre": "pais",
      "requerido": true,
      "base": "int",
      "patron": "[0-9]{1,4}",
      "descripcion": "PaÃ­s del Beneficiario"
     },
     {
      "nombre": "pasa",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por salarios"
     },
     {
      "nombre": "paec",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por emolumentos eclesiÃ¡sticos"
     },
     {
      "nombre": "pabop",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos realizados con bonos electrÃ³nicos o de papel de servicio, cheques, tarjetas, vales, etc."
     },
     {
      "nombre": "vaex",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor del exceso de los pagos por alimentaciÃ³n mayores a 41 UVT, art. 387-1 E.T."
     },
     {
      "nombre": "paho",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por honorarios"
     },
     {
      "nombre": "pase",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por servicios"
     },
     {
      "nombre": "paco",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por comisiones"
     },
     {
      "nombre": "papre",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por prestaciones sociales"
     },
     {
      "nombre": "pavia",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por viÃ¡ticos"
     },
     {
      "nombre": "paga",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por gastos de representaciÃ³n"
     },
     {
      "nombre": "patra",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por compensaciones trabajo asociado cooperativo"
     },
     {
      "nombre": "vapo",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor apoyos econÃ³micos no reembolsables o condonados, entregados por el Estado o financiados con recursos pÃºblicos, para financiar programas educativos."
     },
     {
      "nombre": "potro",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Otros pagos"
     },
     {
      "nombre": "cein",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "CesantÃ­as e intereses de cesantÃ­as efectivamente pagadas al empleado"
     },
     {
      "nombre": "ceco",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "CesantÃ­as consignadas al fondo de cesantÃ­as"
     },
     {
      "nombre": "auce",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Auxilio de cesantÃ­as reconocido a trabajadores del rÃ©gimen tradicional del CÃ³digo Sustantivo del Trabajo, CapÃ­tulo VII, TÃ­tulo VIII Parte Primera"
     },
     {
      "nombre": "peju",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pensiones de jubilaciÃ³n vejez o invalidez"
     },
     {
      "nombre": "tingbtp",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Total Ingresos brutos por rentas de trabajo y pensiÃ³n"
     },
     {
      "nombre": "apos",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Aportes Obligatorios por Salud a cargo del trabajador"
     },
     {
      "nombre": "apof",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Aportes obligatorios a fondos de pensiones y solidaridad pensional a cargo del trabajador"
     },
     {
      "nombre": "aprais",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Aportes voluntarios al rÃ©gimen de ahorro individual con solidaridad - RAIS"
     },
     {
      "nombre": "apov",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Aportes voluntarios a fondos de pensiones voluntarias"
     },
     {
      "nombre": "apafc",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Aportes a cuentas AFC"
     },
     {
      "nombre": "apavc",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Aportes a cuentas AVC"
     },
     {
      "nombre": "vare",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor de las Retenciones en la fuente por pagos de rentas de trabajo o pensiones"
     },
     {
      "nombre": "ivav",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Impuesto sobre las ventas â IVA, mayor valor del costo o gasto"
     },
     {
      "nombre": "rfiva",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "RetenciÃ³n en la fuente a tÃ­tulo de impuesto sobre las ventas â IVA."
     },
     {
      "nombre": "pagahuvt",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Pagos por alimentaciÃ³n hasta a 41 UVT"
     },
     {
      "nombre": "vilap",
      "requerido": true,
      "base": "long",
      "patron": "[0-9]{1,18}",
      "descripcion": "Valor ingreso laboral promedio de los Ãºltimos seis meses."
     },
     {
      "nombre": "tdocde",
      "requerido": false,
      "base": "int",
      "patron": "[0-9]{0,2}",
      "descripcion": "Tipo de documento del dependiente econÃ³mico"
     },
     {
      "nombre": "nitde",
      "requerido": false,
      "base": "string",
      "patron": "[a-zA-Z0-9]*",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "NÃºmero de IdentificaciÃ³n del dependiente econÃ³mico"
     },
     {
      "nombre": "identfc",
      "requerido": false,
      "base": "string",
      "patron": "[0-9]{0,14}",
      "descripcion": "IdentificaciÃ³n del fideicomiso o contrato"
     },
     {
      "nombre": "tdocpcc",
      "requerido": false,
      "base": "int",
      "patron": "[0-9]{0,2}",
      "descripcion": "Tipo documento participante en contrato de colaboraciÃ³n"
     },
     {
      "nombre": "nitpcc",
      "requerido": false,
      "base": "string",
      "patron": "[a-zA-Z0-9]*",
      "minLargo": 0,
      "maxLargo": 20,
      "descripcion": "IdentificaciÃ³n participante en contrato colaboraciÃ³n"
     }
    ]
   }
  };
});
