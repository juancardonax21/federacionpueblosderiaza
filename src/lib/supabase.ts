import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Faltan las variables de Supabase. Revisa tu archivo .env.");
}

export const supabase = createClient(url, key);

export interface Noticia {
  id: string;
  titulo: string;
  slug: string;
  entradilla: string | null;
  fecha: string;
  contenido: string | null;
  portada_url: string | null;
  etiquetas: string | null;
  publicada: boolean;
}

export interface Pueblo {
  id: string;
  slug: string;
  nombre: string;
  piedra: string | null;
  habitantes: number | null;
  patron: string | null;
  fiesta_fecha: string | null;
  mapa_x: number | null;
  mapa_y: number | null;
  foto_url: string | null;
  color: string | null;
  maps_url: string | null;
  orden: number | null;
}

// --- Noticias ---

export async function getNoticias(limite) {
  let q = supabase.from("noticias").select("*").eq("publicada", true).order("fecha", { ascending: false });
  if (limite) q = q.limit(limite);
  const { data, error } = await q;
  if (error) { console.error("Error noticias:", error.message); return []; }
  return data || [];
}

export async function getNoticia(slug) {
  const { data, error } = await supabase.from("noticias").select("*").eq("slug", slug).eq("publicada", true).maybeSingle();
  if (error) { console.error("Error noticia:", error.message); return null; }
  return data;
}

export async function getNoticiasDePueblo(puebloSlug) {
  const { data: pueblo } = await supabase.from("pueblos").select("id").eq("slug", puebloSlug).maybeSingle();
  if (!pueblo) return [];
  const { data: rels } = await supabase.from("noticias_pueblos").select("noticia_id").eq("pueblo_id", pueblo.id);
  if (!rels || rels.length === 0) return [];
  const ids = rels.map((r) => r.noticia_id);
  const { data, error } = await supabase.from("noticias").select("*").in("id", ids).eq("publicada", true).order("fecha", { ascending: false });
  if (error) return [];
  return data || [];
}

// --- Pueblos ---

export async function getPueblos() {
  const { data, error } = await supabase.from("pueblos").select("*").order("orden");
  if (error) { console.error("Error pueblos:", error.message); return []; }
  return data || [];
}

export async function getPueblo(slug) {
  const { data, error } = await supabase.from("pueblos").select("*").eq("slug", slug).maybeSingle();
  if (error) { console.error("Error pueblo:", error.message); return null; }
  return data;
}

export async function getFotosDePueblo(puebloId) {
  const { data, error } = await supabase
    .from("fotos_pueblos").select("archivo, orden")
    .eq("pueblo_id", puebloId).order("orden");
  if (error) { console.error("Error fotos:", error.message); return []; }
  return data || [];
}
