import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const env = {};
for (const linea of readFileSync(".env", "utf8").split("\n")) {
  const m = linea.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const url = env.PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Faltan PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env");
  process.exit(1);
}

const supabase = createClient(url, secret);
const DIR = "src/content/noticias";

function fechaISO(d) {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === "string" && d.length >= 10) return d.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const { data: pueblos, error: errP } = await supabase
    .from("pueblos").select("id, nombre, slug");
  if (errP) { console.error("Error leyendo pueblos:", errP); process.exit(1); }
  console.log(`Pueblos en BBDD: ${pueblos.length}`);

  const archivos = (await readdir(DIR)).filter((f) => f.endsWith(".md"));
  console.log(`Archivos de noticias: ${archivos.length}`);

  let insertadas = 0, relaciones = 0;

  for (const archivo of archivos) {
    const slug = archivo.replace(/\.md$/, "");
    const texto = await readFile(join(DIR, archivo), "utf8");
    const { data: fm, content: cuerpo } = matter(texto);

    const { data: existe } = await supabase
      .from("noticias").select("id").eq("slug", slug).maybeSingle();
    if (existe) { console.log(`  - ya existe, salto: ${slug}`); continue; }

    const { data: noticia, error: errN } = await supabase
      .from("noticias")
      .insert({
        titulo: fm.title || slug,
        slug,
        entradilla: fm.description || null,
        fecha: fechaISO(fm.date),
        contenido: cuerpo.trim(),
        portada_url: fm.cover || null,
        publicada: true,
      })
      .select("id")
      .single();
    if (errN) { console.error(`  ! error en ${slug}:`, errN.message); continue; }
    insertadas++;

    const txt = `${fm.title || ""} ${cuerpo}`.toLowerCase();
    for (const p of pueblos) {
      if (txt.includes(p.nombre.toLowerCase())) {
        const { error: errR } = await supabase
          .from("noticias_pueblos")
          .insert({ noticia_id: noticia.id, pueblo_id: p.id });
        if (!errR) relaciones++;
      }
    }
    console.log(`  + ${slug}  [${fm.title ? "titulo OK" : "SIN TITULO"}] [${fm.cover ? "portada OK" : "sin portada"}]`);
  }

  console.log(`\nResumen: ${insertadas} noticias, ${relaciones} relaciones.`);
}

main();
