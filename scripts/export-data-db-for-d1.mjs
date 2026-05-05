#!/usr/bin/env node
/**
 * Export local EmDash SQLite (data.db) to a .sql file suitable for Cloudflare D1
 * (`wrangler d1 execute … --file=…`), following Cloudflare import guidance:
 * - strip BEGIN TRANSACTION / COMMIT
 * - strip PRAGMA foreign_keys=OFF (use defer_foreign_keys for import instead)
 *
 * Usage:
 *   node scripts/export-data-db-for-d1.mjs
 *   node scripts/export-data-db-for-d1.mjs path/to/other.db
 *   pnpm run emdash:export-d1-sql -- --strip-migration-inserts
 *     → ตัด INSERT เข้า _emdash_migrations (ใช้เมื่อ D1 ถูก EmDash migrate ไปแล้ว แล้วจะ import ข้อมูลจาก data.db)
 *
 * Then (replace DB name with wrangler.jsonc database_name):
 *   pnpm exec wrangler d1 execute fadvisorth --remote --file=data-d1-import.sql
 *
 * หมายเหตุ: หยุด `pnpm dev` ก่อน export ถ้าไม่อยากให้ไฟล์ถูกล็อกขณะเขียน dump
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = process.cwd();
const argv = process.argv.slice(2);
const stripMigrationInserts = argv.includes("--strip-migration-inserts");
const positional = argv.filter((a) => !a.startsWith("--"));
const dbPath = resolve(cwd, positional[0] ?? "data.db");
const outPath = resolve(cwd, process.env.D1_EXPORT_SQL ?? "data-d1-import.sql");

const r = spawnSync("sqlite3", [dbPath, ".dump"], {
	encoding: "utf8",
	maxBuffer: 64 * 1024 * 1024,
});
if (r.error) {
	console.error(
		"ไม่พบคำสั่ง sqlite3 — ติดตั้ง SQLite CLI แล้วลองใหม่ (macOS: Xcode CLT หรือ brew install sqlite)",
	);
	console.error(r.error);
	process.exit(1);
}
if (r.status !== 0) {
	console.error(r.stderr || "sqlite3 .dump failed");
	process.exit(r.status ?? 1);
}

let sql = r.stdout;
// Cloudflare D1: avoid nested transaction errors (see Cloudflare import docs)
sql = sql.replace(/^PRAGMA foreign_keys=OFF;\s*/gm, "");
sql = sql.replace(/^BEGIN TRANSACTION;\s*/m, "");
sql = sql.replace(/^\s*COMMIT;\s*$/m, "");

if (stripMigrationInserts) {
	sql = sql
		.split("\n")
		.filter((line) => {
			const t = line.trimStart();
			return !(
				t.startsWith("INSERT INTO _emdash_migrations ") ||
				t.startsWith('INSERT INTO "_emdash_migrations" ')
			);
		})
		.join("\n");
}

const header = `-- EmDash → D1 import (from ${dbPath})
-- Review this file; then: pnpm exec wrangler d1 execute <database_name> --remote --file=${outPath}
${stripMigrationInserts ? "-- strip-migration-inserts: ไม่มี INSERT _emdash_migrations (ใช้กับ D1 ที่ migrate แล้ว)\n" : ""}PRAGMA defer_foreign_keys = ON;
`;

writeFileSync(outPath, header + sql, "utf8");
console.log(`เขียนไฟล์แล้ว: ${outPath}${stripMigrationInserts ? " (ตัด INSERT _emdash_migrations)" : ""}`);
console.log(
	"ขั้นต่อไป (remote D1): pnpm exec wrangler d1 execute fadvisorth --remote --file=data-d1-import.sql",
);
console.log(
	"ทดสอบบน local D1: pnpm exec wrangler d1 execute fadvisorth --local --file=data-d1-import.sql",
);
console.log(
	"หมายเหตุ: ไฟล์ใน ./uploads (media) ไม่ได้ถูกคัดลอก — ต้องอัปโหลดไป R2 แยกต่างหากถ้าต้องการรูปบน production",
);
