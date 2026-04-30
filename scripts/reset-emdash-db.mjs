#!/usr/bin/env node
/**
 * Fixes "database disk image is malformed" by moving data.db (+ WAL/SHM)
 * into .emdash-db-backups/ and re-running the seed.
 *
 * Stop `pnpm run dev` (and anything using data.db) before running.
 */
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupDir = resolve(cwd, ".emdash-db-backups");
mkdirSync(backupDir, { recursive: true });

for (const suffix of ["", "-wal", "-shm"]) {
	const from = resolve(cwd, `data.db${suffix}`);
	if (!existsSync(from)) {
		continue;
	}
	const to = resolve(backupDir, `data.db${suffix}.${stamp}`);
	renameSync(from, to);
	console.log(`Backed up: ${from} -> ${to}`);
}

const seedPath = resolve(cwd, "seed", "seed.json");
const result = spawnSync(
	"npx",
	["emdash", "seed", seedPath, "--on-conflict", "update"],
	{ cwd, stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
