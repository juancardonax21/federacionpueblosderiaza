import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://www.federacionpueblosderiaza.org",
  output: "server",
  adapter: vercel(),
});
