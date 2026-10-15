/*
 * Verificador de exógena: la lógica, sin pantalla.
 *
 * Lee los XML de la exógena, revisa su estructura contra los esquemas
 * oficiales, hace las revisiones internas y arma los cruces contra las cifras
 * de las declaraciones. Todo lo que depende de la norma está en
 * reglas-ag2025.js, esquemas-ag2025.js y tablas-ag2025.js; aquí solo está la
 * manera de aplicarlo.
 *
 * Corre en el navegador (como window.ExoVerificador) y en Node, donde se prueba
 * con `node --test`. No hace peticiones de red ni guarda nada: recibe bytes y
 * cifras, y devuelve un resultado.
 */
(function (raiz, fabrica) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrica(require('./xml.js'), require('./esquemas-ag2025.js'), require('./tablas-ag2025.js'), require('./reglas-ag2025.js'));
  } else {
    raiz.ExoVerificador = fabrica(raiz.ExoXML, raiz.ExoEsquemas, raiz.ExoTablas, raiz.ExoReglas);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (X, ESQUEMAS, TABLAS, R) {
  'use strict';

  const GRAVEDADES = ['error', 'advertencia', 'informacion'];
  const MAX_EJEMPLOS = 5;

  // ------------------------------------------------------------- utilidades

  /** Huella de 64 bits de un archivo (dos sumas FNV-1a de 32 bits), para reconocer el mismo archivo cargado dos veces. */
  function huella(bytes) {
    let a = 0x811c9dc5;
    let b = 0x01000193 ^ bytes.length;
    for (let k = 0; k < bytes.length; k++) {
      a ^= bytes[k];
      a = Math.imul(a, 0x01000193) >>> 0;
      b ^= bytes[bytes.length - 1 - k];
      b = Math.imul(b, 0x01000193) >>> 0;
    }
    return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
  }

  /** Minúsculas y sin tildes, para comparar textos como «CUANTIAS MENORES». */
  function normalizarTexto(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  /** Un código numérico sin ceros a la izquierda ('05' -> '5'); lo demás, igual. */
  function sinCeros(v) {
    const s = String(v == null ? '' : v).trim();
    return /^\d+$/.test(s) ? String(Number(s)) : s;
  }

  /** 1234567 -> '1.234.567', como se escriben las cifras en Colombia. */
  function miles(n) {
    const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '-' : '') + s;
  }

  function numero(v) {
    if (v === undefined || v === null || v === '') return 0;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : 0;
  }

  /** Dígito de verificación del NIT con el módulo 11 de la DIAN. */
  function digitoVerificacion(nit) {
    const s = String(nit).trim();
    if (!/^\d{1,15}$/.test(s)) return null;
    const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let suma = 0;
    for (let k = 0; k < s.length; k++) suma += Number(s[s.length - 1 - k]) * pesos[k];
    const resto = suma % 11;
    return resto > 1 ? 11 - resto : resto;
  }

  /**
   * Lee una cifra escrita o pegada desde Excel: 1.234.567, 1,234,567, $ 1.234.567,
   * (1.234), -1234, 1234,5. Devuelve un número en pesos (redondeado) o null si la
   * celda está vacía o no es una cifra.
   */
  function leerCifra(texto) {
    if (texto === null || texto === undefined) return null;
    if (typeof texto === 'number') return Number.isFinite(texto) ? Math.round(texto) : null;
    let s = String(texto).replace(/[  \s]/g, '').replace(/^\$|COP|\$/gi, '');
    if (s === '' || s === '-') return null;
    let negativo = false;
    if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1); }
    if (s.startsWith('-')) { negativo = !negativo; s = s.slice(1); }
    if (s.startsWith('+')) s = s.slice(1);
    let valor;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) valor = Number(s.replace(/\./g, '').replace(',', '.'));
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) valor = Number(s.replace(/,/g, ''));
    else if (/^\d+[.,]\d{3}$/.test(s)) valor = Number(s.replace(/[.,]/, ''));
    else if (/^\d+([.,]\d+)?$/.test(s)) valor = Number(s.replace(',', '.'));
    else return null;
    if (!Number.isFinite(valor)) return null;
    return Math.round(negativo ? -valor : valor);
  }

  function nuevoHallazgo(revision, datos) {
    const def = R.REVISIONES[revision];
    if (!def) throw new Error('Revisión no definida: ' + revision);
    return Object.assign({ revision, gravedad: def.gravedad, titulo: def.titulo }, datos);
  }

  // ------------------------------------------------- tipos de los esquemas

  const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})(Z|[+-]\d{2}:\d{2})?$/;
  const RE_FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
  const cachePatrones = new Map();

  function patron(p) {
    if (!cachePatrones.has(p)) cachePatrones.set(p, new RegExp('^(?:' + p + ')$'));
    return cachePatrones.get(p);
  }

  function fechaValida(a, m, d) {
    const f = new Date(Date.UTC(a, m - 1, d));
    return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
  }

  /**
   * Revisa un valor contra la definición de un atributo o de un elemento del
   * esquema. Devuelve null si está bien o el motivo si no.
   */
  function revisarValor(valor, def) {
    const base = def.base;
    let v = valor;
    const numerico = ['int', 'long', 'double', 'positiveInteger', 'gYear'].includes(base);
    if (numerico) v = v.trim();
    if (def.patron && !patron(def.patron).test(v)) return `no cumple el patrón del esquema (${def.patron})`;
    switch (base) {
      case 'int':
      case 'long':
      case 'positiveInteger': {
        if (!/^[+-]?\d+$/.test(v)) return 'debe ser un número entero';
        const n = Number(v);
        if (base === 'positiveInteger' && n < 1) return 'debe ser un entero mayor que cero';
        if (base === 'int' && (n < -2147483648 || n > 2147483647)) return 'no cabe en un entero';
        if (def.min !== undefined && n < def.min) return `debe ser al menos ${def.min}`;
        if (def.max !== undefined && n > def.max) return `debe ser a lo sumo ${def.max}`;
        if (def.digitos !== undefined && v.replace(/^[+-]?0*/, '').length > def.digitos) return `no puede tener más de ${def.digitos} dígitos`;
        return null;
      }
      case 'double':
        if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$|^(INF|-INF|NaN)$/.test(v)) return 'debe ser un número';
        return null;
      case 'gYear':
        return /^-?\d{4,}(Z|[+-]\d{2}:\d{2})?$/.test(v) ? null : 'debe ser un año de cuatro dígitos';
      case 'date': {
        const m = RE_FECHA.exec(v);
        if (!m || !fechaValida(+m[1], +m[2], +m[3])) return 'debe ser una fecha AAAA-MM-DD válida';
        return null;
      }
      case 'dateTime': {
        const m = RE_FECHA_HORA.exec(v);
        if (!m || !fechaValida(+m[1], +m[2], +m[3]) || +m[4] > 24 || +m[5] > 59 || +m[6] > 59) return 'debe ser una fecha y hora AAAA-MM-DDTHH:MM:SS válida';
        return null;
      }
      case 'string': {
        const largo = Array.from(v).length;
        if (def.minLargo !== undefined && largo < def.minLargo) return `debe tener al menos ${def.minLargo} caracteres`;
        if (def.maxLargo !== undefined && largo > def.maxLargo) return `no puede pasar de ${def.maxLargo} caracteres`;
        return null;
      }
      default:
        return null;
    }
  }

  // --------------------------------------------------------- leer un archivo

  /**
   * Agrupa los hallazgos repetidos (la misma revisión y el mismo motivo en
   * muchos registros) para que el informe no tenga miles de líneas. Cada grupo
   * guarda cuántos son y unos ejemplos con su línea.
   */
  function Acumulador() {
    const grupos = new Map();
    return {
      agregar(revision, clave, mensaje, ejemplo, extra) {
        const k = revision + '|' + clave;
        let g = grupos.get(k);
        if (!g) {
          g = nuevoHallazgo(revision, Object.assign({ mensaje, cantidad: 0, ejemplos: [], todos: [] }, extra || {}));
          grupos.set(k, g);
        }
        g.cantidad++;
        if (ejemplo) {
          if (g.ejemplos.length < MAX_EJEMPLOS) g.ejemplos.push(ejemplo);
          g.todos.push(ejemplo);
        }
        return g;
      },
      lista() {
        return Array.from(grupos.values());
      }
    };
  }

  function textoTercero(reg, roles) {
    const a = reg.atr;
    const partes = [];
    if (roles.raz && a[roles.raz]) return String(a[roles.raz]).trim();
    for (const r of ['apl1', 'apl2', 'nom1', 'nom2']) if (roles[r] && a[roles[r]]) partes.push(String(a[roles[r]]).trim());
    return partes.join(' ');
  }

  /**
   * Lee un archivo de la exógena: decodifica, revisa que sea XML, ubica el
   * formato y la versión, y revisa la estructura contra el esquema oficial.
   * Devuelve un objeto con la cabecera, los registros y los hallazgos.
   */
  function leerArchivo(nombre, bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    const archivo = {
      nombre: String(nombre || 'archivo.xml'), tamano: bytes.length, huella: huella(bytes),
      estado: 'error', formato: null, version: null, clave: null, cab: {}, registros: [],
      hallazgos: [], codificacion: null, incluido: false
    };
    const acum = Acumulador();
    const dec = X.decodificar(bytes);
    archivo.codificacion = { declarada: dec.declarada, usada: dec.usada };
    for (const aviso of dec.avisos) acum.agregar('codificacion', aviso, aviso);

    let raizDoc;
    try {
      raizDoc = X.leer(dec.texto);
    } catch (e) {
      if (!(e instanceof X.ErrorXML)) throw e;
      acum.agregar('xml-mal-formado', 'xml', `No es un XML bien formado: ${e.message}`, { linea: e.linea, columna: e.columna });
      archivo.hallazgos = acum.lista();
      return archivo;
    }
    if (dec.usada !== R.PARAMETROS.codificacion.valor) {
      acum.agregar('codificacion', 'utf8', `El archivo está en ${dec.usada.toUpperCase()} y la especificación técnica pide ISO-8859-1.`);
    }
    if (raizDoc.nombre !== 'mas') {
      acum.agregar('estructura', 'raiz', `El elemento raíz es <${raizDoc.nombre}> y debe ser <mas>. No parece un archivo de la exógena.`, { linea: raizDoc.linea });
      archivo.hallazgos = acum.lista();
      return archivo;
    }
    for (const a of raizDoc.orden) {
      if (!/^xmlns(:|$)/.test(a) && !/^xsi:/.test(a)) acum.agregar('estructura', 'atributo-raiz', `El elemento <mas> trae el atributo «${a}», que el esquema no admite.`, { linea: raizDoc.linea });
    }
    if (raizDoc.texto.trim()) acum.agregar('estructura', 'texto-raiz', 'El elemento <mas> trae texto suelto, que el esquema no admite.', { linea: raizDoc.linea });
    const cabEl = raizDoc.hijos[0];
    if (!cabEl || cabEl.nombre !== 'Cab') {
      acum.agregar('estructura', 'sin-cab', 'Falta la cabecera <Cab> como primer elemento de <mas>.', { linea: raizDoc.linea });
      archivo.hallazgos = acum.lista();
      return archivo;
    }
    const cab = {};
    for (const h of cabEl.hijos) {
      if (Object.prototype.hasOwnProperty.call(cab, h.nombre)) acum.agregar('cabecera', 'repetido-' + h.nombre, `La cabecera repite el elemento <${h.nombre}>.`, { linea: h.linea });
      cab[h.nombre] = h.texto;
      if (h.hijos.length) acum.agregar('cabecera', 'anidado-' + h.nombre, `El elemento <${h.nombre}> de la cabecera no debe tener elementos por dentro.`, { linea: h.linea });
    }
    archivo.cab = cab;
    archivo.formato = cab.Formato !== undefined ? sinCeros(cab.Formato) : null;
    archivo.version = cab.Version !== undefined ? sinCeros(cab.Version) : null;
    archivo.clave = `${archivo.formato}-v${archivo.version}`;

    const regla = R.FORMATOS[archivo.formato];
    if (!regla) {
      acum.agregar('formato-desconocido', 'f', `El formato ${archivo.formato || '(sin formato)'} no está entre los que revisa este verificador (1001, 1003 a 1012, 1647, 2275 y 2276). Se lista, pero no entra en los cruces.`);
      archivo.estado = 'no revisado';
      archivo.hallazgos = acum.lista();
      return archivo;
    }
    if (archivo.version !== regla.version) {
      acum.agregar('version', 'v', `Para el año gravable 2025 el ${archivo.formato} es la versión ${regla.version}; este archivo dice versión ${archivo.version}. No entra en los cruces.`);
      archivo.estado = 'version distinta';
      archivo.hallazgos = acum.lista();
      return archivo;
    }
    const esquema = ESQUEMAS[archivo.clave];

    // Cabecera: presencia, orden y valores.
    const nombresCab = esquema.cab.map((c) => c.nombre);
    const presentes = cabEl.hijos.map((h) => h.nombre);
    for (const c of esquema.cab) {
      if (!Object.prototype.hasOwnProperty.call(cab, c.nombre)) {
        acum.agregar('cabecera', 'falta-' + c.nombre, `Falta <${c.nombre}> en la cabecera.`, { linea: cabEl.linea });
        continue;
      }
      const motivo = revisarValor(cab[c.nombre], c);
      if (motivo) acum.agregar('cabecera', 'valor-' + c.nombre, `<${c.nombre}> ${motivo}: «${cab[c.nombre]}».`, { linea: cabEl.linea });
      if (c.fijo !== undefined && sinCeros(cab[c.nombre]) !== sinCeros(c.fijo)) acum.agregar('cabecera', 'fijo-' + c.nombre, `<${c.nombre}> debe ser ${c.fijo}.`, { linea: cabEl.linea });
    }
    for (const n of presentes) if (!nombresCab.includes(n)) acum.agregar('cabecera', 'sobra-' + n, `La cabecera trae <${n}>, que el esquema no tiene.`, { linea: cabEl.linea });
    const ordenPresente = presentes.filter((n) => nombresCab.includes(n));
    const ordenEsperado = nombresCab.filter((n) => presentes.includes(n));
    if (ordenPresente.join() !== ordenEsperado.join()) acum.agregar('cabecera', 'orden', `Los elementos de la cabecera no van en el orden del esquema (${nombresCab.join(', ')}).`, { linea: cabEl.linea });
    if (cab.CodCpt !== undefined && !['1', '2'].includes(sinCeros(cab.CodCpt))) acum.agregar('cabecera', 'codcpt', `<CodCpt> debe ser 1 (inserción) o 2 (reemplazo); dice «${cab.CodCpt}».`, { linea: cabEl.linea });

    // Año gravable: las fechas inicial y final de los registros.
    const fi = RE_FECHA.exec(String(cab.FecInicial || '').trim());
    const ff = RE_FECHA.exec(String(cab.FecFinal || '').trim());
    let anioBien = true;
    if (ff && Number(ff[1]) !== R.ANIO_GRAVABLE) {
      acum.agregar('anio', 'ff', `La fecha final de los registros es ${cab.FecFinal}: el archivo no es del año gravable ${R.ANIO_GRAVABLE}. No entra en los cruces.`, { linea: cabEl.linea });
      anioBien = false;
    }
    if (fi && Number(fi[1]) !== R.ANIO_GRAVABLE) {
      acum.agregar('anio', 'fi', `La fecha inicial de los registros es ${cab.FecInicial}: el archivo no es del año gravable ${R.ANIO_GRAVABLE}. No entra en los cruces.`, { linea: cabEl.linea });
      anioBien = false;
    }
    if (fi && ff && cab.FecInicial.trim() > cab.FecFinal.trim()) acum.agregar('cabecera', 'fechas', 'La fecha inicial es posterior a la fecha final.', { linea: cabEl.linea });
    if (!fi || !ff) anioBien = false;

    // Registros.
    const permitidos = new Map(esquema.atributos.map((a) => [a.nombre, a]));
    const requeridos = esquema.atributos.filter((a) => a.requerido).map((a) => a.nombre);
    for (let k = 1; k < raizDoc.hijos.length; k++) {
      const el = raizDoc.hijos[k];
      if (el.nombre !== esquema.elemento) {
        acum.agregar('estructura', 'elemento-' + el.nombre, `Hay un elemento <${el.nombre}> donde van registros <${esquema.elemento}>.`, { linea: el.linea });
        continue;
      }
      if (el.hijos.length || el.texto.trim()) acum.agregar('estructura', 'contenido', `Los registros <${esquema.elemento}> no deben tener contenido por dentro: los datos van en atributos.`, { linea: el.linea });
      for (const n of el.orden) {
        if (!permitidos.has(n)) {
          acum.agregar('estructura', 'atributo-' + n, `Atributo «${n}» que el esquema del ${archivo.formato} no tiene.`, { linea: el.linea });
          continue;
        }
        const motivo = revisarValor(el.atributos[n], permitidos.get(n));
        if (motivo) acum.agregar('estructura', 'valor-' + n + '-' + motivo, `El atributo «${n}» (${permitidos.get(n).descripcion}) ${motivo}.`, { linea: el.linea, valor: el.atributos[n] });
      }
      for (const n of requeridos) {
        if (!Object.prototype.hasOwnProperty.call(el.atributos, n)) acum.agregar('estructura', 'falta-' + n, `Falta el atributo obligatorio «${n}» (${permitidos.get(n).descripcion}).`, { linea: el.linea });
      }
      archivo.registros.push({ atr: el.atributos, linea: el.linea, archivo: archivo.nombre });
    }
    const n = archivo.registros.length;
    if (n === 0) acum.agregar('cantidad-registros', 'cero', 'El archivo no trae registros: el esquema pide al menos uno.');
    if (cab.CantReg !== undefined && /^\s*\d+\s*$/.test(cab.CantReg) && Number(cab.CantReg) !== n) {
      acum.agregar('cantidad-registros', 'cantreg', `<CantReg> dice ${miles(Number(cab.CantReg))} y el archivo trae ${miles(n)} registros.`, { linea: cabEl.linea });
    }
    const maximo = esquema.maxRegistros || R.PARAMETROS.maxRegistrosPorArchivo.valor;
    if (n > R.PARAMETROS.maxRegistrosPorArchivo.valor || n > maximo) acum.agregar('cantidad-registros', 'maximo', `El archivo trae ${miles(n)} registros; el máximo por archivo es ${miles(Math.min(maximo, R.PARAMETROS.maxRegistrosPorArchivo.valor))}.`);

    // ValorTotal: la suma del atributo que dice la especificación.
    if (cab.ValorTotal !== undefined && regla.sumaValorTotal) {
      const suma = archivo.registros.reduce((s, r) => s + numero(r.atr[regla.sumaValorTotal]), 0);
      const total = Number(String(cab.ValorTotal).trim());
      if (Number.isFinite(total) && Math.abs(total - suma) > 0.5) {
        acum.agregar('valor-total', 'vt', `<ValorTotal> dice ${String(cab.ValorTotal).trim()} y la suma del atributo «${regla.sumaValorTotal}» de los registros da ${suma}. La especificación pide que coincidan (es una suma de control, aunque el atributo sea un código).`, { linea: cabEl.linea });
      }
    }

    // Nombre del archivo, si sigue el estándar Dmuisca_.
    const m = /^Dmuisca_(\d{2})(\d{5})(\d{2})(\d{4})(\d{8})\.xml$/i.exec(archivo.nombre.split(/[\\/]/).pop());
    if (m) {
      const difiere = [];
      if (cab.CodCpt !== undefined && Number(m[1]) !== Number(cab.CodCpt)) difiere.push('el concepto');
      if (Number(m[2]) !== Number(archivo.formato)) difiere.push('el formato');
      if (Number(m[3]) !== Number(archivo.version)) difiere.push('la versión');
      if (cab.Ano !== undefined && Number(m[4]) !== Number(cab.Ano)) difiere.push('el año de envío');
      if (cab.NumEnvio !== undefined && Number(m[5]) !== Number(cab.NumEnvio)) difiere.push('el número de envío');
      if (difiere.length) acum.agregar('nombre-archivo', 'n', `El nombre del archivo no coincide con la cabecera en ${difiere.join(', ')}.`);
    }

    archivo.hallazgos = acum.lista();
    const errorGrave = archivo.hallazgos.some((h) => ['xml-mal-formado', 'version', 'anio'].includes(h.revision) || (h.revision === 'estructura' && ['raiz', 'sin-cab'].includes(h.mensaje)));
    archivo.estado = anioBien && !errorGrave ? 'leido' : 'fuera del año';
    if (!anioBien && !archivo.hallazgos.some((h) => h.revision === 'anio')) {
      acum.agregar('anio', 'sin-fechas', 'La cabecera no trae fechas válidas: no se sabe de qué año es el archivo. No entra en los cruces.', { linea: cabEl.linea });
      archivo.hallazgos = acum.lista();
    }
    archivo.incluido = archivo.estado === 'leido';
    return archivo;
  }

  // ----------------------------------------------------- juntar los archivos

  /**
   * Junta los archivos leídos por formato. Ignora el mismo archivo cargado dos
   * veces y avisa si hay envíos repetidos o inserciones mezcladas con reemplazos.
   */
  function consolidar(archivos) {
    const porFormato = {};
    const hallazgos = [];
    const vistos = new Map();
    for (const a of archivos) {
      if (!a.incluido) continue;
      if (vistos.has(a.huella)) {
        a.incluido = false;
        a.repetidoDe = vistos.get(a.huella).nombre;
        hallazgos.push(nuevoHallazgo('archivo-repetido', { formato: a.formato, archivo: a.nombre, mensaje: `«${a.nombre}» es el mismo archivo que «${a.repetidoDe}»: se cuenta una sola vez.`, cantidad: 1, ejemplos: [], todos: [] }));
        continue;
      }
      vistos.set(a.huella, a);
      (porFormato[a.formato] = porFormato[a.formato] || { formato: a.formato, archivos: [], registros: [] }).archivos.push(a);
    }
    for (const f of Object.values(porFormato)) {
      const envios = new Map();
      for (const a of f.archivos) {
        const env = sinCeros(a.cab.NumEnvio);
        if (envios.has(env)) {
          hallazgos.push(nuevoHallazgo('envio-repetido', { formato: f.formato, archivo: a.nombre, mensaje: `«${a.nombre}» y «${envios.get(env)}» tienen el mismo número de envío (${env}) y distinto contenido. Si uno reemplaza al otro, cargue solo el vigente.`, cantidad: 1, ejemplos: [], todos: [] }));
        } else envios.set(env, a.nombre);
        for (const r of a.registros) f.registros.push(r);
      }
      const conceptos = new Set(f.archivos.map((a) => sinCeros(a.cab.CodCpt)));
      if (conceptos.has('1') && conceptos.has('2')) {
        hallazgos.push(nuevoHallazgo('reemplazo', { formato: f.formato, mensaje: `En el ${f.formato} hay archivos de inserción y de reemplazo. Si el reemplazo sustituyó lo enviado antes, cargue solo los archivos vigentes: el verificador suma todo lo que se carga.`, cantidad: 1, ejemplos: [], todos: [] }));
      }
    }
    return { porFormato, hallazgos };
  }

  // ------------------------------------------------------ revisiones internas

  function rolesDe(formato) {
    return R.FORMATOS[formato].roles;
  }

  function conceptoDe(formato, reg) {
    const roles = rolesDe(formato);
    return roles.concepto ? sinCeros(reg.atr[roles.concepto]) : null;
  }

  function marcasConcepto(formato, codigo) {
    const lista = R.CONCEPTOS[formato];
    return (lista && codigo !== null && lista[codigo]) || null;
  }

  function conceptoValido(formato, codigo) {
    if (R.CONCEPTOS[formato]) return Object.prototype.hasOwnProperty.call(R.CONCEPTOS[formato], codigo);
    const tabla = TABLAS.conceptosPrevalidador[formato];
    return tabla ? Object.prototype.hasOwnProperty.call(tabla, codigo) : true;
  }

  function ejemploDe(formato, reg) {
    const roles = rolesDe(formato);
    const e = { archivo: reg.archivo, linea: reg.linea };
    if (roles.nid) e.nid = String(reg.atr[roles.nid] || '').trim();
    if (roles.concepto) e.concepto = conceptoDe(formato, reg);
    const nombre = textoTercero(reg, roles);
    if (nombre) e.tercero = nombre;
    return e;
  }

  /**
   * Las revisiones de contenido de todos los formatos cargados.
   * contexto: { nitCliente, personaJuridica }.
   */
  function revisarContenido(porFormato, contexto, parametros) {
    const acum = Acumulador();
    const P = R.PARAMETROS;
    const uvt = parametros.uvt;
    const nitCliente = contexto && contexto.nitCliente ? String(contexto.nitCliente).replace(/\D/g, '').slice(0, 15) : '';
    for (const f of Object.values(porFormato)) {
      const formato = f.formato;
      const regla = R.FORMATOS[formato];
      const roles = regla.roles;
      const tablaTipos = regla.tablaTipos ? TABLAS.tiposDocumento[regla.tablaTipos] : null;
      const llaves = new Map();
      for (const reg of f.registros) {
        const a = reg.atr;
        const ej = ejemploDe(formato, reg);
        const tdoc = roles.tdoc ? sinCeros(a[roles.tdoc]) : null;
        const nid = roles.nid ? String(a[roles.nid] || '').trim() : null;
        const concepto = conceptoDe(formato, reg);

        if (tablaTipos && tdoc !== null && !Object.prototype.hasOwnProperty.call(tablaTipos, tdoc)) {
          acum.agregar('tipo-documento', formato + '|' + tdoc, `Tipo de documento ${tdoc} no está en la ${regla.tablaTipos === 'tabla2' ? 'tabla 2 (sin el 43)' : 'tabla 1'} que usa el ${formato}.`, ej, { formato });
        }
        if (nid !== null && tdoc !== null && R.TIPOS_NUMERICOS.includes(tdoc) && !/^\d+$/.test(nid)) {
          acum.agregar('numero-identificacion', formato + '|alfa', `Número de identificación con letras o signos para un tipo de documento numérico (${tdoc}).`, ej, { formato });
        }
        if (nid !== null && tdoc !== null) {
          const n = /^\d+$/.test(nid) ? Number(nid) : NaN;
          const esCuantias = nid === P.nit.cuantiasMenores;
          const esExterior = n >= P.nit.exteriorDesde && n <= P.nit.exteriorHasta;
          if ((esCuantias || esExterior) && tdoc !== '43') {
            acum.agregar('nit-especial', formato + '|tdoc', `El NIT ${nid} se reporta con el tipo de documento 43 y aquí trae el ${tdoc}.`, ej, { formato });
          } else if (tdoc === '43' && !esCuantias && !esExterior) {
            acum.agregar('nit-especial', formato + '|43', 'El tipo de documento 43 se usa para cuantías menores (222222222) y para el exterior sin número fiscal (444444001 a 444449999).', ej, { formato });
          }
        }

        // Dígito de verificación, cuando el formato lo trae.
        if (roles.dv && a[roles.dv] !== undefined && String(a[roles.dv]).trim() !== '') {
          const dv = String(a[roles.dv]).trim();
          if (tdoc === '31') {
            const esperado = digitoVerificacion(nid);
            if (esperado !== null && String(esperado) !== sinCeros(dv)) {
              acum.agregar('dv', formato + '|dv', `El dígito de verificación no corresponde al NIT: con el módulo 11 da ${esperado}.`, Object.assign({ dv, esperado: String(esperado) }, ej), { formato });
            }
          } else {
            acum.agregar('dv', formato + '|dv-no-nit', 'El dígito de verificación solo se diligencia con el tipo de documento 31 (NIT).', ej, { formato, gravedad: 'advertencia' });
          }
        }

        // Concepto válido.
        if (concepto !== null && !conceptoValido(formato, concepto)) {
          acum.agregar('concepto', formato + '|' + concepto, `El concepto ${concepto} no existe para el formato ${formato} en el año gravable 2025.`, ej, { formato });
        }
        if (formato === '2276' && !Object.prototype.hasOwnProperty.call(TABLAS.entidadInformante2276, sinCeros(a.entinfo))) {
          acum.agregar('concepto', '2276|entinfo', `La entidad informante ${a.entinfo} no está en la tabla del artículo 51.`, ej, { formato });
        }

        // Llave única.
        if (regla.llave) {
          const llave = regla.llave.map((c) => sinCeros(a[c])).join('|');
          if (llaves.has(llave)) {
            acum.agregar('duplicados', formato + '|dup', `Registros con la misma llave (${regla.llave.join(', ')}), que no debe repetirse en el año.`, Object.assign({ primeraLinea: llaves.get(llave).linea, primerArchivo: llaves.get(llave).archivo }, ej), { formato });
          } else llaves.set(llave, reg);
        }

        // Cuantías menores.
        if (nid === P.nit.cuantiasMenores) {
          if (regla.cuantiasMenores === 'no previstas') {
            acum.agregar('cuantias-menores-formato', formato + '|cm', `El ${formato} trae el NIT 222222222, y su artículo no prevé cuantías menores.`, ej, { formato });
          }
          if (roles.raz && normalizarTexto(a[roles.raz]) !== normalizarTexto(P.nit.razonCuantiasMenores)) {
            acum.agregar('cuantias-menores', formato + '|razon', 'El registro de cuantías menores debe llevar la razón social «CUANTÍAS MENORES».', ej, { formato, gravedad: 'advertencia' });
          }
          if (formato === '1001') {
            const conRetencion = ['retp', 'reta', 'comun', 'ndom'].filter((c) => numero(a[c]) > 0);
            if (conRetencion.length) {
              acum.agregar('cuantias-menores', '1001|ret', 'Pagos con retención dentro de cuantías menores: todo pago sujeto a retención se reporta con su tercero, sin importar la cuantía.', Object.assign({ valores: conRetencion.map((c) => `${c} = ${a[c]}`).join(', ') }, ej), { formato });
            }
          }
        }

        // GMF a nombre de la DIAN.
        if (formato === '1001') {
          const m = marcasConcepto('1001', concepto);
          if (m && m.gmf && nid === P.nit.dian) {
            acum.agregar('gmf', '1001|gmf', 'El GMF (concepto 5101) está a nombre de la DIAN; se reporta con el NIT del banco o entidad que lo retuvo.', ej, { formato });
          }
        }

        // Base del reteIVA en el 1003.
        if (formato === '1003' && concepto === '1309') {
          const base = numero(a.valor);
          const ret = numero(a.ret);
          if (base > 0 && ret > 0 && ret / base < P.baseReteIVA.proporcionMinima) {
            acum.agregar('base-reteiva', '1003|base', 'En el concepto 1309 la retención es menos del 10 % de la base: parece que la base es el valor del pago y no el valor del IVA.', Object.assign({ base: String(base), retencion: String(ret) }, ej), { formato });
          }
        }

        // Dirección cuando el país es Colombia.
        if (regla.direccionSiColombia.length) {
          const campoPais = regla.paisDireccion || roles.pais;
          if (campoPais && sinCeros(a[campoPais]) === P.paisColombia) {
            const faltan = regla.direccionSiColombia.filter((c) => !String(a[c] == null ? '' : a[c]).trim());
            if (faltan.length) acum.agregar('direccion', formato + '|' + faltan.join(','), `País Colombia sin ${faltan.join(', ')}: la especificación pide diligenciarlos.`, ej, { formato });
          }
        }

        // Códigos de país, departamento y municipio.
        const campoPaises = [roles.pais, regla.paisDireccion].filter(Boolean);
        for (const c of campoPaises) {
          const p = sinCeros(a[c]);
          if (p && !Object.prototype.hasOwnProperty.call(TABLAS.paises, p)) acum.agregar('codigos-dane', formato + '|pais|' + p, `El código de país ${a[c]} no está en la tabla de la DIAN.`, ej, { formato });
        }
        const campoDpto = regla.dptoDireccion || roles.dpto;
        const campoMun = regla.munDireccion || roles.mun;
        const d = campoDpto ? sinCeros(a[campoDpto]) : '';
        const mu = campoMun ? sinCeros(a[campoMun]) : '';
        if (d && !Object.prototype.hasOwnProperty.call(TABLAS.departamentos, d)) {
          acum.agregar('codigos-dane', formato + '|dpto|' + d, `El código de departamento ${a[campoDpto]} no existe.`, ej, { formato });
        } else if (d && mu && !Object.prototype.hasOwnProperty.call(TABLAS.municipios, d + '-' + mu)) {
          acum.agregar('codigos-dane', formato + '|mun|' + d + '-' + mu, `El municipio ${a[campoMun]} no existe en el departamento ${a[campoDpto]}.`, ej, { formato });
        }

        // Nombre o razón social.
        if (roles.apl1 && tdoc !== null && nid !== P.nit.cuantiasMenores) {
          const tieneNombre = String(a[roles.apl1] || '').trim() && String(a[roles.nom1] || '').trim();
          const tieneRazon = roles.raz ? String(a[roles.raz] || '').trim() : '';
          if (R.TIPOS_PERSONA_NATURAL.includes(tdoc) && !tieneNombre) {
            acum.agregar('nombre-tercero', formato + '|pn', 'Persona natural sin primer apellido y primer nombre.', ej, { formato });
          } else if (!R.TIPOS_PERSONA_NATURAL.includes(tdoc) && !tieneNombre && !tieneRazon) {
            acum.agregar('nombre-tercero', formato + '|sin', 'Tercero sin razón social ni nombre.', ej, { formato });
          }
        }

        // Todos los valores en cero.
        const vals = regla.valores.filter((c) => a[c] !== undefined);
        if (vals.length && vals.every((c) => numero(a[c]) === 0)) {
          acum.agregar('valores-en-cero', formato + '|0', 'Registro con todos los valores en cero.', ej, { formato });
        }

        // Conceptos que van con el NIT del informante.
        if (nitCliente && nid) {
          const m = marcasConcepto(formato, concepto);
          if (m && m.nitInformante && nid !== nitCliente) {
            acum.agregar('nit-informante', formato + '|' + concepto, `El concepto ${concepto} se reporta con el NIT del informante (${nitCliente}).`, ej, { formato });
          }
        }
      }
    }

    // IVA llevado al costo: en el AG 2025 va en el 1001 y en el 1005.
    if (porFormato['1001'] && porFormato['1005']) {
      const en1001 = porFormato['1001'].registros.reduce((s, r) => s + numero(r.atr.ided) + numero(r.atr.inded), 0);
      const en1005 = porFormato['1005'].registros.reduce((s, r) => s + numero(r.atr.ivavcg), 0);
      if (Math.abs(en1001 - en1005) >= R.PARAMETROS.verdeUVT * uvt) {
        acum.agregar('iva-costo', 'iva', `El IVA llevado al costo suma ${cop(en1001)} en el 1001 (deducible y no deducible) y ${cop(en1005)} en el 1005. En el AG 2025 es el mismo valor reportado en los dos formatos.`, null, { formato: '1001 y 1005', en1001, en1005 });
      }
    }
    return acum.lista();
  }

  // --------------------------------------------------------- declaraciones

  function periodicidadDe(declaraciones, formulario) {
    const p = declaraciones && declaraciones.periodicidad && declaraciones.periodicidad[formulario];
    const permitidas = R.DECLARACIONES[formulario].periodicidades;
    return permitidas.includes(p) ? p : permitidas[0];
  }

  const CAMPOS = {};
  for (const [formulario, dec] of Object.entries(R.DECLARACIONES)) {
    for (const c of dec.casillas) CAMPOS[c.id] = Object.assign({ formulario }, c);
  }

  /** Los valores de un campo por periodo, para la periodicidad elegida. */
  function periodosCampo(declaraciones, campo) {
    const def = CAMPOS[campo];
    if (!def) throw new Error('Campo no definido: ' + campo);
    const periodicidad = periodicidadDe(declaraciones, def.formulario);
    const valores = (declaraciones && declaraciones.valores && declaraciones.valores[campo]) || {};
    return R.PERIODOS[periodicidad].map((p) => ({ id: p.id, nombre: p.nombre, valor: valores[p.id] === undefined || valores[p.id] === null || valores[p.id] === '' ? null : Number(valores[p.id]) }));
  }

  /** La suma de un campo en el año, o null si no se escribió ningún valor. */
  function valorCampo(declaraciones, campo) {
    const ps = periodosCampo(declaraciones, campo);
    if (ps.every((p) => p.valor === null)) return null;
    return ps.reduce((s, p) => s + (p.valor || 0), 0);
  }

  // ---------------------------------------------------------------- cruces

  function terminoIncluye(formato, termino, reg) {
    const codigo = conceptoDe(formato, reg);
    const m = marcasConcepto(formato, codigo) || {};
    if (termino.incluirMarcas && !termino.incluirMarcas.some((k) => m[k])) return false;
    if (termino.excluirMarcas && termino.excluirMarcas.some((k) => m[k])) return false;
    return true;
  }

  function signoRegistro(formato, termino, reg) {
    let s = termino.signo === undefined ? 1 : termino.signo;
    if (termino.usarSignosRetenciones) {
      const m = marcasConcepto(formato, conceptoDe(formato, reg));
      if (m && m.signoRetenciones) s *= m.signoRetenciones;
    }
    return s;
  }

  function estadoSemaforo(resto, parametros) {
    const a = Math.abs(resto);
    if (a < R.PARAMETROS.verdeUVT * parametros.uvt) return 'verde';
    if (a < parametros.umbralUVT * parametros.uvt) return 'amarillo';
    return 'rojo';
  }

  const ORDEN_ESTADO = { rojo: 4, amarillo: 3, verde: 2, 'sin datos': 1, omitida: 0 };

  /** Calcula una línea de cruce. */
  function calcularLinea(linea, porFormato, declaraciones, explicaciones, parametros) {
    const res = {
      id: linea.id, nombre: linea.nombre, detalle: linea.detalle, opcional: !!linea.opcional,
      exogena: 0, declarado: null, diferencia: null, explicado: 0, resto: null, uvt: null, estado: 'sin datos',
      faltanFormatos: [], formatos: [], terceros: [], causas: linea.causas.map((c) => Object.assign({ id: c }, R.CAUSAS[c])),
      explicaciones: (explicaciones && explicaciones[linea.id]) || [], periodos: [], notas: []
    };
    const porTercero = new Map();
    let hayExogena = false;
    for (const t of linea.exogena) {
      if (!res.formatos.includes(t.formato)) res.formatos.push(t.formato);
      const f = porFormato[t.formato];
      if (!f) {
        if (!res.faltanFormatos.includes(t.formato)) res.faltanFormatos.push(t.formato);
        continue;
      }
      hayExogena = true;
      const roles = rolesDe(t.formato);
      for (const reg of f.registros) {
        if (!terminoIncluye(t.formato, t, reg)) continue;
        const s = signoRegistro(t.formato, t, reg);
        let v = 0;
        for (const at of t.atributos) v += numero(reg.atr[at]);
        if (!v) continue;
        res.exogena += s * v;
        const tdoc = roles.tdoc ? sinCeros(reg.atr[roles.tdoc]) : '';
        const nid = roles.nid ? String(reg.atr[roles.nid] || '').trim() : '';
        const clave = tdoc + '|' + nid;
        let t3 = porTercero.get(clave);
        if (!t3) {
          t3 = { tdoc, nid, nombre: textoTercero(reg, roles), valor: 0, formatos: new Set() };
          porTercero.set(clave, t3);
        }
        if (!t3.nombre) t3.nombre = textoTercero(reg, roles);
        t3.valor += s * v;
        t3.formatos.add(t.formato);
      }
    }
    // Los formatos que faltan solo cuentan si ninguno de la línea está cargado.
    if (hayExogena && res.faltanFormatos.length) res.notas.push(`No se cargó el ${res.faltanFormatos.join(' ni el ')}; la cifra de la exógena se armó sin ${res.faltanFormatos.length > 1 ? 'ellos' : 'él'}.`);

    const valoresDeclarados = linea.declarado.map((d) => ({ campo: d.campo, signo: d.signo === undefined ? 1 : d.signo, valor: valorCampo(declaraciones, d.campo) }));
    const hayDeclarado = valoresDeclarados.some((d) => d.valor !== null);
    if (hayDeclarado) {
      res.declarado = valoresDeclarados.reduce((s, d) => s + d.signo * (d.valor || 0), 0);
      const campoPrincipal = linea.declarado[0].campo;
      const def = CAMPOS[campoPrincipal];
      if (def.formulario !== '110') {
        // Detalle por periodo de la casilla principal: dónde mirar primero.
        const ps = periodosCampo(declaraciones, campoPrincipal);
        if (ps.length > 1) {
          res.periodos = ps;
          const vacios = ps.filter((p) => p.valor === null).map((p) => p.nombre);
          if (vacios.length) res.notas.push(`Sin cifra en ${vacios.join(', ')} (casilla ${def.casilla} del ${def.formulario}).`);
        }
      }
    }
    res.camposDeclarados = valoresDeclarados.map((d) => Object.assign({}, CAMPOS[d.campo], { signo: d.signo, valor: d.valor }));

    if (!hayDeclarado && !hayExogena) {
      res.estado = linea.opcional ? 'omitida' : 'sin datos';
      res.motivo = 'Faltan la exógena y la cifra declarada.';
      return res;
    }
    if (!hayDeclarado) {
      if (linea.opcional && res.exogena === 0) { res.estado = 'omitida'; return res; }
      res.estado = 'sin datos';
      res.motivo = `Falta la cifra declarada (${res.camposDeclarados.filter((c) => c.signo > 0).map((c) => `casilla ${c.casilla} del ${c.formulario}`).join(', ')}).`;
      return res;
    }
    if (!hayExogena) {
      res.estado = 'sin datos';
      res.motivo = `Falta el formato ${res.faltanFormatos.join(' o el ')}.`;
      return res;
    }
    res.diferencia = res.declarado - res.exogena;
    res.explicado = res.explicaciones.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    res.resto = res.diferencia - res.explicado;
    res.uvt = res.diferencia / parametros.uvt;
    res.restoUVT = res.resto / parametros.uvt;
    res.estado = estadoSemaforo(res.resto, parametros);
    res.explicada = res.explicaciones.length > 0 && Math.abs(res.diferencia) >= R.PARAMETROS.verdeUVT * parametros.uvt && res.estado !== 'rojo';
    const base = Math.abs(res.exogena) || 1;
    res.terceros = Array.from(porTercero.values())
      .filter((t) => t.valor !== 0)
      .sort((x, y) => Math.abs(y.valor) - Math.abs(x.valor) || x.nid.localeCompare(y.nid))
      .slice(0, 10)
      .map((t) => ({ tdoc: t.tdoc, nid: t.nid, nombre: t.nombre, valor: t.valor, participacion: t.valor / base, formatos: Array.from(t.formatos) }));
    return res;
  }

  function calcularCruces(porFormato, declaraciones, explicaciones, parametros) {
    return R.CRUCES.map((c) => {
      const lineas = c.lineas.map((l) => calcularLinea(l, porFormato, declaraciones, explicaciones, parametros));
      const visibles = lineas.filter((l) => l.estado !== 'omitida');
      const estado = visibles.reduce((peor, l) => (ORDEN_ESTADO[l.estado] > ORDEN_ESTADO[peor] ? l.estado : peor), 'sin datos');
      return { id: c.id, nombre: c.nombre, pregunta: c.pregunta, norma: c.norma, donde: c.donde, criterio: c.criterio, estado, lineas: visibles };
    });
  }

  // ----------------------------------------------------- formatos que faltan

  function formatosFaltantes(porFormato, declaraciones, contexto, parametros) {
    const lista = [];
    for (const e of R.FORMATOS_ESPERADOS) {
      if (porFormato[e.formato]) continue;
      let espera = false;
      if (e.personaJuridica) espera = !!(contexto && contexto.personaJuridica) && Object.keys(porFormato).length > 0;
      else {
        const suma = e.cuando.reduce((s, c) => s + Math.max(0, valorCampo(declaraciones, c) || 0), 0);
        const resta = (e.restar || []).reduce((s, c) => s + Math.max(0, valorCampo(declaraciones, c) || 0), 0);
        const minimo = (e.minimoUVT || 0) * parametros.uvt;
        espera = suma - resta > 0 && suma - resta >= minimo;
      }
      if (espera) {
        lista.push(nuevoHallazgo('formatos-faltantes', { formato: e.formato, mensaje: `No se cargó el ${e.formato} (${R.FORMATOS[e.formato].nombre}). ${e.texto}.`, cantidad: 1, ejemplos: [], todos: [] }));
      }
    }
    return lista;
  }

  // --------------------------------------------------------------- todo junto

  /**
   * Corre todo: recibe los archivos ya leídos (leerArchivo), las cifras de las
   * declaraciones, las explicaciones de cada línea y los parámetros, y devuelve
   * el resultado completo.
   *
   * entrada = {
   *   archivos: [archivo],
   *   declaraciones: { periodicidad: { 300: 'bimestral', 350: 'mensual' }, valores: { r58: { A: 123 }, ... } },
   *   explicaciones: { C6: [{ descripcion, valor }] },
   *   parametros: { uvt, umbralUVT },
   *   contexto: { nitCliente, nombreCliente, personaJuridica }
   * }
   */
  function verificar(entrada) {
    const parametros = {
      uvt: Number(entrada.parametros && entrada.parametros.uvt) || R.PARAMETROS.uvt.valor,
      umbralUVT: Number(entrada.parametros && entrada.parametros.umbralUVT) || R.PARAMETROS.umbralUVT.valor
    };
    const archivos = entrada.archivos || [];
    for (const a of archivos) {
      a.incluido = a.estado === 'leido';
      delete a.repetidoDe;
    }
    const contexto = entrada.contexto || {};
    const { porFormato, hallazgos: deConsolidar } = consolidar(archivos);
    const deArchivos = [];
    for (const a of archivos) for (const h of a.hallazgos) deArchivos.push(Object.assign({ archivo: a.nombre, formato: a.formato }, h));
    const deContenido = revisarContenido(porFormato, contexto, parametros);
    const faltantes = formatosFaltantes(porFormato, entrada.declaraciones, contexto, parametros);
    const hallazgos = deArchivos.concat(deConsolidar, deContenido, faltantes)
      .sort((a, b) => GRAVEDADES.indexOf(a.gravedad) - GRAVEDADES.indexOf(b.gravedad));
    const cruces = calcularCruces(porFormato, entrada.declaraciones, entrada.explicaciones, parametros);
    const resumen = { rojo: 0, amarillo: 0, verde: 0, 'sin datos': 0 };
    for (const c of cruces) resumen[c.estado]++;
    const conteo = { error: 0, advertencia: 0, informacion: 0 };
    for (const h of hallazgos) conteo[h.gravedad] += h.cantidad || 1;
    return { anio: R.ANIO_GRAVABLE, parametros, contexto, archivos, porFormato, hallazgos, conteo, cruces, resumen, reglasRevisadas: R.PARAMETROS.revisadas };
  }

  // -------------------------------------------------------------- salidas

  function pesos(n) {
    if (n === null || n === undefined) return '';
    return String(Math.round(n));
  }

  function celdaCSV(v) {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  const NOMBRE_ESTADO = { verde: 'Cuadra', amarillo: 'Revisar', rojo: 'No cuadra', 'sin datos': 'Sin datos' };

  function nombreEstado(linea) {
    if (linea.estado === 'verde' && linea.explicada) return 'Explicada';
    return NOMBRE_ESTADO[linea.estado] || linea.estado;
  }

  /** Todo el resultado en un CSV para Excel (punto y coma y marca BOM, para que lea las tildes). */
  function aCSV(resultado) {
    const filas = [];
    const fila = (...c) => filas.push(c.map(celdaCSV).join(';'));
    const ctx = resultado.contexto || {};
    fila('Verificador de exógena', `Año gravable ${resultado.anio}`);
    fila('Cliente', ctx.nombreCliente || '', 'NIT', ctx.nitCliente || '');
    fila('UVT', resultado.parametros.uvt, 'Umbral en UVT', resultado.parametros.umbralUVT, 'Reglas revisadas', resultado.reglasRevisadas);
    fila();
    fila('CRUCES');
    fila('Cruce', 'Línea', 'Exógena', 'Declarado', 'Diferencia (declarado - exógena)', 'Diferencia en UVT', 'Explicado', 'Sin explicar', 'Estado', 'Detalle');
    for (const c of resultado.cruces) {
      for (const l of c.lineas) {
        fila(`${c.id} ${c.nombre}`, `${l.id} ${l.nombre}`, pesos(l.exogena), pesos(l.declarado), pesos(l.diferencia), l.uvt === null ? '' : l.uvt.toFixed(2).replace('.', ','), pesos(l.explicado), pesos(l.resto), nombreEstado(l), l.motivo || l.detalle);
      }
    }
    fila();
    fila('EXPLICACIONES');
    fila('Línea', 'Explicación', 'Valor');
    for (const c of resultado.cruces) for (const l of c.lineas) for (const e of l.explicaciones) fila(l.id, e.descripcion, pesos(e.valor));
    fila();
    fila('TERCEROS QUE MÁS PESAN EN LA EXÓGENA DE CADA LÍNEA');
    fila('Línea', 'Tipo de documento', 'Número', 'Nombre', 'Valor', 'Participación');
    for (const c of resultado.cruces) for (const l of c.lineas) for (const t of l.terceros) fila(l.id, t.tdoc, t.nid, t.nombre, pesos(t.valor), (t.participacion * 100).toFixed(1).replace('.', ',') + ' %');
    fila();
    fila('REVISIONES DE LOS XML');
    fila('Gravedad', 'Revisión', 'Formato', 'Archivo', 'Línea', 'Identificación', 'Concepto', 'Mensaje');
    for (const h of resultado.hallazgos) {
      const casos = h.todos && h.todos.length ? h.todos : [null];
      for (const e of casos) fila(h.gravedad, h.titulo, h.formato || '', (e && e.archivo) || h.archivo || '', e && e.linea ? e.linea : '', (e && e.nid) || '', (e && e.concepto) || '', h.mensaje);
    }
    fila();
    fila('ARCHIVOS');
    fila('Archivo', 'Formato', 'Versión', 'Registros', 'Envío', 'Concepto', 'Estado');
    for (const a of resultado.archivos) fila(a.nombre, a.formato || '', a.version || '', a.registros.length, a.cab.NumEnvio || '', a.cab.CodCpt || '', a.repetidoDe ? 'repetido' : a.estado);
    return '﻿' + filas.join('\r\n') + '\r\n';
  }

  function cop(n) {
    if (n === null || n === undefined) return 'sin dato';
    return (n < 0 ? '-' : '') + '$' + miles(Math.abs(n));
  }

  /** Un resumen sin NIT ni nombres de terceros, para pedir ayuda. */
  function resumenSinNIT(resultado) {
    const r = [];
    r.push(`Verificador de exógena, año gravable ${resultado.anio}: resumen sin datos de terceros`);
    r.push(`UVT ${cop(resultado.parametros.uvt)}; umbral ${resultado.parametros.umbralUVT} UVT (${cop(resultado.parametros.uvt * resultado.parametros.umbralUVT)}).`);
    r.push('');
    for (const c of resultado.cruces) {
      for (const l of c.lineas) {
        if (l.estado === 'sin datos') {
          r.push(`${l.id} ${l.nombre}: sin datos. ${l.motivo || ''}`.trim());
          continue;
        }
        const partes = [`${l.id} ${l.nombre}: ${nombreEstado(l)}.`, `Exógena ${cop(l.exogena)}, declarado ${cop(l.declarado)}, diferencia ${cop(l.diferencia)} (${l.uvt.toFixed(1).replace('.', ',')} UVT).`];
        if (l.explicaciones.length) partes.push(`Explicado ${cop(l.explicado)}: ${l.explicaciones.map((e) => e.descripcion).join('; ')}. Sin explicar ${cop(l.resto)}.`);
        r.push(partes.join(' '));
      }
    }
    r.push('');
    const c = resultado.conteo;
    r.push(`Revisiones de los XML: ${c.error} errores, ${c.advertencia} advertencias.`);
    const titulos = Array.from(new Set(resultado.hallazgos.filter((h) => h.gravedad !== 'informacion').map((h) => h.titulo)));
    if (titulos.length) r.push('Revisiones con hallazgos: ' + titulos.join('; ') + '.');
    r.push('');
    r.push('¿Quiere ayuda con estas diferencias? Andrés Briñez · contacto@andresbrinez.com · andresbrinez.com');
    return r.join('\n');
  }

  // ------------------------------------------------ plantilla y pegado

  const NOMBRES_FORMULARIO = { 110: 'Renta 110', 300: 'IVA 300', 350: 'Retenciones 350' };

  /** La plantilla de cifras para Excel, con la periodicidad elegida para el 300 y el 350. */
  function plantillaCSV(periodicidad) {
    const filas = ['Declaración;Casilla;Concepto;Periodo;Valor'];
    for (const [formulario, dec] of Object.entries(R.DECLARACIONES)) {
      const per = periodicidadDe({ periodicidad }, formulario);
      for (const c of dec.casillas) {
        for (const p of R.PERIODOS[per]) {
          filas.push([NOMBRES_FORMULARIO[formulario], c.casilla, c.nombre + (c.opcional ? ' (opcional)' : ''), p.nombre, ''].map(celdaCSV).join(';'));
        }
      }
    }
    return '﻿' + filas.join('\r\n') + '\r\n';
  }

  function normalizarClave(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /**
   * Lee un bloque pegado desde Excel con las columnas de la plantilla
   * (Declaración, Casilla, Concepto, Periodo, Valor), separadas por tabulador o
   * por punto y coma. Devuelve { valores, periodicidad, leidas, avisos }.
   */
  function leerPegado(texto, periodicidadActual) {
    const avisos = [];
    const valores = {};
    const usadas = { 300: new Set(), 350: new Set() };
    let leidas = 0;
    const lineas = String(texto || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    const indicePeriodo = {};
    for (const [per, lista] of Object.entries(R.PERIODOS)) {
      for (const p of lista) {
        indicePeriodo[normalizarClave(p.nombre)] = { per, id: p.id };
        indicePeriodo[normalizarClave(p.id)] = { per, id: p.id };
        if (p.detalle) indicePeriodo[normalizarClave(p.detalle)] = { per, id: p.id };
      }
    }
    lineas.forEach((linea, k) => {
      const celdas = linea.split(linea.includes('\t') ? '\t' : ';').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (normalizarClave(celdas[0]) === 'declaracion') return;
      const form = (/(110|300|350)/.exec(celdas[0] || '') || [])[1];
      if (!form) { avisos.push(`Fila ${k + 1}: no se reconoce la declaración «${celdas[0] || ''}».`); return; }
      const casilla = R.DECLARACIONES[form].casillas.find((c) => normalizarClave(c.casilla) === normalizarClave(celdas[1]));
      if (!casilla) { avisos.push(`Fila ${k + 1}: la casilla «${celdas[1] || ''}» no está en la plantilla del ${form}.`); return; }
      const p = indicePeriodo[normalizarClave(celdas[3])];
      if (!p || !R.DECLARACIONES[form].periodicidades.includes(p.per)) { avisos.push(`Fila ${k + 1}: el periodo «${celdas[3] || ''}» no sirve para el ${form}.`); return; }
      const valorTexto = celdas.length > 4 ? celdas[celdas.length - 1] : '';
      if (valorTexto === '') return;
      const v = leerCifra(valorTexto);
      if (v === null) { avisos.push(`Fila ${k + 1}: «${valorTexto}» no es una cifra.`); return; }
      (valores[casilla.id] = valores[casilla.id] || {})[p.id] = v;
      if (usadas[form]) usadas[form].add(p.per);
      leidas++;
    });
    const periodicidad = Object.assign({}, periodicidadActual);
    for (const form of ['300', '350']) {
      const pers = Array.from(usadas[form]);
      if (pers.length === 1) periodicidad[form] = pers[0];
      else if (pers.length > 1) avisos.push(`El ${form} trae periodos de varias periodicidades (${pers.join(', ')}); se usa ${periodicidad[form] || pers[0]}.`);
    }
    return { valores, periodicidad, leidas, avisos };
  }

  return {
    leerArchivo, consolidar, revisarContenido, formatosFaltantes, calcularCruces, verificar,
    aCSV, resumenSinNIT, plantillaCSV, leerPegado, leerCifra, digitoVerificacion, valorCampo, periodosCampo,
    revisarValor, nombreEstado, cop, CAMPOS, huella
  };
});
