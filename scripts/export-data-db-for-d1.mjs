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
 *     → ตัด INSERT เข้า _emdash_migrations และ _emdash_migrations_lock (ใช้เมื่อ D1 ถูก Worker migrate ไปแล้ว)
 *   pnpm run emdash:export-d1-sql -- --strip-migration-inserts --insert-or-replace
 *     → แปลง INSERT เป็น INSERT OR REPLACE (ยกเว้น sqlite_schema) เมื่อ D1 มีข้อมูลซ้ำจาก import ก่อน
 *   --skip-404-log
 *     → ไม่ส่ง INSERT เข้า _emdash_404_log (ใช้เมื่อ D1 มี migration 404_log ใหม่กว่า data.db จะได้ไม่ชน column count)
 *   --for-d1-remote
 *     → ตัด PRAGMA writable_schema และบล็อก INSERT เข้า sqlite_schema ทั้งก้อน แล้วแทรก CREATE VIRTUAL TABLE
 *       จาก sqlite_master (D1 ไม่ให้แก้ sqlite_master; dump เดิมเก็บ FTS ไว้ใน sqlite_schema เท่านั้น)
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
const insertOrReplace = argv.includes("--insert-or-replace");
const skip404Log = argv.includes("--skip-404-log");
const forD1Remote = argv.includes("--for-d1-remote");
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

/** INSERT ที่ชนกับ DB ที่ Worker สร้างไว้แล้ว (migrate + lock row) */
const MIGRATION_META_INSERT = /^\s*INSERT INTO (?:_emdash_migrations(?:_lock)?|"_emdash_migrations(?:_lock)?")\s/i;

if (stripMigrationInserts) {
	sql = sql
		.split("\n")
		.filter((line) => !MIGRATION_META_INSERT.test(line))
		.join("\n");
}

/**
 * ลบ INSERT INTO sqlite_schema(...) แบบหลายบรรทัด (ค่า sql ของ FTS) — ห้ามลบแค่บรรทัดแรกเพราะจะเหลือเศษ syntax
 */
function stripSqliteSchemaInsertBlocks(text) {
	const lines = text.split("\n");
	const out = [];
	let skipping = false;
	for (const line of lines) {
		if (!skipping && /^\s*INSERT INTO sqlite_schema\s*\(/i.test(line)) {
			skipping = true;
			continue;
		}
		if (skipping) {
			if (/^\s*\)\'\);\s*$/.test(line)) skipping = false;
			continue;
		}
		out.push(line);
	}
	return out.join("\n");
}

function fetchVirtualTableDdls(path) {
	const q =
		"SELECT sql||';'||char(10) FROM sqlite_master WHERE sql LIKE 'CREATE VIRTUAL%';";
	const r = spawnSync("sqlite3", [path, "-batch", q], {
		encoding: "utf8",
		maxBuffer: 4 * 1024 * 1024,
	});
	if (r.error || r.status !== 0) {
		console.error(r.stderr || r.error || "sqlite3 virtual ddl query failed");
		process.exit(r.status ?? 1);
	}
	return r.stdout.trim();
}

if (forD1Remote) {
	sql = sql.replace(/^PRAGMA writable_schema=(ON|OFF);\s*$/gim, "");
	sql = stripSqliteSchemaInsertBlocks(sql);
	const virtualDdls = fetchVirtualTableDdls(dbPath);
	const anchor = "CREATE TABLE IF NOT EXISTS '_emdash_fts_";
	const idx = sql.indexOf(anchor);
	if (virtualDdls && idx !== -1) {
		const ddl = virtualDdls.replace(
			/^CREATE VIRTUAL TABLE /gim,
			"CREATE VIRTUAL TABLE IF NOT EXISTS ",
		);
		sql = `${sql.slice(0, idx)}${ddl}\n${sql.slice(idx)}`;
	}
	/* shadow tables ของ FTS สร้างอัตโนมัติ — D1 ไม่ให้ CREATE/INSERT เข้า _emdash_fts_*_data ฯลฯ แยก */
	sql = sql
		.split("\n")
		.filter((line) => {
			if (/^\s*CREATE TABLE IF NOT EXISTS ['"]_emdash_fts_/i.test(line))
				return false;
			if (/^\s*CREATE TABLE IF NOT EXISTS _emdash_fts_/i.test(line))
				return false;
			if (/^\s*INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+['"]?_emdash_fts_/i.test(line))
				return false;
			return true;
		})
		.join("\n");
	sql = sql.replace(/^CREATE UNIQUE INDEX\s+/gim, "CREATE UNIQUE INDEX IF NOT EXISTS ");
	sql = sql.replace(/^CREATE INDEX\s+/gim, "CREATE INDEX IF NOT EXISTS ");
	sql = sql.replace(/^CREATE TRIGGER\s+/gim, "CREATE TRIGGER IF NOT EXISTS ");
}

if (insertOrReplace) {
	sql = sql.replace(
		/^(\s*)INSERT INTO\s+(?!sqlite_schema)/gim,
		"$1INSERT OR REPLACE INTO ",
	);
}

const INSERT_404_LOG =
	/^\s*INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+_emdash_404_log\s/i;
if (skip404Log) {
	sql = sql
		.split("\n")
		.filter((line) => !INSERT_404_LOG.test(line))
		.join("\n");
}

const header = `-- EmDash → D1 import (from ${dbPath})
-- Review this file; then: pnpm exec wrangler d1 execute <database_name> --remote --file=${outPath}
${stripMigrationInserts ? "-- strip-migration-inserts: ไม่มี INSERT _emdash_migrations / _emdash_migrations_lock\n" : ""}${insertOrReplace ? "-- insert-or-replace: INSERT OR REPLACE (ยกเว้น sqlite_schema)\n" : ""}${skip404Log ? "-- skip-404-log\n" : ""}${forD1Remote ? "-- for-d1-remote (no sqlite_schema INSERT / writable_schema)\n" : ""}PRAGMA defer_foreign_keys = ON;
`;

writeFileSync(outPath, header + sql, "utf8");
const flags = [
	stripMigrationInserts && "ตัด migration meta",
	insertOrReplace && "INSERT OR REPLACE",
	skip404Log && "skip 404 log",
	forD1Remote && "for D1 remote",
]
	.filter(Boolean)
	.join(", ");
console.log(
	`เขียนไฟล์แล้ว: ${outPath}${flags ? ` (${flags})` : ""}`,
);
console.log(
	"ขั้นต่อไป (remote D1): pnpm exec wrangler d1 execute fadvisorth --remote --file=data-d1-import.sql",
);
console.log(
	"ทดสอบบน local D1: pnpm exec wrangler d1 execute fadvisorth --local --file=data-d1-import.sql",
);
console.log(
	"หมายเหตุ: ไฟล์ใน ./uploads (media) ไม่ได้ถูกคัดลอก — ต้องอัปโหลดไป R2 แยกต่างหากถ้าต้องการรูปบน production",
);
