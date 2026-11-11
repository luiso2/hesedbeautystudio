import { build } from "esbuild";
import { mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
const dir = "build/public";
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });
const base = {
  bundle: true,
  minify: true,
  legalComments: "none",
  target: "es2022",
  format: "esm",
  loader: { ".ttf": "binary" },
};
await build({
  ...base,
  entryPoints: ["worker.js"],
  outfile: "build/worker.mjs",
  platform: "browser",
});
const clientBuild = await build({
  ...base,
  entryPoints: ["client/main.js"],
  outdir: dir,
  entryNames: "waiver-[hash]",
  metafile: true,
  platform: "browser",
});
const script = Object.keys(clientBuild.metafile.outputs)[0].split("/").pop();
const files = [
  "waiver.css",
  "manifest.webmanifest",
];
for (const file of files) await copyFile("client/" + file, dir + "/" + file);
const brandFiles = ["maria-hesed-mark.webp", "studio-light.webp", "maria-hesed-icon.png", "marca.css"];
for (const file of brandFiles) await copyFile("../public/" + file, dir + "/" + file);
const html = (await readFile("client/index.html", "utf8")).replace("/waiver.js", "/" + script);
const pages = ["index.html", "panel.html", "estudio.html", "app.html"];
for (const page of pages) await writeFile(dir + "/" + page, html);
const paths = [...files, ...brandFiles, script, ...pages].map((p) => "/" + p);
const hash = createHash("sha256");
for (const path of paths) hash.update(await readFile(dir + path));
const cache = "mh-waiver-" + hash.digest("hex").slice(0, 16);
const sw = await readFile("client/sw.js", "utf8");
await writeFile(
  dir + "/sw.js",
  sw
    .replace('"BUILD_CACHE"', JSON.stringify(cache))
    .replace(
      '"BUILD_PATHS"',
      JSON.stringify(paths.map((p) => (p === "/index.html" ? "/" : p.replace(/\.html$/, "")))),
    ),
);
await writeFile(dir + "/robots.txt", "User-agent: *\nDisallow: /\n");
await writeFile(
  dir + "/_headers",
  `/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'
/sw.js
  Cache-Control: no-cache
/waiver-*.js
  Cache-Control: public, max-age=31536000, immutable
`,
);
