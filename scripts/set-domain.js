#!/usr/bin/env node
/*
 * Pone el dominio del consultorio en todas las direcciones absolutas del sitio
 * (canonical, Open Graph, JSON-LD, sitemap.xml y robots.txt).
 *
 *   node scripts/set-domain.js minegocio.com     -> escribe el dominio
 *   node scripts/set-domain.js --check           -> falla si todavía falta poner el dominio
 *
 * Se puede volver a ejecutar con otro dominio: reemplaza el anterior.
 */
const fs = require('node:fs');
const path = require('node:path');

const PLACEHOLDER = 'https://DOMINIO-PENDIENTE.invalid';
const FILES = ['index.html', 'robots.txt', 'sitemap.xml'];
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function normalize(input) {
  const d = String(input || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!DOMAIN_RE.test(d)) throw new Error('Escribe un dominio válido, por ejemplo: minegocio.com');
  return 'https://' + d.toLowerCase();
}

function currentBase(dir) {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const m = html.match(/<link rel="canonical" href="([^"]+)">/);
  if (!m) throw new Error('No encontré la etiqueta canonical en index.html');
  return m[1].replace(/\/+$/, '');
}

function setDomain(dir, input) {
  const next = normalize(input);
  const prev = currentBase(dir);
  for (const f of FILES) {
    const p = path.join(dir, f);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split(prev).join(next));
  }
  return next;
}

function hasPlaceholder(dir) {
  return FILES.some((f) => fs.readFileSync(path.join(dir, f), 'utf8').includes(PLACEHOLDER));
}

module.exports = { setDomain, hasPlaceholder, PLACEHOLDER };

if (require.main === module) {
  const site = path.join(__dirname, '..', 'sitio');
  const arg = process.argv[2];
  try {
    if (arg === '--check') {
      if (hasPlaceholder(site)) {
        console.error('Falta poner el dominio. Ejecuta: node scripts/set-domain.js minegocio.com');
        process.exit(1);
      }
      console.log('Dominio listo: ' + currentBase(site));
    } else {
      console.log('Dominio configurado: ' + setDomain(site, arg));
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
