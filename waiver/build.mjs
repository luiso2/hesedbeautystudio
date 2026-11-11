import { build } from "esbuild";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const dir = "build/public";
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
await build({
  ...base,
  entryPoints: ["client/main.js"],
  outfile: dir + "/waiver.js",
  platform: "browser",
});
const files = [
  "index.html",
  "waiver.css",
  "manifest.webmanifest",
];
for (const file of files) await copyFile("client/" + file, dir + "/" + file);
const brandFiles = ["maria-hesed-logo.jpg", "maria-hesed-icon.png", "marca.css"];
for (const file of brandFiles) await copyFile("../public/" + file, dir + "/" + file);
await copyFile(dir + "/index.html", dir + "/panel.html");
const paths = [...files, ...brandFiles, "waiver.js", "panel.html"].map((p) => "/" + p);
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
      JSON.stringify(paths.map((p) => (p === "/index.html" ? "/" : p === "/panel.html" ? "/panel" : p))),
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
/waiver.js
  Cache-Control: no-cache
`,
);
