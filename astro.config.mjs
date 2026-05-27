import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.federacionpueblosderiaza.org",
  // Las galerías se generan como HTML directo en el Markdown (ver el script
  // de migración), así que no hace falta ningún plugin.
  // Las redirecciones de URLs antiguas van en vercel.json.
});
