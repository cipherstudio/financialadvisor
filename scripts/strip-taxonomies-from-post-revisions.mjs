/**
 * Revisions บางรายการมี key `taxonomies` ใน JSON — publish พยายาม sync ลง ec_posts
 * แต่ไม่มีคอลัมน์นั้น → SqliteError: no such column: taxonomies
 * ลบ key ออกจาก revisions.data (หมวดจริงอยู่ใน content_taxonomies อยู่แล้ว)
 *
 * รัน: node scripts/strip-taxonomies-from-post-revisions.mjs
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const dbPath = resolve(process.cwd(), "data.db");
if (!existsSync(dbPath)) {
	console.error("ไม่พบ data.db");
	process.exit(1);
}

const db = new Database(dbPath);
const rows = db.prepare("SELECT id, data FROM revisions WHERE collection = ?").all("posts");
let fixed = 0;
const update = db.prepare("UPDATE revisions SET data = ? WHERE id = ?");

const tx = db.transaction(() => {
	for (const row of rows) {
		let data;
		try {
			data = JSON.parse(row.data);
		} catch {
			continue;
		}
		if (!data || typeof data !== "object" || !Object.prototype.hasOwnProperty.call(data, "taxonomies")) {
			continue;
		}
		delete data.taxonomies;
		update.run(JSON.stringify(data), row.id);
		fixed++;
	}
});
tx();
db.close();
console.log(`OK: แก้ revisions ของ posts ที่มี taxonomies ใน JSON แล้ว ${fixed} รายการ`);
