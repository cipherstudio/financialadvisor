/**
 * ย้ายคอลัมน์ title → role_title ใน ec_advisors และอัปเดต _emdash_fields
 * เพื่อให้รายการใน admin แสดงชื่อ (name) เป็นหลัก — EmDash ใช้ data.title ก่อน data.name
 *
 * รันจาก root: node scripts/migrate-advisors-title-to-role-title.mjs
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

const col = db
	.prepare("SELECT id FROM _emdash_collections WHERE slug = ?")
	.get("advisors");
if (!col?.id) {
	console.error("ไม่พบ collection advisors");
	process.exit(1);
}

const cols = db.prepare("PRAGMA table_info(ec_advisors)").all();
const names = new Set(cols.map((c) => c.name));
const hasTitle = names.has("title");
const hasRole = names.has("role_title");

if (!hasTitle && hasRole) {
	console.log("OK: มี role_title แล้ว ไม่ต้อง migrate คอลัมน์");
} else if (hasTitle && !hasRole) {
	db.exec("ALTER TABLE ec_advisors RENAME COLUMN title TO role_title");
	console.log("OK: RENAME COLUMN title → role_title");
} else if (hasTitle && hasRole) {
	const n = db
		.prepare(
			"UPDATE ec_advisors SET role_title = title WHERE role_title IS NULL OR role_title = ''",
		)
		.run();
	console.log("OK: คัดลอก title → role_title (แถวที่อัปเดต:", n.changes, ")");
	// SQLite 3.35+ DROP COLUMN — ถ้าไม่รองรับให้ลบคอลัมน์ title ทีหลังด้วยมือใน admin
	try {
		db.exec("ALTER TABLE ec_advisors DROP COLUMN title");
		console.log("OK: DROP COLUMN title");
	} catch (e) {
		console.warn("ไม่สามารถ DROP COLUMN title อัตโนมัติ — ลบฟิลด์ title ใน Schema ถ้ายังเหลือ:", e.message);
	}
} else {
	console.log("ไม่พบคอลัมน์ title (ฐานใหม่หลัง seed) — อัปเดต metadata อย่างเดียว");
}

/**
 * รีวิชันเก็บ snapshot เป็น JSON — ถ้ายังมี key "title" แต่ตารางไม่มีคอลัมน์ title
 * ตอน publish จะ syncDataColumns แล้ว error SQLITE_ERROR
 */
const revs = db.prepare("SELECT id, data FROM revisions WHERE collection = ?").all("advisors");
const updateRev = db.prepare("UPDATE revisions SET data = ? WHERE id = ?");
let revFixed = 0;
for (const r of revs) {
	try {
		const d = JSON.parse(r.data);
		if (!Object.prototype.hasOwnProperty.call(d, "title")) continue;
		const t = d.title;
		delete d.title;
		if ((d.role_title == null || d.role_title === "") && t != null) {
			d.role_title = t;
		}
		updateRev.run(JSON.stringify(d), r.id);
		revFixed++;
	} catch (e) {
		console.warn("ข้าม revision", r.id, e.message);
	}
}
if (revFixed > 0) {
	console.log("OK: แก้ key title → role_title ใน revisions:", revFixed, "แถว");
}

const up = db
	.prepare(
		`UPDATE _emdash_fields SET slug = 'role_title', label = 'Title (optional)'
     WHERE collection_id = ? AND slug = 'title'`,
	)
	.run(col.id);
if (up.changes > 0) {
	console.log("OK: อัปเดต _emdash_fields title → role_title");
} else {
	const hasRoleField = db
		.prepare(
			"SELECT 1 FROM _emdash_fields WHERE collection_id = ? AND slug = 'role_title'",
		)
		.get(col.id);
	if (!hasRoleField) {
		console.warn(
			"ยังไม่มีฟิลด์ role_title ใน _emdash_fields — รัน: npx emdash seed seed/seed.json",
		);
	}
}

db.close();
console.log("เสร็จแล้ว รีสตาร์ต dev แล้วรีเฟรช admin");
