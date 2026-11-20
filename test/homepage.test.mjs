import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import catalog from "../src/booking-catalog.json" with { type: "json" };
import { EN } from "../src/i18n.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("index.html");
const script = read("src/main.js");

test("the Black Friday offer dialog ships with the homepage that opens it", () => {
  // main.js opens this dialog on load; a homepage saved from an older copy drops it silently.
  assert.match(script, /\$\(['"]#black-friday-offer['"]\)/);
  const dialog = /<dialog[^>]*id="black-friday-offer"[\s\S]*?<\/dialog>/.exec(html)?.[0];
  assert.ok(dialog, "index.html has no #black-friday-offer dialog");
  for (const part of ["holiday-offer__close", "holiday-offer__dates", "holiday-offer__confetti", 'href="/reservar"'])
    assert.ok(dialog.includes(part), `offer dialog is missing ${part}`);
  // The dialog layout lives in refinement.css and its animation in the stylesheet main.js imports.
  assert.match(html, /<link rel="stylesheet" href="\/src\/refinement\.css"/);
  assert.match(read("src/refinement.css"), /\.holiday-offer\[open\]/);
  assert.match(script, /import ['"]\.\/black-friday-gift\.css['"]/);
});

test("every homepage text has an English translation", () => {
  const keys = new Set([...html.matchAll(/data-i18n(?:-alt|-html)?="([^"]+)"/g)].map((match) => match[1]));
  assert.ok(keys.size > 100);
  assert.deepEqual([...keys].filter((key) => !(key in EN)).sort(), []);
});

test("every treatment card books a service that exists in the catalog", () => {
  const ids = new Set(catalog.map((service) => service.id));
  const cards = [...html.matchAll(/data-booking-id="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(cards.length >= 20);
  assert.deepEqual(cards.filter((id) => !ids.has(id)), []);
  assert.equal(new Set(cards).size, cards.length, "a treatment card is duplicated");
});

test("the relaxing massage menu is on the homepage and bookable", () => {
  const massages = { "masaje-relajante-sueco": 95, "masaje-piedras-calientes": 115, "masaje-aromaterapia": 105, "masaje-percusion": 55 };
  for (const [id, price] of Object.entries(massages)) {
    assert.ok(html.includes(`data-booking-id="${id}"`), `${id} has no homepage card`);
    assert.ok(html.includes(`href="/reservar?service=${id}"`), `${id} card does not open its booking`);
    assert.equal(catalog.find((service) => service.id === id)?.price, price, `${id} catalog price`);
  }
});
