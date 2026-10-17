/* CONTACTOS DE LA EMPRESA (proveedor): números de dueños/responsables a quienes Coordinación puede escribir. Usa window.ECOSAC. */
(function () {
  'use strict';
  var E = window.ECOSAC, $ = function (id) { return document.getElementById(id); }, el = E.el;

  function abrir() {
    E.llamar('contactosObtener', [E.token()], function (r) {
      var filas = [];
      var caja = el('div');
      function fila(c) {
        var w = el('div', 'campo');
        var a = el('input', 'input-texto'); a.type = 'text'; a.maxLength = 60; a.placeholder = 'Nombre (ej. Juan Pérez - Gerente)'; a.value = c.nombre || ''; a.style.fontSize = '15px';
        var b = el('input', 'input-texto'); b.type = 'tel'; b.maxLength = 20; b.placeholder = 'Celular (9 dígitos)'; b.value = c.numero ? String(c.numero).replace(/^51(?=9\d{8}$)/, '') : ''; b.style.fontSize = '15px'; b.style.marginTop = '6px';
        var q = el('button', 'btn btn--secundario btn--sm', 'Quitar'); q.type = 'button'; q.style.marginTop = '6px';
        var o = { a: a, b: b, w: w };
        q.addEventListener('click', function () { filas.splice(filas.indexOf(o), 1); caja.removeChild(w); mas.disabled = false; });
        w.appendChild(a); w.appendChild(b); w.appendChild(q); caja.appendChild(w); filas.push(o);
      }
      r.contactos.forEach(fila);
      var mas = el('button', 'btn btn--secundario btn--sm', '+ Agregar número'); mas.type = 'button';
      mas.addEventListener('click', function () { if (filas.length >= r.max) { mas.disabled = true; return; } fila({}); if (filas.length >= r.max) mas.disabled = true; });
      if (!r.contactos.length) fila({});
      mas.disabled = filas.length >= r.max;
      var bt = el('div', 'modal-botones'); bt.style.marginTop = '14px';
      var no = el('button', 'btn btn--secundario', 'Cancelar'), si = el('button', 'btn btn--primario', 'Guardar'); no.type = si.type = 'button';
      no.addEventListener('click', E.cerrarModal);
      si.addEventListener('click', function () {
        var lista = filas.map(function (o) { return { nombre: o.a.value, numero: o.b.value }; });
        E.llamar('contactosGuardar', [E.token(), lista], function () { E.cerrarModal(); E.toast('Contactos guardados.'); }, function (m) { E.toast(m, 'error'); });
      });
      bt.appendChild(no); bt.appendChild(si);
      E.abrirModal([el('h3', null, 'Contactos de la empresa'),
        el('p', 'ayuda', 'Registra hasta ' + r.max + ' números de dueños o responsables. Coordinación podrá escribirles por WhatsApp para avisos de programación, disconformidades y solicitudes.'),
        caja, mas, bt]);
    });
  }

  $('btn-ir-cont').addEventListener('click', abrir);
})();
