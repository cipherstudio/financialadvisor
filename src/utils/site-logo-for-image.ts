import type { MediaValue, SiteSettings } from "emdash";

type LogoWithUrl = NonNullable<SiteSettings["logo"]> & { url?: string };

/**
 * Site settings logo is resolved to `{ mediaId, alt, url? }` where `url` is the
 * public file path. The EmDash <Image> component builds `src` from `img.src` or
 * `img.id` for MediaValue — it does not read `url` on the object — so we return
 * the string URL for <Image image={...}> when the resolver added it.
 */
export function siteLogoForImage(
	logo: SiteSettings["logo"] | undefined
): string | MediaValue | null {
	if (!logo) {
		return null;
	}
	const o = logo as LogoWithUrl;
	if (typeof o.url === "string" && o.url.length > 0) {
		return o.url;
	}
	return o as unknown as MediaValue;
}
