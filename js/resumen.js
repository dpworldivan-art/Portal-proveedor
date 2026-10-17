/* RESUMEN DE LA SEMANA (proveedor): lectura de QR por día, placa y turno, tramo a tramo. Usa window.ECOSAC. */
(function () {
  'use strict';
  var E = window.ECOSAC, $ = function (id) { return document.getElementById(id); }, el = E.el;
  var OFFSET = 0, ABIERTOS = {};
  var ETQ_TRAMO = { LEIDO: ['QR leído', 'tag tag--ok'], NO_LEIDO: ['QR no leído', 'tag tag--mal'], PENDIENTE: ['Pendiente', 'tag tag--pend'], SIN_DATOS: ['Lectura por actualizar', 'tag tag--pend'] };
  var ETQ_VIAJE = {
    COMPLETO: ['QR completo', 'tag tag--ok'], INCOMPLETO: ['QR incompleto', 'tag tag--pend'], SIN_LECTURA: ['QR no leído', 'tag tag--mal'],
    EN_CURSO: ['En curso', 'tag tag--pend'], PENDIENTE: ['Pendiente', 'tag'], SIN_DATOS: ['Lectura por actualizar', 'tag tag--pend']
  };

  function btn(txt, fn, dis) { var b = el('button', 'btn btn--secundario btn--sm', txt); b.type = 'button'; b.disabled = !!dis; b.addEventListener('click', fn); return b; }

  /** Un cuadro compacto por tramo: IDA o VUELTA, su estado de lectura y, si se leyó, hora y tranquera. */
  function tramoCaja(t) {
    var c = el('div', 'qr-tramo qr-tramo--' + t.estado.toLowerCase());
    c.appendChild(el('b', 'qr-tramo-tit', t.sentido + ' · ' + t.hora));
    var e = ETQ_TRAMO[t.estado]; c.appendChild(el('span', e[1] + ' qr-tramo-tag', e[0]));
    var info = '';
    if (t.estado === 'LEIDO') info = [t.horaLectura, t.tranquera].filter(Boolean).join(' · ');
    else if (t.estado === 'SIN_DATOS') info = 'Se actualiza con la próxima carga';
    else if (t.estado === 'PENDIENTE') info = 'Dentro del horario';
    if (info) c.appendChild(el('div', 'qr-tramo-info', info));
    return c;
  }

  function filaDetalle(k, v) { var f = el('div', 'qr-det'); f.appendChild(el('span', null, k)); f.appendChild(el('b', null, v)); return f; }

  function viajeCaja(v, clave) {
    var caja = el('div', 'viaje viaje--qr-' + v.estado.toLowerCase());
    var cab = el('div', 'viaje-cab'); cab.appendChild(el('span', 'placa', v.placa));
    cab.appendChild(el('span', 'tag tag--' + (v.turno === 'NOCHE' ? 'noche' : 'dia'), v.turno));
    var e = ETQ_VIAJE[v.estado]; cab.appendChild(el('span', e[1], e[0]));
    cab.appendChild(el('span', 'esp'));
    if (v.pax) { var px = el('b', 'qr-pax', String(v.pax)); px.title = 'Pasajeros'; cab.appendChild(px); }
    caja.appendChild(cab);
    caja.appendChild(el('div', 'viaje-det', (v.lugar || '') + (v.horas ? ' · ' + v.horas : '')));
    var cont = el('div', 'qr-tramos');
    v.tramos.forEach(function (t) { cont.appendChild(tramoCaja(t)); });
    caja.appendChild(cont);
    var det = el('div', 'qr-dets' + (ABIERTOS[clave] ? '' : ' oculto'));
    var filas = [['N° solicitud', v.solicitud], ['Cliente', v.cliente], ['Centro de costo', v.centro], ['Capacidad', v.cap ? String(v.cap) : ''], ['Tipo de vehículo', v.tipo]];
    v.tramos.forEach(function (t) { if (t.manifiesto) filas.push(['Manifiesto ' + t.sentido, t.manifiesto]); });
    filas.forEach(function (p) { if (p[1]) det.appendChild(filaDetalle(p[0], p[1])); });
    var ver = el('button', 'btn-link', ABIERTOS[clave] ? 'Ocultar detalle' : 'Ver detalle'); ver.type = 'button';
    ver.addEventListener('click', function () { ABIERTOS[clave] = !ABIERTOS[clave]; det.classList.toggle('oculto', !ABIERTOS[clave]); ver.textContent = ABIERTOS[clave] ? 'Ocultar detalle' : 'Ver detalle'; });
    caja.appendChild(ver); caja.appendChild(det);
    return caja;
  }

  function matriz(r) {
    var cont = el('div'); cont.appendChild(el('h3', null, 'Lectura por placa y día'));
    cont.appendChild(el('p', 'ayuda', 'Tramos leídos / tramos programados. En rojo: hay tramos sin lectura.'));
    var wrap = el('div', 'qr-mat-wrap'), t = el('table', 'lista qr-mat'), th = el('thead'), tr0 = el('tr');
    tr0.appendChild(el('th', null, 'Placa'));
    r.etiquetasDias.forEach(function (d) { tr0.appendChild(el('th', null, d.corta)); });
    tr0.appendChild(el('th', null, 'Total')); th.appendChild(tr0); t.appendChild(th);
    var tb = el('tbody');
    r.matriz.forEach(function (m) {
      var tr = el('tr'); var c0 = el('td'); c0.appendChild(el('b', null, m.placa)); if (m.tipo || m.cap) c0.appendChild(el('div', 'ayuda', [m.tipo, m.cap ? m.cap + ' as.' : ''].filter(Boolean).join(' · '))); c0.lastChild.style.textAlign = 'left'; tr.appendChild(c0);
      m.celdas.forEach(function (c) {
        var td = el('td', null, c ? c.leidos + '/' + c.total : '–');
        if (c) td.className = c.problema ? 'qr-c qr-c--mal' : (c.leidos === c.total ? 'qr-c qr-c--ok' : 'qr-c qr-c--pend');
        tr.appendChild(td);
      });
      tr.appendChild(el('td', m.problemas ? 'qr-c qr-c--mal' : null, m.leidos + '/' + m.total));
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); cont.appendChild(wrap);
    return cont;
  }

  function plegable(titulo, extra, abierto, claveEstado, cuerpoFn) {
    var caja = el('div', 'qr-dia'), cab = el('button', 'qr-dia-cab'); cab.type = 'button';
    var flecha = el('span', 'qr-flecha', ''); cab.appendChild(flecha); cab.appendChild(el('b', null, titulo)); cab.appendChild(el('span', 'esp'));
    if (extra) cab.appendChild(extra);
    var cuerpo = el('div', 'qr-dia-cuerpo');
    var pinta = function () { var ab = ABIERTOS[claveEstado]; flecha.textContent = ab ? '▾' : '▸'; cuerpo.classList.toggle('oculto', !ab); cab.setAttribute('aria-expanded', ab ? 'true' : 'false'); };
    if (ABIERTOS[claveEstado] === undefined) ABIERTOS[claveEstado] = abierto;
    cab.addEventListener('click', function () { ABIERTOS[claveEstado] = !ABIERTOS[claveEstado]; pinta(); });
    cuerpoFn(cuerpo); caja.appendChild(cab); caja.appendChild(cuerpo); pinta();
    return caja;
  }

  function cargar() {
    E.llamar('resumenSemana', [E.token(), OFFSET], function (r) {
      $('sem-sub').textContent = r.titulo;
      var cont = $('sem-cont'); cont.textContent = '';
      var nav = el('div', 'unid-acciones');
      nav.appendChild(btn('← Semana anterior', function () { OFFSET--; cargar(); }, !r.hayAnterior));
      nav.appendChild(btn('Esta semana', function () { OFFSET = 0; cargar(); }, OFFSET === 0));
      nav.appendChild(btn('Siguiente →', function () { OFFSET++; cargar(); }, !r.haySiguiente));
      cont.appendChild(nav);
      var nota = r.hayDatos ? 'Datos de la última carga de programación' + (r.actualizado ? ' (' + r.actualizado + ')' : '') + '. Para liquidar deben estar leídos todos los tramos (IDA y VUELTA).'
        : 'La programación cargada no trae el estado de lectura del QR (columna Estado Viaje); por eso no se puede indicar si cada tramo fue leído.';
      var p0 = el('p', 'ayuda', nota); p0.style.textAlign = 'left'; cont.appendChild(p0);
      if (!r.totales.tramos) { cont.appendChild(el('div', 'vacio', 'No hay viajes programados en esta semana.')); return; }
      var ex = el('span', 'tag', r.totales.leidos + '/' + r.totales.tramos + ' leídos');
      cont.appendChild(plegable('Lectura por placa y día', ex, false, 'mat|' + r.desde, function (c) { c.appendChild(matriz(r)); }));
      cont.appendChild(el('h3', null, 'Detalle por día'));
      r.dias.forEach(function (d) {
        var x = d.resumen, badge = null;
        if (x.tramos) badge = el('span', 'tag ' + (x.noLeidos ? 'tag--mal' : (x.leidos === x.tramos ? 'tag--ok' : 'tag--pend')), x.leidos + '/' + x.tramos);
        var abierto = d.esHoy;
        cont.appendChild(plegable(d.etiqueta + (d.esHoy ? ' · hoy' : ''), badge, abierto, 'dia|' + d.dia, function (c) {
          if (!d.viajes.length) { c.appendChild(el('p', 'ayuda', 'Sin viajes programados.')); return; }
          var partes = ['QR: ' + x.leidos + ' leído' + (x.leidos === 1 ? '' : 's')];
          if (x.noLeidos) partes.push(x.noLeidos + ' sin lectura');
          if (x.sinDatos) partes.push(x.sinDatos + ' por actualizar');
          if (x.pendientes) partes.push(x.pendientes + ' pendiente' + (x.pendientes === 1 ? '' : 's'));
          var s = el('p', 'ayuda', partes.join(' · ')); s.style.textAlign = 'left'; c.appendChild(s);
          d.viajes.forEach(function (v) { c.appendChild(viajeCaja(v, d.dia + '|' + v.placa + '|' + v.turno + '|' + v.solicitud)); });
        }));
      });
    });
  }

  $('btn-ir-sem').addEventListener('click', function () { OFFSET = 0; E.mostrar('pantalla-sem'); cargar(); });
  $('btn-sem-volver').addEventListener('click', function () { E.mostrar('pantalla-inicio'); });
  $('btn-sem-actualizar').addEventListener('click', cargar);
})();
