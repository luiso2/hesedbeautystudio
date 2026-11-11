import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fontBytes from "../fonts/Lato-Regular.ttf";
import {
  title,
  sections,
  clauses,
  fields,
  services,
  conditions,
  photos,
  eSign,
} from "./form.js";

export async function makePdf(data, reference) {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const L = data.lang === "en" ? 1 : 0;
  const text = (pair) => pair[L];
  doc.setTitle(text(title));
  doc.setAuthor("María Hesed");
  doc.setCreationDate(new Date(data.signedAt));
  doc.setModificationDate(new Date(data.signedAt));
  doc.registerFontkit(fontkit);
  const body = await doc.embedFont(fontBytes, { subset: true });
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const ink = rgb(0.13, 0.12, 0.1),
    gold = rgb(0.49, 0.38, 0.23);
  let page, y;
  function newPage() {
    page = doc.addPage([612, 792]);
    y = 746;
    page.drawText("MARÍA HESED", {
      x: 46,
      y,
      font: serif,
      size: 18,
      color: ink,
    });
    page.drawText("AESTHETIC STUDIO", {
      x: 454,
      y: y + 2,
      font: body,
      size: 9,
      color: gold,
    });
    page.drawLine({
      start: { x: 46, y: y - 13 },
      end: { x: 566, y: y - 13 },
      color: gold,
      thickness: 0.65,
    });
    y -= 49;
  }
  function room(height) {
    if (y - height < 58) newPage();
  }
  function line(value, font = body, size = 10.5, color = ink) {
    room(size + 4);
    page.drawText(value, { x: 46, y, font, size, color });
    y -= size + 4;
  }
  function paragraph(value) {
    const size = 10.5,
      max = 520;
    for (const raw of String(value).split(/\r?\n/)) {
      let row = "";
      for (const word of raw.split(/\s+/)) {
        const joined = row ? row + " " + word : word;
        if (body.widthOfTextAtSize(joined, size) <= max) {
          row = joined;
          continue;
        }
        if (row) line(row);
        row = "";
        for (const c of word) {
          if (body.widthOfTextAtSize(row + c, size) > max) {
            line(row);
            row = "";
          }
          row += c;
        }
      }
      line(row);
    }
    y -= 4;
  }
  function section(i) {
    room(53);
    y -= 7;
    line(text(sections[i]), serif, 16, gold);
    y -= 2;
  }
  function field(k) {
    paragraph(text(fields[k]) + " · " + (data[k] || "—"));
  }
  newPage();
  line(text(title), serif, 22);
  y -= 5;
  paragraph(
    "Ref. " +
      reference +
      "   /   " +
      data.version +
      "   /   " +
      data.lang.toUpperCase(),
  );
  section(0);
  ["name", "dob", "phone", "email", "emergency"].forEach(field);
  section(1);
  paragraph(data.services.map((k) => text(services[k])).join(" · "));
  if (data.services.includes("other")) field("serviceOther");
  field("provider");
  field("date");
  section(2);
  paragraph(data.health.map((k) => text(conditions[k])).join(" · "));
  if (data.health.includes("other")) field("healthOther");
  field("meds");
  field("notes");
  newPage();
  for (let i = 0; i < clauses.length; i++) {
    section(i + 3);
    paragraph(text(clauses[i]));
    if (i === 3) paragraph(text(photos[data.photo]));
  }
  paragraph(text(eSign));
  room(91);
  if (data.method === "typed") paragraph(data.typed);
  else {
    for (const stroke of data.ink)
      for (let i = 1; i < stroke.length; i++) {
        const point = ([x, v]) => ({ x: 50 + x * 0.25, y: y - v * 0.075 });
        page.drawLine({
          start: point(stroke[i - 1]),
          end: point(stroke[i]),
          color: ink,
          thickness: 1.25,
        });
      }
    y -= 79;
  }
  paragraph(
    data.name +
      " · " +
      data.signedAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC"),
  );
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText("MARÍA HESED  ·  " + data.version, {
      x: 46,
      y: 30,
      size: 8,
      font: body,
      color: gold,
    });
    p.drawText(i + 1 + " / " + pages.length, {
      x: 532,
      y: 30,
      size: 8,
      font: body,
      color: gold,
    });
  });
  return doc.save({ useObjectStreams: false, objectsPerTick: Infinity });
}
