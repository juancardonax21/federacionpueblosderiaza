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

// --- Eventos ---

export interface Evento {
  id: string;
  titulo: string;
  slug: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  hora: string | null;
  lugar: string | null;
  cartel_url: string | null;
  precio: string | null;
  url_inscripcion: string | null;
  url_info: string | null;
  publicado: boolean;
  destacado: boolean;
}

// Devuelve la fecha de hoy en formato YYYY-MM-DD (zona local).
function hoyISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Eventos futuros o en curso (fecha_inicio o fecha_fin >= hoy), ordenados.
export async function getEventos(limite) {
  const hoy = hoyISO();
  // Un evento se considera "vigente" si su fecha de fin (o inicio, si no hay fin)
  // todavía no ha pasado. Para evitar lógica compleja en SQL, traemos todos los
  // publicados y filtramos en JS.
  let q = supabase.from("eventos").select("*").eq("publicado", true).order("fecha_inicio");
  const { data, error } = await q;
  if (error) { console.error("Error eventos:", error.message); return []; }
  const vigentes = (data || []).filter((e) => {
    const ref = e.fecha_fin || e.fecha_inicio;
    return ref >= hoy;
  });
  return limite ? vigentes.slice(0, limite) : vigentes;
}

export async function getEvento(slug) {
  const { data, error } = await supabase.from("eventos").select("*").eq("slug", slug).eq("publicado", true).maybeSingle();
  if (error) { console.error("Error evento:", error.message); return null; }
  return data;
}

// Evento destacado para el banner de la home. Solo si está vigente.
export async function getEventoDestacado() {
  const hoy = hoyISO();
  const { data, error } = await supabase
    .from("eventos").select("*")
    .eq("publicado", true).eq("destacado", true)
    .order("fecha_inicio").limit(1).maybeSingle();
  if (error || !data) return null;
  const ref = data.fecha_fin || data.fecha_inicio;
  return ref >= hoy ? data : null;
}

export async function getEventosDePueblo(puebloSlug) {
  const { data: pueblo } = await supabase.from("pueblos").select("id").eq("slug", puebloSlug).maybeSingle();
  if (!pueblo) return [];
  const { data: rels } = await supabase.from("eventos_pueblos").select("evento_id").eq("pueblo_id", pueblo.id);
  if (!rels || rels.length === 0) return [];
  const ids = rels.map((r) => r.evento_id);
  const hoy = hoyISO();
  const { data, error } = await supabase
    .from("eventos").select("*")
    .in("id", ids).eq("publicado", true).order("fecha_inicio");
  if (error) return [];
  return (data || []).filter((e) => (e.fecha_fin || e.fecha_inicio) >= hoy);
}
