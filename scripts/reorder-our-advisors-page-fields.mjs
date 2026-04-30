/**
 * อัปเดต sort_order ของฟิลด์ collection our_advisors_page ให้ตรง seed ปัจจุบัน
 * (npx emdash seed อัปเดต label แต่ไม่รีลำดับฟิลด์ที่สร้างไว้แล้ว)
 * รันจาก root: node scripts/reorder-our-advisors-page-fields.mjs
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

/** ตรงกับลำดับใน seed/seed.json ของ collection นี้ */
const slugs = [
	"page_title",
	"hero_badge",
	"hero_title",
	"hero_subtitle",
	"grid_section_title",
	"grid_section_intro",
	"show_trust_section",
	"trust_items",
	"specialties_section_heading",
];

const dbPath = resolve(process.cwd(), "data.db");
if (!existsSync(dbPath)) {
	console.error("ไม่พบ data.db — รันหลัง emdash สร้าง DB แล้ว");
	process.exit(1);
}

const db = new Database(dbPath);
const row = db
	.prepare("SELECT id FROM _emdash_collections WHERE slug = ?")
	.get("our_advisors_page");
if (!row?.id) {
	console.error("ไม่พบ collection our_advisors_page");
	process.exit(1);
}
const update = db.prepare(
	"UPDATE _emdash_fields SET sort_order = ? WHERE collection_id = ? AND slug = ?",
);
const tx = db.transaction(() => {
	for (let i = 0; i < slugs.length; i++) {
		const r = update.run(i, row.id, slugs[i]);
		if (r.changes === 0) {
			console.warn("ไม่พบ slug:", slugs[i]);
		}
	}
});
tx();
db.close();
console.log("OK: รีลำดับ our_advisors_page แล้ว (", slugs.length, "ฟิลด์ )");
