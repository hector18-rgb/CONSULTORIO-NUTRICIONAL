const test = require('node:test');
const assert = require('node:assert/strict');
const { waLink, getOpenStatus, SCHEDULE } = require('../sitio/js/main.js');

// Mexico City is UTC-6 all year (no DST since 2022). 2026-11-11 is a Wednesday.
const utc = (iso) => new Date(iso);

test('waLink encodes accents and ¿ in the prefilled message', () => {
  const msg = 'Hola, ¿cuánto cuesta?';
  assert.equal(waLink(msg), 'https://wa.me/525535679939?text=' + encodeURIComponent(msg));
});

test('SCHEDULE has closed Sunday, Tuesday and Friday', () => {
  assert.equal(SCHEDULE[0], null);
  assert.equal(SCHEDULE[2], null);
  assert.equal(SCHEDULE[5], null);
  assert.deepEqual(SCHEDULE[3], ['10:00', '13:30']);
  assert.deepEqual(SCHEDULE[6], ['10:00', '14:00']);
});

test('Wednesday 11:00 CDMX is open and says when it closes', () => {
  const s = getOpenStatus(utc('2026-11-11T17:00:00Z'));
  assert.equal(s.open, true);
  assert.equal(s.label, 'Abierto ahora · cierra a las 1:30 p.m.');
});

test('closing time is exclusive: Wednesday 13:30 CDMX is closed', () => {
  assert.equal(getOpenStatus(utc('2026-11-11T19:30:00Z')).open, false);
});

test('Saturday 13:59 is open and 14:00 is closed', () => {
  assert.equal(getOpenStatus(utc('2026-11-14T19:59:00Z')).open, true);
  assert.equal(getOpenStatus(utc('2026-11-14T20:00:00Z')).open, false);
});

test('Saturday open label closes at 2:00 p.m.', () => {
  assert.equal(getOpenStatus(utc('2026-11-14T18:00:00Z')).label, 'Abierto ahora · cierra a las 2:00 p.m.');
});

test('Tuesday (closed day) points to Wednesday', () => {
  const s = getOpenStatus(utc('2026-11-10T17:00:00Z'));
  assert.equal(s.open, false);
  assert.equal(s.label, 'Cerrado · abre el miércoles a las 10:00 a.m.');
});

test('Thursday after closing skips closed Friday and points to Saturday', () => {
  assert.equal(getOpenStatus(utc('2026-11-12T20:00:00Z')).label, 'Cerrado · abre el sábado a las 10:00 a.m.');
});

test('Saturday after closing skips closed Sunday and points to Monday', () => {
  assert.equal(getOpenStatus(utc('2026-11-14T21:00:00Z')).label, 'Cerrado · abre el lunes a las 10:00 a.m.');
});

test('Monday before opening says it opens today', () => {
  assert.equal(getOpenStatus(utc('2026-11-16T15:00:00Z')).label, 'Cerrado · abre hoy a las 10:00 a.m.');
});

test('result does not depend on the machine time zone', () => {
  // Same instant as Wednesday 11:00 CDMX; run the suite with TZ=Asia/Tokyo to prove independence.
  const s = getOpenStatus(utc('2026-11-11T17:00:00Z'));
  assert.equal(s.open, true);
});

test('open/closed status does not depend on the device time-zone database (fixed UTC-6)', () => {
  // Old phones with stale tz data would apply Mexican DST; the logic must not call Intl at all.
  const RealIntl = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function () { throw new Error('Intl must not be used'); };
  try {
    // Wednesday 11:00 in Mexico City (UTC-6)
    assert.equal(getOpenStatus(utc('2026-11-11T17:00:00Z')).open, true);
    // Same instant in July (when stale data would add DST): Wednesday 2026-07-15 11:00 UTC-6
    assert.equal(getOpenStatus(utc('2026-07-15T17:00:00Z')).open, true);
    assert.equal(getOpenStatus(utc('2026-07-15T19:30:00Z')).open, false);
  } finally {
    Intl.DateTimeFormat = RealIntl;
  }
});

const { countUpValue } = require('../sitio/js/main.js');

test('v1.1: countUpValue goes from 0.0 to the target and never overshoots', () => {
  assert.equal(countUpValue(0, 4.9, 1), '0.0');
  assert.equal(countUpValue(1, 4.9, 1), '4.9');
  assert.equal(countUpValue(2, 4.9, 1), '4.9'); // clamped
  assert.equal(countUpValue(-1, 4.9, 1), '0.0'); // clamped
  assert.equal(countUpValue(0.5, 4.9, 1), '4.3'); // ease-out: ahead of linear (2.5)
});
