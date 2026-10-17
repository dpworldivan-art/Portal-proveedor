/* GENERA TU QR (público): una placa -> tarjeta con placa, QR y mensaje, en imagen (PNG) y PDF A4 con 2 por hoja.
 * Todo se hace en el dispositivo: no hay llamadas al servidor y no se guarda nada. Usa window.ECOSAC (y sus utilidades de PDF). */
(function () {
  'use strict';
  var E = window.ECOSAC, $ = function (id) { return document.getElementById(id); }, el = E.el;
  var VUELVE = 'pantalla-login', PLACA = '';

  /** Tarjeta 1000 x 700: placa arriba, QR al centro y mensaje abajo. */
  function tarjeta(placa, mensaje) {
    var c = document.createElement('canvas'); c.width = 1000; c.height = 700;
    var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 700);
    g.strokeStyle = '#d5d9d7'; g.lineWidth = 3; g.strokeRect(6, 6, 988, 688);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    var tam = 100;
    g.fillStyle = '#111';
    do { g.font = 'bold ' + tam + 'px Arial, Helvetica, sans-serif'; tam -= 4; } while (g.measureText(placa).width > 880 && tam > 30);
    g.fillText(placa, 500, 125);
    var qr = qrcode(0, 'M'); qr.addData(placa); qr.make();
    var n = qr.getModuleCount(), quiet = 2, celda = Math.floor(430 / (n + quiet * 2)), lado = celda * (n + quiet * 2);
    var x0 = Math.round((1000 - lado) / 2), y0 = 160;
    g.fillStyle = '#fff'; g.fillRect(x0, y0, lado, lado);
    g.fillStyle = '#000';
    for (var f = 0; f < n; f++) for (var k = 0; k < n; k++) if (qr.isDark(f, k)) g.fillRect(x0 + (k + quiet) * celda, y0 + (f + quiet) * celda, celda, celda);
    // mensaje: se parte en líneas si es largo
    g.fillStyle = '#555'; g.font = '30px Arial, Helvetica, sans-serif';
    var palabras = String(mensaje || '').split(/\s+/).filter(Boolean), lineas = [], act = '';
    palabras.forEach(function (w) { var t = act ? act + ' ' + w : w; if (g.measureText(t).width > 880 && act) { lineas.push(act); act = w; } else act = t; });
    if (act) lineas.push(act);
    lineas.slice(0, 2).forEach(function (l, i) { g.fillText(l, 500, y0 + lado + 55 + i * 40); });
    return c;
  }

  function valida(p) { return /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(p); }

  function pintar() {
    var cont = $('qr-prev'); cont.textContent = '';
    var ok = valida(PLACA);
    $('btn-qr-pdf').disabled = !ok; $('btn-qr-png').disabled = !ok;
    if (!ok) { cont.appendChild(el('div', 'vacio', 'Escribe la placa completa para ver el QR.')); return; }
    var url = tarjeta(PLACA, E.publico().qrMensaje).toDataURL('image/png');
    for (var i = 0; i < 2; i++) {
      if (i) cont.appendChild(el('div', 'qr-corte'));
      var img = document.createElement('img'); img.src = url; img.alt = 'Tarjeta QR de la placa ' + PLACA; img.className = 'qr-img';
      cont.appendChild(img);
    }
  }

  function normalizar(v) {
    var s = String(v).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    return s.length > 3 ? s.slice(0, 3) + '-' + s.slice(3) : s;
  }

  function abrir() {
    VUELVE = E.hayToken() ? 'pantalla-inicio' : 'pantalla-login';
    E.mostrar('pantalla-qr');
    pintar();
    window.scrollTo(0, 0);
  }

  function bajarPng() {
    if (!valida(PLACA)) return;
    tarjeta(PLACA, E.publico().qrMensaje).toBlob(function (b) { E.util.descargar(b, 'QR_' + PLACA + '.png'); }, 'image/png');
  }
  function bajarPdf() {
    if (!valida(PLACA)) return;
    try {
      var c = tarjeta(PLACA, E.publico().qrMensaje);
      var j = { bytes: E.util.aBytes(c.toDataURL('image/jpeg', 0.92)), w: c.width, h: c.height };
      E.util.descargar(new Blob([E.util.crearPdf([j, j])], { type: 'application/pdf' }), 'QR_' + PLACA + '.pdf');
    } catch (e) { E.toast('No se pudo crear el PDF en este dispositivo.', 'error'); }
  }

  document.querySelectorAll('.btn-abrir-qr').forEach(function (b) { b.addEventListener('click', abrir); });
  $('btn-qr-volver').addEventListener('click', function () { E.mostrar(VUELVE); });
  $('input-placa-qr').addEventListener('input', function () { this.value = PLACA = normalizar(this.value); pintar(); });
  $('btn-qr-png').addEventListener('click', bajarPng);
  $('btn-qr-pdf').addEventListener('click', bajarPdf);
})();
