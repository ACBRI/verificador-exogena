/*
 * Verificador de exógena: el lector de XML.
 *
 * Lee los archivos de la exógena tal como los pide la especificación técnica de
 * la DIAN: un documento XML 1.0 con un elemento raíz «mas», una cabecera «Cab»
 * y un registro por elemento. Es un lector propio y pequeño para que el
 * navegador y Node lean igual (las pruebas corren en Node) y para poder decir
 * en qué línea está cada error.
 *
 * Qué hace:
 * - Decodifica los bytes con la codificación que declara el archivo
 *   (ISO-8859-1, que es la que pide la DIAN, o UTF-8).
 * - Revisa que el documento esté bien formado: etiquetas que abren y cierran,
 *   atributos sin repetir, comillas, referencias de carácter válidas.
 * - No procesa declaraciones DOCTYPE ni entidades externas: un archivo de la
 *   exógena no las trae, y así ningún archivo puede pedirle al navegador que
 *   busque algo afuera.
 *
 * Corre en el navegador (como window.ExoXML) y en Node (require).
 */
(function (raiz, fabrica) {
  'use strict';
  var modulo = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else raiz.ExoXML = modulo;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class ErrorXML extends Error {
    constructor(mensaje, linea, columna) {
      super(mensaje);
      this.name = 'ErrorXML';
      this.linea = linea;
      this.columna = columna;
    }
  }

  // ------------------------------------------------------------ codificación

  const ETIQUETAS_LATIN1 = new Set(['iso-8859-1', 'iso8859-1', 'latin1', 'latin-1', 'l1', 'iso_8859-1', 'cp1252', 'windows-1252', 'us-ascii', 'ascii']);
  const ETIQUETAS_UTF8 = new Set(['utf-8', 'utf8']);

  /** La codificación que declara el encabezado <?xml ... encoding="..."?>, en minúsculas, o '' si no declara. */
  function codificacionDeclarada(bytes) {
    const n = Math.min(bytes.length, 300);
    let cabeza = '';
    for (let i = 0; i < n; i++) cabeza += String.fromCharCode(bytes[i]);
    const m = /^(?:\xEF\xBB\xBF)?\s*<\?xml[^>]*?encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(cabeza);
    return m ? m[1].toLowerCase() : '';
  }

  /**
   * Convierte los bytes de un archivo en texto.
   * Devuelve { texto, declarada, usada, avisos }.
   * - Con marca BOM de UTF-8, se lee como UTF-8.
   * - Si declara ISO-8859-1 (o una equivalente), se lee como tal.
   * - Si declara UTF-8 o no declara nada, se lee como UTF-8; si los bytes no son
   *   UTF-8 válido, se lee como ISO-8859-1 y se avisa.
   */
  function decodificar(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    const avisos = [];
    const bom = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    const declarada = codificacionDeclarada(bytes);
    let usada;
    if (bom) usada = 'utf-8';
    else if (ETIQUETAS_LATIN1.has(declarada)) usada = 'iso-8859-1';
    else if (ETIQUETAS_UTF8.has(declarada) || declarada === '') usada = 'utf-8';
    else {
      avisos.push(`El archivo declara la codificación «${declarada}», que el verificador no conoce; se leyó como ISO-8859-1.`);
      usada = 'iso-8859-1';
    }
    let texto;
    if (usada === 'utf-8') {
      try {
        texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch (e) {
        avisos.push('El archivo dice ser UTF-8 pero trae caracteres de otra codificación; se leyó como ISO-8859-1.');
        usada = 'iso-8859-1';
      }
    }
    if (usada === 'iso-8859-1') texto = new TextDecoder('windows-1252').decode(bytes);
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);
    return { texto, declarada, usada, avisos };
  }

  // ---------------------------------------------------------------- lector

  const RE_NOMBRE = /[\p{L}_:][\p{L}\p{N}._:\-·]*/uy;
  const RE_ESPACIO = /[ \t\r\n]*/y;
  const ENTIDADES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

  function caracterValido(cp) {
    return cp === 0x9 || cp === 0xA || cp === 0xD ||
      (cp >= 0x20 && cp <= 0xD7FF) || (cp >= 0xE000 && cp <= 0xFFFD) || (cp >= 0x10000 && cp <= 0x10FFFF);
  }

  /**
   * Lee un documento XML y devuelve su elemento raíz:
   * { nombre, atributos (objeto sin prototipo), orden (nombres de atributo en
   *   orden), hijos: [elementos], texto, linea, columna }.
   * Si el documento no está bien formado, lanza ErrorXML con la línea y la columna.
   */
  function leer(texto) {
    const s = String(texto);
    const largo = s.length;
    let i = 0;

    // Inicios de línea, para traducir una posición a línea y columna.
    const inicios = [0];
    for (let k = 0; k < largo; k++) if (s.charCodeAt(k) === 10) inicios.push(k + 1);
    function posicion(p) {
      let bajo = 0;
      let alto = inicios.length - 1;
      while (bajo < alto) {
        const medio = (bajo + alto + 1) >> 1;
        if (inicios[medio] <= p) bajo = medio;
        else alto = medio - 1;
      }
      return { linea: bajo + 1, columna: p - inicios[bajo] + 1 };
    }
    function fallar(mensaje, p) {
      const pos = posicion(p === undefined ? i : p);
      throw new ErrorXML(mensaje, pos.linea, pos.columna);
    }

    // Caracteres que XML 1.0 no admite (por ejemplo, un salto de página pegado al copiar).
    for (let k = 0; k < largo; k++) {
      const c = s.charCodeAt(k);
      if (c < 0x20 && c !== 9 && c !== 10 && c !== 13) fallar(`Hay un carácter de control no permitido en XML (código ${c}).`, k);
      if (c === 0xFFFE || c === 0xFFFF) fallar('Hay un carácter no permitido en XML.', k);
    }

    function espacios() {
      RE_ESPACIO.lastIndex = i;
      RE_ESPACIO.exec(s);
      i = RE_ESPACIO.lastIndex;
    }
    function nombre() {
      RE_NOMBRE.lastIndex = i;
      const m = RE_NOMBRE.exec(s);
      if (!m) fallar('Se esperaba un nombre de etiqueta o de atributo.');
      i = RE_NOMBRE.lastIndex;
      return m[0];
    }
    function referencias(valor, inicio) {
      if (valor.indexOf('&') === -1) return valor;
      return valor.replace(/&([^;&<\s]*);?/g, (todo, ref, desplazamiento) => {
        if (!todo.endsWith(';')) fallar('Hay un «&» suelto: en XML se escribe «&amp;».', inicio + desplazamiento);
        if (ref[0] === '#') {
          const cp = ref[1] === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
          const bien = ref[1] === 'x' ? /^#x[0-9A-Fa-f]+$/.test(ref) : /^#[0-9]+$/.test(ref);
          if (!bien || !caracterValido(cp)) fallar(`La referencia de carácter «&${ref};» no es válida.`, inicio + desplazamiento);
          return String.fromCodePoint(cp);
        }
        if (Object.prototype.hasOwnProperty.call(ENTIDADES, ref)) return ENTIDADES[ref];
        return fallar(`La entidad «&${ref};» no está definida en XML.`, inicio + desplazamiento);
      });
    }
    function saltarComentario() {
      const fin = s.indexOf('-->', i + 4);
      if (fin === -1) fallar('Un comentario «<!--» no se cierra.');
      if (s.slice(i + 4, fin).includes('--')) fallar('Un comentario no puede llevar «--» por dentro.');
      i = fin + 3;
    }
    function saltarInstruccion() {
      const fin = s.indexOf('?>', i + 2);
      if (fin === -1) fallar('Una instrucción «<?» no se cierra.');
      const objetivo = /^<\?([^\s?]+)/.exec(s.slice(i, fin + 2));
      if (objetivo && objetivo[1].toLowerCase() === 'xml') fallar('La declaración <?xml ...?> solo puede ir al comienzo del archivo.');
      i = fin + 2;
    }

    // Prólogo: declaración XML, comentarios, instrucciones y espacios.
    if (s.startsWith('<?xml') && /^<\?xml[\s?]/.test(s.slice(0, 6))) {
      const fin = s.indexOf('?>');
      if (fin === -1) fallar('La declaración <?xml ...?> no se cierra.');
      const decl = s.slice(0, fin + 2);
      if (!/^<\?xml\s+version\s*=\s*["']1\.[0-9]+["']/.test(decl)) fallar('La declaración <?xml ...?> debe empezar por version="1.0".');
      i = fin + 2;
    }
    for (;;) {
      espacios();
      if (s.startsWith('<!--', i)) saltarComentario();
      else if (s.startsWith('<?', i)) saltarInstruccion();
      else if (s.startsWith('<!DOCTYPE', i)) fallar('El archivo trae una declaración DOCTYPE. Los XML de la exógena no la usan, y el verificador no la procesa.');
      else break;
    }
    if (i >= largo || s[i] !== '<') fallar(i >= largo ? 'El archivo está vacío o no tiene elemento raíz.' : 'Hay texto antes del elemento raíz.');

    // Elementos, con una pila para revisar que cada uno cierre donde debe.
    const pila = [];
    let raizDoc = null;
    for (;;) {
      if (i >= largo) {
        if (pila.length) {
          const abierto = pila[pila.length - 1];
          fallar(`La etiqueta <${abierto.nombre}> (línea ${abierto.linea}) no se cierra.`, largo);
        }
        break;
      }
      if (s[i] === '<') {
        if (s.startsWith('<!--', i)) { saltarComentario(); continue; }
        if (s.startsWith('<?', i)) { saltarInstruccion(); continue; }
        if (s.startsWith('<![CDATA[', i)) {
          if (!pila.length) fallar('Hay una sección CDATA fuera del elemento raíz.');
          const fin = s.indexOf(']]>', i + 9);
          if (fin === -1) fallar('Una sección CDATA no se cierra.');
          pila[pila.length - 1].texto += s.slice(i + 9, fin);
          i = fin + 3;
          continue;
        }
        if (s.startsWith('<!', i)) fallar('Hay una declaración «<!» que XML no admite dentro del documento.');
        if (s[i + 1] === '/') {
          // Etiqueta de cierre.
          const inicio = i;
          i += 2;
          const n = nombre();
          espacios();
          if (s[i] !== '>') fallar(`La etiqueta de cierre </${n}> está mal escrita.`);
          i++;
          const abierto = pila.pop();
          if (!abierto) fallar(`Sobra la etiqueta de cierre </${n}>.`, inicio);
          if (abierto.nombre !== n) fallar(`Se esperaba </${abierto.nombre}> (abierta en la línea ${abierto.linea}) y aparece </${n}>.`, inicio);
          if (!pila.length) {
            // Después de la raíz solo pueden venir comentarios, instrucciones y espacios.
            for (;;) {
              espacios();
              if (s.startsWith('<!--', i)) saltarComentario();
              else if (s.startsWith('<?', i)) saltarInstruccion();
              else break;
            }
            if (i < largo) fallar('Hay contenido después del cierre del elemento raíz.');
            break;
          }
          continue;
        }
        // Etiqueta de apertura.
        const inicio = i;
        if (raizDoc && !pila.length) fallar('El documento tiene más de un elemento raíz.');
        i++;
        const pos = posicion(inicio);
        const elemento = { nombre: nombre(), atributos: Object.create(null), orden: [], hijos: [], texto: '', linea: pos.linea, columna: pos.columna };
        for (;;) {
          const antes = i;
          espacios();
          if (s[i] === '>' || (s[i] === '/' && s[i + 1] === '>')) break;
          if (i >= largo) fallar(`La etiqueta <${elemento.nombre}> no se termina.`, inicio);
          if (i === antes) fallar(`Falta un espacio entre los atributos de <${elemento.nombre}>.`);
          const inicioAtributo = i;
          const a = nombre();
          espacios();
          if (s[i] !== '=') fallar(`Al atributo «${a}» le falta el signo «=».`);
          i++;
          espacios();
          const comilla = s[i];
          if (comilla !== '"' && comilla !== "'") fallar(`El valor del atributo «${a}» debe ir entre comillas.`);
          const fin = s.indexOf(comilla, i + 1);
          if (fin === -1) fallar(`El valor del atributo «${a}» no cierra las comillas.`);
          const crudo = s.slice(i + 1, fin);
          const menor = crudo.indexOf('<');
          if (menor !== -1) fallar(`El valor del atributo «${a}» trae un «<», que XML no admite; se escribe «&lt;».`, i + 1 + menor);
          if (Object.prototype.hasOwnProperty.call(elemento.atributos, a)) fallar(`El atributo «${a}» está repetido en <${elemento.nombre}>.`, inicioAtributo);
          elemento.atributos[a] = referencias(crudo.replace(/[\t\n\r]/g, ' '), i + 1);
          elemento.orden.push(a);
          i = fin + 1;
        }
        if (pila.length) pila[pila.length - 1].hijos.push(elemento);
        else raizDoc = elemento;
        if (s[i] === '/') {
          i += 2;
          if (!pila.length) {
            for (;;) {
              espacios();
              if (s.startsWith('<!--', i)) saltarComentario();
              else if (s.startsWith('<?', i)) saltarInstruccion();
              else break;
            }
            if (i < largo) fallar('Hay contenido después del cierre del elemento raíz.');
            break;
          }
        } else {
          i += 1;
          pila.push(elemento);
        }
        continue;
      }
      // Texto entre etiquetas.
      const fin = s.indexOf('<', i);
      const hasta = fin === -1 ? largo : fin;
      const crudo = s.slice(i, hasta);
      if (!pila.length) {
        if (crudo.trim()) fallar('Hay texto fuera del elemento raíz.');
      } else {
        if (crudo.includes(']]>')) fallar('El texto trae «]]>», que XML no admite fuera de una sección CDATA.', i + crudo.indexOf(']]>'));
        pila[pila.length - 1].texto += referencias(crudo, i);
      }
      i = hasta;
    }
    if (!raizDoc) fallar('El archivo no tiene elemento raíz.');
    return raizDoc;
  }

  return { leer, decodificar, codificacionDeclarada, ErrorXML };
});
