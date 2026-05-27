import { defineCollection, z } from "astro:content";

const noticias = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    cover: z.string().optional(),
    galeria: z.boolean().optional(),
    wpUrl: z.string().optional(), // ruta original en WordPress (para redirecciones)
  }),
});

const paginas = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    wpUrl: z.string().optional(),
  }),
});

export const collections = { noticias, paginas };
