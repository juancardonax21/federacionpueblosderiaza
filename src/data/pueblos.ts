// Datos estructurados de los diez pueblos de la Federación.
// La ficha técnica (altitud, habitantes, fiesta) está pendiente de datos
// reales: rellena los campos marcados como null cuando los tengas.
// mapaX / mapaY son la posición del punto sobre el mapa del territorio,
// en % sobre la imagen. Ajústalos si algún punto queda descolocado.

export interface Pueblo {
  slug: string;
  nombre: string;
  color: string;
  piedra: string;
  foto: string;
  maps: string | null;
  asociacion: string | null;
  mapaX: number;
  mapaY: number;
  altitud: string | null;
  habitantes: string | null;
  fiesta: string | null;
}

export const pueblos: Pueblo[] = [
  {
    slug: "aldeanueva-del-monte", nombre: "Aldeanueva del Monte",
    color: "var(--c-ocre)", piedra: "Piedra amarilla",
    foto: "/images/Pueblo.jpg",
    maps: "https://www.google.com/maps?q=Aldeanueva+del+Monte+40517+Segovia",
    asociacion: null, mapaX: 15.8, mapaY: 35,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "alquite", nombre: "Alquité",
    color: "var(--c-ocre)", piedra: "Cuarcita amarilla",
    foto: "/images/Agua-molinera.jpg",
    maps: "https://www.google.com/maps?q=Alquit%C3%A9+40510+Segovia",
    asociacion: null, mapaX: 62.8, mapaY: 58,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "barahona-de-fresno", nombre: "Barahona de Fresno",
    color: "var(--c-verde)", piedra: "Entre campos de cultivo",
    foto: "/images/Roble-de-mi-tierra.jpg",
    maps: "https://www.google.com/maps?q=Barahona+de+Fresno+40517+Segovia",
    asociacion: null, mapaX: 6.2, mapaY: 27,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "becerril", nombre: "Becerril",
    color: "var(--c-tinta)", piedra: "Pizarra negra",
    foto: "/images/En-El-Muyo-nieva.jpg",
    maps: "https://www.google.com/maps?q=Becerril+40510+Segovia",
    asociacion: "Asociación Hogar de Becerril", mapaX: 75.5, mapaY: 73.5,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "el-muyo", nombre: "El Muyo",
    color: "var(--c-tinta)", piedra: "Piedra negra",
    foto: "/images/Esplendor-en-las-praderas-de-El-Muyo.jpg",
    maps: "https://www.google.com/maps?q=El+Muyo+40510+Segovia",
    asociacion: "Asociación Cultural de El Muyo", mapaX: 93.2, mapaY: 78.5,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "el-negredo", nombre: "El Negredo",
    color: "var(--c-verde)", piedra: "Entre pinares",
    foto: "/images/Un-lugar-para-vivir-la-calma.jpeg",
    maps: "https://www.google.com/maps?q=El+Negredo+40512+Segovia",
    asociacion: null, mapaX: 96.0, mapaY: 45,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "madriguera", nombre: "Madriguera",
    color: "var(--c-rojo)", piedra: "Piedra roja",
    foto: "/images/Historia.jpg",
    maps: "https://www.google.com/maps?q=Madriguera+40510+Segovia",
    asociacion: null, mapaX: 89.3, mapaY: 53,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "martin-munoz-de-ayllon", nombre: "Martín Muñoz de Ayllón",
    color: "var(--c-ocre)", piedra: "Cuarcita amarilla",
    foto: "/images/La-tarde-del-adios.jpg",
    maps: "https://www.google.com/maps?q=Mart%C3%ADn+Mu%C3%B1oz+de+Ayll%C3%B3n+40510+Segovia",
    asociacion: null, mapaX: 64.9, mapaY: 67,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "serracin", nombre: "Serracín",
    color: "var(--c-tinta)", piedra: "Piedra y madera",
    foto: "/images/Soledad-y-abandono-en-el-tiempo.jpeg",
    maps: "https://federacionpueblosderiaza.org/serracin/",
    asociacion: null, mapaX: 85.2, mapaY: 71,
    altitud: null, habitantes: null, fiesta: null,
  },
  {
    slug: "villacorta", nombre: "Villacorta",
    color: "var(--c-rojo)", piedra: "Piedra roja",
    foto: "/images/Anochecer.jpg",
    maps: null,
    asociacion: "Asociación San Roque de Villacorta", mapaX: 77.7, mapaY: 49,
    altitud: null, habitantes: null, fiesta: null,
  },
];

export const getPueblo = (slug: string) => pueblos.find((p) => p.slug === slug);
