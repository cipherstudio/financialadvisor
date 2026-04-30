/**
 * Logic สำหรับตัดสินว่าควรแสดง 404 หรือไม่ — ต้องเรียกจากไฟล์ใน `src/pages/` เท่านั้น
 * (ห้ามเรียก Astro.redirect จาก component ที่ import — จะได้ ResponseSentError)
 */
import { getEmDashCollection, getEmDashEntry, getRequestContext } from "emdash";
import type { ContentEntry } from "emdash";
import type { MarketUpdate } from "../../emdash-env";

function has(s: string | undefined | null): boolean {
	return typeof s === "string" && s.trim() !== "";
}

function calendarDayOnly(raw: string | undefined | null): string {
	if (!has(raw)) return "";
	const m = raw!.trim().match(/^(\d{4}-\d{2}-\d{2})/);
	return m ? m[1]! : "";
}

function dayKeyFromData(data: MarketUpdate): string {
	return calendarDayOnly(data.market_calendar_day);
}

function dayKeySortMs(dayKey: string): number {
	if (!has(dayKey)) return 0;
	const t = Date.parse(`${dayKey.trim()}T12:00:00Z`);
	return Number.isNaN(t) ? 0 : t;
}

function dedupeByCalendarDay(list: ContentEntry<MarketUpdate>[]): ContentEntry<MarketUpdate>[] {
	const map = new Map<string, ContentEntry<MarketUpdate>>();
	const sorted = [...list].sort((a, b) => {
		const db = dayKeySortMs(dayKeyFromData(b.data)) - dayKeySortMs(dayKeyFromData(a.data));
		if (db !== 0) return db;
		const tb =
			b.data.updatedAt instanceof Date
				? b.data.updatedAt.getTime()
				: new Date(b.data.updatedAt).getTime();
		const ta =
			a.data.updatedAt instanceof Date
				? a.data.updatedAt.getTime()
				: new Date(a.data.updatedAt).getTime();
		return tb - ta;
	});
	for (const e of sorted) {
		const k = dayKeyFromData(e.data);
		if (!has(k)) continue;
		if (!map.has(k)) map.set(k, e);
	}
	return [...map.values()].sort(
		(a, b) => dayKeySortMs(dayKeyFromData(a.data)) - dayKeySortMs(dayKeyFromData(b.data)),
	);
}

export async function marketUpdatesShould404(entrySlugOrId: string | undefined): Promise<boolean> {
	const { entries: rawList } = await getEmDashCollection("market_updates", {
		status: "published",
		limit: 500,
	});

	const previewCtx = getRequestContext()?.preview;
	let rawMerged = rawList as ContentEntry<MarketUpdate>[];
	let previewFocusedEntry: ContentEntry<MarketUpdate> | null = null;

	if (previewCtx?.collection === "market_updates") {
		const { entry: pvEntry } = await getEmDashEntry("market_updates", previewCtx.id);
		if (pvEntry) {
			const p = pvEntry as ContentEntry<MarketUpdate>;
			previewFocusedEntry = p;
			const pid = (p.data as MarketUpdate).id ?? "";
			const dup = rawMerged.some(
				(e) =>
					e.id === p.id ||
					((e.data as MarketUpdate).id && (e.data as MarketUpdate).id === pid),
			);
			if (!dup) {
				rawMerged = [...rawMerged, p];
			}
		}
	}

	const withDayKey = rawMerged.filter((e) => dayKeySortMs(dayKeyFromData(e.data)) > 0);
	const timelineAsc = dedupeByCalendarDay(withDayKey);

	if (timelineAsc.length === 0) {
		return true;
	}

	const entriesDesc = [...timelineAsc].sort(
		(a, b) => dayKeySortMs(dayKeyFromData(b.data)) - dayKeySortMs(dayKeyFromData(a.data)),
	);

	let entry: ContentEntry<MarketUpdate> | null = null;

	if (has(entrySlugOrId)) {
		const { entry: one } = await getEmDashEntry("market_updates", entrySlugOrId!);
		entry = one as ContentEntry<MarketUpdate> | null;
	} else if (previewFocusedEntry) {
		entry = previewFocusedEntry;
	} else {
		entry = entriesDesc[0] as ContentEntry<MarketUpdate>;
	}

	return entry == null;
}
