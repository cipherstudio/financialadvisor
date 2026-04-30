/**
 * แก้ SQLITE_CORRUPT_VTAB ตอน restore ลบข้อมูลฟอร์ม:
 * ลบตาราง FTS5 + ทริกเกอร์ แล้วปิด search สำหรับ book_consultation_submissions / contact_submissions
 *
 * รัน: node scripts/repair-form-submission-fts.mjs
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const slugs = ["book_consultation_submissions", "contact_submissions"];

const dbPath = resolve(process.cwd(), "data.db");
if (!existsSync(dbPath)) {
	console.error("ไม่พบ", dbPath);
	process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

let dropped = 0;
for (const slug of slugs) {
	const fts = `_emdash_fts_${slug}`;
	for (const suffix of ["_insert", "_update", "_delete"]) {
		try {
			db.exec(`DROP TRIGGER IF EXISTS "${fts}${suffix}"`);
		} catch (e) {
			console.warn(`drop trigger ${fts}${suffix}:`, e.message);
		}
	}
	try {
		db.exec(`DROP TABLE IF EXISTS "${fts}"`);
		dropped++;
	} catch (e) {
		console.error(`DROP TABLE "${fts}":`, e);
	}
}

// ปิด search ใน config (เหมือน EmDash disableSearch แบบง่าย)
const cfg = JSON.stringify({ enabled: false });
const upMeta = db.prepare(
	`UPDATE _emdash_collections SET search_config = ? WHERE slug IN (?, ?)`,
);
upMeta.run(cfg, slugs[0], slugs[1]);

// ไม่ index ฟิลด์ฟอร์มใน search อีก (กันสร้าง FTS ใหม่โดยไม่ตั้งใจ)
db.exec(`
	UPDATE _emdash_fields
	SET searchable = 0
	WHERE collection_id IN (
		SELECT id FROM _emdash_collections
		WHERE slug IN ('book_consultation_submissions', 'contact_submissions')
	)
`);

// ลบ "search" ออกจาก JSON supports ถ้ามี
const rows = db
	.prepare(`SELECT id, supports FROM _emdash_collections WHERE slug IN (?, ?)`)
	.all(...slugs);
const upd = db.prepare(`UPDATE _emdash_collections SET supports = ? WHERE id = ?`);
for (const row of rows) {
	if (!row.supports) continue;
	try {
		const arr = JSON.parse(row.supports);
		if (!Array.isArray(arr) || !arr.includes("search")) continue;
		const next = arr.filter((x) => x !== "search");
		upd.run(JSON.stringify(next), row.id);
	} catch {
		// ignore
	}
}

db.close();
console.log(
	`repair-form-submission-fts: ลบ FTS/trigger สำหรับ ${slugs.length} collection(s), อัปเดต search_config แล้ว (ลบ supports.search ถ้ามี)`,
);
console.log(" → รีสตาร์ต dev server แล้วลองกด Restore อีกครั้ง\n");
