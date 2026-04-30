/**
 * อัปเดต sort_order ของฟิลด์ collection investment_articles_page ให้ตรง seed/seed.json
 * (emdash seed --on-conflict update อัปเดต label แต่ไม่รีลำดับฟิลด์ที่มีอยู่แล้ว)
 * รันจาก root: node scripts/reorder-investment-articles-page-fields.mjs
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

/** ตรงกับลำดับใน seed/seed.json — toggle อยู่ก่อนฟิลด์เนื้อหา CTA ของแต่ละส่วน */
const slugs = [
	"page_title",
	"hero_title",
	"hero_description",
	"show_category_filters",
	"empty_state_title",
	"empty_state_description",
	"show_cta_section",
	"cta_title",
	"cta_description",
	"cta_button_label",
	"cta_button_href",
	"detail_back_label",
	"detail_back_href",
	"detail_sidebar_author_label",
	"detail_sidebar_author_title",
	"detail_sidebar_author_subtitle",
	"show_detail_cta_section",
	"detail_cta_title",
	"detail_cta_description",
	"detail_cta_button_label",
	"detail_cta_button_href",
	"detail_related_eyebrow",
	"detail_related_heading",
	"detail_related_link_label",
];

const dbPath = resolve(process.cwd(), "data.db");
if (!existsSync(dbPath)) {
	console.error("ไม่พบ data.db — รันหลัง emdash สร้าง DB แล้ว");
	process.exit(1);
}

const db = new Database(dbPath);
const row = db.prepare("SELECT id FROM _emdash_collections WHERE slug = ?").get("investment_articles_page");
if (!row?.id) {
	console.error("ไม่พบ collection investment_articles_page");
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
console.log("OK: รีลำดับ investment_articles_page แล้ว (", slugs.length, "ฟิลด์)");
