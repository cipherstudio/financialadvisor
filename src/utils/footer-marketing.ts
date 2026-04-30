import { extractPlainText } from "emdash";
import { MediaRepository } from "emdash";
import { getDb } from "emdash/runtime";
import { siteLogoForImage as siteLogoForImageField } from "./site-logo-for-image";
import type { MediaReference, MediaValue } from "emdash";

/** Resolve any media id to an <Image> compatible value. */
export async function getImageByMediaId(
	mediaId: string | undefined,
	alt?: string,
): Promise<string | MediaValue | null> {
	const id = mediaId?.trim();
	if (!id) {
		return null;
	}
	const db = await getDb();
	const repo = new MediaRepository(db);
	const media = await repo.findById(id);
	if (!media) {
		return null;
	}
	const ref: MediaReference & { url?: string } = {
		mediaId: id,
		alt: alt?.trim() || media.alt || undefined,
		url: `/_emdash/api/media/file/${media.storageKey}`,
	};
	return siteLogoForImageField(ref);
}

export function normalizeHtmlishText(v: string | undefined): string | undefined {
	const t = v?.trim();
	if (!t) {
		return undefined;
	}
	return t;
}

export function looksLikeHtml(v: string | undefined): boolean {
	if (!v) return false;
	return /<[^>]+>/.test(v);
}

/**
 * Footer "logo" widget: In the admin, insert **Image** (one image) or paste a single media id as text.
 * Image blocks from the Portable Text editor store the id on `asset._ref`.
 */
export function extractFooterLogoMediaId(blocks: unknown[] | undefined | null): string | undefined {
	if (!Array.isArray(blocks)) {
		return undefined;
	}
	for (const b of blocks) {
		if (!b || typeof b !== "object") {
			continue;
		}
		const block = b as { _type?: string; asset?: { _ref?: string } };
		if (block._type === "image" && typeof block.asset?._ref === "string") {
			const id = block.asset._ref.trim();
			if (id) {
				return id;
			}
		}
	}
	// Legacy: one line = raw media id (or accidental alt-only — caller falls back to site logo)
	return normalizeHtmlishText(extractPlainText(blocks as any));
}
