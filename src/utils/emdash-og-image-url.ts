/**
 * Build an absolute URL for og:image / twitter:image from an EmDash image field
 * (same rules as `src/pages/investment-articles/[slug].astro`).
 */
export function getOgAbsoluteUrlFromImageField(img: unknown, origin: string): string | undefined {
	if (!img || typeof img !== "object") return undefined;
	const image = img as Record<string, unknown>;
	const base = origin.replace(/\/$/, "");
	if (typeof image.src === "string" && image.src) {
		if (image.src.startsWith("http")) return image.src;
		return image.src.startsWith("/") ? `${base}${image.src}` : `${base}/${image.src}`;
	}
	const meta = image.meta as Record<string, unknown> | undefined;
	const storageKey =
		(typeof meta?.storageKey === "string" ? meta.storageKey : undefined) ||
		(typeof image.id === "string" ? image.id : undefined);
	if (storageKey) {
		return `${base}/_emdash/api/media/file/${storageKey}`;
	}
	return undefined;
}
