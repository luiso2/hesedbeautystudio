import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { load } from "cheerio";
import catalog from "../src/booking-catalog.json" with { type: "json" };
import { EN } from "../src/i18n.js";
import { categories } from "./search-content.mjs";
import { alternateTags, booking, business, categoryPaths, domain, home } from "./search-html.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("public/", root);
const source = load(await readFile(new URL("index.html", root), "utf8"));
const descriptions = new Map(source("[data-booking-id]").toArray().map(card => {
  const text = source(card).find(".card__body > p[data-i18n]:not(.card__eyebrow):not(.card__price)").first();
  return [source(card).attr("data-booking-id"), { es: text.text().trim(), en: EN[text.attr("data-i18n")] }];
}));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function serviceRow(service, lang) {
  const en = lang === "en";
  const price = entry => entry.price == null ? (en ? "Ask for pricing" : "Consultar el precio")
    : (entry.from ? (en ? "From " : "Desde ") : "") + `<span data-service-price="${entry.price}">US$${entry.price}</span>`;
  const options = service.options?.map(option =>
    `<div><dt>${escape(option.name[lang])}</dt><dd>${price(option)}</dd></div>`).join("");
  const label = service.optionType === "duration" ? (en ? "Prices by duration" : "Precios por duración") : (en ? "Prices by area" : "Precios por zona");
  const description = descriptions.get(service.id)?.[lang];
  return `<article id="${service.id}"><h2>${escape(service.name[lang])}</h2>${description ? `<p>${escape(description)}</p>` : ""}<p class="price">${options ? label : price(service)}</p>${options ? `<dl>${options}</dl>` : ""}<a class="book" href="${booking[lang]}?service=${service.id}">${en ? "Book" : "Reservar"} <span class="visually-hidden">${escape(service.name[lang])}</span></a></article>`;
}

function categoryPage(category, lang) {
  const paths = categoryPaths(category);
  const c = category[lang];
  const url = domain + paths[lang];
  const title = c.title + " | María Hesed";
  const services = catalog.filter(service => service.category === category.id);
  const graph = {
    "@context": "https://schema.org", "@graph": [business, {
      "@type": "CollectionPage", "@id": url, url, name: title, description: c.description, inLanguage: lang,
      about: { "@id": business["@id"] }, mainEntity: {
        "@type": "ItemList", itemListElement: services.map((service, index) => ({
          "@type": "ListItem", position: index + 1, item: {
            "@type": "Service", "@id": url + "#" + service.id, name: service.name[lang], provider: { "@id": business["@id"] },
            offers: (service.options || [service]).filter(item => item.price != null).map(item => ({
              "@type": "Offer", name: item.name[lang], url: domain + booking[lang] + "?service=" + service.id,
              ...(item.from ? { priceSpecification: { "@type": "PriceSpecification", minPrice: item.price, priceCurrency: "USD" } } : { price: item.price, priceCurrency: "USD" }),
            })),
          },
        })),
      },
    }],
  };
  const other = lang === "es" ? "en" : "es";
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(c.description)}"><link rel="canonical" href="${url}">${alternateTags(paths)}<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:locale" content="${lang}_US"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(c.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${domain}/img/${category.image}.webp"><meta property="og:image:alt" content="${escape(c.alt)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/maria-hesed-icon.png" type="image/png"><link rel="stylesheet" href="/marca.css"><link rel="stylesheet" href="/studio-fonts.css"><link rel="stylesheet" href="/catalogo.css"><script type="application/ld+json">${JSON.stringify(graph).replaceAll("<", "\\u003c")}</script></head>
<body class="studio-page"><header><a class="brand" href="${home[lang]}"><img class="studio-logo" src="/maria-hesed-mark.webp" alt="${business.name}" width="990" height="571"></a><a href="${paths[other]}" hreflang="${other}" lang="${other}">${other === "en" ? "English" : "Español"}</a></header>
<main><div class="intro"><div><h1>${escape(c.title)}</h1><p>${escape(c.description)}</p></div><img src="/img/${category.image}.webp" alt="${escape(c.alt)}" width="480" height="360"></div>
<div class="services">${services.map(service => serviceRow(service, lang)).join("\n")}</div>
<section class="guide"><h2>${escape(c.heading)}</h2>${c.paragraphs.map(p => `<p>${escape(p)}</p>`).join("\n")}<a href="${home[lang]}#servicios">${lang === "en" ? "Explore all treatments" : "Explorar todos los tratamientos"}</a></section></main>
<footer><a href="${home[lang]}">${business.name}</a><span>West Miami 33144</span><a href="tel:+17867095791">(786) 709-5791</a><a href="https://www.merktop.com">Powered by Merktop</a></footer></body></html>`;
}
await mkdir(new URL("en/", root), { recursive: true });
for (const [src, dst] of [["index.html", "en/index.html"], ["reservar.html", "en/book.html"]]) {
  await copyFile(new URL(src, root), new URL(dst, root));
}
const urls = [...Object.values(home), ...Object.values(booking)];
for (const lang of ["es", "en"]) {
  for (const category of categories) {
    const path = categoryPaths(category)[lang];
    const file = new URL("." + path + ".html", output);
    await mkdir(new URL("./", file), { recursive: true });
    await writeFile(file, categoryPage(category, lang));
    urls.push(path);
  }
}
await writeFile(new URL("sitemap.xml", output),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(path => `  <url><loc>${domain}${path}</loc></url>`).join("\n")}\n</urlset>\n`);
