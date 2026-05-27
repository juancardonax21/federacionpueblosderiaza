#!/usr/bin/env node
/**
 * Migración WordPress -> Markdown (Astro content collections)
 * ------------------------------------------------------------
 * Extrae posts (noticias) y pages (páginas) vía la API REST de WordPress,
 * descarga imágenes (máxima resolución) y PDFs adjuntos, convierte el HTML
 * a Markdown y genera .md con frontmatter para Astro. Detecta galerías,
 * captions y deduplica adjuntos.
 *
 * Uso:  node scripts/migrar.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";

const SITE = "https://www.federacionpueblosderiaza.org";
const API = `${SITE}/wp-json/wp/v2`;

const OUT_NEWS = "src/content/noticias";
const OUT_PAGES = "src/content/paginas";
const OUT_IMG = "public/images";
const OUT_FILES = "public/files";

const NUL = "\u0000"; // marcador interno

// --- Utilidades ----------------------------------------------------------

const slugify = (s) =>
  s.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const strip = (t) => decodeEntities((t || "").replace(/<[^>]+>/g, "").trim());

function decodeEntities(s) {
  return (s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“").replace(/&#8221;/g, "”").replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…").replace(/&#8230;/g, "…")
    .replace(/&#171;|&laquo;/g, "«").replace(/&#187;|&raquo;/g, "»");
}

const yamlString = (s) => `"${(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const escapeHtml = (s) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Quita sufijos de tamaño de WordPress: -1024x461 y -scaled.
function originalImageUrl(src) {
  return src
    .replace(/-\d+x\d+(\.(jpe?g|png|webp|gif))$/i, "$1")
    .replace(/-scaled(\.(jpe?g|png|webp|gif))$/i, "$1");
}

const isImageHref = (href) => /\.(jpe?g|png|webp|gif|svg)$/i.test(href);

// Si el enlace apunta al propio sitio (con o sin www), devuelve solo la ruta
// (p. ej. /aldeanueva-del-monte/). Los enlaces externos se dejan intactos.
function toInternalPath(href) {
  try {
    const u = new URL(href, SITE);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "federacionpueblosderiaza.org") {
      return u.pathname + (u.hash || "");
    }
    return href;
  } catch {
    return href;
  }
}

// --- Descargas (deduplicadas) --------------------------------------------

const downloaded = new Map(); // url limpia -> nombre de archivo
async function download(src, destDir, { keepSize = false } = {}) {
  const clean = keepSize ? src : originalImageUrl(src);
  if (downloaded.has(clean)) return downloaded.get(clean);
  const file = path.basename(new URL(clean, SITE).pathname);
  try {
    let res = await fetch(clean);
    if (!res.ok && clean !== src) res = await fetch(src);
    if (!res.ok) { console.warn(`  ! ${res.status} en ${clean}`); downloaded.set(clean, file); return file; }
    await pipeline(res.body, createWriteStream(path.join(destDir, file)));
    console.log(`  ↓ ${file}`);
  } catch (e) {
    console.warn(`  ! no se pudo descargar ${src}: ${e.message}`);
  }
  downloaded.set(clean, file);
  return file;
}

// Encuentra cada <figure class="...wp-block-gallery..."> y recorta hasta su
// </figure> de cierre real, contando figuras anidadas. Llama a replacer(block)
// con el bloque completo y sustituye por su valor de retorno.
function replaceGalleries(html, replacer) {
  const openRe = /<figure[^>]*class="[^"]*wp-block-gallery[^"]*"[^>]*>/i;
  let result = "";
  let rest = html;
  while (true) {
    const m = rest.match(openRe);
    if (!m) { result += rest; break; }
    const start = m.index;
    result += rest.slice(0, start);
    // recorrer desde la apertura contando <figure>/</figure>
    let i = start;
    let depth = 0;
    const figTag = /<\/?figure\b[^>]*>/gi;
    figTag.lastIndex = start;
    let end = -1;
    let tag;
    while ((tag = figTag.exec(rest))) {
      if (tag[0][1] === "/") { depth--; if (depth === 0) { end = figTag.lastIndex; break; } }
      else depth++;
    }
    if (end === -1) { result += rest.slice(start); break; } // sin cierre: dejar tal cual
    const block = rest.slice(start, end);
    result += replacer(block);
    rest = rest.slice(end);
  }
  return result;
}

// --- Conversión HTML -> Markdown -----------------------------------------

async function htmlToMarkdown(html) {
  if (!html) return { md: "", hasGallery: false, primeraImg: null };
  let hasGallery = false;
  let primeraImg = null; // primera imagen del cuerpo (respaldo para portada)
  const tokens = []; // bloques que se resuelven al final (orden preservado)

  // 1) GALERÍAS primero (antes que las figuras sueltas, para no romperlas).
  // Las galerías de WP son <figure> anidadas dentro de <figure>. Una regex
  // no cuenta anidamiento, así que recortamos cada galería equilibrando
  // las etiquetas <figure>...</figure>.
  html = replaceGalleries(html, (block) => {
    const srcs = [...block.matchAll(/<img[^>]*src=["']([^"']+)["']/gi)].map((x) => x[1]);
    // El caption de la galería es el último figcaption del bloque.
    const caps = [...block.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi)];
    const caption = caps.length ? strip(caps[caps.length - 1][1]) : "";
    tokens.push({ type: "gallery", srcs, caption });
    return `${NUL}${tokens.length - 1}${NUL}`;
  });

  // 2) PDFs (capturar antes de limpiar). Deduplicado por archivo.
  html = html.replace(/<a[^>]*href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href, label) => {
      const txt = strip(label);
      // Ignorar el segundo enlace ("Descarga"/"Download") al mismo PDF.
      if (/^(descarga|descargar|download)$/i.test(txt)) return "";
      tokens.push({ type: "pdf", href, txt: txt || "Descargar PDF" });
      return `${NUL}${tokens.length - 1}${NUL}`;
    });
  html = html.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, "");

  // 3) Figuras con imagen (+ caption opcional)
  html = html.replace(
    /<figure[^>]*>\s*<img[^>]*src=["']([^"']+)["'][^>]*>(?:[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?[\s\S]*?<\/figure>/gi,
    (_m, src, cap) => {
      tokens.push({ type: "img", src, caption: cap ? strip(cap) : "" });
      return `${NUL}${tokens.length - 1}${NUL}\n`;
    });

  // 4) Imágenes sueltas restantes
  html = html.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (_m, src) => {
    tokens.push({ type: "img", src, caption: "" });
    return `${NUL}${tokens.length - 1}${NUL}\n`;
  });

  // 5) Enlaces: si apuntan a una imagen (lightbox de WP), conservar solo el
  //    texto. Si apuntan al propio dominio, convertir a ruta relativa.
  html = html.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href, t) => {
      if (isImageHref(href)) return strip(t);
      const internal = toInternalPath(href);
      return `[${strip(t)}](${internal})`;
    });

  // 6) Resto de etiquetas -> markdown
  let md = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, t) => `\n# ${strip(t)}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, t) => `\n## ${strip(t)}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, t) => `\n### ${strip(t)}\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, t) => `\n#### ${strip(t)}\n`)
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _g, t) => `**${strip(t)}**`)
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _g, t) => `*${strip(t)}*`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `- ${strip(t)}\n`)
    .replace(/<\/(ul|ol)>/gi, "\n").replace(/<(ul|ol)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n").replace(/<p[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n");

  // 7) Resolver tokens en orden (descargando lo necesario)
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    let out = "";
    if (tk.type === "gallery") {
      hasGallery = true;
      const items = [];
      for (const s of tk.srcs) {
        const f = await download(s, OUT_IMG);
        if (!primeraImg) primeraImg = `/images/${f}`;
        items.push(`    <a href="/images/${f}"><img src="/images/${f}" alt="" loading="lazy" /></a>`);
      }
      const cap = tk.caption
        ? `\n  <figcaption>${escapeHtml(tk.caption)}</figcaption>`
        : "";
      // HTML directo: Astro lo respeta sin necesidad de plugin.
      out = `\n<figure class="galeria">\n  <div class="galeria-grid">\n${items.join("\n")}\n  </div>${cap}\n</figure>\n`;
    } else if (tk.type === "img") {
      const file = await download(tk.src, OUT_IMG);
      if (!primeraImg) primeraImg = `/images/${file}`;
      out = `![${tk.caption}](/images/${file})`;
    } else if (tk.type === "pdf") {
      await download(tk.href, OUT_FILES, { keepSize: true });
      const file = path.basename(new URL(tk.href, SITE).pathname);
      out = `\n[📄 ${tk.txt}](/files/${file})\n`;
    }
    md = md.replace(`${NUL}${i}${NUL}`, () => out);
  }

  md = decodeEntities(md).replace(/\n{3,}/g, "\n\n").trim();
  return { md, hasGallery, primeraImg };
}

// --- API -----------------------------------------------------------------

async function getAll(endpoint) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${API}/${endpoint}?per_page=100&page=${page}&_embed`;
    const res = await fetch(url);
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`Error ${res.status} en ${url}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    const total = Number(res.headers.get("x-wp-totalpages") || "1");
    if (page >= total) break;
    page++;
  }
  return items;
}

const featuredImage = (item) =>
  item?._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;

const cleanExcerpt = (raw) =>
  strip(raw).replace(/\s*\[\s*…\s*\]\s*$/, "").replace(/\s*\[\.\.\.\]\s*$/, "").replace(/…\s*$/, "").trim();

// --- Principal -----------------------------------------------------------

async function run() {
  for (const d of [OUT_NEWS, OUT_PAGES, OUT_IMG, OUT_FILES])
    await mkdir(d, { recursive: true });

  console.log("Descargando noticias...");
  const posts = await getAll("posts");
  console.log(`  ${posts.length} noticias\n`);

  for (const p of posts) {
    const title = strip(p.title?.rendered || "Sin título");
    const date = (p.date || "").slice(0, 10);
    const slug = p.slug || slugify(title);
    const { md, hasGallery, primeraImg } = await htmlToMarkdown(p.content?.rendered || "");
    const excerpt = cleanExcerpt(p.excerpt?.rendered || "");

    // Portada: imagen destacada de WP si existe; si no, la primera del cuerpo.
    let cover = null;
    const feat = featuredImage(p);
    if (feat) cover = `/images/${await download(feat, OUT_IMG)}`;
    else if (primeraImg) cover = primeraImg;

    const fm = ["---",
      `title: ${yamlString(title)}`,
      `date: ${date}`,
      excerpt ? `description: ${yamlString(excerpt)}` : null,
      cover ? `cover: ${yamlString(cover)}` : null,
      hasGallery ? "galeria: true" : null,
      `wpUrl: ${yamlString(new URL(p.link).pathname)}`,
      "---", ""].filter(Boolean).join("\n");

    await writeFile(path.join(OUT_NEWS, `${slug}.md`), fm + md + "\n");
    console.log(`noticia → ${slug}.md`);
  }

  console.log("\nDescargando páginas...");
  const pages = await getAll("pages");
  console.log(`  ${pages.length} páginas\n`);

  for (const p of pages) {
    const title = strip(p.title?.rendered || "Sin título");
    const slug = p.slug || slugify(title);
    const { md } = await htmlToMarkdown(p.content?.rendered || "");
    const fm = ["---",
      `title: ${yamlString(title)}`,
      `wpUrl: ${yamlString(new URL(p.link).pathname)}`,
      "---", ""].join("\n");
    await writeFile(path.join(OUT_PAGES, `${slug}.md`), fm + md + "\n");
    console.log(`página → ${slug}.md`);
  }

  console.log("\n✔ Migración completada.");
}

run().catch((e) => { console.error("Fallo:", e); process.exit(1); });
