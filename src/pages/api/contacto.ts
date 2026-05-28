import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

// Cliente de Supabase con clave SECRETA (solo servidor: puede insertar
// saltándose RLS). Se crea aquí dentro para usar variables de servidor.
function getSupabaseAdmin() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const secret = import.meta.env.SUPABASE_SECRET_KEY;
  return createClient(url, secret);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const datos = await request.json();
    const { nombre, email, asunto, mensaje, web } = datos;

    // --- Antispam: campo "honeypot" oculto. Si viene relleno, es un bot.
    if (web) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // --- Validación básica
    if (!nombre || !email || !mensaje) {
      return new Response(JSON.stringify({ ok: false, error: "Faltan campos obligatorios." }), { status: 400 });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return new Response(JSON.stringify({ ok: false, error: "El email no es válido." }), { status: 400 });
    }

    // --- 1) Guardar en Supabase
    const supabase = getSupabaseAdmin();
    const { error: errDB } = await supabase.from("mensajes").insert({
      nombre, email, asunto: asunto || null, mensaje,
    });
    if (errDB) {
      console.error("Error guardando mensaje:", errDB.message);
      return new Response(JSON.stringify({ ok: false, error: "No se pudo guardar el mensaje." }), { status: 500 });
    }

    // --- 2) Enviar emails con Resend
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
    const DESDE = "Federación Pueblos de Riaza <contacto@federacionpueblosderiaza.org>";
    const PARA_INTERNO = "info@federacionpueblosderiaza.org";

    if (RESEND_API_KEY) {
      // Aviso interno (a la Federación)
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: DESDE,
          to: PARA_INTERNO,
          reply_to: email,
          subject: `Nuevo mensaje de contacto: ${asunto || "(sin asunto)"}`,
          html: `<h2>Nuevo mensaje desde la web</h2>
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Asunto:</strong> ${asunto || "(sin asunto)"}</p>
            <p><strong>Mensaje:</strong></p>
            <p>${String(mensaje).replace(/\n/g, "<br>")}</p>`,
        }),
      });

      // Confirmación al visitante
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: DESDE,
          to: email,
          subject: "Hemos recibido tu mensaje · Federación Pueblos de Riaza",
          html: `<p>Hola ${nombre},</p>
            <p>Gracias por escribirnos. Hemos recibido tu mensaje y te responderemos lo antes posible.</p>
            <p>Un saludo,<br>Federación de Pueblos de Riaza</p>`,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error("Error en endpoint contacto:", e);
    return new Response(JSON.stringify({ ok: false, error: "Error del servidor." }), { status: 500 });
  }
};
