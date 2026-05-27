# Federación Pueblos de Riaza — migración a Astro

Sitio informativo migrado de WordPress a Astro, desplegado en Vercel.

## Puesta en marcha

```bash
npm install
```

## 1. Migrar el contenido desde WordPress

El script se conecta a la API REST de tu WordPress actual, descarga todas las
noticias y páginas con sus imágenes, y las convierte a Markdown.

```bash
npm run migrar
```

Genera:

- `src/content/noticias/*.md` — una por noticia, con título, fecha, portada.
- `src/content/paginas/*.md` — las páginas informativas (Federación, Pueblos, etc.).
- `public/images/*` — imágenes descargadas en su máxima resolución (sin los
  sufijos `-1024x461` ni `-scaled` que añade WordPress).
- `public/files/*` — PDFs adjuntos (folletos, carteles).

El script detecta automáticamente:

- **Galerías** de WordPress: se convierten en HTML directo (`<figure class="galeria">`)
  dentro del Markdown, que Astro renderiza sin necesidad de plugin. Las noticias
  con galería llevan `galeria: true` en el frontmatter. El CSS mínimo de la
  rejilla está en `src/layouts/Base.astro`.
- **PDFs**: se descargan a `/public/files` y se enlazan en el texto (se ignora
  el segundo enlace «Descarga» que WordPress duplica).
- **Captions** (pies de foto) y enlaces de imagen (lightbox), que se limpian.
- **Enlaces internos**: los que apuntan al propio dominio se convierten en
  rutas relativas (`/los-pueblos/`) para que funcionen en local y en Vercel.

Requisito: que la API REST de WordPress esté accesible. Compruébalo abriendo
en el navegador `https://www.federacionpueblosderiaza.org/wp-json/wp/v2/posts`.
Si devuelve JSON, funciona. Si da error 401/403, hay que habilitarla
temporalmente o exportar el contenido por otra vía.

## 2. Revisar el contenido

El conversor HTML→Markdown cubre los casos habituales, pero conviene revisar
los `.md` generados, sobre todo páginas con maquetación compleja. Aquí es donde
una IA te ayuda a limpiar y reestructurar rápido.

## 3. Desarrollo local

```bash
npm run dev
```

## 4. Diseño

El esqueleto (`src/layouts/Base.astro`, `src/pages/`) es deliberadamente
mínimo. Aquí es donde inviertes el tiempo en hacer el diseño a tu gusto.

## 5. Despliegue en Vercel

Conecta el repo en Vercel. Detecta Astro automáticamente. El `vercel.json`
incluye la redirección de las URLs antiguas de WordPress
(`/AAAA/MM/DD/slug`) a las nuevas (`/noticias/slug`) con un 301, para no
perder posicionamiento.

## Estructura

```
scripts/migrar.mjs        Script de migración WP -> Markdown
src/content/config.ts     Esquema de las colecciones (noticias, paginas)
src/content/noticias/     Noticias en Markdown (generadas)
src/content/paginas/      Páginas en Markdown (generadas)
src/layouts/Base.astro    Layout base (cabecera, pie, navegación)
src/pages/index.astro     Home: banner de eventos + listado de noticias
src/pages/noticias/[slug].astro   Detalle de noticia
src/pages/[slug].astro    Páginas informativas
public/images/            Imágenes (generadas)
vercel.json               Redirecciones 301 desde URLs antiguas
```

## Futuro: la tiendita

Cuando llegue, Supabase entra para productos/stock/pedidos sin tocar lo
anterior. El sitio sigue siendo estático y solo la parte de tienda consulta
la base de datos.

---

## Fase 1: páginas nuevas y contenido (mayo 2025)

Se han añadido a mano (no provienen de WordPress):

- `src/pages/el-territorio.astro` — sección El Territorio (biodiversidad,
  usos tradicionales, paisaje), con contenido del informe del proyecto minero.
- `src/pages/patrimonio.astro` — sección Patrimonio (arquitectura tradicional,
  materiales por pueblo, yacimientos).
- `src/pages/los-pueblos.astro` — índice de los DIEZ pueblos (página propia,
  ya incluye Villacorta). Sustituye a la página migrada del mismo nombre.
- `src/pages/al-dia.astro` — blog con todas las noticias.
- `src/content/paginas/villacorta.md` — ficha del décimo pueblo.
- `public/documentos/informe-proyecto-minero-sierra-ayllon.pdf` — descargable.

IMPORTANTE: la home se ha aligerado (3 noticias) y muestra el informe como
descargable destacado.

### Páginas con plantilla propia

`la-federacion` y `los-pueblos` tienen plantilla `.astro` propia y están
EXCLUIDAS de la ruta genérica `[slug].astro` (ver el `Set propias` en ese
archivo). Si el contenido migrado de esas páginas cambia, no afecta a la web.

### Sobre re-migrar y Villacorta

`npm run migrar` NO borra la carpeta de contenido: solo escribe los archivos
que vienen de WordPress. Por eso `villacorta.md` (creado a mano) sobrevive a
las re-migraciones. No borres `src/content/paginas/` manualmente.

### PENDIENTE: Asociación San Roque de Villacorta

La página "Las Asociaciones" aún se sirve del contenido migrado de WordPress.
Para añadir la Asociación San Roque de Villacorta de forma permanente,
conviene convertirla en página propia (`las-asociaciones.astro`) con el
listado real de asociaciones. Pendiente de definir ese listado.

---

## Fase 1 (ampliación): iconos, fichas de pueblo, entidades

- `src/components/Icono.astro` — iconos SVG de línea (monte, hoja, agua, casa,
  ganado, seta, trigo, piedra, documento, columna, brújula).
- `src/data/pueblos.ts` — datos estructurados de los 10 pueblos. RELLENAR los
  campos `altitud`, `habitantes`, `fiesta`, `asociacion` cuando haya datos.
- `src/pages/[pueblo].astro` — ficha de pueblo enriquecida: foto, ficha técnica,
  noticias relacionadas (detección automática por nombre en título/descripción),
  enlace a Google Maps y navegación al siguiente pueblo. Genera las URLs de los
  10 pueblos; estos slugs están excluidos de `[slug].astro`.
- Pie: mención "Miembro de CODINSE" con enlace.
- El Territorio: enlace a Red Natura 2000; iconos en usos tradicionales.
- Patrimonio: sección etnográfica nueva y arqueología ampliada.

### Noticias relacionadas por pueblo (provisional)

Se detectan buscando el nombre del pueblo en el título/descripción de cada
noticia. Es aproximado; se hará con precisión con el campo "pueblo" en Supabase
(Fase 2).

### Convertir un párrafo en cita

En los .md de pueblo, antepón `>` al párrafo para que se renderice como cita
(blockquote). Ej. ver `src/content/paginas/villacorta.md`.

### Enlaces a Google Maps de los pueblos

Están en `src/data/pueblos.ts`. Aldeanueva, Alquité, Barahona, El Muyo,
El Negredo, Madriguera y Martín Muñoz tienen su enlace; Becerril usa búsqueda
genérica; Serracín apunta a la web actual; Villacorta pendiente.

---

## Mapa interactivo del territorio

- `public/images/mapa-territorio.png` — mapa de fondo.
- En `src/pages/los-pueblos.astro` se superponen puntos clicables, uno por
  pueblo, posicionados con `mapaX`/`mapaY` (en %) de `src/data/pueblos.ts`.
- Para mover un punto, edita su `mapaX`/`mapaY` en `pueblos.ts`. Aumentar X
  lo mueve a la derecha; aumentar Y, hacia abajo.
- Al pasar el ratón sobre un punto aparece el nombre y se agranda; al pulsar,
  lleva a la ficha del pueblo.
