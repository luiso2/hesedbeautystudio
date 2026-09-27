import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
	plugins: [cloudflare()],
	environments: {
		client: {
			build: {
				rollupOptions: {
					input: {
						main: resolve(import.meta.dirname, "index.html"),
							booking: resolve(import.meta.dirname, "reservar.html"),
						},
				},
			},
		},
	},
});
