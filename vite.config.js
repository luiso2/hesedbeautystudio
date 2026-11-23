import { resolve, relative } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { renderStudioPage } from "./scripts/search-html.mjs";

const pages = {
  main: "index.html", booking: "reservar.html", review: "resena.html",
  english: "en/index.html", englishBooking: "en/book.html",
};
export default defineConfig({
  plugins: [cloudflare(), {
    name: "studio-language-pages",
    transformIndexHtml: {
      order: "pre",
      handler(html, { filename }) {
        const page = relative(import.meta.dirname, filename);
        if (!Object.values(pages).includes(page) || page === pages.review) return;
        return renderStudioPage(html, page.startsWith("en/") ? "en" : "es",
          page === pages.booking || page === pages.englishBooking);
      },
    },
  }],
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: Object.fromEntries(Object.entries(pages).map(([key, path]) => [key, resolve(import.meta.dirname, path)])),
        },
      },
    },
  },
});
