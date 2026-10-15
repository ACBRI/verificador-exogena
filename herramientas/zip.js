'use strict';
/*
 * Un ZIP pequeño y sin dependencias para el paquete de descarga: escribe y lee
 * archivos con deflate o sin comprimir, con los nombres en ASCII y una fecha
 * fija, para que el mismo contenido dé siempre el mismo paquete. Lo que Windows
 * («Extraer todo») y el Mac (Utilidad de Archivo) abren sin preguntar nada.
 *
 * Formato: APPNOTE de PKWARE, secciones 4.3 y 4.4. Sin ZIP64: cada archivo y el
 * paquete entero tienen que pesar menos de 4 GB, y aquí pesan menos de 1 MB.
 */
const zlib = require('node:zlib');

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN = 0x06054b50;
const VERSION = 20; // 2.0: deflate. «Hecho por» MS-DOS: sin permisos de Unix que interpretar.

/** La fecha y la hora en el formato de MS-DOS que guarda el ZIP (de dos en dos segundos). */
function fechaDos(fecha) {
  const hora = (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | Math.floor(fecha.getSeconds() / 2);
  const dia = ((fecha.getFullYear() - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate();
  return { hora, dia };
}

/**
 * Arma el ZIP. `entradas`: [{ nombre, datos }], en el orden en que se quieren ver.
 * Cada archivo va comprimido con deflate, salvo que así pese más (un PDF ya viene
 * comprimido): entonces va tal cual.
 */
function armarZip(entradas, fecha) {
  const { hora, dia } = fechaDos(fecha);
  const locales = [];
  const centrales = [];
  let desplazamiento = 0;
  for (const { nombre, datos } of entradas) {
    if (!/^[\x21-\x7e]+$/.test(nombre)) throw new Error(`El nombre «${nombre}» tiene que ir en ASCII y sin espacios.`);
    const nombreBytes = Buffer.from(nombre, 'ascii');
    const comprimido = zlib.deflateRawSync(datos, { level: 9 });
    const metodo = comprimido.length < datos.length ? 8 : 0;
    const cuerpo = metodo === 8 ? comprimido : datos;
    const crc = zlib.crc32(datos);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(FIRMA_LOCAL, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(0, 6); // sin banderas: nombres en ASCII, tamaños en la cabecera
    local.writeUInt16LE(metodo, 8);
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(dia, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(cuerpo.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nombreBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locales.push(local, nombreBytes, cuerpo);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(FIRMA_CENTRAL, 0);
    central.writeUInt16LE(VERSION, 4); // hecho por: MS-DOS, versión 2.0
    central.writeUInt16LE(VERSION, 6); // versión necesaria para abrirlo
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(metodo, 10);
    central.writeUInt16LE(hora, 12);
    central.writeUInt16LE(dia, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(cuerpo.length, 20);
    central.writeUInt32LE(datos.length, 24);
    central.writeUInt16LE(nombreBytes.length, 28);
    central.writeUInt16LE(0, 30); // campo extra
    central.writeUInt16LE(0, 32); // comentario
    central.writeUInt16LE(0, 34); // disco
    central.writeUInt16LE(0, 36); // atributos internos
    central.writeUInt32LE(0, 38); // atributos externos
    central.writeUInt32LE(desplazamiento, 42);
    centrales.push(central, nombreBytes);

    desplazamiento += local.length + nombreBytes.length + cuerpo.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(FIRMA_FIN, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  fin.writeUInt16LE(0, 20);
  return Buffer.concat([...locales, directorio, fin]);
}

/**
 * Lee un ZIP como el que arma `armarZip`: devuelve [{ nombre, datos, metodo, fecha }]
 * en el orden del directorio central, con cada archivo descomprimido y su CRC
 * comprobado. Lanza un error si algo no cuadra.
 */
function leerZip(zip) {
  const finEn = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (finEn < 0) throw new Error('No es un ZIP: no tiene el registro de fin del directorio central.');
  const total = zip.readUInt16LE(finEn + 10);
  const tamanoDirectorio = zip.readUInt32LE(finEn + 12);
  let p = zip.readUInt32LE(finEn + 16);
  if (p + tamanoDirectorio !== finEn) throw new Error('El directorio central no termina donde empieza su registro de fin.');
  const entradas = [];
  for (let i = 0; i < total; i++) {
    if (zip.readUInt32LE(p) !== FIRMA_CENTRAL) throw new Error(`La entrada ${i + 1} del directorio central no tiene su firma.`);
    const metodo = zip.readUInt16LE(p + 10);
    const hora = zip.readUInt16LE(p + 12);
    const dia = zip.readUInt16LE(p + 14);
    const crc = zip.readUInt32LE(p + 16);
    const comprimido = zip.readUInt32LE(p + 20);
    const tamano = zip.readUInt32LE(p + 24);
    const largoNombre = zip.readUInt16LE(p + 28);
    const largoExtra = zip.readUInt16LE(p + 30);
    const largoComentario = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const nombre = zip.toString('latin1', p + 46, p + 46 + largoNombre);
    p += 46 + largoNombre + largoExtra + largoComentario;

    if (zip.readUInt32LE(local) !== FIRMA_LOCAL) throw new Error(`${nombre}: la cabecera local no tiene su firma.`);
    const nombreLocal = zip.toString('latin1', local + 30, local + 30 + zip.readUInt16LE(local + 26));
    if (nombreLocal !== nombre) throw new Error(`${nombre}: la cabecera local dice «${nombreLocal}».`);
    const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const cuerpo = zip.subarray(inicio, inicio + comprimido);
    let datos;
    if (metodo === 8) datos = zlib.inflateRawSync(cuerpo);
    else if (metodo === 0) datos = Buffer.from(cuerpo);
    else throw new Error(`${nombre}: método de compresión ${metodo} desconocido.`);
    if (datos.length !== tamano) throw new Error(`${nombre}: pesa ${datos.length} bytes y el ZIP dice ${tamano}.`);
    if (zlib.crc32(datos) !== crc) throw new Error(`${nombre}: el CRC no coincide.`);
    const fecha = new Date(1980 + (dia >> 9), ((dia >> 5) & 15) - 1, dia & 31, hora >> 11, (hora >> 5) & 63, (hora & 31) * 2);
    entradas.push({ nombre, datos, metodo, fecha });
  }
  return entradas;
}

module.exports = { armarZip, leerZip };
