import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { auditLogPlugin } from "@emdash-cms/plugin-audit-log";
import { defineConfig, fontProviders } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import { fadvisorBookConsultationPlugin } from "./src/emdash-plugins/fadvisor-book-consultation/descriptor.ts";
import { fadvisorContactPlugin } from "./src/emdash-plugins/fadvisor-contact/descriptor.ts";

/** Cloudflare Workers / Pages (D1 + R2). Set EMDASH_CF=1 in the build environment. */
const useCloudflare =
	process.env.EMDASH_CF === "1" || process.env.CF_PAGES === "1";

export default defineConfig({
	output: "server",
	adapter: useCloudflare
		? cloudflare({
				// Avoid requiring a Cloudflare Images binding; media uses R2 via EmDash.
				imageService: "passthrough",
				// Prerender uses Node so local DB tooling in the dependency graph can resolve at build time.
				prerenderEnvironment: "node",
			})
		: node({ mode: "standalone" }),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: useCloudflare
				? d1({ binding: "DB", session: "auto" })
				: sqlite({ url: "file:./data.db" }),
			storage: useCloudflare
				? r2({ binding: "MEDIA" })
				: local({
						directory: "./uploads",
						baseUrl: "/_emdash/api/media/file",
					}),
			plugins: [
				auditLogPlugin(),
				fadvisorContactPlugin(),
				fadvisorBookConsultationPlugin(),
			],
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-sans",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
