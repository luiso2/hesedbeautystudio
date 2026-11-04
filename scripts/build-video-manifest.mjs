import { readdir, readFile, stat, writeFile } from "node:fs/promises";

const directory = new URL("../public/videos/", import.meta.url);
const target = new URL("../src/video-sizes.json", import.meta.url);
const sizes = {};
for (const file of (await readdir(directory)).sort()) {
  if (file.endsWith(".mp4")) sizes[`/videos/${file}`] = (await stat(new URL(file, directory))).size;
}
const content = `${JSON.stringify(sizes, null, 2)}\n`;
const previous = await readFile(target, "utf8").catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return "";
});
if (previous !== content) await writeFile(target, content);
console.log(`Video manifest: ${Object.keys(sizes).length} files`);
