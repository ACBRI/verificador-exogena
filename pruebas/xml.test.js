'use strict';
// Pruebas del lector de XML. Se corren con `node --test`.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const X = require('../src/xml.js');

function falla(texto, parecido, linea) {
  assert.throws(() => X.leer(texto), (e) => {
    assert.ok(e instanceof X.ErrorXML, 'debe ser ErrorXML');
    assert.match(e.message, parecido);
    if (linea !== undefined) assert.equal(e.linea, linea);
    return true;
  });
}

describe('lectura de documentos bien formados', () => {
  test('raíz, cabecera, registros y posiciones', () => {
    const r = X.leer('<?xml version="1.0" encoding="ISO-8859-1"?>\n<mas>\n  <Cab><Ano>2026</Ano></Cab>\n  <pagos cpt="5002" tdoc=\'31\' />\n</mas>\n');
    assert.equal(r.nombre, 'mas');
    assert.equal(r.hijos.length, 2);
    assert.equal(r.hijos[0].hijos[0].texto, '2026');
    assert.deepEqual({ ...r.hijos[1].atributos }, { cpt: '5002', tdoc: '31' });
    assert.deepEqual(r.hijos[1].orden, ['cpt', 'tdoc']);
    assert.equal(r.hijos[1].linea, 4);
    assert.equal(r.hijos[1].columna, 3);
  });

  test('referencias de entidad y de carácter', () => {
    const r = X.leer('<mas a="A &amp; B &lt; C &#209;&#xF1; &quot;x&quot; &apos;y&apos;">t &gt; u</mas>');
    assert.equal(r.atributos.a, 'A & B < C Ññ "x" \'y\'');
    assert.equal(r.texto, 't > u');
  });

  test('comentarios, instrucciones y CDATA', () => {
    const r = X.leer('<?xml version="1.0"?><!-- antes --><?otra cosa?><mas><!-- dentro --><![CDATA[<no es etiqueta>]]></mas><!-- después -->');
    assert.equal(r.texto, '<no es etiqueta>');
  });

  test('los saltos de línea dentro de un atributo se vuelven espacios', () => {
    assert.equal(X.leer('<mas a="uno\ndos\ttres"/>').atributos.a, 'uno dos tres');
  });

  test('un atributo llamado __proto__ no contamina nada', () => {
    const r = X.leer('<mas __proto__="x" constructor="y"/>');
    assert.equal(r.atributos.__proto__, 'x');
    assert.equal({}.x, undefined);
  });
});

describe('documentos mal formados', () => {
  test('etiqueta sin cerrar y cierre equivocado', () => {
    falla('<mas>\n<pagos>\n</mas>', /Se esperaba <\/pagos>/, 3);
    falla('<mas><pagos/>', /no se cierra/);
  });
  test('atributo repetido, sin comillas o con «<»', () => {
    falla('<mas a="1" a="2"/>', /repetido/);
    falla('<mas a=1/>', /comillas/);
    falla('<mas a="<"/>', /&lt;/);
    falla('<mas a="1"b="2"/>', /espacio/);
  });
  test('entidades desconocidas y «&» suelto', () => {
    falla('<mas>&nbsp;</mas>', /no está definida/);
    falla('<mas a="A & B"/>', /suelto/);
    falla('<mas>&#0;</mas>', /no es válida/);
  });
  test('DOCTYPE, raíz doble, texto fuera y archivo vacío', () => {
    falla('<!DOCTYPE mas [<!ENTITY x "y">]><mas/>', /DOCTYPE/);
    falla('<mas/><otra/>', /después del cierre/);
    falla('hola<mas/>', /texto antes/);
    falla('', /vacío/);
    falla('<?xml version="1.0"?>', /vacío/);
  });
  test('declaración XML fuera del comienzo y caracteres de control', () => {
    falla('<mas><?xml version="1.0"?></mas>', /solo puede ir al comienzo/);
    falla('<mas>\u000C</mas>', /control/);
  });
  test('comentario con «--» o sin cerrar', () => {
    falla('<mas><!-- a -- b --></mas>', /--/);
    falla('<mas><!-- a </mas>', /no se cierra/);
  });
});

describe('codificación', () => {
  test('ISO-8859-1 declarada se lee como tal', () => {
    const bytes = Buffer.concat([Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><mas a="'), Buffer.from([0xD1, 0xC1]), Buffer.from('"/>')]);
    const d = X.decodificar(bytes);
    assert.equal(d.usada, 'iso-8859-1');
    assert.equal(X.leer(d.texto).atributos.a, 'ÑÁ');
  });
  test('UTF-8 declarada, con BOM o sin declaración', () => {
    const utf8 = Buffer.from('<?xml version="1.0" encoding="UTF-8"?><mas a="Ñ"/>', 'utf8');
    assert.equal(X.decodificar(utf8).usada, 'utf-8');
    assert.equal(X.leer(X.decodificar(utf8).texto).atributos.a, 'Ñ');
    const bom = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('<mas a="é"/>', 'utf8')]);
    assert.equal(X.leer(X.decodificar(bom).texto).atributos.a, 'é');
  });
  test('si dice UTF-8 pero no lo es, se lee como ISO-8859-1 y se avisa', () => {
    const bytes = Buffer.concat([Buffer.from('<?xml version="1.0" encoding="UTF-8"?><mas a="'), Buffer.from([0xD1]), Buffer.from('"/>')]);
    const d = X.decodificar(bytes);
    assert.equal(d.usada, 'iso-8859-1');
    assert.equal(d.avisos.length, 1);
    assert.equal(X.leer(d.texto).atributos.a, 'Ñ');
  });
  test('dice ISO-8859-1 pero está en UTF-8: se lee como UTF-8 y se avisa', () => {
    const bytes = Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><mas a="Número – Ñ"/>', 'utf8');
    const d = X.decodificar(bytes);
    assert.equal(d.usada, 'utf-8');
    assert.match(d.avisos[0], /está escrito en UTF-8/);
    assert.equal(X.leer(d.texto).atributos.a, 'Número – Ñ');
  });
  test('los bytes 0x80 a 0x9F se leen como en Windows, igual en todas partes', () => {
    const bytes = Buffer.concat([Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><mas a="'), Buffer.from([0x80, 0x93, 0x96, 0x81, 0xD1]), Buffer.from('"/>')]);
    const d = X.decodificar(bytes);
    assert.equal(d.usada, 'iso-8859-1');
    assert.deepEqual(d.avisos, []);
    assert.equal(X.leer(d.texto).atributos.a, '\u20AC\u201C\u2013\u0081Ñ');
  });
  test('codificación desconocida', () => {
    const d = X.decodificar(Buffer.from('<?xml version="1.0" encoding="EBCDIC-X"?><mas/>'));
    assert.equal(d.usada, 'iso-8859-1');
    assert.match(d.avisos[0], /no conoce/);
  });
});
