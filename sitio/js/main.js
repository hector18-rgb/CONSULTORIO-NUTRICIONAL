(function () {
  'use strict';

  var WA_NUMBER = '525535679939';
  var MX_OFFSET_MIN = -6 * 60;
  var DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  // 0 = domingo. null = cerrado. [apertura, cierre] en hora de Ciudad de México.
  var SCHEDULE = {
    0: null,
    1: ['10:00', '13:30'],
    2: null,
    3: ['10:00', '13:30'],
    4: ['10:00', '13:30'],
    5: null,
    6: ['10:00', '14:00']
  };

  function waLink(message) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(message);
  }

  function toMinutes(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function formatTime(hhmm) {
    var p = hhmm.split(':');
    var h = parseInt(p[0], 10);
    var suffix = h >= 12 ? 'p.m.' : 'a.m.';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + p[1] + ' ' + suffix;
  }

  // Día de la semana y minutos del día en hora de Ciudad de México.
  // México no usa horario de verano desde 2022: UTC-6 fijo, sin depender de la base de zonas del dispositivo.
  function mexicoCityNow(now) {
    var shifted = new Date(now.getTime() + MX_OFFSET_MIN * 60000);
    return { day: shifted.getUTCDay(), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
  }

  // Valor del contador animado (ease-out cúbico). progress va de 0 a 1 y se limita a ese rango.
  function countUpValue(progress, target, decimals) {
    var p = Math.min(Math.max(progress, 0), 1);
    var eased = 1 - Math.pow(1 - p, 3);
    return (target * eased).toFixed(decimals);
  }

  function getOpenStatus(now) {
    var mx = mexicoCityNow(now);
    var today = SCHEDULE[mx.day];

    if (today && mx.minutes >= toMinutes(today[0]) && mx.minutes < toMinutes(today[1])) {
      return { open: true, label: 'Abierto ahora · cierra a las ' + formatTime(today[1]) };
    }
    if (today && mx.minutes < toMinutes(today[0])) {
      return { open: false, label: 'Cerrado · abre hoy a las ' + formatTime(today[0]) };
    }
    for (var i = 1; i <= 7; i++) {
      var d = (mx.day + i) % 7;
      if (SCHEDULE[d]) {
        return { open: false, label: 'Cerrado · abre el ' + DAY_NAMES[d] + ' a las ' + formatTime(SCHEDULE[d][0]) };
      }
    }
    return { open: false, label: 'Cerrado' };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { waLink: waLink, getOpenStatus: getOpenStatus, SCHEDULE: SCHEDULE, countUpValue: countUpValue };
  }

  /* ===== Mejora progresiva del DOM (la página funciona sin esto) ===== */
  if (typeof document === 'undefined') return;

  // 1) Aparición suave. Va primero: aunque algo más falle, el contenido nunca queda oculto.
  var reveals = document.querySelectorAll('.reveal');
  function showAll() { reveals.forEach(function (el) { el.classList.add('is-visible'); }); }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    document.documentElement.classList.add('js-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
    // Seguro: si el observador nunca dispara, se muestra todo.
    setTimeout(showAll, 4000);
  } else {
    showAll();
  }

  // 1b) Movimiento extra (solo si la persona no pidió reducir el movimiento).
  //     Es mejora opcional: si algo falla, la página sigue completa.
  function initScrollEffects() {
    var header = document.querySelector('.site-header');
    var bar = document.querySelector('.progress');
    var media = document.querySelector('.hero__media');
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset || 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(y / max, 1).toFixed(4) : '0');
      if (media && y < window.innerHeight) media.style.setProperty('--py', Math.min(y * 0.06, 40).toFixed(1) + 'px');
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function initCountUp() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var start = null;
      el.textContent = countUpValue(0, target, decimals);
      function step(ts) {
        if (start === null) start = ts;
        var p = (ts - start) / 1400;
        el.textContent = countUpValue(p, target, decimals);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      setTimeout(function () { el.textContent = countUpValue(1, target, decimals); }, 2000); // seguro
    }
    var counter = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { counter.unobserve(e.target); run(e.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { counter.observe(el); });
  }

  try {
    if (!reduce) { initScrollEffects(); initCountUp(); }
  } catch (err) { /* sin movimiento extra */ }

  // 2) Enlaces de WhatsApp con mensaje propio (el HTML ya trae un href válido)
  document.querySelectorAll('a[data-wa]').forEach(function (a) {
    a.setAttribute('href', waLink(a.getAttribute('data-wa')));
  });

  // 3) Estado abierto/cerrado y día actual en la tabla de horario (mejora opcional).
  //    Se refresca cada minuto por si la pestaña se queda abierta.
  function updateStatus() {
    try {
      var now = new Date();
      var status = getOpenStatus(now);
      var statusEl = document.getElementById('open-status');
      if (statusEl) {
        statusEl.textContent = status.label;
        statusEl.classList.toggle('is-open', status.open);
        statusEl.classList.toggle('is-closed', !status.open);
      }
      document.querySelectorAll('.hours tr[aria-current]').forEach(function (r) { r.removeAttribute('aria-current'); });
      var row = document.querySelector('.hours tr[data-day="' + mexicoCityNow(now).day + '"]');
      if (row) row.setAttribute('aria-current', 'date');
    } catch (err) {
      /* sin estado en vivo: la tabla de horario sigue siendo legible */
    }
  }
  updateStatus();
  setInterval(updateStatus, 60000);
})();
