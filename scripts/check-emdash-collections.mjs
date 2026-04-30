/**
 * ตรวจว่า data.db ตรงกลางมี collection about_us หรือยัง
 * รันจาก root: node scripts/check-emdash-collections.mjs
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const dbPath = resolve(process.cwd(), "data.db");
if (!existsSync(dbPath)) {
	console.error("ไม่พบ data.db ที่", dbPath);
	console.error("รันจาก root โปรเจกต์เท่านั้น แล้ว emdash จะสร้าง data.db หลัง dev/seed ครั้งแรก");
	process.exit(1);
}

const db = new Database(dbPath, { readonly: true });
const rows = db
	.prepare("SELECT slug, label FROM _emdash_collections ORDER BY slug")
	.all();
const slugs = rows.map((r) => r.slug);
const has = slugs.includes("about_us");
console.log("data.db =", dbPath);
console.log("จำนวน collections:", rows.length);
console.log(slugs.join(", "));
if (!has) {
	console.error("\n❌ ยังไม่มี slug \"about_us\" — รัน: npx emdash seed seed/seed.json แล้ว refesh หน้า admin (หรือ hard refresh Ctrl+Shift+R)\n");
	process.exit(1);
}
console.log("\n✅ พบ about_us ถ้า admin ยังไม่ขึ้น: รีสตาร์ต pnpm dev + hard refresh; ยืนยันว่า dev รันจากโฟลเดอร์เดียวกับไฟล์ data.db นี้ (ไม่ copy WSL/Windows คนละไดรฟ์)\n");
db.close();
