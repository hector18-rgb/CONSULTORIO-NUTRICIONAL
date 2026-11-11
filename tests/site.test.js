const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', 'sitio', p), 'utf8');
const css = read('css/styles.css');
const html = read('index.html');
const js = read('js/main.js');

test('.reveal is only hidden after main.js marks the page js-ready (content survives a failed script)', () => {
  const base = css.match(/(^|\n)\.reveal \{([^}]*)\}/)[2];
  assert.doesNotMatch(base, /opacity:\s*0/);
  assert.match(css, /\.js-ready \.reveal:not\(\.is-visible\)/);
});

test('main.js reveals everything after a timeout even if the observer never fires', () => {
  assert.match(js, /classList\.add\('js-ready'\)/);
  // the failsafe timer must call the function that adds .is-visible to every .reveal
  assert.match(js, /function showAll\(\)[^}]*classList\.add\('is-visible'\)/);
  assert.match(js, /setTimeout\(showAll,\s*\d+\)/);
});

test('the open/closed block cannot stop the page from working (wrapped in try/catch)', () => {
  assert.match(js, /function updateStatus\(\)\s*\{\s*try\s*\{[\s\S]*getOpenStatus\([\s\S]*\}\s*catch/);
});

test('above-the-fold hero content is not hidden behind .reveal', () => {
  const hero = html.match(/<section id="inicio"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(hero, /class="[^"]*\breveal\b/);
});

test('mobile footer padding rule (room for the floating button) comes after the base footer rule', () => {
  const base = css.indexOf('.site-footer { padding: 40px 0');
  const mobile = css.indexOf('.site-footer { padding-bottom: 96px');
  assert.ok(base > -1 && mobile > -1, 'both rules exist');
  assert.ok(mobile > base, 'mobile rule must come later so it wins');
});

test('closing section has a visible keyboard focus ring (white on the green background)', () => {
  assert.match(css, /\.closing :focus-visible\s*\{[^}]*outline-color:\s*#fff/);
});


test('JSON-LD medicalSpecialty is a valid schema.org value', () => {
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.medicalSpecialty, 'DietNutrition');
});

test('long contact links wrap instead of overflowing on 320px screens', () => {
  assert.match(css, /\.contact-list a\s*\{[^}]*overflow-wrap:\s*anywhere/);
});

test('favicon uses the light 192px logo and an apple-touch-icon exists', () => {
  assert.match(html, /<link rel="icon"[^>]*href="assets\/logo-192\.png"/);
  assert.match(html, /<link rel="apple-touch-icon"[^>]*href="assets\/logo-192\.png"/);
});

test('status refreshes while the tab stays open', () => {
  assert.match(js, /setInterval\(\s*updateStatus\s*,\s*60000\s*\)/);
});

test('hours section tells visitors that holidays are by appointment only', () => {
  const loc = html.match(/<section id="ubicacion"[\s\S]*?<\/section>/)[0];
  assert.match(loc, /d[ií]as festivos[^<]*previa cita/i);
});

// ===== v1.1 =====
const servicesSection = html.match(/<section id="servicios"[\s\S]*?<\/section>/)[0];

test('v1.1: the footer no longer carries the privacy notice', () => {
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
  assert.doesNotMatch(footer, /privacidad/i);
  assert.doesNotMatch(footer, /Google Fonts/);
});

test('v1.1: services are listed without any price call-to-action', () => {
  assert.doesNotMatch(servicesSection, /precio/i);
  assert.doesNotMatch(servicesSection, /data-wa/);
  assert.doesNotMatch(servicesSection, /Consultar/);
});

test('v1.1: all 7 services are still listed', () => {
  const titles = [...servicesSection.matchAll(/<article class="service-card[^"]*">[\s\S]*?<h3>([^<]+)<\/h3>/g)].map((m) => m[1]);
  assert.deepEqual(titles, [
    'Nutrición clínica', 'Control de peso', 'Nutrición deportiva', 'Padecimientos específicos',
    'Niños y adolescentes', 'Embarazo y lactancia', 'Consulta en línea',
  ]);
});

test('v1.1: hero entrance animations are pure CSS (work even if JS fails)', () => {
  assert.match(css, /\.hero h1 \.line > span\s*\{[^}]*animation:/);
  assert.match(css, /\.hero__media img\s*\{[^}]*animation:/);
  assert.match(css, /@keyframes rise/);
  assert.match(css, /@keyframes float/);
});

test('v1.1: hero shows two floating badges with true claims only', () => {
  const hero = html.match(/<section id="inicio"[\s\S]*?<\/section>/)[0];
  const badges = [...hero.matchAll(/class="hero__badge[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  assert.deepEqual(badges, ['Presencial y en línea', 'Con cita previa']);
});

test('v1.1: prefers-reduced-motion turns every animation and transition off', () => {
  const m = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, 'reduced-motion block exists');
  assert.match(m[1], /animation:\s*none\s*!important/);
  assert.match(m[1], /transition:\s*none\s*!important/);
});

test('v1.1: service cards react on hover only where hover exists, and reveal with a stagger', () => {
  assert.match(css, /@media \(hover:\s*hover\)\s*\{[^}]*\.service-card:hover/);
  assert.match(css, /\.service-card:nth-child\(3n \+ 2\)\s*\{[^}]*--d:/);
});

test('v1.1: opinions show the number counting up and five animated stars', () => {
  const op = html.match(/<section id="opiniones"[\s\S]*?<\/section>/)[0];
  assert.match(op, /data-count="4\.9"[^>]*>4\.9</); // final value is in the HTML, so no-JS shows it
  assert.equal((op.match(/class="star-i"/g) || []).length, 5);
});

test('v1.1: scroll progress bar exists and is hidden from assistive tech', () => {
  assert.match(html, /<div class="progress" aria-hidden="true"><\/div>/);
});

test('v1.1: scroll effects are skipped when the visitor asked for reduced motion', () => {
  assert.match(js, /requestAnimationFrame/);
  assert.match(js, /if \(!reduce\)\s*\{[\s\S]*?initScrollEffects/);
});
