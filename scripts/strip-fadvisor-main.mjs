/**
 * Keep only `<main>...</main>` in each `src/fadvisor-bodies/*.html` (shared header/footer are Astro components).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, "../src/fadvisor-bodies");

const MAIN_RE = /<main[\s\S]*?<\/main>/i;

for (const f of readdirSync(DIR)) {
	if (!f.endsWith(".html")) {
		continue;
	}
	const p = join(DIR, f);
	const raw = readFileSync(p, "utf8");
	const m = raw.match(MAIN_RE);
	if (!m) {
		console.error("No <main> in", f);
		process.exitCode = 1;
		continue;
	}
	writeFileSync(p, `\n${m[0]}\n`, "utf8");
	console.log("OK", f);
}
