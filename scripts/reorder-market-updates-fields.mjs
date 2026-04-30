/**
 * ซิงก์ฟิลด์ collection market_updates กับ seed ปัจจุบัน:
 * 1) ลบแถวเมตาใน _emdash_fields ที่ไม่มีใน seed แล้ว (emdash seed --no-content ไม่ลบฟิลด์ที่ถอดออกจาก seed)
 * 2) อัปเดต sort_order ให้ตรงลำดับใน seed
 *
 * รันจาก root: node scripts/reorder-market-updates-fields.mjs
 * หรือ: pnpm run emdash:reorder-market-updates-fields
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

/** ตรงกับลำดับใน seed/seed.json ของ collection market_updates (เฉพาะข้อมูลรายวัน) */
const seedSlugs = [
	"market_calendar_day",
	"title",
	"indices_data",
	"top_gainers",
	"top_losers",
	"market_summary",
	"market_sentiment",
];

const seedSet = new Set(seedSlugs);

const dbPath = resolve(process.cwd(), "data.db");
if (!existsSync(dbPath)) {
	console.error("ไม่พบ data.db — รันหลัง emdash สร้าง DB แล้ว");
	process.exit(1);
}

const db = new Database(dbPath);
const row = db.prepare("SELECT id FROM _emdash_collections WHERE slug = ?").get("market_updates");
if (!row?.id) {
	console.error("ไม่พบ collection market_updates");
	process.exit(1);
}

const cid = row.id;

let dbSlugs = db
	.prepare("SELECT slug FROM _emdash_fields WHERE collection_id = ? ORDER BY sort_order")
	.all(cid)
	.map((r) => r.slug);

const orphans = dbSlugs.filter((s) => !seedSet.has(s));
if (orphans.length > 0) {
	const del = db.prepare("DELETE FROM _emdash_fields WHERE collection_id = ? AND slug = ?");
	const prune = db.transaction(() => {
		for (const slug of orphans) del.run(cid, slug);
	});
	prune();
	console.log("ลบฟิลด์เมตาที่ไม่มีใน seed:", orphans.join(", "));
	dbSlugs = db
		.prepare("SELECT slug FROM _emdash_fields WHERE collection_id = ? ORDER BY sort_order")
		.all(cid)
		.map((r) => r.slug);
}

const ordered = seedSlugs.filter((s) => dbSlugs.includes(s));

const update = db.prepare(
	"UPDATE _emdash_fields SET sort_order = ? WHERE collection_id = ? AND slug = ?",
);

const tx = db.transaction(() => {
	for (let i = 0; i < ordered.length; i++) {
		update.run(i, cid, ordered[i]);
	}
});
tx();
db.close();
console.log("OK: รีลำดับ market_updates แล้ว (", ordered.length, "ฟิลด์ )");
