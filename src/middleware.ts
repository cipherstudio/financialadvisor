import { defineMiddleware } from "astro:middleware";

/**
 * Preview URLs จาก EmDash `urlPattern` ใน seed (หลายคอลเลกชันใช้ `/_cms/...`):
 * - Astro **ไม่สร้าง route** ให้ `pages/_cms` (โฟลเดอร์ขึ้นต้นด้วย `_` ไม่ใช่หน้า — “Excluding pages”)
 * - ถ้าไม่ redirect ที่นี่ การกด Preview ในแอดมินจะได้ 404
 *
 * คู่ path กับหน้าสาธารณะจริง (เก็บ query `_preview` ฯลฯ)
 * — ลำดับสำคัญ: prefix ยาว (เช่น `...-messages`) ต้องมาก่อน prefix สั้นที่เป็นพ substring
 *
 * `/{collection}_page/{id}` — แพตเทิร์นค่าเริ่มต้นของ preview (`/{collection}/{id}`)
 */
const CMS_PREVIEW_REDIRECTS: { prefix: string; to: string }[] = [
	{ prefix: "/_cms/home", to: "/" },
	{ prefix: "/_cms/about", to: "/about-us" },
	{ prefix: "/_cms/our-advisors", to: "/our-advisors" },
	{ prefix: "/_cms/market-updates-page", to: "/market-updates" },
	{ prefix: "/_cms/testimonials-page", to: "/testimonials" },
	{ prefix: "/_cms/investment-articles", to: "/investment-articles" },
	{ prefix: "/_cms/faq", to: "/faq" },
	{ prefix: "/_cms/services-page", to: "/services" },
	{ prefix: "/_cms/contact-messages", to: "/contact" },
	{ prefix: "/_cms/contact", to: "/contact" },
	{ prefix: "/_cms/book-consultation-messages", to: "/book-consultation" },
	{ prefix: "/_cms/book-consultation", to: "/book-consultation" },
];

export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search } = context.url;

	for (const { prefix, to } of CMS_PREVIEW_REDIRECTS) {
		if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
			return context.redirect(`${to}${search}`, 307);
		}
	}

	/** URL เก่าแบบขีดล่าง `/market_updates/...` → ใช้ขีดกลางคู่กับ `urlPattern` ใน seed */
	if (pathname.startsWith("/market_updates/")) {
		const suffix = pathname.slice("/market_updates".length);
		return context.redirect(`/market-updates${suffix}${search}`, 307);
	}

	if (pathname === "/market_updates_page" || pathname.startsWith("/market_updates_page/")) {
		return context.redirect(`/market-updates${search}`, 307);
	}

	return next();
});
