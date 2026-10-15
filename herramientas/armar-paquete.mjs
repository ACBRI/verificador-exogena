#!/usr/bin/env node
// Arma el paquete de descarga: paquete/verificador-exogena-ag2025.zip, con la página
// y la guía «Cómo usar el verificador» en PDF.
//
//   npm run paquete              imprime la guía solo si cambió, y arma el ZIP
//   npm run paquete -- --imprimir   la imprime aunque no haya cambiado
//
// La guía (guia/como-usar-el-verificador.html) se imprime con el Chromium de
// Playwright, como los documentos del sitio, y antes de imprimir se pregunta si
// las tipografías cargaron: una ruta mal escrita en un @font-face no da error,
// imprime con la letra de reserva. También se detiene si el texto de una hoja no
// cabe (quedaría escondido debajo del pie) o si el PDF no sale de una o dos hojas.
// Va antes `npm run construir`: el ZIP lleva la página tal como está en el disco.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import paquete from './paquete.js';
import { buscarChromium } from './chromium.mjs';

const { RAIZ, GUIA, PDF, ZIP, HUELLAS, sha256, huellaGuia, armarPaquete, leerHuellas, paginasPDF } = paquete;
const ruta = (r) => path.join(RAIZ, r);

async function imprimirGuia() {
  const navegador = await chromium.launch({ executablePath: buscarChromium() });
  try {
    const pagina = await navegador.newPage();
    await pagina.goto(pathToFileURL(ruta(GUIA)).href);
    await pagina.evaluate(() => document.fonts.ready);
    const fallidas = await pagina.evaluate(() => [...document.fonts].filter((f) => f.status !== 'loaded').map((f) => `${f.family} ${f.weight}`));
    if (fallidas.length) throw new Error(`no cargaron estas tipografías: ${fallidas.join(', ')}`);
    const desbordadas = await pagina.$$eval('.hoja', (hojas) => hojas
      .map((h, i) => ({ hoja: i + 1, sobra: h.scrollHeight - h.clientHeight }))
      .filter((h) => h.sobra > 0));
    if (desbordadas.length) throw new Error('el texto no cabe en ' + desbordadas.map((d) => `la hoja ${d.hoja} (${d.sobra} px de más)`).join(' ni en '));
    const pdf = await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
    const hojas = paginasPDF(pdf);
    if (hojas < 1 || hojas > 2) throw new Error(`la guía salió de ${hojas} hojas; tiene que ser de una o dos`);
    return { pdf, hojas, version: navegador.version() };
  } finally {
    await navegador.close();
  }
}

try {
  const huella = huellaGuia();
  const antes = leerHuellas();
  const forzar = process.argv.includes('--imprimir');
  let pdf;
  let navegador = antes && antes.navegador;
  if (forzar || !antes || antes.guia !== huella || !fs.existsSync(ruta(PDF))) {
    const impresa = await imprimirGuia();
    pdf = impresa.pdf;
    navegador = `Chromium ${impresa.version}`;
    fs.mkdirSync(path.dirname(ruta(PDF)), { recursive: true });
    fs.writeFileSync(ruta(PDF), pdf);
    console.log(`Guía impresa: ${PDF} (${impresa.hojas} hojas, ${Math.round(pdf.length / 1024)} KB)`);
  } else {
    pdf = fs.readFileSync(ruta(PDF));
    console.log(`Guía sin cambios: se usa ${PDF}`);
  }
  const zip = armarPaquete(pdf);
  fs.writeFileSync(ruta(ZIP), zip);
  fs.writeFileSync(ruta(HUELLAS), JSON.stringify({ guia: huella, pdf: sha256(pdf), navegador }, null, 2) + '\n');
  console.log(`Paquete: ${ZIP} (${Math.round(zip.length / 1024)} KB)`);
} catch (error) {
  console.error(`FALLO: ${error.message}`);
  process.exit(1);
}
