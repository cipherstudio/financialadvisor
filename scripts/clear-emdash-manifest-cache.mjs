/**
 * ลบแคช manifest แอดมิน (emdash:manifest_cache) ใน data.db
 * หลัง `emdash seed` เพิ่ม/แก้ collection — มิฉะนั้น admin อาจยังใช้ manifest เก่า
 * และขึ้น "Collection not found" กับ collection ที่เพิ่ง seed
 *
 * หมายเหตุ: ต้องรีสตาร์ต `pnpm dev` ด้วย เพื่อเคลียร์แคชในหน่วยความจำของ process
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const dbPath = resolve(process.cwd(), "data.db");
if (!existsSync(dbPath)) {
	console.error("ไม่พบ", dbPath);
	process.exit(1);
}

const db = new Database(dbPath);
const r = db
	.prepare("DELETE FROM options WHERE name = 'emdash:manifest_cache'")
	.run();
db.close();
console.log(
	`clear-emdash-manifest-cache: ลบ emdash:manifest_cache จำนวน ${r.changes} แถว (ถ้าเป็น 0 แสดงว่าไม่มีแคชใน options)`,
);
console.log(" → รีสตาร์ต dev server (หยุด pnpm dev แล้วรันใหม่) แล้ว refesh หน้า admin\n");
