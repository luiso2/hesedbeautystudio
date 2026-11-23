import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";
import { load } from "cheerio";
import { booking, domain, home, renderStudioPage } from "../scripts/search-html.mjs";
import worker from "../src/worker.js";

test("all public aliases redirect in one hop, including static files and booking selections", async () => {
  for (const origin of ["http://mariahesed.com", "http://www.mariahesed.com", "https://www.mariahesed.com"]) {
    for (const path of ["/", "/en/book?service=facial-deep-clean", "/sitemap.xml"]) {
      const response = await worker.fetch(new Request(origin + path), {});
      assert.equal(response.status, 308);
      assert.equal(response.headers.get("location"), domain + path);
    }
  }
});

for (const lang of ["es", "en"]) {
  test(`search engines receive ${lang} content and matching metadata without JavaScript`, () => {
    for (const isBooking of [false, true]) {
      const path = isBooking ? "reservar.html" : "index.html";
      const template = readFileSync(new URL("../" + path, import.meta.url), "utf8");
      const $ = load(renderStudioPage(template, lang, isBooking));
      const paths = isBooking ? booking : home;
      assert.equal($("html").attr("lang"), lang);
      assert.equal($('link[rel="canonical"]').attr("href"), domain + paths[lang]);
      for (const alt of ["es", "en"]) assert.equal($(`link[hreflang="${alt}"]`).attr("href"), domain + paths[alt]);
      assert.match($("title").text(), /West Miami/);
      if (!isBooking) {
        const [studio, faq] = JSON.parse($('script[type="application/ld+json"]').text())["@graph"];
        assert.equal(studio.address.streetAddress, undefined);
        assert.equal(studio.address.addressRegion, "FL");
        assert.deepEqual(faq.mainEntity.map(q => q.name), $(".faq summary").map((_, el) => $(el).text().trim()).get());
        assert.equal($("[data-category-open=facial]").attr("href"), lang === "en" ? "/en/treatments/facials" : "/tratamientos/faciales");
      }
    }
  });
}
