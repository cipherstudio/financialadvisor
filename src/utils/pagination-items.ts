/**
 * รูปแบบแถบหมายเลขหน้าแบบทั่วไป: ถ้ามี ≤5 หน้า แสดงครบ;
 * มากกว่า 5 แสดง 1, …, รอบหน้าปัจจุบัน, …, หน้าสุดท้าย
 */
export type PaginationItem = { kind: "page"; n: number } | { kind: "ellipsis"; key: string };

const E = (key: string): PaginationItem => ({ kind: "ellipsis", key });

function trimLeading1Ellipsis2(items: PaginationItem[]): void {
	// ลบ "1 … 2" เมื่อ 1 กับ 2 ติดกัน ไม่ต้องมี …
	for (let i = 0; i < items.length - 2; i++) {
		const a = items[i];
		const b = items[i + 1];
		const c = items[i + 2];
		if (a?.kind === "page" && a.n === 1 && b?.kind === "ellipsis" && c?.kind === "page" && c.n === 2) {
			items.splice(i + 1, 1);
			return;
		}
	}
}

export function getPaginationItems(total: number, current: number): PaginationItem[] {
	if (total < 1) return [];
	const c = Math.min(Math.max(1, current), total);

	if (total <= 5) {
		return Array.from({ length: total }, (_, i) => ({ kind: "page" as const, n: i + 1 }));
	}

	// total > 5
	if (c <= 3) {
		const out: PaginationItem[] = [P(1), P(2), P(3), P(4), P(5), E("a"), P(total)];
		trimLeading1Ellipsis2(out);
		return out;
	}
	if (c >= total - 2) {
		const out: PaginationItem[] = [P(1), E("b"), P(total - 4), P(total - 3), P(total - 2), P(total - 1), P(total)];
		trimLeading1Ellipsis2(out);
		return out;
	}
	const out: PaginationItem[] = [P(1), E("c"), P(c - 1), P(c), P(c + 1), E("d"), P(total)];
	trimLeading1Ellipsis2(out);
	return out;
}

function P(n: number): PaginationItem {
	return { kind: "page", n };
}
