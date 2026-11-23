import { load } from "cheerio";
import { EN } from "../src/i18n.js";
import { translations } from "../src/booking-translations.js";
import { bookingTerms } from "../src/booking-terms.js";
import catalog from "../src/booking-catalog.json" with { type: "json" };
import { categories } from "./search-content.mjs";

export const domain = "https://mariahesed.com";
export const home = { es: "/", en: "/en/" };
export const booking = { es: "/reservar", en: "/en/book" };
export const categoryPaths = cat => ({
  es: "/tratamientos/" + cat.es.slug, en: "/en/treatments/" + cat.en.slug,
});
export const alternateTags = paths => Object.entries({ ...paths, "x-default": paths.es })
  .map(([lang, path]) => `<link rel="alternate" hreflang="${lang}" href="${domain}${path}">`).join("\n");
const prices = catalog.flatMap(item => (item.options || [item]).map(option => option.price)).filter(Number.isFinite);
export const business = {
  "@type": "BeautySalon", "@id": domain + "/#estudio",
  name: "María Hesed · Aesthetic Studio", legalName: "Hesed Beauty Studio, LLC",
  url: domain + "/", logo: domain + "/maria-hesed-mark.webp", image: domain + "/img/maria-hesed-portrait.jpg",
  telephone: "+1-786-709-5791", areaServed: "West Miami, Florida",
  address: { "@type": "PostalAddress", addressLocality: "West Miami", postalCode: "33144", addressRegion: "FL", addressCountry: "US" },
  priceRange: `USD ${Math.min(...prices)}–${Math.max(...prices)}`,
  sameAs: ["https://www.instagram.com/mariahesed.esthetics/"],
};
const titles = {
  es: "Esteticista en West Miami | Faciales, cuerpo y cejas | María Hesed",
  en: "Esthetician in West Miami | Facials, Body & Brows | María Hesed",
};
const descriptions = {
  es: "Explora faciales, maderoterapia, drenaje linfático, fibroblast y diseño de cejas en María Hesed · Aesthetic Studio. Consulta precios y solicita una cita en West Miami 33144.",
  en: "Explore facials, wood therapy, manual lymphatic drainage, fibroblast and brow shaping at María Hesed · Aesthetic Studio. Compare prices and book in West Miami 33144.",
};
const bookingDescriptions = {
  es: "Elige tus tratamientos, revisa los precios y solicita una cita en María Hesed · Aesthetic Studio en West Miami 33144. María confirmará tu horario.",
  en: "Choose your treatments, review prices and request an appointment at María Hesed · Aesthetic Studio in West Miami 33144. María will confirm your preferred time.",
};
const imageAlts = {
  "maria-hesed-portrait": "María Hesed in her studio with a wood therapy tool",
  "metalterapia-sculpt-cliente": "Metal tools used on the abdomen during a body treatment",
  "kinesio-body-cliente": "Applying kinesiology tape to the abdomen",
  "facial-deep-clean-mascarilla": "Three stages of a facial, from mask application to freshly cleansed skin",
  "skin-rejuvenation-antes-despues": "Side-by-side views of the skin before and after a facial",
  "facial-detox-antes-despues-cliente": "The same person's skin before and after Facial Detox",
  "fibroblast-ojeras-antes-despues": "The under-eye area before and after fibroblast",
  "diseno-cejas-cliente": "Portrait showing shaped eyebrows",
  "laminado-cejas-cliente": "Brushing the brows during lamination",
  "lifting-pestanas-cliente": "Applying product during a lash lift",
  "depilacion-cera-cliente": "Wax being applied to a leg",
};
const labels = {
  Principal: "Main navigation", Idioma: "Language", "Abrir menú": "Open menu", "Categorías de tratamientos": "Treatment categories",
  "Ampliar imagen de antes y después del Facial Detox": "Enlarge the Facial Detox comparison",
  "Masaje en María Hesed · Aesthetic Studio": "Massage at María Hesed · Aesthetic Studio", "Galería de resultados": "Results gallery",
  "Seleccionar imagen": "Choose an image", "Montos sugeridos": "Suggested amounts", Cerrar: "Close",
  "María Hesed · Inicio": "María Hesed · Home", "Pasos de la reserva": "Booking steps", "Resumen de la reserva": "Booking summary",
  "Borrar búsqueda": "Clear search", "Categorías de servicios": "Service categories", Tratamientos: "Treatments",
};
function englishMarkup($) {
  $("[data-i18n]").each((_, el) => $(el).html(EN[$(el).attr("data-i18n")]));
  $("img").each((_, el) => {
    const key = $(el).attr("src").split("/").pop().split(".")[0];
    const alt = EN[$(el).attr("data-i18n-alt")] ?? imageAlts[key];
    if (alt) $(el).attr("alt", alt);
  });
  $("[aria-label]").each((_, el) => {
    const label = $(el).attr("aria-label");
    $(el).attr("aria-label", labels[label] ?? label.replace("Ver imagen ", "View image ").replace(/(\d) de (\d)/, "$1 of $2"));
  });
  $(".hero__edition").text("SCIENCE · BEAUTY · WELLNESS");
  $(".category-choice__cta-label").text("View services & prices");
  $("[data-gift-submit]").text("Buy Gift Card");
  $(".holiday-offer__dates").text("Through November 30.");
  $('[href], [data-book]').each((_, el) => {
    for (const attr of ["href", "data-book"]) {
      const path = $(el).attr(attr);
      if (!path || $(el).is("[data-lang]")) continue;
      const cat = categories.find(c => categoryPaths(c).es === path);
      if (cat) $(el).attr(attr, categoryPaths(cat).en);
      else if (/^\/reservar($|\?)/.test(path)) $(el).attr(attr, path.replace("/reservar", booking.en));
      else if (path === "/" || path.startsWith("/#")) $(el).attr(attr, "/en/" + path.slice(1));
    }
  });
}
export function renderStudioPage(html, lang, isBooking) {
  const $ = load(html);
  $("html").attr("lang", lang);
  const paths = isBooking ? booking : home;
  const title = isBooking ? translations[lang].pageTitle : titles[lang];
  const description = (isBooking ? bookingDescriptions : descriptions)[lang];
  if (lang === "en") englishMarkup($);
  if (isBooking) {
    $("[data-t]").each((_, el) => {
      const key = $(el).attr("data-t");
      if (key === "title") return $(el).html(lang === "en" ? "Book your <em>moment.</em>" : "Reserva tu <em>momento.</em>");
      const arrow = $(el).find("[aria-hidden]").clone();
      $(el).text(translations[lang][key]);
      if (arrow.length) $(el).append(" ", arrow);
    });
    $("[data-terms]").each((_, el) => $(el).text(bookingTerms[lang][$(el).attr("data-terms")]));
    $("#booking-search").attr("placeholder", translations[lang].searchPlaceholder);
  } else {
    const questions = $(".faq details").toArray().map(el => ({
      "@type": "Question", name: $(el).find("summary").text().trim(),
      acceptedAnswer: { "@type": "Answer", text: $(el).find(".acc__body").text().trim() },
    }));
    const original = JSON.parse($('script[type="application/ld+json"]').text());
    $('script[type="application/ld+json"]').text(JSON.stringify({
      "@context": "https://schema.org", "@graph": [
        { ...business, description, founder: original.founder },
        { "@type": "FAQPage", "@id": domain + paths[lang] + "#faq", inLanguage: lang, mainEntity: questions },
      ],
    }).replaceAll("<", "\\u003c"));
  }
  $("[data-lang]").each((_, el) => {
    const active = $(el).attr("data-lang") === lang;
    $(el).toggleClass("is-active", active);
    if ($(el).is("a")) { if (active) $(el).attr("aria-current", "page"); }
    else $(el).attr("aria-pressed", String(active));
  });
  $("title").text(title);
  $('meta[property="og:title"], meta[name="twitter:title"]').attr("content", title);
  $('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').attr("content", description);
  $('meta[property="og:locale"]').attr("content", lang + "_US");
  $('meta[property="og:url"]').attr("content", domain + paths[lang]);
  if (lang === "en") $('meta[property="og:image:alt"], meta[name="twitter:image:alt"]').attr("content", imageAlts["maria-hesed-portrait"]);
  $('meta[name="robots"]').attr("content", "index,follow,max-image-preview:large");
  $('link[rel="canonical"]').remove();
  $("head").append(`<link rel="canonical" href="${domain}${paths[lang]}">\n` + alternateTags(paths));
  return $.html();
}
