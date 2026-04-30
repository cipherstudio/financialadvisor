/**
 * Rebuild EmDash FTS5 (drop + create + triggers + re-index) for collections.
 * Fixes publish failing with: SqliteError: database disk image is malformed (SQLITE_CORRUPT_VTAB)
 *
 * สำคัญ: ต้องหยุด `pnpm run dev` ก่อน (Ctrl+C) — ถ้าไฟล์ `data.db` ยังถูก Node ล็อกอยู่
 * การรีบิลด์ FTS จะคนละกระบวนการกับเซิร์ฟเวอร์ ทำให้ index เพี้ยน/พังอีกทันทีที่ Publish
 * หลังรันสคริปต์นี้เสร็จ ค่อย `pnpm run dev` ใหม่
 *
 * Stop the dev server first (Ctrl+C) so nothing else holds a write lock on data.db.
 *
 * Usage: node scripts/rebuild-fts.mjs [collection ...]
 * Default: pages posts market_updates
 */
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new Database(join(root, "data.db"));

const defaultSlugs = ["pages", "posts", "market_updates"];
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : defaultSlugs;

function getSearchableFields(collectionSlug) {
	return db
		.prepare(
			`SELECT f.slug FROM _emdash_fields f
     JOIN _emdash_collections c ON c.id = f.collection_id
     WHERE c.slug = ? AND f.searchable = 1
     ORDER BY f.slug`,
		)
		.all(collectionSlug)
		.map((r) => r.slug);
}

function isSearchEnabled(collectionSlug) {
	const row = db
		.prepare(`SELECT search_config FROM _emdash_collections WHERE slug = ?`)
		.get(collectionSlug);
	if (!row?.search_config) return false;
	try {
		const c = JSON.parse(row.search_config);
		return c.enabled === true;
	} catch {
		return false;
	}
}

function rebuildFts(collectionSlug, searchableFields) {
	if (searchableFields.length === 0) {
		console.log(`Skip ${collectionSlug}: no searchable fields`);
		return;
	}
	const ftsTable = `_emdash_fts_${collectionSlug}`;
	const contentTable = `ec_${collectionSlug}`;

	db.exec(`DROP TRIGGER IF EXISTS "${ftsTable}_insert"`);
	db.exec(`DROP TRIGGER IF EXISTS "${ftsTable}_update"`);
	db.exec(`DROP TRIGGER IF EXISTS "${ftsTable}_delete"`);
	db.exec(`DROP TABLE IF EXISTS "${ftsTable}"`);

	const indexedCols = ["id UNINDEXED", "locale UNINDEXED", ...searchableFields].join(", ");
	const fieldList = searchableFields.join(", ");
	const newFieldList = searchableFields.map((f) => `NEW.${f}`).join(", ");

	db.exec(`
    CREATE VIRTUAL TABLE "${ftsTable}" USING fts5(
      ${indexedCols},
      content='${contentTable}',
      content_rowid='rowid',
      tokenize='porter unicode61'
    );
  `);

	db.exec(`
    CREATE TRIGGER "${ftsTable}_insert"
    AFTER INSERT ON "${contentTable}"
    WHEN NEW.deleted_at IS NULL
    BEGIN
      INSERT INTO "${ftsTable}"(rowid, id, locale, ${fieldList})
      VALUES (NEW.rowid, NEW.id, NEW.locale, ${newFieldList});
    END;
  `);

	db.exec(`
    CREATE TRIGGER "${ftsTable}_update"
    AFTER UPDATE ON "${contentTable}"
    BEGIN
      DELETE FROM "${ftsTable}" WHERE rowid = OLD.rowid;
      INSERT INTO "${ftsTable}"(rowid, id, locale, ${fieldList})
      SELECT NEW.rowid, NEW.id, NEW.locale, ${newFieldList}
      WHERE NEW.deleted_at IS NULL;
    END;
  `);

	db.exec(`
    CREATE TRIGGER "${ftsTable}_delete"
    AFTER DELETE ON "${contentTable}"
    BEGIN
      DELETE FROM "${ftsTable}" WHERE rowid = OLD.rowid;
    END;
  `);

	db.exec(`
    INSERT INTO "${ftsTable}"(rowid, id, locale, ${fieldList})
    SELECT rowid, id, locale, ${fieldList} FROM "${contentTable}"
    WHERE deleted_at IS NULL
  `);

	console.log(`Rebuilt ${ftsTable} (${searchableFields.join(", ")})`);
}

for (const slug of slugs) {
	if (!isSearchEnabled(slug)) {
		console.log(`Skip ${slug}: search not enabled in schema`);
		continue;
	}
	const fields = getSearchableFields(slug);
	try {
		rebuildFts(slug, fields);
	} catch (e) {
		console.error(`Failed ${slug}:`, e.message);
		process.exit(1);
	}
}

db.close();
console.log("FTS rebuild finished. Restart the dev server and try Publish again.");
