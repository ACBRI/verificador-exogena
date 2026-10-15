/*
 * Verificador de exógena: la página.
 *
 * Lee los XML que la persona arrastra o elige, toma las cifras de las
 * declaraciones (escritas o pegadas desde Excel), corre verificador.js y pinta
 * el informe. Todo pasa en el navegador: la página no envía nada a ninguna
 * parte y lo cargado vive solo en la memoria mientras la pestaña esté abierta.
 */
(function () {
  'use strict';

  const V = window.ExoVerificador;
  const R = window.ExoReglas;
  const EJEMPLOS = window.ExoEjemplos || {};
  const LOGO = document.querySelector('.firma svg') ? document.querySelector('.firma svg').outerHTML : '';
  const CLAVE_TEMA = 'verificador-exogena-tema';
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const estado = {
    archivos: [],
    declaraciones: { periodicidad: { 300: 'anual', 350: 'anual' }, valores: {} },
    explicaciones: {},
    parametros: { uvt: R.PARAMETROS.uvt.valor, umbralUVT: R.PARAMETROS.umbralUVT.valor },
    contexto: { nombreCliente: '', nitCliente: '', personaJuridica: true },
    resultado: null,
    ejemplo: null
  };

  // ------------------------------------------------------------ utilidades

  function $(id) {
    return document.getElementById(id);
  }

  /** Crea un elemento. Los textos van siempre como texto, nunca como HTML. */
  function el(etiqueta, atributos, ...hijos) {
    const e = document.createElement(etiqueta);
    if (atributos) {
      for (const [k, v] of Object.entries(atributos)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'clase') e.className = v;
        else if (k === 'texto') e.textContent = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const h of hijos.flat()) {
      if (h === null || h === undefined || h === false) continue;
      e.appendChild(typeof h === 'string' || typeof h === 'number' ? document.createTextNode(String(h)) : h);
    }
    return e;
  }

  function miles(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return '';
    const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '-' : '') + s;
  }

  function pesos(n) {
    if (n === null || n === undefined) return '';
    const s = miles(n);
    return s.startsWith('-') ? '-$' + s.slice(1) : '$' + s;
  }

  function uvts(n) {
    if (n === null || n === undefined) return '';
    const signo = n < 0 ? '-' : '';
    const [entero, dec] = Math.abs(n).toFixed(1).split('.');
    return signo + entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
  }

  function porcentaje(p) {
    return (p * 100).toFixed(1).replace('.', ',') + ' %';
  }

  function fechaHoy() {
    const f = new Date();
    return `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
  }

  function descargar(contenido, nombre, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function nombreSeguro(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);
  }

  const NOMBRE_ESTADO = { rojo: 'No cuadra', amarillo: 'Revisar', verde: 'Cuadra', 'sin datos': 'Sin datos' };
  const CLASE_ESTADO = { rojo: 's-rojo', amarillo: 's-amarillo', verde: 's-verde', 'sin datos': 's-sin' };

  function chip(estadoLinea, explicada) {
    const texto = estadoLinea === 'verde' && explicada ? 'Explicada' : NOMBRE_ESTADO[estadoLinea];
    return el('span', { clase: 'semaforo ' + CLASE_ESTADO[estadoLinea], texto });
  }

  // ------------------------------------------------------------------ tema

  const botonTema = $('boton-tema');
  function temaActual() {
    const fijado = document.documentElement.getAttribute('data-theme');
    if (fijado) return fijado;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function pintarBotonTema() {
    const oscuro = temaActual() === 'dark';
    botonTema.setAttribute('aria-pressed', String(oscuro));
    botonTema.querySelector('span').textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
  }
  botonTema.addEventListener('click', () => {
    const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    try {
      window.localStorage.setItem(CLAVE_TEMA, nuevo);
    } catch (e) {
      // Sin almacenamiento: el modo dura mientras la página esté abierta.
    }
    pintarBotonTema();
  });
  pintarBotonTema();

  // -------------------------------------------------------------- recalcular

  let pendiente = null;
  function recalcular(inmediato) {
    clearTimeout(pendiente);
    if (inmediato) return calcular();
    pendiente = setTimeout(calcular, 120);
    return undefined;
  }

  function hayAlgo() {
    return estado.archivos.length > 0 || Object.keys(estado.declaraciones.valores).length > 0;
  }

  function calcular() {
    if (!hayAlgo()) {
      estado.resultado = null;
      pintarInforme();
      return;
    }
    estado.resultado = V.verificar({
      archivos: estado.archivos,
      declaraciones: estado.declaraciones,
      explicaciones: estado.explicaciones,
      parametros: estado.parametros,
      contexto: estado.contexto
    });
    pintarArchivos();
    pintarInforme();
  }

  // ------------------------------------------------------------- archivos

  const estadoCarga = $('estado-carga');

  async function leerArchivos(lista) {
    const archivos = Array.from(lista || []);
    if (!archivos.length) return;
    let leidos = 0;
    const problemas = [];
    for (const f of archivos) {
      try {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const a = V.leerArchivo(f.name, bytes);
        estado.archivos.push(a);
        leidos++;
      } catch (e) {
        problemas.push(`${f.name}: ${e && e.message ? e.message : 'no se pudo leer'}`);
      }
    }
    estado.ejemplo = null;
    estadoCarga.textContent = `${leidos === 1 ? 'Se leyó 1 archivo' : `Se leyeron ${leidos} archivos`}.` + (problemas.length ? ` No se pudieron leer: ${problemas.join('; ')}.` : '');
    recalcular(true);
  }

  $('archivos-xml').addEventListener('change', (e) => {
    leerArchivos(e.target.files);
    e.target.value = '';
  });

  const soltar = $('soltar');
  soltar.addEventListener('dragover', (e) => {
    e.preventDefault();
    soltar.classList.add('encima');
  });
  soltar.addEventListener('dragleave', () => soltar.classList.remove('encima'));
  soltar.addEventListener('drop', (e) => {
    e.preventDefault();
    soltar.classList.remove('encima');
    leerArchivos(e.dataTransfer && e.dataTransfer.files);
  });
  // Si un archivo cae fuera de la zona, el navegador no lo abre (se perdería lo cargado).
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  function textoEstadoArchivo(a) {
    if (a.repetidoDe) return 'Repetido: se cuenta una vez';
    switch (a.estado) {
      case 'leido': {
        const n = a.hallazgos.filter((h) => h.gravedad !== 'informacion').length;
        return n ? `Leído, con ${n === 1 ? 'una revisión' : n + ' revisiones'} en el informe` : 'Leído';
      }
      case 'no revisado': return 'Formato que no se revisa';
      case 'version distinta': return 'Versión distinta: fuera de los cruces';
      case 'fuera del año': return 'Fuera del año gravable 2025';
      default: return 'No se pudo leer: vea el informe';
    }
  }

  function pintarArchivos() {
    const cuerpo = $('cuerpo-archivos');
    cuerpo.textContent = '';
    $('lista-archivos').hidden = estado.archivos.length === 0;
    estado.archivos.forEach((a, k) => {
      const formato = a.formato ? `${a.formato}${a.version ? ' v' + a.version : ''}` : '';
      const nombre = a.formato && R.FORMATOS[a.formato] ? R.FORMATOS[a.formato].nombre : '';
      cuerpo.appendChild(el('tr', null,
        el('td', null, el('span', { clase: 'archivo-nombre', texto: a.nombre })),
        el('td', null, el('span', { clase: 'cifra', texto: formato }), nombre ? el('span', { clase: 'archivo-detalle', texto: nombre }) : null),
        el('td', { clase: 'numero', texto: miles(a.registros.length) }),
        el('td', { clase: 'numero', texto: a.cab && a.cab.NumEnvio ? String(a.cab.NumEnvio).trim() : '' }),
        el('td', { texto: textoEstadoArchivo(a) }),
        el('td', null, el('button', {
          type: 'button', clase: 'boton-mini', 'aria-label': `Quitar ${a.nombre}`, texto: 'Quitar',
          onclick: () => {
            estado.archivos.splice(k, 1);
            recalcular(true);
            if (!estado.archivos.length) pintarArchivos();
          }
        }))
      ));
    });
  }

  // --------------------------------------------------------------- cliente

  function leerCliente() {
    estado.contexto.nombreCliente = $('cliente-nombre').value.trim();
    estado.contexto.nitCliente = $('cliente-nit').value.replace(/\D/g, '');
    estado.contexto.personaJuridica = $('cliente-juridica').checked;
    recalcular();
  }
  $('cliente-nombre').addEventListener('input', leerCliente);
  $('cliente-nit').addEventListener('input', leerCliente);
  $('cliente-juridica').addEventListener('change', leerCliente);

  // --------------------------------------------------------- declaraciones

  function periodos(formulario) {
    return R.PERIODOS[estado.declaraciones.periodicidad[formulario] || 'anual'];
  }

  function guardarCelda(input) {
    const campo = input.dataset.campo;
    const periodo = input.dataset.periodo;
    const texto = input.value.trim();
    const valores = estado.declaraciones.valores;
    if (texto === '') {
      if (valores[campo]) {
        delete valores[campo][periodo];
        if (!Object.keys(valores[campo]).length) delete valores[campo];
      }
      input.removeAttribute('aria-invalid');
    } else {
      const v = V.leerCifra(texto);
      if (v === null) {
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      input.removeAttribute('aria-invalid');
      (valores[campo] = valores[campo] || {})[periodo] = v;
    }
    pintarTotal(campo);
  }

  function pintarTotal(campo) {
    const celda = document.querySelector(`[data-total="${campo}"]`);
    if (!celda) return;
    const v = V.valorCampo(estado.declaraciones, campo);
    celda.textContent = v === null ? '' : miles(v);
  }

  function pegarEnRejilla(e) {
    const texto = (e.clipboardData || window.clipboardData).getData('text');
    if (!/[\t\n]/.test(texto.replace(/\r?\n$/, ''))) return;
    e.preventDefault();
    const filas = texto.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((f) => f.split('\t'));
    const origen = e.target;
    const tabla = origen.closest('table');
    const celdas = Array.from(tabla.querySelectorAll('input[data-campo]'));
    const fila0 = Number(origen.dataset.fila);
    const col0 = Number(origen.dataset.col);
    let llenas = 0;
    filas.forEach((fila, df) => {
      fila.forEach((valor, dc) => {
        const destino = celdas.find((c) => Number(c.dataset.fila) === fila0 + df && Number(c.dataset.col) === col0 + dc);
        if (!destino) return;
        destino.value = valor.trim();
        guardarCelda(destino);
        formatearCelda(destino);
        llenas++;
      });
    });
    $('estado-pegado').textContent = `Se pegaron ${llenas} cifras en la tabla.`;
    recalcular();
  }

  function formatearCelda(input) {
    if (input.getAttribute('aria-invalid') === 'true') return;
    const v = V.leerCifra(input.value);
    if (v !== null) input.value = miles(v);
  }

  function celda(dec, c, p, fila, col) {
    const v = estado.declaraciones.valores[c.id] && estado.declaraciones.valores[c.id][p.id];
    return el('td', null, el('input', {
      type: 'text', inputmode: 'numeric', autocomplete: 'off', spellcheck: 'false',
      'data-campo': c.id, 'data-periodo': p.id, 'data-fila': String(fila), 'data-col': String(col),
      'aria-label': `${dec.nombre}, casilla ${c.casilla}, ${c.nombre}, ${p.nombre}`,
      value: v === undefined ? '' : miles(v),
      oninput: (e) => { guardarCelda(e.target); recalcular(); },
      onblur: (e) => formatearCelda(e.target),
      onpaste: pegarEnRejilla
    }));
  }

  function tituloCasilla(c, etiqueta) {
    return el(etiqueta, { clase: 'fila-titulo', scope: etiqueta === 'th' ? 'row' : null },
      el('span', { clase: 'casilla-num', texto: `Casilla ${c.casilla}` }), c.nombre,
      c.opcional ? el('span', { clase: 'opcional', texto: ' (opcional)' }) : null);
  }

  /**
   * Una declaración con el total del año: una fila por casilla. Por periodo: una
   * fila por periodo y una columna por casilla, para pegar una columna de Excel
   * (por ejemplo, los doce meses de una casilla) de una sola vez.
   */
  function pintarDeclaraciones() {
    const marco = $('declaraciones');
    marco.textContent = '';
    for (const [formulario, dec] of Object.entries(R.DECLARACIONES)) {
      const ps = periodos(formulario);
      const varios = ps.length > 1;
      let tabla;
      if (!varios) {
        tabla = el('table', { clase: 'rejilla rejilla-anual' },
          el('caption', { clase: 'visualmente-oculto', texto: dec.nombre }),
          el('thead', null, el('tr', null, el('th', { clase: 'fila-titulo', scope: 'col', texto: 'Casilla' }), el('th', { scope: 'col', texto: 'Valor del año' }))),
          el('tbody', null, dec.casillas.map((c, i) => el('tr', null, tituloCasilla(c, 'th'), celda(dec, c, ps[0], i, 0)))));
      } else {
        tabla = el('table', { clase: 'rejilla rejilla-periodos' },
          el('caption', { clase: 'visualmente-oculto', texto: dec.nombre }),
          el('thead', null, el('tr', null,
            el('th', { clase: 'periodo', scope: 'col', texto: 'Periodo' }),
            dec.casillas.map((c) => el('th', { clase: 'col-casilla', scope: 'col' }, el('span', { clase: 'casilla-num', texto: `Casilla ${c.casilla}` }), c.nombre, c.opcional ? el('span', { clase: 'opcional', texto: ' (opcional)' }) : null)))),
          el('tbody', null,
            ps.map((p, i) => el('tr', null, el('th', { clase: 'periodo', scope: 'row', title: p.detalle || p.nombre, texto: p.nombre }), dec.casillas.map((c, j) => celda(dec, c, p, i, j)))),
            el('tr', { clase: 'fila-total' }, el('th', { clase: 'periodo', scope: 'row', texto: 'Total' }), dec.casillas.map((c) => el('td', { clase: 'total', 'data-total': c.id })))));
      }
      const norma = R.NORMAS[dec.norma];
      marco.appendChild(el('div', { clase: 'declaracion' },
        el('h3', { texto: dec.nombre }),
        el('p', { clase: 'nota', texto: norma.nombre + '.' }),
        el('div', { clase: 'rejilla-marco' }, tabla)));
      if (varios) for (const c of dec.casillas) pintarTotal(c.id);
    }
  }

  function fijarPeriodicidad(formulario, valor) {
    estado.declaraciones.periodicidad[formulario] = valor;
    $('per-' + formulario).value = valor;
  }

  $('per-300').addEventListener('change', (e) => { fijarPeriodicidad('300', e.target.value); pintarDeclaraciones(); recalcular(); });
  $('per-350').addEventListener('change', (e) => { fijarPeriodicidad('350', e.target.value); pintarDeclaraciones(); recalcular(); });

  $('descargar-plantilla').addEventListener('click', () => {
    descargar(V.plantillaCSV(estado.declaraciones.periodicidad), 'plantilla-cifras-exogena-ag2025.csv', 'text/csv;charset=utf-8');
  });

  $('leer-pegado').addEventListener('click', () => {
    const r = V.leerPegado($('texto-pegado').value, estado.declaraciones.periodicidad);
    for (const [campo, porPeriodo] of Object.entries(r.valores)) {
      estado.declaraciones.valores[campo] = Object.assign(estado.declaraciones.valores[campo] || {}, porPeriodo);
    }
    for (const f of ['300', '350']) if (r.periodicidad[f]) fijarPeriodicidad(f, r.periodicidad[f]);
    pintarDeclaraciones();
    const avisos = r.avisos.length ? ` ${r.avisos.length === 1 ? 'Un aviso' : r.avisos.length + ' avisos'}: ${r.avisos.slice(0, 3).join(' ')}${r.avisos.length > 3 ? ' …' : ''}` : '';
    $('estado-pegado').textContent = `Se leyeron ${r.leidas} cifras.${avisos}`;
    recalcular(true);
  });

  // ------------------------------------------------------------ parámetros

  function leerParametros() {
    const uvt = V.leerCifra($('p-uvt').value);
    const umbral = Number(String($('p-umbral').value).replace(',', '.'));
    $('p-uvt').setAttribute('aria-invalid', String(!(uvt > 0)));
    $('p-umbral').setAttribute('aria-invalid', String(!(umbral > 0)));
    if (uvt > 0) estado.parametros.uvt = uvt;
    if (umbral > 0) estado.parametros.umbralUVT = umbral;
    recalcular();
  }
  $('p-uvt').addEventListener('input', leerParametros);
  $('p-umbral').addEventListener('input', leerParametros);
  $('parametros').addEventListener('submit', (e) => e.preventDefault());

  // ----------------------------------------------------------------- informe

  function nombreTercero(t) {
    return t.nombre || '(sin nombre)';
  }

  /** Una línea de un cruce. Si el cruce tiene una sola línea, la fila lleva el nombre del cruce. */
  function filaLinea(l, cruceUnico) {
    const vacia = l.estado === 'sin datos';
    return el('tr', { clase: cruceUnico ? 'fila-unica' : null },
      el('td', { clase: 'celda-linea' },
        el('span', { clase: 'id', texto: cruceUnico ? cruceUnico.id : l.id }), cruceUnico ? cruceUnico.nombre : l.nombre,
        vacia && l.motivo ? el('span', { clase: 'motivo', texto: l.motivo }) : null,
        l.explicada ? el('span', { clase: 'motivo motivo-explicado', texto: `Explicado ${pesos(l.explicado)}; sin explicar ${pesos(l.resto)}` }) : null),
      el('td', { clase: 'numero', 'data-etiqueta': 'Exógena', texto: vacia && !l.formatos.some((f) => !l.faltanFormatos.includes(f)) ? '' : pesos(l.exogena) }),
      el('td', { clase: 'numero', 'data-etiqueta': 'Declarado', texto: l.declarado === null ? '' : pesos(l.declarado) }),
      el('td', { clase: 'numero', 'data-etiqueta': 'Diferencia', texto: l.diferencia === null ? '' : pesos(l.diferencia) }),
      el('td', { clase: 'numero', 'data-etiqueta': 'UVT', texto: l.uvt === null ? '' : uvts(l.uvt) }),
      el('td', { 'data-etiqueta': 'Estado' }, chip(l.estado, l.explicada))
    );
  }

  function formularioExplicacion(l) {
    const desc = el('input', { type: 'text', 'aria-label': `Explicación para ${l.id}`, placeholder: 'Qué explica la diferencia' });
    const valor = el('input', { type: 'text', clase: 'cifra', inputmode: 'numeric', 'aria-label': `Valor que explica, para ${l.id}`, placeholder: 'Valor' });
    if (l.resto !== null) valor.value = miles(l.resto);
    return el('form', {
      clase: 'form-explicacion solo-pantalla',
      onsubmit: (e) => {
        e.preventDefault();
        const v = V.leerCifra(valor.value);
        if (!desc.value.trim() || v === null || v === 0) {
          (desc.value.trim() ? valor : desc).setAttribute('aria-invalid', 'true');
          return;
        }
        (estado.explicaciones[l.id] = estado.explicaciones[l.id] || []).push({ descripcion: desc.value.trim(), valor: v });
        recalcular(true);
      }
    }, desc, valor, el('button', { type: 'submit', clase: 'boton-mini', texto: 'Agregar explicación' }));
  }

  function listaExplicaciones(l, conBorrar) {
    if (!l.explicaciones.length) return null;
    return el('ul', { clase: 'explicaciones' }, l.explicaciones.map((x, k) => el('li', null,
      el('span', { texto: x.descripcion }),
      el('span', null, el('span', { clase: 'cifra', texto: pesos(x.valor) }), conBorrar ? ' ' : null, conBorrar ? el('button', {
        type: 'button', clase: 'boton-enlace solo-pantalla', texto: 'Quitar', 'aria-label': `Quitar la explicación «${x.descripcion}»`,
        onclick: () => {
          estado.explicaciones[l.id].splice(k, 1);
          if (!estado.explicaciones[l.id].length) delete estado.explicaciones[l.id];
          recalcular(true);
        }
      }) : null)
    )));
  }

  function bloqueDetalle(l) {
    return el('div', { clase: 'detalle d-' + l.estado },
      el('h4', null, el('span', null, `${l.id} ${l.nombre}`), el('span', { clase: 'cifra', texto: `diferencia ${pesos(l.diferencia)} · ${uvts(l.uvt)} UVT${l.explicaciones.length ? ` · sin explicar ${pesos(l.resto)}` : ''}` })),
      el('p', { clase: 'detalle-texto', texto: l.detalle }),
      el('h5', { texto: 'Qué revisar' }),
      el('ul', { clase: 'causas' }, l.causas.map((c) => el('li', null, el('strong', { texto: c.titulo + '.' }), ' ', el('span', { clase: 'causa-texto', texto: c.texto })))),
      l.terceros.length ? el('h5', { texto: `Los ${l.terceros.length === 10 ? '10' : l.terceros.length} terceros que más pesan en la exógena` }) : null,
      l.terceros.length ? el('table', { clase: 'terceros' }, el('tbody', null, l.terceros.map((t) => el('tr', null,
        el('td', { clase: 'nid', texto: t.nid }),
        el('td', { texto: nombreTercero(t), title: nombreTercero(t) }),
        el('td', { clase: 'valor', texto: pesos(t.valor) }),
        el('td', { clase: 'pct', texto: porcentaje(t.participacion) })
      )))) : null,
      l.explicaciones.length ? el('h5', { texto: 'Explicaciones' }) : null,
      listaExplicaciones(l, true),
      l.notas.length ? el('p', { clase: 'detalle-texto', texto: l.notas.join(' ') }) : null,
      formularioExplicacion(l)
    );
  }

  function textoEjemplos(h) {
    const casos = (h.ejemplos || []).map((x) => {
      const partes = [];
      if (x.archivo || h.archivo) partes.push(x.archivo || h.archivo);
      if (x.linea) partes.push(`línea ${x.linea}`);
      if (x.nid) partes.push(`NIT ${x.nid}`);
      if (x.concepto) partes.push(`concepto ${x.concepto}`);
      return partes.join(', ');
    }).filter(Boolean);
    if (!casos.length) return '';
    return casos.join(' · ') + (h.cantidad > casos.length ? ` · y ${h.cantidad - casos.length} más` : '');
  }

  const NOMBRE_GRAVEDAD = { error: 'Error', advertencia: 'Advertencia', informacion: 'Información' };

  function pintarInforme() {
    const hoja = $('informe');
    const res = estado.resultado;
    $('informe-vacio').hidden = !!res;
    hoja.hidden = !res;
    $('acciones-informe').hidden = !res;
    $('resumen-texto').hidden = !res;
    if (!res) return;
    hoja.textContent = '';

    const ctx = estado.contexto;
    const nombre = ctx.nombreCliente || 'Cliente sin nombre';
    const conteoArchivos = estado.archivos.length;
    const formatos = Object.keys(res.porFormato).sort().join(', ');
    const meta = [
      ctx.nitCliente ? `NIT ${ctx.nitCliente}` : null,
      `UVT ${pesos(res.parametros.uvt)}`,
      `umbral ${uvts(res.parametros.umbralUVT).replace(/,0$/, '')} UVT (${pesos(res.parametros.uvt * res.parametros.umbralUVT)})`,
      `${conteoArchivos} ${conteoArchivos === 1 ? 'archivo' : 'archivos'} XML${formatos ? ': ' + formatos : ''}`,
      fechaHoy()
    ].filter(Boolean).join(' · ');

    const cabecera = el('header', { clase: 'hoja-cabecera' });
    const firma = el('span', { clase: 'firma' });
    firma.innerHTML = LOGO; // el logotipo es parte de la página, no un dato cargado
    firma.appendChild(el('span', { texto: 'Andrés Briñez' }));
    cabecera.append(firma, el('span', { clase: 'hoja-titulo', texto: `Verificador de exógena · Año gravable ${res.anio}` }));

    const lineas = res.cruces.flatMap((c) => c.lineas);
    // Las fichas cuentan cruces: cada uno toma el peor estado de sus líneas.
    const cuenta = (e) => res.resumen[e] || 0;
    const umbral = uvts(res.parametros.umbralUVT).replace(/,0$/, '');
    const fichas = el('div', { clase: 'fichas' },
      el('div', { clase: 'ficha ficha-rojo' }, el('p', { clase: 'ficha-etiqueta', texto: 'No cuadra' }), el('span', { clase: 'ficha-valor', texto: String(cuenta('rojo')) }), el('p', { clase: 'ficha-nota', texto: `cruces con ${umbral} UVT o más sin explicar` })),
      el('div', { clase: 'ficha' }, el('p', { clase: 'ficha-etiqueta', texto: 'Revisar' }), el('span', { clase: 'ficha-valor', texto: String(cuenta('amarillo')) }), el('p', { clase: 'ficha-nota', texto: `cruces entre 1 y ${umbral} UVT` })),
      el('div', { clase: 'ficha' }, el('p', { clase: 'ficha-etiqueta', texto: 'Cuadra' }), el('span', { clase: 'ficha-valor', texto: String(cuenta('verde')) }), el('p', { clase: 'ficha-nota', texto: cuenta('sin datos') ? `cruces; ${cuenta('sin datos')} sin datos` : 'cruces con menos de 1 UVT' })),
      el('div', { clase: 'ficha' }, el('p', { clase: 'ficha-etiqueta', texto: 'Revisiones de los XML' }), el('span', { clase: 'ficha-valor', texto: String(res.conteo.error) }), el('p', { clase: 'ficha-nota', texto: `errores · ${res.conteo.advertencia} advertencias` }))
    );

    const filas = [];
    for (const c of res.cruces) {
      if (c.lineas.length === 1) {
        filas.push(filaLinea(c.lineas[0], c));
        continue;
      }
      filas.push(el('tr', { clase: 'fila-cruce' }, el('td', { colspan: '5' }, el('span', { clase: 'id', texto: c.id }), c.nombre), el('td', null, chip(c.estado, false))));
      for (const l of c.lineas) filas.push(filaLinea(l));
    }
    const tabla = el('table', { clase: 'cruces' },
      el('caption', { clase: 'visualmente-oculto', texto: 'Los ocho cruces con su semáforo' }),
      el('thead', null, el('tr', null, el('th', { texto: 'Cruce' }), el('th', { clase: 'numero', texto: 'Exógena' }), el('th', { clase: 'numero', texto: 'Declarado' }), el('th', { clase: 'numero', texto: 'Diferencia' }), el('th', { clase: 'numero', texto: 'UVT' }), el('th', { texto: 'Estado' }))),
      el('tbody', null, filas));

    const conDiferencia = lineas.filter((l) => l.estado === 'rojo' || l.estado === 'amarillo');
    const explicadas = lineas.filter((l) => l.estado === 'verde' && l.explicaciones.length);
    const detalles = conDiferencia.length ? el('div', { clase: 'detalles' }, conDiferencia.map(bloqueDetalle)) : null;
    const bloqueExplicadas = explicadas.length ? el('div', { clase: 'explicadas' },
      el('h4', { texto: 'Diferencias explicadas' }),
      explicadas.map((l) => el('div', null, el('strong', { texto: `${l.id} ${l.nombre}: ` }), listaExplicaciones(l, true)))) : null;

    const revisiones = el('section', { clase: 'revisiones', 'aria-label': 'Revisiones de los XML' },
      el('h4', { texto: 'Revisiones de los XML' }),
      res.hallazgos.length
        ? el('ul', null, res.hallazgos.map((h) => el('li', null,
          el('span', { clase: 'gravedad g-' + h.gravedad, texto: NOMBRE_GRAVEDAD[h.gravedad] }),
          el('strong', { texto: h.titulo }),
          h.formato ? ` · ${h.formato}` : '',
          h.cantidad > 1 ? ` · ${miles(h.cantidad)} casos` : '',
          el('span', { clase: 'mensaje', texto: '. ' + h.mensaje }),
          textoEjemplos(h) ? el('span', { clase: 'donde', texto: textoEjemplos(h) }) : null)))
        : el('p', { clase: 'sin-hallazgos', texto: 'Las revisiones de los XML no encontraron nada.' }));

    const pie = el('footer', { clase: 'hoja-pie' },
      el('p', null, el('strong', { texto: 'contacto@andresbrinez.com' }), ' · andresbrinez.com'),
      el('p', { texto: `Reglas del año gravable ${res.anio}, revisadas el ${fechaReglas(res.reglasRevisadas)}. Muestra diferencias y causas posibles; el contador decide.` }));

    hoja.append(cabecera, el('div', { clase: 'hoja-cuerpo' },
      el('div', { clase: 'hoja-cliente' }, el('h3', { texto: nombre }), el('p', { clase: 'hoja-meta', texto: meta })),
      fichas, tabla, detalles, bloqueExplicadas, revisiones), pie);

    $('texto-resumen').value = V.resumenSinNIT(res);
  }

  function fechaReglas(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
  }

  // --------------------------------------------------------------- acciones

  $('imprimir').addEventListener('click', () => {
    const titulo = document.title;
    const cliente = estado.contexto.nombreCliente || estado.contexto.nitCliente;
    document.title = `Exógena AG 2025${cliente ? ' - ' + cliente : ''}`;
    const restaurar = () => { document.title = titulo; window.removeEventListener('afterprint', restaurar); };
    window.addEventListener('afterprint', restaurar);
    window.print();
  });

  $('descargar-csv').addEventListener('click', () => {
    if (!estado.resultado) return;
    const sufijo = nombreSeguro(estado.contexto.nitCliente || estado.contexto.nombreCliente) || 'cliente';
    descargar(V.aCSV(estado.resultado), `verificador-exogena-ag2025-${sufijo}.csv`, 'text/csv;charset=utf-8');
  });

  $('copiar-resumen').addEventListener('click', async () => {
    const texto = $('texto-resumen').value;
    const boton = $('copiar-resumen');
    $('resumen-texto').open = true;
    try {
      await navigator.clipboard.writeText(texto);
      boton.textContent = 'Resumen copiado';
    } catch (e) {
      const area = $('texto-resumen');
      area.focus();
      area.select();
      let copiado = false;
      try { copiado = document.execCommand('copy'); } catch (e2) { copiado = false; }
      boton.textContent = copiado ? 'Resumen copiado' : 'Selecciónelo y cópielo abajo';
    }
    setTimeout(() => { boton.textContent = 'Copiar resumen sin NIT'; }, 2500);
  });

  function limpiar() {
    estado.archivos = [];
    estado.declaraciones = { periodicidad: { 300: 'anual', 350: 'anual' }, valores: {} };
    estado.explicaciones = {};
    estado.contexto = { nombreCliente: '', nitCliente: '', personaJuridica: true };
    estado.ejemplo = null;
    $('cliente-nombre').value = '';
    $('cliente-nit').value = '';
    $('cliente-juridica').checked = true;
    $('texto-pegado').value = '';
    $('estado-pegado').textContent = '';
    estadoCarga.textContent = '';
    fijarPeriodicidad('300', 'anual');
    fijarPeriodicidad('350', 'anual');
    pintarDeclaraciones();
    pintarArchivos();
  }

  $('nuevo-cliente').addEventListener('click', () => {
    limpiar();
    recalcular(true);
    $('paso-xml').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------------------------------------------------------------- ejemplos

  function bytesDeBase64(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    return bytes;
  }

  function cargarEjemplo(tipo) {
    const ej = EJEMPLOS[tipo];
    if (!ej) return;
    limpiar();
    estado.ejemplo = tipo;
    estado.archivos = ej.archivos.map((a) => V.leerArchivo(a.nombre, bytesDeBase64(a.base64)));
    const r = V.leerPegado(ej.declaraciones, {});
    estado.declaraciones.valores = r.valores;
    for (const f of ['300', '350']) if (r.periodicidad[f]) fijarPeriodicidad(f, r.periodicidad[f]);
    for (const x of ej.explicaciones) (estado.explicaciones[x.linea] = estado.explicaciones[x.linea] || []).push({ descripcion: x.descripcion, valor: x.valor });
    estado.contexto = { nombreCliente: ej.nombre, nitCliente: ej.nit, personaJuridica: true };
    $('cliente-nombre').value = ej.nombre;
    $('cliente-nit').value = ej.nit;
    estadoCarga.textContent = `Ejemplo cargado: ${ej.nombre}, ${ej.archivos.length} archivos XML y ${r.leidas} cifras de sus declaraciones.`;
    pintarDeclaraciones();
    recalcular(true);
  }

  for (const b of document.querySelectorAll('[data-ejemplo]')) {
    b.addEventListener('click', () => {
      cargarEjemplo(b.dataset.ejemplo);
      if (b.closest('#paso-informe')) $('informe').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --------------------------------------------------------- cómo se calcula

  function pintarComo() {
    const rejilla = $('como-cruces');
    for (const c of R.CRUCES) {
      const norma = R.NORMAS[c.norma];
      rejilla.appendChild(el('div', null,
        el('h3', { texto: `${c.id} ${c.nombre}` }),
        el('p', { texto: c.pregunta }),
        c.lineas.map((l) => el('span', { clase: 'formula', texto: `${l.id} ${l.nombre}${l.opcional ? ' (si escribe la casilla)' : ''}: ${l.detalle}` })),
        el('p', { clase: 'nota', texto: `${norma.nombre}, ${c.donde}.${c.criterio ? ' ' + c.criterio : ''}` })));
    }
    const lista = $('fuentes');
    for (const n of Object.values(R.NORMAS)) {
      lista.appendChild(el('li', null, el('a', { href: n.url, rel: 'noreferrer', texto: n.nombre }), `: ${n.que}${n.pendiente ? ' Pendiente de confirmar.' : ''}`));
    }
    $('pie-reglas').textContent = `Reglas del año gravable ${R.ANIO_GRAVABLE}, revisadas el ${fechaReglas(R.PARAMETROS.revisadas)}.`;
  }

  // ------------------------------------------------------------------ inicio

  pintarDeclaraciones();
  pintarComo();
  pintarInforme();
})();
