import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
export async function studio(port = 0) {
  const mail = [];
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: "build/worker.mjs",
      compatibilityDate: "2026-11-10",
      d1Databases: ["DB"],
      port,
      host: "127.0.0.1",
      bindings: {
        RECORD_KEY: randomBytes(32).toString("base64"),
        MAIL_KEY: "local-test",
        MAIL_FROM: "Studio <studio@example.org>",
        STUDIO_EMAIL: "studio@example.org",
        PUBLIC_ORIGIN: "http://localhost:" + port,
      },
      serviceBindings: {
        STUDIO: (r) =>
          Response.json(
            { authenticated: true },
            {
              status:
                r.headers.get("Authorization") === "Bearer test-access"
                  ? 200
                  : 401,
            },
          ),
        ASSETS: async (req) => {
          let p = new URL(req.url).pathname;
          if (p === "/") p = "/index.html";
          if (!/^\/[\w.-]+$/.test(p)) return new Response("", { status: 404 });
          try {
            return new Response(await readFile("build/public" + p), {
              headers: {
                "content-type":
                  {
                    html: "text/html",
                    js: "text/javascript",
                    css: "text/css",
                    png: "image/png",
                    svg: "image/svg+xml",
                    webmanifest: "application/manifest+json",
                  }[p.split(".").at(-1)] || "text/plain",
              },
            });
          } catch {
            return new Response("", { status: 404 });
          }
        },
      },
      outboundService: async (req) => {
        if (req.url !== "https://api.resend.com/emails")
          return new Response("", { status: 403 });
        mail.push(await req.json());
        return Response.json({ id: "local-test" });
      },
    }),
  );
  const db = await runtime.getD1Database("DB");
  const schema = await readFile("migrations/0001_waivers.sql", "utf8");
  const parts = schema.split(/;\s*(?=CREATE|$)/).filter((s) => s.trim());
  for (const part of parts) await db.prepare(part).run();
  return { runtime, db, mail };
}
