# Landing Consultorio Nutricional SyF

Página de una sola sección-scroll en HTML, CSS y JS sin dependencias. El sitio está en la carpeta `sitio/`.

## Antes de publicar: poner el dominio

El sitio **no trae dominio**: las direcciones de SEO (canonical, Open Graph, sitemap, robots) llevan un marcador. Cuando compres tu dominio:

```bash
node scripts/set-domain.js minegocio.com
node scripts/set-domain.js --check
```

El segundo comando falla mientras falte el dominio. Se puede volver a ejecutar con otro dominio.

## Publicar con Cloudflare Pages (conectado a GitHub)

1. Sube el proyecto a un repositorio de GitHub (recomendado: privado).
2. En Cloudflare: Workers & Pages → Create → Pages → Connect to Git → elige el repositorio.
3. Configuración de compilación: **Build command**: vacío. **Build output directory**: `sitio`.
4. Compra o conecta el dominio en Cloudflare (Custom domains) y ejecuta `set-domain.js` con ese dominio antes del último despliegue.

Cada `git push` vuelve a publicar la página.

## Editar contenido

- Textos, servicios y teléfono: `sitio/index.html`.
- **Horario: tres lugares.** La tabla visible y el bloque JSON-LD en `sitio/index.html`, y `SCHEDULE` en `sitio/js/main.js`.
- Colores: variables al inicio de `sitio/css/styles.css`.

## Pruebas

```bash
node --test tests/
```

Requiere Node 18 o superior.

## Decisiones

- Foto de sala de espera: se mantiene la de Google Maps (recortada para no mostrar el diploma con nombre).
- Días festivos: se atienden solo previa cita; la página lo indica junto al horario y el estado Abierto/Cerrado no los distingue.
- Dominio: pendiente, ver arriba.
