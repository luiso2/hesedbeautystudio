import { mkdir, writeFile } from "node:fs/promises";
import catalog from "../src/booking-catalog.json" with { type: "json" };

const domain = "https://mariahesed.com";
const output = new URL("../public/", import.meta.url);
const categories = [
  {
    id: "corporal",
    slug: "corporales",
    heading: "Tratamientos corporales en Miami",
    description:
      "Compara drenaje linfático manual, maderoterapia, Brazilian Slim y radiofrecuencia corporal en María Hesed. Consulta el precio de cada sesión y solicita tu cita.",
    image: "maderoterapia-rodillos-abdomen-poster.jpg",
    alt: "Sesión de maderoterapia corporal con rodillos de madera",
  },
  {
    id: "facial",
    slug: "faciales",
    heading: "Tratamientos faciales en Miami",
    description:
      "Consulta los precios de la limpieza facial Deep Clean, Facial Detox con ácido hialurónico, Salmon DNA, yoga facial y Delux Facial en María Hesed.",
    image: "facial-deep-clean-mascarilla.jpg",
    alt: "Tres etapas del tratamiento facial con mascarilla",
  },
  {
    id: "fibroblast",
    slug: "fibroblast",
    heading: "Fibroblast en Miami",
    description:
      "Consulta las zonas y los precios de Fibroblast Plasma, el tratamiento de párpados y Plasma Pen en María Hesed. María valora tu piel antes de la sesión.",
    image: "fibroblast-ojeras-antes-despues.jpg",
    alt: "Comparativa del contorno de ojos en una sesión de fibroblast",
  },
  {
    id: "cejas",
    slug: "cejas-y-depilacion",
    heading: "Cejas, pestañas y depilación con cera en Miami",
    description:
      "Consulta el diseño y laminado de cejas, el lifting de pestañas y los precios de depilación con cera por zona del rostro y del cuerpo en María Hesed.",
    image: "laminado-cejas-cliente.jpg",
    alt: "Aplicación de laminado de cejas en el estudio",
  },
];
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const pagePath = ({ slug }) => `/tratamientos/${slug}`;
const brandId = `${domain}/#estudio`;
const priceLabel = (entry) =>
  entry.price == null
    ? "Consultar el precio"
    : `${entry.from ? "Desde " : ""}US$${entry.price}`;

function serviceRow(service) {
  const price = service.options ? "Precios por zona" : priceLabel(service);
  const zones =
    service.options
      ?.map(
        (zone) =>
          `<div><dt>${escape(zone.name.es)}</dt><dd>${priceLabel(zone)}</dd></div>`,
      )
      .join("") || "";
  return `<article id="${service.id}"><h2>${escape(service.name.es)}</h2><p class="price">${price}</p>${zones ? `<dl>${zones}</dl>` : ""}<a class="book" href="/reservar?service=${service.id}">Reservar <span class="visually-hidden">${escape(service.name.es)}</span></a></article>`;
}
function serviceSchema(service, url) {
  const schema = {
    "@type": "Service",
    "@id": `${url}#${service.id}`,
    name: service.name.es,
    provider: { "@id": brandId },
    areaServed: "Miami, Florida",
  };
  const prices = (service.options || [service]).filter(
    (entry) => entry.price != null,
  );
  if (prices.length)
    schema.offers = prices.map((entry) => ({
      "@type": "Offer",
      name: entry.name.es,
      url: `${domain}/reservar?service=${service.id}`,
      ...(entry.from
        ? {
            priceSpecification: {
              "@type": "PriceSpecification",
              minPrice: entry.price,
              priceCurrency: "USD",
            },
          }
        : { price: entry.price, priceCurrency: "USD" }),
    }));
  return schema;
}
function categoryPage(category) {
  const services = catalog.filter(
    (service) => service.category === category.id,
  );
  const url = domain + pagePath(category);
  const pageTitle = `${category.heading} | María Hesed`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: pageTitle,
        description: category.description,
        inLanguage: "es",
        about: { "@id": brandId },
        mainEntity: { "@id": `${url}#catalogo` },
      },
      {
        "@type": "ItemList",
        "@id": `${url}#catalogo`,
        itemListElement: services.map((service, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: serviceSchema(service, url),
        })),
      },
      {
        "@type": "BeautySalon",
        "@id": brandId,
        name: "María Hesed · Aesthetic Studio",
        logo: domain + "/maria-hesed-mark.webp",
        url: domain + "/",
        telephone: "+1-786-709-5791",
        areaServed: "Miami, Florida",
        address: { "@type": "PostalAddress", addressLocality: "West Miami", postalCode: "33144" },
        sameAs: ["https://www.instagram.com/mariahesed.esthetics/"],
      },
    ],
  };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(pageTitle)}</title><meta name="description" content="${escape(category.description)}"><link rel="canonical" href="${url}"><meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:locale" content="es_US"><meta property="og:title" content="${escape(pageTitle)}"><meta property="og:description" content="${escape(category.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${domain}/img/${category.image}"><meta property="og:image:alt" content="${escape(category.alt)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/maria-hesed-icon.png" type="image/png"><link rel="stylesheet" href="/marca.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Italiana&family=Montserrat:wght@400;500;600&display=swap"><link rel="stylesheet" href="/catalogo.css"><script type="application/ld+json">${JSON.stringify(graph).replaceAll("<", "\\u003c")}</script></head>
<body class="studio-page"><header><a class="brand" href="/"><img class="studio-logo" src="/maria-hesed-mark.webp" alt="María Hesed · Aesthetic Studio" width="990" height="571"></a><a href="/#servicios">Ver tratamientos</a></header><main><div class="intro"><div><h1>${escape(category.heading)}</h1><p>${escape(category.description)}</p></div><img src="/img/${category.image}" alt="${escape(category.alt)}" width="480" height="360"></div>
<div class="services">${services.map(serviceRow).join("\n")}</div></main><footer><a href="/">María Hesed · West Miami 33144</a><a href="/#contacto">Contacto</a><a href="https://www.merktop.com">Powered by Merktop</a></footer></body></html>`;
}
await mkdir(new URL("tratamientos/", output), { recursive: true });
for (const category of categories) {
  await writeFile(
    new URL(`tratamientos/${category.slug}.html`, output),
    categoryPage(category),
  );
}
const urls = ["/", ...categories.map(pagePath)];
await writeFile(
  new URL("sitemap.xml", output),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${domain}${path}</loc></url>`).join("\n")}\n</urlset>\n`,
);
