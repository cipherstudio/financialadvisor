/**
 * ตั้งฟิลด์ market_calendar_day เป็น type datetime ใน DB (แอดมินจะได้ปุ่ม datetime-local)
 * และแปลงค่าเก่าแบบ YYYY-MM-DD เป็น YYYY-MM-DDTHH:mm ให้ตัวเลือกปฏิทินแสดงถูกต้อง
 *
 * รันครั้งเดียวหลังดึง seed ที่เปลี่ยนประเภทฟิลด์แล้ว:
 *   node scripts/migrate-market-calendar-day-field-type.mjs
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

function normalizeCalendarValue(v) {
	if (typeof v !== "string") return v;
	const t = v.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T00:00`;
	return v;
}

const dbPath = resolve(process.cwd(), "data.db");
if (!existsSync(dbPath)) {
	console.error("ไม่พบ data.db");
	process.exit(1);
}

const db = new Database(dbPath);

const col = db.prepare("SELECT id FROM _emdash_collections WHERE slug = ?").get("market_updates");
if (!col?.id) {
	console.error("ไม่พบ collection market_updates");
	process.exit(1);
}

const fid = db
	.prepare("SELECT id FROM _emdash_fields WHERE collection_id = ? AND slug = ?")
	.get(col.id, "market_calendar_day");
if (!fid?.id) {
	console.error("ไม่พบฟิลด์ market_calendar_day");
	process.exit(1);
}

let nEc = 0;
let nRev = 0;

const tx = db.transaction(() => {
	db.prepare(
		`UPDATE _emdash_fields SET type = 'datetime', validation = NULL WHERE id = ?`,
	).run(fid.id);

	const ecRows = db.prepare("SELECT id, market_calendar_day FROM ec_market_updates").all();
	const updEc = db.prepare("UPDATE ec_market_updates SET market_calendar_day = ? WHERE id = ?");
	for (const row of ecRows) {
		const n = normalizeCalendarValue(row.market_calendar_day);
		if (n !== row.market_calendar_day) {
			updEc.run(n, row.id);
			nEc++;
		}
	}

	const revRows = db.prepare("SELECT id, data FROM revisions WHERE collection = ?").all("market_updates");
	const updRev = db.prepare("UPDATE revisions SET data = ? WHERE id = ?");
	for (const rev of revRows) {
		try {
			const data = JSON.parse(rev.data);
			if (data.market_calendar_day == null) continue;
			const n = normalizeCalendarValue(data.market_calendar_day);
			if (n !== data.market_calendar_day) {
				data.market_calendar_day = n;
				updRev.run(JSON.stringify(data), rev.id);
				nRev++;
			}
		} catch {
			// skip bad JSON
		}
	}
});

tx();
db.close();

console.log(
	`OK: market_calendar_day → datetime; อัปเดต ec_market_updates ${nEc} แถว, revisions ${nRev} แถว`,
);
