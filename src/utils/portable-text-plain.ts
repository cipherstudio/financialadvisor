/**
 * Flattens Portable Text blocks to a plain string for search / client-side use.
 */
export function portableTextToPlain(value: unknown): string {
	if (!value || !Array.isArray(value)) return "";
	const parts: string[] = [];
	for (const b of value as { children?: unknown[]; _type?: string }[]) {
		if (b?._type === "block" && b.children) {
			for (const c of b.children) parts.push(extractInlineText(c as Record<string, unknown>));
		}
	}
	return parts.join(" ").replace(/\s+/g, " ").trim();
}

function extractInlineText(node: Record<string, unknown> | null | undefined): string {
	if (!node) return "";
	if (node._type === "span" && typeof node.text === "string") return node.text;
	if (Array.isArray((node as { children?: unknown[] }).children)) {
		return (node as { children: unknown[] }).children
			.map((c) => extractInlineText(c as Record<string, unknown>))
			.join("");
	}
	return "";
}
