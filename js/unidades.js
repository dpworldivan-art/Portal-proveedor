/* MIS UNIDADES (proveedor): lista oficial, disponibilidad, solicitudes y QR. Usa las utilidades de PortalJS (window.ECOSAC). */
(function () {
  'use strict';
  var E = window.ECOSAC, $ = function (id) { return document.getElementById(id); }, el = E.el;
  var U = null, TAB = 'unid', DIA = '', FILTRO = '';

  /* =================== QR (se genera aquí; contiene solo la placa) =================== */

  /** Dibuja la tarjeta de una unidad en un canvas (1000 x 700): QR a la izquierda, placa a la derecha. */
  function tarjetaQR(u) {
    var c = document.createElement('canvas'); c.width = 1000; c.height = 700;
    var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 700);
    g.strokeStyle = '#0f5c3a'; g.lineWidth = 8; g.strokeRect(10, 10, 980, 680);
    var qr = qrcode(0, 'M'); qr.addData(u.placa); qr.make();
    var n = qr.getModuleCount(), quiet = 4, celda = Math.floor(600 / (n + quiet * 2)), lado = celda * (n + quiet * 2);
    var x0 = 40, y0 = Math.round((700 - lado) / 2);
    g.fillStyle = '#fff'; g.fillRect(x0, y0, lado, lado);
    g.fillStyle = '#000';
    for (var f = 0; f < n; f++) for (var k = 0; k < n; k++) if (qr.isDark(f, k)) g.fillRect(x0 + (k + quiet) * celda, y0 + (f + quiet) * celda, celda, celda);
    var cx = x0 + lado + 30, ancho = 1000 - cx - 40;
    g.fillStyle = '#0f5c3a'; g.textBaseline = 'alphabetic';
    var th = 30;
    do { g.font = 'bold ' + th + 'px Arial'; th -= 2; } while (g.measureText('ECOSAC · TRANSPORTES').width > ancho && th > 12);
    g.fillText('ECOSAC · TRANSPORTES', cx, 120);
    g.fillStyle = '#666'; g.font = '28px Arial'; g.fillText('PLACA', cx, 300);
    var tam = 90;
    g.fillStyle = '#000';
    do { g.font = 'bold ' + tam + 'px Consolas, "Courier New", monospace'; tam -= 4; } while (g.measureText(u.placa).width > ancho && tam > 24);
    g.fillText(u.placa, cx, 300 + tam + 40);
    g.fillStyle = '#444'; g.font = '30px Arial';
    var linea = [u.tipo, u.cap ? 'Cap. ' + u.cap : ''].filter(Boolean).join(' · ');
    if (linea) g.fillText(linea, cx, 560);
    return c;
  }

  function descargar(blob, nombre) {
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = nombre; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }

  function aBytes(dataUrl) {
    var b = atob(dataUrl.split(',')[1]), r = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) r[i] = b.charCodeAt(i);
    return r;
  }

  /** PDF A4 con 2 tarjetas por hoja (imágenes JPEG ya codificadas). */
  function crearPdf(jpegs) {
    var partes = [], largo = 0, offs = [];
    function txt(s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; partes.push(a); largo += a.length; }
    function bin(a) { partes.push(a); largo += a.length; }
    function obj(n) { offs[n] = largo; txt(n + ' 0 obj\n'); }
    var paginas = Math.ceil(jpegs.length / 2), total = 2 + paginas * 4;
    var ids = []; // por página: página, contenido, imagen1, imagen2
    for (var p = 0; p < paginas; p++) ids.push([3 + p * 4, 4 + p * 4, 5 + p * 4, 6 + p * 4]);
    txt('%PDF-1.4\n');
    obj(1); txt('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    obj(2); txt('<< /Type /Pages /Count ' + paginas + ' /Kids [' + ids.map(function (i) { return i[0] + ' 0 R'; }).join(' ') + '] >>\nendobj\n');
    var W = 500, H = 350, X = 47.64, YS = [422, 42];
    for (var q = 0; q < paginas; q++) {
      var par = jpegs.slice(q * 2, q * 2 + 2), id = ids[q];
      obj(id[0]);
      txt('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents ' + id[1] + ' 0 R /Resources << /XObject << ' +
        par.map(function (j, i) { return '/Im' + i + ' ' + id[2 + i] + ' 0 R'; }).join(' ') + ' >> >> >>\nendobj\n');
      var cont = par.map(function (j, i) { return 'q ' + W + ' 0 0 ' + H + ' ' + X + ' ' + YS[i] + ' cm /Im' + i + ' Do Q'; }).join('\n') +
        (par.length > 1 ? '\nq 0.6 G [4 4] 0 d 40 407 m 555 407 l S Q' : '');
      obj(id[1]); txt('<< /Length ' + cont.length + ' >>\nstream\n' + cont + '\nendstream\nendobj\n');
      par.forEach(function (j, i) {
        obj(id[2 + i]);
        txt('<< /Type /XObject /Subtype /Image /Width ' + j.w + ' /Height ' + j.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + j.bytes.length + ' >>\nstream\n');
        bin(j.bytes); txt('\nendstream\nendobj\n');
      });
    }
    // Una última página con 1 sola imagen deja un objeto sin usar: se rellena para que la tabla xref quede completa
    for (var n = 3; n <= total; n++) if (offs[n] === undefined) { obj(n); txt('null\nendobj\n'); }
    var xref = largo;
    txt('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
    for (var m = 1; m <= total; m++) txt(('0000000000' + offs[m]).slice(-10) + ' 00000 n \n');
    txt('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    var out = new Uint8Array(largo), pos = 0;
    partes.forEach(function (a) { out.set(a, pos); pos += a.length; });
    return out;
  }

  function jpegDe(u) {
    var c = tarjetaQR(u);
    return { bytes: aBytes(c.toDataURL('image/jpeg', 0.92)), w: c.width, h: c.height };
  }

  function pdfDe(unidades, nombre) {
    try {
      var bytes = crearPdf(unidades.map(jpegDe));
      descargar(new Blob([bytes], { type: 'application/pdf' }), nombre);
    } catch (e) { E.toast('No se pudo crear el PDF en este dispositivo.', 'error'); }
  }

  function verQR(u) {
    var c = tarjetaQR(u), img = document.createElement('img');
    img.src = c.toDataURL('image/png'); img.alt = 'Código QR de la placa ' + u.placa; img.className = 'qr-img';
    var png = el('button', 'btn btn--primario', 'Descargar imagen'), pdf = el('button', 'btn btn--secundario', 'Descargar PDF (A4)'), cer = el('button', 'btn btn--secundario', 'Cerrar');
    png.type = pdf.type = cer.type = 'button';
    png.addEventListener('click', function () { c.toBlob(function (b) { descargar(b, 'QR_' + u.placa + '.png'); }, 'image/png'); });
    pdf.addEventListener('click', function () { pdfDe([u], 'QR_' + u.placa + '.pdf'); });
    cer.addEventListener('click', E.cerrarModal);
    E.abrirModal([el('h3', null, 'QR de ' + u.placa), img, el('p', 'ayuda', 'El QR contiene solo la placa. Si no se descarga, mantén presionada la imagen para guardarla.'), png, pdf, cer]);
  }

  /* =================== Datos y pantallas =================== */

  function leerCache() { try { return JSON.parse(E.lsGet('ecosac_unid') || 'null'); } catch (e) { return null; } }
  function abrir() {
    E.mostrar('pantalla-unid');
    if (!U) { var c = leerCache(); if (c && c.unidades) { U = c; preparar(); } }
    if (U) { pintar(); cargar(false); } else cargar(true);   // lo último visto aparece al instante; se actualiza en silencio
  }
  function preparar() {
    var dias = U.dias.map(function (d) { return d.dia; });
    if (dias.indexOf(DIA) < 0) DIA = dias[dias.length - 1];
    $('unid-sub').textContent = U.unidades.length + (U.unidades.length === 1 ? ' unidad' : ' unidades') + ' en la lista oficial';
  }
  (window.ECOSAC_PRECARGA = window.ECOSAC_PRECARGA || []).push(function () { cargar(false); });

  function cargar(conSpinner) {
    E.llamar('unidObtener', [E.token()], function (r) {
      U = r; preparar();
      try { E.lsSet('ecosac_unid', JSON.stringify(r)); } catch (e) { /* ok */ }
      pintar();
    }, null, !conSpinner);
  }

  function pintar() {
    var tabs = $('unid-tabs'); tabs.textContent = '';
    var pend = U.solicitudes.filter(function (s) { return s.estado === 'Pendiente'; }).length;
    [['unid', 'Mis unidades'], ['disp', 'Disponibilidad'], ['sol', 'Solicitudes']].forEach(function (t) {
      var b = el('button', 'chip' + (TAB === t[0] ? ' activo' : ''), t[1]);
      b.type = 'button';
      if (t[0] === 'sol' && pend) b.appendChild(el('span', 'n', String(pend)));
      b.addEventListener('click', function () { TAB = t[0]; FILTRO = ''; pintar(); });
      tabs.appendChild(b);
    });
    var cont = $('unid-cont'); cont.textContent = '';
    if (!U.hayVehiculos && TAB !== 'sol') {
      cont.appendChild(el('div', 'vacio', 'Aún no hay unidades registradas para tu empresa en la lista oficial. Si necesitas registrarlas, pide un alta en la pestaña Solicitudes.'));
      return;
    }
    if (TAB === 'unid') pintarUnidades(cont); else if (TAB === 'disp') pintarDisp(cont); else pintarSolicitudes(cont);
  }

  /* ---- Mis unidades ---- */
  function pintarUnidades(cont) {
    cont.appendChild(el('div', 'caja caja--info', 'La placa, la capacidad y el tipo vienen del sistema oficial de ECOSAC y no se editan aquí. Para corregirlos, o para agregar o quitar unidades, usa la pestaña Solicitudes.'));
    var acc = el('div', 'unid-acciones');
    var todos = el('button', 'btn btn--secundario btn--sm', 'PDF con todos los QR (2 por hoja)');
    todos.type = 'button';
    todos.addEventListener('click', function () {
      pdfDe(U.unidades, 'QR_unidades.pdf');
    });
    acc.appendChild(todos); cont.appendChild(acc);
    if (U.unidades.length > 8) {
      var b = el('input', 'input-texto input-busca'); b.type = 'search'; b.placeholder = 'Buscar placa'; b.value = FILTRO; b.maxLength = 8; b.autocomplete = 'off';
      b.addEventListener('input', function () { FILTRO = b.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); listaUnidades(lista); });
      cont.appendChild(b);
    }
    var lista = el('div'); cont.appendChild(lista); listaUnidades(lista);
  }
  function listaUnidades(lista) {
    lista.textContent = '';
    var l = U.unidades.filter(function (u) { return !FILTRO || u.placa.replace('-', '').indexOf(FILTRO) >= 0; });
    if (!l.length) lista.appendChild(el('div', 'vacio', 'Ninguna placa coincide.'));
    l.forEach(function (u) {
      var t = el('div', 'viaje'), cab = el('div', 'viaje-cab');
      cab.appendChild(el('span', 'placa', u.placa)); cab.appendChild(el('span', 'esp'));
      t.appendChild(cab);
      t.appendChild(el('div', 'viaje-det', [u.tipo || 'Tipo no registrado', u.cap ? 'Capacidad ' + u.cap : 'Capacidad no registrada'].join(' · ')));
      var q = el('button', 'btn btn--secundario btn--sm', 'Ver QR / descargar'); q.type = 'button';
      q.addEventListener('click', function () { verQR(u); });
      t.appendChild(q);
      lista.appendChild(t);
    });
  }

  /* ---- Disponibilidad ---- */
  var ETQ = { OCUPADA: 'Ocupada', DISPONIBLE: 'Disponible', SIN_DEFINIR: 'Sin definir' };

  function pintarDisp(cont) {
    var chips = el('div', 'chips');
    U.dias.forEach(function (d) {
      var b = el('button', 'chip' + (d.dia === DIA ? ' activo' : ''), (d.esHoy ? 'Hoy · ' : 'Mañana · ') + d.etiqueta); b.type = 'button';
      b.addEventListener('click', function () { DIA = d.dia; pintar(); });
      chips.appendChild(b);
    });
    cont.appendChild(chips);
    cont.appendChild(el('div', 'caja caja--info', 'Indica el estado de cada unidad para el día. Quedan "Ocupadas" solas cuando su viaje programado ya está validado; mientras tanto figuran "Sin definir" hasta que tú las indiques.'));
    var cuenta = { OCUPADA: 0, DISPONIBLE: 0, SIN_DEFINIR: 0 }, activas = U.unidades;
    activas.forEach(function (u) { cuenta[u.disp[DIA].estado]++; });
    var res = el('div', 'resumen');
    ['OCUPADA', 'DISPONIBLE', 'SIN_DEFINIR'].forEach(function (k) {
      var d = el('div', 'dato' + (k === 'SIN_DEFINIR' && cuenta[k] ? ' dato--alerta' : '')); d.appendChild(el('b', null, String(cuenta[k]))); d.appendChild(el('span', null, ETQ[k]));
      res.appendChild(d);
    });
    cont.appendChild(res);
    if (U.fueraDeLista.length) cont.appendChild(el('div', 'caja caja--aviso', 'Estas placas están en tu programación pero no en tu lista oficial: ' + U.fueraDeLista.join(', ') + '. Si es un bus nuevo, pide su alta en Solicitudes.'));
    var libres = activas.filter(function (u) { return u.disp[DIA].estado === 'SIN_DEFINIR'; });
    if (libres.length) {
      var todos = el('button', 'btn btn--primario btn--sm btn--bloque', 'Marcar las ' + libres.length + ' sin definir como disponibles'); todos.type = 'button';
      todos.addEventListener('click', function () { fijar(libres.map(function (u) { return u.placa; }), 'DISPONIBLE'); });
      cont.appendChild(todos);
    }
    activas.forEach(function (u) {
      var d = u.disp[DIA], t = el('div', 'viaje'), cab = el('div', 'viaje-cab');
      cab.appendChild(el('span', 'placa', u.placa)); cab.appendChild(el('span', 'esp'));
      if (d.programada) cab.appendChild(el('span', 'tag ' + (d.validada ? 'tag--ok' : 'tag--pend'), d.validada ? 'Viaje validado' : 'Programada · por validar'));
      t.appendChild(cab);
      t.appendChild(el('div', 'viaje-det', [u.tipo, u.cap ? 'Cap. ' + u.cap : ''].filter(Boolean).join(' · ')));
      var seg = el('div', 'seg');
      ['OCUPADA', 'DISPONIBLE', 'SIN_DEFINIR'].forEach(function (k) {
        var b = el('button', 'seg-b seg-b--' + k.toLowerCase() + (d.estado === k ? ' activo' : ''), ETQ[k]); b.type = 'button';
        if (d.programada && d.validada) b.disabled = true;
        b.addEventListener('click', function () { if (d.estado !== k) fijar([u.placa], k); });
        seg.appendChild(b);
      });
      t.appendChild(seg);
      cont.appendChild(t);
    });
  }

  function fijar(placas, estado) {
    var dia = DIA, ant = {};
    U.unidades.forEach(function (u) { if (placas.indexOf(u.placa) >= 0 && !(u.disp[dia].programada && u.disp[dia].validada)) { ant[u.placa] = u.disp[dia].estado; u.disp[dia].estado = estado; } });
    pintar();
    E.llamar('unidDisponibilidad', [E.token(), dia, estado, placas], function () { /* ya está pintado */ },
      function (m) { E.toast(m, 'error'); cargar(false); }, true);
  }

  /* ---- Solicitudes ---- */
  function pintarSolicitudes(cont) {
    cont.appendChild(el('div', 'caja caja--info', 'Una solicitud queda "Pendiente" hasta que ECOSAC la registre en el sistema oficial y recargue la lista. Cuando la lista cambie, la solicitud pasará a "Atendida".'));
    var acc = el('div', 'unid-acciones');
    var alta = el('button', 'btn btn--primario btn--sm', '+ Agregar unidad'), baja = el('button', 'btn btn--secundario btn--sm', 'Quitar unidad'),
      cambio = el('button', 'btn btn--secundario btn--sm', 'Corregir datos');
    alta.type = baja.type = cambio.type = 'button';
    alta.addEventListener('click', dialogoAlta);
    baja.addEventListener('click', dialogoBaja);
    cambio.addEventListener('click', dialogoCambio);
    if (!U.unidades.length) baja.disabled = cambio.disabled = true;
    acc.appendChild(alta); acc.appendChild(baja); acc.appendChild(cambio); cont.appendChild(acc);
    if (!U.solicitudes.length) { cont.appendChild(el('div', 'vacio', 'No has enviado solicitudes.')); return; }
    U.solicitudes.forEach(function (s) {
      var t = el('div', 'viaje'), cab = el('div', 'viaje-cab');
      cab.appendChild(el('span', 'placa', s.placa));
      cab.appendChild(el('span', 'tag ' + (s.tipo === 'ALTA' ? 'tag--ok' : 'tag--dia'), NOMBRE_SOL[s.tipo] || s.tipo));
      cab.appendChild(el('span', 'esp'));
      var cls = { Pendiente: 'tag--pend', Atendida: 'tag--ok', Rechazada: 'tag--mal', Anulada: '' }[s.estado] || '';
      cab.appendChild(el('span', 'tag ' + cls, s.estado));
      t.appendChild(cab);
      var det = [s.tipo !== 'BAJA' ? [s.tipoVeh, s.cap ? 'Cap. ' + s.cap : ''].filter(Boolean).join(' · ') : '', s.creado].filter(Boolean).join(' · ');
      t.appendChild(el('div', 'viaje-det', det));
      if (s.comentario) t.appendChild(el('div', 'viaje-det', 'Comentario: ' + s.comentario));
      if (s.nota && s.estado !== 'Anulada') t.appendChild(el('div', 'viaje-det', 'Respuesta: ' + s.nota));
      if (s.estado === 'Pendiente') {
        var an = el('button', 'btn btn--secundario btn--sm', 'Anular solicitud'); an.type = 'button';
        an.addEventListener('click', function () { anular(s); });
        t.appendChild(an);
      }
      cont.appendChild(t);
    });
  }

  var NOMBRE_SOL = { ALTA: 'Agregar', BAJA: 'Quitar', CAMBIO: 'Corregir' };

  function anular(s) {
    var si = el('button', 'btn btn--primario', 'Sí, anular'), no = el('button', 'btn btn--secundario', 'No'); si.type = no.type = 'button';
    no.addEventListener('click', E.cerrarModal);
    si.addEventListener('click', function () {
      E.cerrarModal();
      E.llamar('unidAnular', [E.token(), s.id], function () { E.toast('Solicitud anulada.'); cargar(false); }, function (m) { E.toast(m, 'error'); cargar(false); });
    });
    E.abrirModal([el('h3', null, '¿Anular la solicitud?'), el('p', null, NOMBRE_SOL[s.tipo] + ' · placa ' + s.placa + '.'), si, no]);
  }

  function campo(etq, input) {
    var c = el('div', 'campo'); var l = el('label', 'campo-label', etq); c.appendChild(l); c.appendChild(input); return c;
  }
  function msgError() { return el('div', 'caja caja--error oculto'); }
  function mostrarMsg(c, m) { c.textContent = m; c.classList.remove('oculto'); }

  function dialogoAlta() {
    var placa = el('input', 'input-texto'); placa.type = 'text'; placa.maxLength = 7; placa.placeholder = 'Ej. ABC-123'; placa.autocomplete = 'off'; placa.autocapitalize = 'characters';
    placa.addEventListener('input', function () { placa.value = placa.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7); });
    var tipo = el('select', 'input-texto');
    tipo.appendChild(new Option('Elige el tipo', ''));
    U.tipos.forEach(function (t) { tipo.appendChild(new Option(t, t)); });
    var cap = el('input', 'input-texto'); cap.type = 'number'; cap.inputMode = 'numeric'; cap.min = 1; cap.max = 80; cap.placeholder = 'Asientos';
    var com = el('textarea', 'area-texto'); com.maxLength = 200; com.placeholder = 'Comentario (opcional)';
    var err = msgError(), ok = el('button', 'btn btn--primario', 'Enviar solicitud'), no = el('button', 'btn btn--secundario', 'Cancelar');
    ok.type = no.type = 'button';
    no.addEventListener('click', E.cerrarModal);
    ok.addEventListener('click', function () {
      if (placa.value.length < 6) { mostrarMsg(err, 'Escribe la placa completa.'); return; }
      if (!tipo.value) { mostrarMsg(err, 'Elige el tipo de vehículo.'); return; }
      if (!(Number(cap.value) >= 1 && Number(cap.value) <= 80)) { mostrarMsg(err, 'La capacidad debe estar entre 1 y 80.'); return; }
      enviar('ALTA', placa.value, tipo.value, Number(cap.value), com.value, err);
    });
    E.abrirModal([el('h3', null, 'Agregar una unidad a mi lista'), campo('Placa', placa), campo('Tipo de vehículo', tipo), campo('Capacidad (asientos)', cap), campo('Comentario', com), err, ok, no]);
  }

  function dialogoBaja() {
    var sel = el('select', 'input-texto');
    sel.appendChild(new Option('Elige la placa', ''));
    U.unidades.forEach(function (u) { sel.appendChild(new Option(u.placa + (u.tipo ? ' · ' + u.tipo : ''), u.placa)); });
    var com = el('textarea', 'area-texto'); com.maxLength = 200; com.placeholder = 'Motivo (ej. no corresponde a mi empresa, vendida)';
    var err = msgError(), ok = el('button', 'btn btn--primario', 'Enviar solicitud'), no = el('button', 'btn btn--secundario', 'Cancelar');
    ok.type = no.type = 'button';
    no.addEventListener('click', E.cerrarModal);
    ok.addEventListener('click', function () {
      if (!sel.value) { mostrarMsg(err, 'Elige la placa.'); return; }
      enviar('BAJA', sel.value, '', 0, com.value, err);
    });
    E.abrirModal([el('h3', null, 'Quitar una unidad de mi lista'), campo('Placa', sel), campo('Motivo', com), err, ok, no]);
  }

  function dialogoCambio() {
    var sel = el('select', 'input-texto');
    sel.appendChild(new Option('Elige la placa', ''));
    U.unidades.forEach(function (u) { sel.appendChild(new Option(u.placa + ' · ' + (u.tipo || '—') + ' · cap. ' + (u.cap || '—'), u.placa)); });
    var tipo = el('select', 'input-texto');
    tipo.appendChild(new Option('Tipo correcto (si cambia)', ''));
    U.tipos.forEach(function (t) { tipo.appendChild(new Option(t, t)); });
    var cap = el('input', 'input-texto'); cap.type = 'number'; cap.inputMode = 'numeric'; cap.min = 1; cap.max = 80; cap.placeholder = 'Capacidad correcta (asientos)';
    var com = el('textarea', 'area-texto'); com.maxLength = 200; com.placeholder = 'Comentario (opcional)';
    var err = msgError(), ok = el('button', 'btn btn--primario', 'Enviar solicitud'), no = el('button', 'btn btn--secundario', 'Cancelar');
    ok.type = no.type = 'button';
    no.addEventListener('click', E.cerrarModal);
    ok.addEventListener('click', function () {
      if (!sel.value) { mostrarMsg(err, 'Elige la placa.'); return; }
      if (!tipo.value && !cap.value) { mostrarMsg(err, 'Indica la capacidad o el tipo correcto.'); return; }
      if (cap.value && !(Number(cap.value) >= 1 && Number(cap.value) <= 80)) { mostrarMsg(err, 'La capacidad debe estar entre 1 y 80.'); return; }
      enviar('CAMBIO', sel.value, tipo.value, cap.value ? Number(cap.value) : 0, com.value, err);
    });
    E.abrirModal([el('h3', null, 'Corregir datos de una unidad'), campo('Placa', sel), campo('Tipo', tipo), campo('Capacidad', cap), campo('Comentario', com), err, ok, no]);
  }

  function enviar(tipo, placa, tv, cap, com, err) {
    E.llamar('unidSolicitar', [E.token(), tipo, placa, tv, cap, com], function (r) {
      cargar(false);
      var c = E.contacto(), ok = el('button', 'btn btn--primario', 'Listo');
      ok.type = 'button'; ok.addEventListener('click', E.cerrarModal);
      var nodos = [el('h3', null, 'Solicitud enviada'), el('p', null, NOMBRE_SOL[tipo] + ' · placa ' + r.placa + ': solicitud registrada como Pendiente. ECOSAC la revisará.')];
      if (c.numero) {
        var wa = el('button', 'btn btn--secundario', 'Avisar a Coordinación por WhatsApp'); wa.type = 'button';
        wa.addEventListener('click', function () {
          var t = 'Hola, soy de ' + (U.empresa || 'una empresa transportista') + '. Envié por el portal una solicitud de ' + NOMBRE_SOL[tipo].toUpperCase() + ' para la placa ' + r.placa + '. Quedo atento.';
          window.open('https://wa.me/' + c.numero + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
        });
        nodos.push(wa);
      }
      nodos.push(ok);
      E.abrirModal(nodos);
    }, function (m) { mostrarMsg(err, m); });
  }

  /* =================== Arranque =================== */
  $('btn-ir-unid').addEventListener('click', abrir);
  $('btn-unid-volver').addEventListener('click', function () { E.mostrar('pantalla-inicio'); });
  $('btn-unid-actualizar').addEventListener('click', function () { cargar(true); });
  window.ECOSAC.unidades = { tarjetaQR: tarjetaQR, crearPdf: crearPdf };
})();
