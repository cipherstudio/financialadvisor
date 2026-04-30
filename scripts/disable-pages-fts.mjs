/**
 * ปิด FTS สำหรับคอลเลกชัน `pages` เท่านั้น (ดรอปตาราง + trigger + ปิด search_config)
 * ใช้เมื่อ Publish หน้า pages ล้มเหลวซ้ำด้วย SQLITE_CORRUPT_VTAB แม้รัน rebuild-fts แล้ว
 *
 * หยุด `pnpm run dev` ก่อนรัน (หรือปิดโปรเซสที่เปิด data.db)
 */
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new Database(join(root, "data.db"));

const ftsTable = "_emdash_fts_pages";

db.exec(`DROP TRIGGER IF EXISTS "${ftsTable}_insert"`);
db.exec(`DROP TRIGGER IF EXISTS "${ftsTable}_update"`);
db.exec(`DROP TRIGGER IF EXISTS "${ftsTable}_delete"`);
db.exec(`DROP TABLE IF EXISTS "${ftsTable}"`);

const r = db
	.prepare(
		`UPDATE _emdash_collections SET search_config = ? WHERE slug = 'pages'`,
	)
	.run(JSON.stringify({ enabled: false }));

const f = db
	.prepare(
		`UPDATE _emdash_fields SET searchable = 0
     WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'pages')`,
	)
	.run();

db.close();
console.log(
	`OK: ปิด FTS สำหรับ pages (collections ${r.changes}, fields searchable → 0: ${f.changes}), ลอง Publish อีกครั้ง`,
);
