/* ECOSAC · Portal de proveedores (app instalable). Habla con Apps Script por fetch (JSON).
 * Núcleo: login, sesión, Mi programación (validación inmediata) y utilidades compartidas (window.ECOSAC). */
(function () {
  'use strict';
  var CONF = window.ECOSAC_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var SECC = null, TOKEN = '';
  var CONTACTO = { numero: '', nombre: 'Coordinación', horario: '' };
  var tToast = null;
  var PROG = null, DIA_SEL = '';

  /* ---------- almacenamiento (todo envuelto: puede no existir) ---------- */
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
  function guardarToken(t) { lsSet('ecosac_t', t || ''); }
  function leerToken() { return lsGet('ecosac_t'); }
  function guardarCacheProg() { try { lsSet('ecosac_prog', PROG ? JSON.stringify(PROG) : ''); } catch (e) { /* ok */ } }
  function leerCacheProg() { try { return JSON.parse(lsGet('ecosac_prog') || 'null'); } catch (e) { return null; } }

  function mostrar(id) {
    ['pantalla-login', 'pantalla-inicio', 'pantalla-prog', 'pantalla-unid', 'pantalla-sem', 'pantalla-qr'].forEach(function (p) { $(p).classList.toggle('activa', p === id); });
    window.scrollTo(0, 0);
  }
  function toast(msg, tipo) {
    var t = $('toast'); t.textContent = msg; t.className = 'toast toast--' + (tipo || 'ok');
    clearTimeout(tToast); tToast = setTimeout(function () { t.classList.add('oculto'); }, 4000);
  }
  function spinner(v) { $('spinner').classList.toggle('visible', v); }

  /** Llama a una función del servidor (Apps Script). SESION_EXPIRADA lleva siempre al login.
   *  silencioso = sin velo de carga (para acciones que ya se pintaron en pantalla). */
  function llamar(fn, args, ok, fallo, silencioso) {
    if (!silencioso) spinner(true);
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var corte = setTimeout(function () { if (ctl) ctl.abort(); }, 45000);
    var termina = function () { clearTimeout(corte); if (!silencioso) spinner(false); };
    var error = function (m) {
      if (m.indexOf('SESION_EXPIRADA') >= 0) { cerrarLocal('Tu sesión venció. Ingresa de nuevo.'); return; }
      if (fallo) fallo(m); else toast(m, 'error');
    };
    fetch(CONF.API_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit', redirect: 'follow',
      body: JSON.stringify({ fn: fn, args: args }), signal: ctl ? ctl.signal : undefined
    }).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); }).then(function (j) {
      termina();
      if (j && j.ok === true) ok(j.data); else error(String((j && j.error) || 'No se pudo completar. Intenta de nuevo.'));
    }, function () {
      termina();
      error('Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.');
    });
  }

  function cerrarLocal(aviso) {
    TOKEN = ''; guardarToken(''); lsSet('ecosac_n', ''); PROG = null; DIA_SEL = ''; guardarCacheProg(); SECC = null; ['ecosac_s', 'ecosac_unid', 'ecosac_sem'].forEach(function (k) { lsSet(k, ''); });
    try { $('modal-capa').classList.add('oculto'); } catch (e) { /* ok */ }
    $('input-clave').value = '';
    mostrar('pantalla-login');
    if (aviso) mostrarError(aviso);
  }
  function mostrarError(msg) { var c = $('login-error'); c.textContent = msg; c.classList.remove('oculto'); }
  function limpiarError() { $('login-error').classList.add('oculto'); }

  function validar() {
    $('btn-entrar').disabled = !($('input-ruc').value.length === 11 && $('input-clave').value.length >= 5);
  }

  function entrar(ev) {
    ev.preventDefault();
    if ($('btn-entrar').disabled) return;
    limpiarError();
    $('btn-entrar').disabled = true;
    llamar('portalLogin', [$('input-ruc').value, $('input-clave').value], function (r) {
      $('input-clave').value = ''; validar();
      if (!r || !r.ok) { mostrarError((r && r.mensaje) || 'No se pudo ingresar.'); return; }
      TOKEN = r.token; guardarToken(TOKEN); lsSet('ecosac_n', r.nombre || '');
      abrirInicio(r.nombre, r.secciones);
    }, function (m) { validar(); mostrarError(m); });
  }

  /* Secciones visibles (las decide la hoja Config: SECCION_*). Si el servidor no las informa, todas se ven. */
  var BOTONES = { prog: 'btn-ir-prog', unid: 'btn-ir-unid', sem: 'btn-ir-sem', cont: 'btn-ir-cont' };
  function aplicarSecciones(sec) {
    if (sec) { SECC = sec; try { lsSet('ecosac_s', JSON.stringify(sec)); } catch (e) { /* ok */ } }
    else if (!SECC) { try { SECC = JSON.parse(lsGet('ecosac_s') || 'null'); } catch (e) { SECC = null; } }
    Object.keys(BOTONES).forEach(function (k) { $(BOTONES[k]).classList.toggle('oculto', !!SECC && SECC[k] === false); });
  }
  /* Recursos públicos (Genera tu QR): los decide la hoja Config (PUBLICO_GENERADOR_QR, QR_MENSAJE). Se recuerda lo último para que no parpadee. */
  var PUB = { generadorQr: true, qrMensaje: 'Pegar en un lugar seguro donde no se moje.' };
  function aplicarPublico(c) {
    if (c) { PUB = { generadorQr: c.generadorQr !== false, qrMensaje: c.qrMensaje || PUB.qrMensaje }; try { lsSet('ecosac_pub', JSON.stringify(PUB)); } catch (e) { /* ok */ } }
    else { try { var g = JSON.parse(lsGet('ecosac_pub') || 'null'); if (g) PUB = { generadorQr: g.generadorQr !== false, qrMensaje: g.qrMensaje || PUB.qrMensaje }; } catch (e) { /* ok */ } }
    ['caja-qr-login', 'caja-qr-inicio'].forEach(function (id) { $(id).classList.toggle('oculto', !PUB.generadorQr); });
  }
  function seccionActiva(k) { return !SECC || SECC[k] !== false; }

  /** Al abrir el inicio se piden en segundo plano las secciones activas, para que al tocarlas ya estén listas. */
  function precargar() {
    (window.ECOSAC_PRECARGA || []).forEach(function (f) { try { f(); } catch (e) { /* ok */ } });
    if (seccionActiva('prog')) cargarProg(false);
  }

  function abrirInicio(nombre, secciones) {
    $('txt-empresa').textContent = nombre || 'Tu empresa';
    aplicarSecciones(secciones);
    mostrar('pantalla-inicio');
    mostrarInstalar();
    precargar();
  }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined && txt !== null) e.textContent = txt; return e; }

  function abrirModal(nodos) {
    var m = $('modal'); m.textContent = '';
    nodos.forEach(function (n) { m.appendChild(n); });
    $('modal-capa').classList.remove('oculto');
  }
  function cerrarModal() { $('modal-capa').classList.add('oculto'); $('modal').textContent = ''; }

  /* =================== MI PROGRAMACIÓN =================== */

  function abrirProg() {
    mostrar('pantalla-prog');
    if (PROG) { elegirDiaPorDefecto(); $('prog-sub').textContent = PROG.empresa || ''; pintarProg(); cargarProg(false); }   // ya precargada: se ve al instante y se refresca en silencio
    else cargarProg(true);
  }

  function elegirDiaPorDefecto() {
    var dias = PROG.dias.map(function (d) { return d.dia; });
    if (DIA_SEL === '' || dias.indexOf(DIA_SEL) < 0) {
      var ab = PROG.dias.filter(function (d) { return d.estado === 'ABIERTO'; })[0];
      DIA_SEL = ab ? ab.dia : (dias[0] || '');
    }
  }

  function cargarProg(conSpinner) {
    var cache = (conSpinner && !PROG) ? leerCacheProg() : null;
    if (cache && cache.dias) {                      // se muestra al instante lo último que se vio, mientras llega lo nuevo
      PROG = cache; elegirDiaPorDefecto();
      $('prog-sub').textContent = (PROG.empresa || '') + ' · actualizando…';
      pintarProg();
    }
    llamar('progObtener', [TOKEN], function (r) {
      PROG = r; guardarCacheProg(); elegirDiaPorDefecto();
      $('prog-sub').textContent = r.empresa || '';
      pintarProg();
    }, function (m) {
      if (PROG) { $('prog-sub').textContent = (PROG.empresa || '') + ' · sin conexión'; toast('No se pudo actualizar. Se muestra lo último guardado.', 'error'); }
      else toast(m, 'error');
    }, !!cache);
  }

  function diaActual() { return PROG && PROG.dias.filter(function (d) { return d.dia === DIA_SEL; })[0]; }

  function repintar() { var y = window.pageYOffset; pintarProg(); window.scrollTo(0, y); }

  function recontar(d) {
    var c = { total: 0, conformes: 0, disconformes: 0, pendientes: 0 };
    d.viajes.forEach(function (x) {
      if (!x.activo) return;
      c.total++;
      if (x.estado === 'CONFORME') c.conformes++; else if (x.estado === 'DISCONFORME') c.disconformes++; else c.pendientes++;
    });
    d.conteo = c;
  }

  /* ---- guardia: a quién se envía el resumen según la hora de Lima ---- */
  var TURNO_ENVIO = '';   // '' = el de guardia; si la persona pulsa "enviar al otro turno" se invierte
  function limaMin() { var m = new Date(Date.now() - 5 * 3600000); return m.getUTCHours() * 60 + m.getUTCMinutes(); }
  function turnoGuardia() {
    var g = (PROG && PROG.guardia) || {};
    var d = typeof g.diaInicio === 'number' ? g.diaInicio : 360, n = typeof g.nocheInicio === 'number' ? g.nocheInicio : 1080, m = limaMin();
    var esDia = d <= n ? (m >= d && m < n) : (m >= d || m < n);
    return esDia ? 'DÍA' : 'NOCHE';
  }
  function destinoDe(turno) {
    var c = (PROG && PROG.contactos) || {};
    var i = c[turno];
    if (i && i.numero) return i;
    return c['N/D'] && c['N/D'].numero ? c['N/D'] : null;
  }
  function nombreTurno(t) { return t === 'NOCHE' ? 'Noche' : 'Día'; }

  function pintarProg() {
    var chips = $('prog-dias'); chips.textContent = '';
    var vacio = !PROG || !PROG.dias.length;
    $('prog-vacio').classList.toggle('oculto', !vacio);
    $('prog-banner').classList.add('oculto');
    $('prog-acciones').textContent = ''; $('prog-lista').textContent = '';
    if (vacio) return;

    PROG.dias.forEach(function (d) {
      var b = el('button', 'chip' + (d.dia === DIA_SEL ? ' activo' : ''), d.etiqueta);
      b.type = 'button'; b.setAttribute('role', 'tab');
      if (d.estado === 'ABIERTO' && d.conteo.pendientes) b.appendChild(el('span', 'n', String(d.conteo.pendientes)));
      b.addEventListener('click', function () { DIA_SEL = d.dia; TURNO_ENVIO = ''; pintarProg(); });
      chips.appendChild(b);
    });

    var d = diaActual(); if (!d) return;
    var ban = $('prog-banner');
    var act = PROG.actualizadoTexto ? ' Actualizada: ' + PROG.actualizadoTexto + '.' : '';
    if (d.estado === 'ABIERTO') {
      ban.className = 'caja caja--aviso';
      ban.textContent = 'Valida tus viajes cuando puedas: no hay hora límite. Si algo cambia en la programación, te lo marcaremos para que lo valides de nuevo.' + act;
    } else if (d.estado === 'PRELIMINAR') {
      ban.className = 'caja caja--info';
      ban.textContent = 'Programación preliminar: puede cambiar.' + act + ' Podrás validarla desde las ' + d.publicaTexto.slice(-5) + ' del ' + d.publicaTexto.slice(0, 5) + '.';
    } else {
      ban.className = 'caja caja--info';
      ban.textContent = (d.esHoy ? 'Programación de hoy, solo para consulta.' : 'La validación de este día ya cerró.') + act + ' Si algo no está bien, escribe a Coordinación por WhatsApp.';
    }

    var ac = $('prog-acciones');
    var c = d.conteo;
    ac.appendChild(el('p', 'ayuda', c.total + ' viajes · ' + c.conformes + ' conformes · ' + c.disconformes + ' disconformes · ' + c.pendientes + ' pendientes'));
    if (d.estado === 'ABIERTO' && c.pendientes > 0) {
      var todo = el('button', 'btn btn--primario', 'Todo conforme (' + c.pendientes + ' pendientes)');
      todo.type = 'button'; todo.addEventListener('click', function () { confirmarTodo(d); });
      ac.appendChild(todo);
    }

    // Avisar a Coordinación: va a quien está de guardia ahora (hora de Lima); se puede cambiar al otro turno
    var activos = d.viajes.filter(function (v) { return v.activo; });
    var guardia = turnoGuardia();
    var turno = TURNO_ENVIO || guardia;
    var dest = destinoDe(turno);
    if (activos.length && dest) {
      var caja = el('div', 'caja caja--info'); caja.appendChild(el('b', null, 'Avisar a Coordinación por WhatsApp'));
      var p = el('p', 'guardia-txt', 'De guardia ahora (turno ' + nombreTurno(guardia) + '): ' + ((destinoDe(guardia) || {}).nombre || 'Coordinación') + '. El resumen lleva los ' + activos.length + ' viajes del día.');
      caja.appendChild(p);
      var envia = el('button', 'btn btn--primario', 'Enviar resumen a ' + dest.nombre + (turno !== guardia ? ' (turno ' + nombreTurno(turno) + ')' : ''));
      envia.type = 'button'; envia.style.marginTop = '8px';
      envia.addEventListener('click', function () { enviarResumen(d, dest); });
      caja.appendChild(envia);
      var otro = turno === 'DÍA' ? 'NOCHE' : 'DÍA';
      if (destinoDe(otro) && (destinoDe(otro).numero !== dest.numero)) {
        var cambia = el('button', 'btn-link', turno === guardia ? 'Enviar al encargado del turno ' + nombreTurno(otro) : 'Volver al encargado de guardia');
        cambia.type = 'button';
        cambia.addEventListener('click', function () { TURNO_ENVIO = (turno === guardia) ? otro : ''; pintarProg(); });
        caja.appendChild(cambia);
      }
      ac.appendChild(caja);
    }

    d.viajes.forEach(function (v) { $('prog-lista').appendChild(tarjetaViaje(d, v)); });
  }

  function tarjetaViaje(d, v) {
    var clase = 'viaje' + (v.estado === 'CONFORME' ? ' viaje--conforme' : v.estado === 'DISCONFORME' ? ' viaje--disconforme' : v.estado === 'BAJA' ? ' viaje--baja' : '');
    var t = el('div', clase);
    var cab = el('div', 'viaje-cab');
    cab.appendChild(el('span', 'placa', v.placa));
    cab.appendChild(el('span', 'tag ' + (v.turno === 'NOCHE' ? 'tag--noche' : 'tag--dia'), v.turno));
    cab.appendChild(el('span', 'esp'));
    var etq = v._g ? ['Guardando…', 'tag--pend'] : ({ CONFORME: ['Conforme', 'tag--ok'], DISCONFORME: ['Disconforme', 'tag--mal'], PENDIENTE: ['Pendiente', 'tag--pend'], BAJA: ['Retirado', 'tag--mal'] }[v.estado] || ['Pendiente', 'tag--pend']);
    cab.appendChild(el('span', 'tag ' + etq[1], etq[0]));
    t.appendChild(cab);
    t.appendChild(el('div', 'viaje-det', v.lugar + (v.cap ? ' · Capacidad: ' + v.cap : '')));
    var tr = el('div', 'tramos-chips');
    v.tramos.forEach(function (x) { tr.appendChild(el('span', 'chip-tramo', x.s + ' ' + x.h)); });
    t.appendChild(tr);
    if (v.cambio) {
      var cj = el('div', 'caja caja--aviso', (v.estado === 'BAJA' ? 'Este viaje fue retirado de la programación.' : 'Este viaje cambió (' + v.cambio + ')' + (v.revalidar ? '. Vuelve a validarlo.' : '.')) + (v.modTarde ? ' El cambio llegó después del cierre: coordina con tu encargado por WhatsApp.' : ''));
      t.appendChild(cj);
    }
    if (v.motivo) t.appendChild(el('div', 'viaje-det', 'Motivo: ' + v.motivo));
    if (d.estado === 'ABIERTO' && v.activo) {
      var fila = el('div', 'viaje-botones');
      var ok = el('button', 'btn btn--ok', v.estado === 'CONFORME' ? '✓ Conforme' : 'Conforme');
      var mal = el('button', 'btn btn--mal', v.estado === 'DISCONFORME' ? '✕ Disconforme' : 'Disconforme');
      ok.type = mal.type = 'button';
      ok.disabled = mal.disabled = !!v._g;
      ok.addEventListener('click', function () { responder(d, v, 'CONFORME', '', ''); });
      mal.addEventListener('click', function () { dialogoDisconforme(d, v); });
      fila.appendChild(ok); fila.appendChild(mal); t.appendChild(fila);
    }
    return t;
  }

  function etiquetaMotivo(codigo) {
    var m = (PROG.motivos || []).filter(function (x) { return x.id === codigo; })[0];
    return m ? m.label : '';
  }

  /** Respuesta inmediata: la tarjeta cambia al tocar y el guardado va por detrás; si el servidor la rechaza, vuelve atrás. */
  function responder(d, v, estado, motivo, texto) {
    if (v._g) return;
    var ant = { estado: v.estado, motivo: v.motivo, revalidar: v.revalidar };
    v._g = true; v.estado = estado; v.revalidar = false;
    v.motivo = estado === 'DISCONFORME' ? etiquetaMotivo(motivo) + (texto ? ': ' + texto : '') : '';
    recontar(d); repintar();
    llamar('progResponder', [TOKEN, v.uid, v.version, estado, motivo, texto], function () {
      v._g = false; guardarCacheProg(); repintar();
    }, function (m) {
      v._g = false; v.estado = ant.estado; v.motivo = ant.motivo; v.revalidar = ant.revalidar;
      recontar(d); repintar(); toast(m, 'error'); cargarProg(false);
    }, true);
  }

  function dialogoDisconforme(d, v) {
    var sel = '';
    var cont = el('div', 'motivos');
    PROG.motivos.forEach(function (m) {
      var lab = el('label', 'motivo');
      var r = el('input'); r.type = 'radio'; r.name = 'motivo'; r.value = m.id;
      r.addEventListener('change', function () { sel = m.id; });
      var tx = el('span'); tx.appendChild(document.createTextNode(m.label)); tx.appendChild(el('small', null, m.detalle));
      lab.appendChild(r); lab.appendChild(tx); cont.appendChild(lab);
    });
    var area = el('textarea', 'area-texto'); area.maxLength = 200; area.placeholder = 'Comentario (obligatorio si eliges "Otro")';
    var fila = el('div', 'modal-botones');
    var no = el('button', 'btn btn--secundario', 'Cancelar'), si = el('button', 'btn btn--primario', 'Enviar');
    no.type = si.type = 'button';
    no.addEventListener('click', cerrarModal);
    si.addEventListener('click', function () {
      if (!sel) { toast('Elige el motivo.', 'error'); return; }
      if (sel === 'OTRO' && area.value.trim().length < 5) { toast('Explica brevemente el motivo.', 'error'); return; }
      var motivo = sel, texto = area.value.trim();
      cerrarModal(); responder(d, v, 'DISCONFORME', motivo, texto);
    });
    fila.appendChild(no); fila.appendChild(si);
    abrirModal([el('h3', null, 'Disconforme · ' + v.placa), el('p', null, '¿Qué no está bien en este viaje?'), cont, area, fila]);
  }

  function confirmarTodo(d) {
    var fila = el('div', 'modal-botones');
    var no = el('button', 'btn btn--secundario', 'Cancelar'), si = el('button', 'btn btn--primario', 'Sí, todo conforme');
    no.type = si.type = 'button';
    no.addEventListener('click', cerrarModal);
    si.addEventListener('click', function () {
      cerrarModal();
      var marcados = d.viajes.filter(function (v) { return v.activo && v.estado === 'PENDIENTE'; });
      marcados.forEach(function (v) { v.estado = 'CONFORME'; v._g = true; v.revalidar = false; });
      recontar(d); repintar();
      llamar('progResponderDia', [TOKEN, d.dia], function (r) {
        marcados.forEach(function (v) { v._g = false; });
        guardarCacheProg(); repintar(); toast(r.marcados + ' viajes marcados como conformes.');
      }, function (m) {
        marcados.forEach(function (v) { v._g = false; v.estado = 'PENDIENTE'; });
        recontar(d); repintar(); toast(m, 'error'); cargarProg(false);
      }, true);
    });
    fila.appendChild(no); fila.appendChild(si);
    abrirModal([el('h3', null, 'Todo conforme'), el('p', null, 'Se marcarán como conformes los ' + d.conteo.pendientes + ' viajes pendientes de ' + d.etiqueta + '. Los que ya marcaste como disconformes no se tocan.'), fila]);
  }

  function enviarResumen(d, info) {
    var l = ['*Resumen de validación* · ' + (PROG.empresa || ''), d.etiqueta];
    var n = { CONFORME: 0, DISCONFORME: 0, PENDIENTE: 0 };
    var det = [];
    d.viajes.forEach(function (v) {
      if (!v.activo) return;
      n[v.estado] = (n[v.estado] || 0) + 1;
      det.push('• ' + v.turno + ' · ' + v.placa + ' · ' + v.lugar + ' · ' + v.tramos.map(function (t) { return t.s + ' ' + t.h; }).join(' / ') + ': ' + (v.estado === 'DISCONFORME' ? 'DISCONFORME (' + v.motivo + ')' : v.estado.toLowerCase()));
    });
    l.push('Conformes: ' + n.CONFORME + ' · Disconformes: ' + n.DISCONFORME + ' · Pendientes: ' + n.PENDIENTE);
    l = l.concat(det);
    window.open('https://wa.me/' + info.numero + '?text=' + encodeURIComponent(l.join('\n')), '_blank', 'noopener');
  }

  /* =================== INSTALAR COMO APP =================== */
  var EV_INSTALAR = null;
  function yaInstalada() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function mostrarInstalar() {
    var c = $('caja-instalar'); if (!c) return;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (yaInstalada() || lsGet('ecosac_no_instalar') === '1' || !(EV_INSTALAR || ios)) { c.classList.add('oculto'); return; }
    $('txt-instalar').textContent = EV_INSTALAR
      ? 'Ten el portal como una app en tu celular: abre más rápido y sin buscar el enlace.'
      : 'Para instalar la app: toca el botón Compartir de Safari y elige "Añadir a pantalla de inicio".';
    $('btn-instalar').classList.toggle('oculto', !EV_INSTALAR);
    c.classList.remove('oculto');
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); EV_INSTALAR = e; mostrarInstalar(); });
  window.addEventListener('appinstalled', function () { EV_INSTALAR = null; mostrarInstalar(); });

  function salir() {
    if (TOKEN) llamar('portalSalir', [TOKEN], function () { }, function () { }, true);
    cerrarLocal('');
  }

  function contactar() {
    var texto = 'Hola, necesito ayuda para ingresar al portal de transportes. Mi RUC es ' + ($('input-ruc').value || '(sin escribir)') + '.';
    if (!CONTACTO.numero) { toast('El contacto aún no está configurado.', 'error'); return; }
    window.open('https://wa.me/' + CONTACTO.numero + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  }

  function iniciar() {
    $('input-ruc').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 11); limpiarError(); validar(); });
    $('input-clave').addEventListener('input', function () { this.value = this.value.replace(/\s/g, '').toUpperCase().slice(0, 8); limpiarError(); validar(); });
    $('btn-ver').addEventListener('click', function () {
      var c = $('input-clave'), ver = c.type === 'password';
      c.type = ver ? 'text' : 'password'; this.textContent = ver ? 'Ocultar' : 'Ver';
    });
    $('form-login').addEventListener('submit', entrar);
    $('btn-salir').addEventListener('click', salir);
    $('btn-ir-prog').addEventListener('click', abrirProg);
    $('btn-prog-volver').addEventListener('click', function () { mostrar('pantalla-inicio'); });
    $('btn-prog-actualizar').addEventListener('click', function () { cargarProg(true); });
    $('btn-ir-manual').addEventListener('click', function () { window.open(CONF.REGISTRO_MANUAL_URL, '_blank', 'noopener'); });
    $('btn-instalar').addEventListener('click', function () {
      if (!EV_INSTALAR) return;
      EV_INSTALAR.prompt();
      EV_INSTALAR.userChoice.then(function () { EV_INSTALAR = null; mostrarInstalar(); });
    });
    $('btn-no-instalar').addEventListener('click', function () { lsSet('ecosac_no_instalar', '1'); mostrarInstalar(); });
    $('btn-contacto').addEventListener('click', contactar);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarModal(); });

    aplicarPublico(null);
    llamar('portalConfigPublica', [], function (c) {
      aplicarPublico(c);
      CONTACTO = { numero: c.contactoNumero, nombre: c.contactoNombre, horario: c.contactoHorario };
      $('txt-contacto').textContent = c.contactoNombre || 'Coordinación';
      $('horario-login').textContent = c.contactoHorario ? 'Atención: ' + c.contactoHorario : '';
    }, function () { /* el login funciona igual sin contacto */ }, true);

    var t = leerToken();
    if (t) {
      TOKEN = t;
      llamar('portalSesion', [t], function (r) { if (r && r.ok) { lsSet('ecosac_n', r.nombre || ''); abrirInicio(r.nombre, r.secciones); } else cerrarLocal(''); }, function (m) {
        // sin señal NO se cierra la sesión: se entra con lo último guardado y se avisa
        if (/^Sin conexión/.test(m) && lsGet('ecosac_n')) { abrirInicio(lsGet('ecosac_n')); toast('Sin conexión: se mostrará lo último guardado.', 'error'); }
        else cerrarLocal('');
      });
    }

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* la app funciona igual sin caché */ });
    }
  }

  window.ECOSAC = {
    lsGet: lsGet, lsSet: lsSet, aplicarSecciones: aplicarSecciones, llamar: llamar, el: el, toast: toast, abrirModal: abrirModal, cerrarModal: cerrarModal, mostrar: mostrar,
    publico: function () { return PUB; }, hayToken: function () { return !!TOKEN; },
    token: function () { return TOKEN; }, contacto: function () { return CONTACTO; }
  };
  iniciar();
})();
