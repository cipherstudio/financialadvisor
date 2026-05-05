#!/usr/bin/env node
/**
 * อัปโหลดไฟล์จาก ./uploads ขึ้น Cloudflare R2 ให้ตรงกับคีย์ใน EmDash (ตาราง media.storage_key)
 *
 * ต้องล็อกอิน wrangler แล้ว (`pnpm exec wrangler login`) และมี bucket ตาม wrangler.jsonc
 *
 * Usage:
 *   pnpm run emdash:sync-uploads-r2 -- --dry-run
 *   pnpm run emdash:sync-uploads-r2 -- --remote
 *   pnpm run emdash:sync-uploads-r2 -- --local
 *
 * Env:
 *   R2_BUCKET     ชื่อ bucket (ดีฟอลต์อ่านจาก wrangler.jsonc หรือ fadvisorth-media)
 *   UPLOADS_DIR   ดีฟอลต์ ./uploads
 *   SQLITE_PATH   ดีฟอลต์ ./data.db
 */
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";

const cwd = process.cwd();
const uploadsDir = resolve(cwd, process.env.UPLOADS_DIR || "uploads");
const dbPath = resolve(cwd, process.env.SQLITE_PATH || "data.db");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const useLocal = argv.includes("--local");
const scanAll = argv.includes("--scan-all-files");

function readR2BucketFromWrangler() {
	const p = resolve(cwd, "wrangler.jsonc");
	if (!existsSync(p)) return null;
	const text = readFileSync(p, "utf8");
	const m = text.match(/"r2_buckets"\s*:\s*\[[\s\S]*?"bucket_name"\s*:\s*"([^"]+)"/);
	return m?.[1] ?? null;
}

const bucket =
	process.env.R2_BUCKET || readR2BucketFromWrangler() || "fadvisorth-media";

/**
 * @param {string} dir
 * @param {string} baseRel posix-style relative prefix under uploads
 * @returns {{ key: string, abs: string }[]}
 */
function listFilesRecursive(dir, baseRel = "") {
	const out = [];
	if (!existsSync(dir)) return out;
	for (const name of readdirSync(dir)) {
		const abs = join(dir, name);
		const rel = baseRel ? `${baseRel}/${name}` : name;
		const st = statSync(abs);
		if (st.isDirectory()) out.push(...listFilesRecursive(abs, rel));
		else out.push({ key: rel.split("\\").join("/"), abs });
	}
	return out;
}

function putObject(key, filePath, contentType) {
	const objectPath = `${bucket}/${key}`;
	const args = [
		"exec",
		"wrangler",
		"r2",
		"object",
		"put",
		objectPath,
		"--file",
		filePath,
		"-y",
	];
	if (contentType) {
		args.push("--content-type", contentType);
	}
	args.push(useLocal ? "--local" : "--remote");
	if (dryRun) return;
	try {
		execFileSync("pnpm", args, {
			cwd,
			stdio: "inherit",
		});
	} catch (e) {
		console.error(`wrangler ล้มเหลวสำหรับ ${objectPath}`, e);
		process.exit(1);
	}
}

function main() {
	if (!existsSync(dbPath)) {
		console.error(`ไม่พบ ${dbPath}`);
		process.exit(1);
	}
	if (!existsSync(uploadsDir)) {
		mkdirSync(uploadsDir, { recursive: true });
		console.warn(`สร้างโฟลเดอร์ว่าง: ${uploadsDir} (ยังไม่มีไฟล์ให้อัปโหลด)`);
	}

	console.log(
		`R2 bucket: ${bucket} | uploads: ${uploadsDir} | ${dryRun ? "DRY-RUN" : useLocal ? "local" : "remote"}`,
	);

	const db = new Database(dbPath, { readonly: true });
	const fromDb = db
		.prepare(
			`SELECT storage_key AS key, mime_type AS mime FROM media WHERE storage_key IS NOT NULL AND storage_key != ''`,
		)
		.all();

	let todo = fromDb.map((row) => ({
		key: row.key,
		abs: resolve(uploadsDir, row.key),
		mime: row.mime || "application/octet-stream",
	}));

	if (scanAll) {
		const onDisk = listFilesRecursive(uploadsDir);
		const seen = new Set(todo.map((t) => t.key));
		for (const { key, abs } of onDisk) {
			if (!seen.has(key)) {
				seen.add(key);
				todo.push({
					key,
					abs,
					mime: "application/octet-stream",
				});
			}
		}
	}

	let ok = 0;
	let missing = 0;

	for (const { key, abs, mime } of todo) {
		if (!existsSync(abs)) {
			console.warn(`[ข้าม ไม่มีไฟล์] ${key}`);
			missing++;
			continue;
		}
		if (dryRun) {
			console.log(`[dry-run] put ${bucket}/${key} <- ${abs} (${mime})`);
		} else {
			console.log(`อัปโหลด ${key} …`);
			putObject(key, abs, mime);
		}
		ok++;
	}

	console.log(
		`สรุป: ${dryRun ? "จะอัปโหลด" : "อัปโหลดแล้ว"} ${ok} ไฟล์, ไม่มีไฟล์ในเครื่อง ${missing}${scanAll ? " (รวม --scan-all-files)" : ""}`,
	);
}

main();
