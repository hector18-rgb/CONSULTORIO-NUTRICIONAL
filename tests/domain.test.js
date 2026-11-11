const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setDomain, PLACEHOLDER } = require('../scripts/set-domain.js');

const SITE = path.join(__dirname, '..', 'sitio');
const OLD = 'nutricionsaludyfigura.com.mx';

function tmpCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  for (const f of ['index.html', 'robots.txt', 'sitemap.xml']) fs.copyFileSync(path.join(SITE, f), path.join(dir, f));
  return dir;
}
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');

test('the site no longer points at a domain the owner does not control', () => {
  for (const f of ['index.html', 'robots.txt', 'sitemap.xml']) {
    assert.ok(!read(SITE, f).includes(OLD), f + ' still mentions ' + OLD);
  }
});

test('setDomain writes the new domain into canonical, Open Graph, JSON-LD, sitemap and robots', () => {
  const dir = tmpCopy();
  setDomain(dir, 'https://ejemplo.com');
  const html = read(dir, 'index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/ejemplo\.com\/">/);
  assert.match(html, /property="og:url" content="https:\/\/ejemplo\.com\/"/);
  assert.match(html, /property="og:image" content="https:\/\/ejemplo\.com\/assets\/og-image\.jpg"/);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.url, 'https://ejemplo.com/');
  assert.equal(ld.image, 'https://ejemplo.com/assets/logo-192.png');
  assert.match(read(dir, 'sitemap.xml'), /<loc>https:\/\/ejemplo\.com\/<\/loc>/);
  assert.match(read(dir, 'robots.txt'), /Sitemap: https:\/\/ejemplo\.com\/sitemap\.xml/);
  for (const f of ['index.html', 'robots.txt', 'sitemap.xml']) assert.ok(!read(dir, f).includes(PLACEHOLDER), f + ' kept the placeholder');
});

test('setDomain accepts a bare domain with or without trailing slash and can be re-run', () => {
  const dir = tmpCopy();
  setDomain(dir, 'ejemplo.com/');
  assert.match(read(dir, 'index.html'), /<link rel="canonical" href="https:\/\/ejemplo\.com\/">/);
  setDomain(dir, 'otro.mx');
  const html = read(dir, 'index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/otro\.mx\/">/);
  assert.ok(!html.includes('ejemplo.com'));
});

test('setDomain rejects input that is not a domain', () => {
  const dir = tmpCopy();
  assert.throws(() => setDomain(dir, ''), /dominio/i);
  assert.throws(() => setDomain(dir, 'no es un dominio'), /dominio/i);
});

test('sitemap.xml and robots.txt have no byte-order mark (crawlers reject a BOM before <?xml)', () => {
  for (const f of ['sitemap.xml', 'robots.txt']) {
    const bytes = fs.readFileSync(path.join(SITE, f));
    assert.notDeepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], f + ' starts with a BOM');
  }
  assert.ok(read(SITE, 'sitemap.xml').startsWith('<?xml'));
});
