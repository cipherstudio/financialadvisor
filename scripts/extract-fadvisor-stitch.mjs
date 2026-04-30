/**
 * Extracts <body> inner HTML from Stitch design HTML files, patches a[href="#"] by link text,
 * and writes fragment files for Astro pages.
 */
import * as cheerio from "cheerio";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STITCH = join(ROOT, "stitch_premium_thai_wealth_management");
const OUT = join(ROOT, "src/fadvisor-bodies");

/** @type {Record<string, string>} */
const ROUTE_BY_TEXT = {
	Home: "/",
	หน้าแรก: "/",
	Services: "/services",
	บริการ: "/services",
	Advisors: "/our-advisors",
	"Our Advisors": "/our-advisors",
	Insights: "/investment-articles",
	"Investment Articles": "/investment-articles",
	บทวิเคราะห์: "/investment-articles",
	Contact: "/contact",
	"Contact us": "/contact",
	"Contact Us": "/contact",
	ติดต่อเรา: "/contact",
	"เกี่ยวกับเรา": "/about-us",
	"About Us": "/about-us",
	"Book Consultation": "/book-consultation",
	"สำรวจบริการ": "/services",
	"Market Outlook": "/market-updates",
	"Market Updates": "/market-updates",
	Testimonials: "/testimonials",
	FAQ: "/faq",
	Faq: "/faq",
	"คำถามที่พบบ่อย": "/faq",
	"นัดหมายปรึกษา": "/book-consultation",
	"นัดหมายปรึกษาฟรี": "/book-consultation",
	"นัดหมายที่ปรึกษา": "/book-consultation",
	"จองคิวนัดปรึกษา": "/book-consultation",
	"จองคิวนัดปรึกษาฟรี": "/book-consultation",
	"จองคิวปรึกษา": "/book-consultation",
	ปรึกษาเรา: "/book-consultation",
	"ปรึกษาผู้เชี่ยวชาญ": "/book-consultation",
	"พอร์ตการลงทุน": "/our-advisors",
	"อ่านเพิ่มเติม": "/investment-articles",
	อ่านต่อ: "/investment-articles/detail",
	"Read more": "/investment-articles/detail",
	"View all": "/investment-articles",
	"View Profile": "/our-advisors",
	"กลับสู่รายการบทความ": "/investment-articles",
	"Back to articles": "/investment-articles",
	"Back to home": "/",
	"Back to Home": "/",
	"นโยบายความเป็นส่วนตัว": "/",
	"Privacy Policy": "/",
	"Terms of Service": "/",
	"Risk Warnings": "/",
	Whistleblowing: "/",
	บริหารความมั่งคั่ง: "/services",
	"วางแผนภาษี": "/services",
	"วิเคราะห์พอร์ต": "/our-advisors",
	"ข้อกำหนดการใช้งาน": "/",
	"ความปลอดภัย": "/",
	"Wealth Management": "/services",
	"Investment Strategy": "/investment-articles",
	"Private Equity": "/services",
	"Career Opportunities": "/contact",
	"Office Locations": "/contact",
	"Regulatory Disclosures": "/about-us",
	"ดูบริการทั้งหมด": "/services",
	"ดูบทความทั้งหมด": "/investment-articles",
	ดูรายงาน: "/market-updates",
	ดูรายงานเพิ่มเติม: "/market-updates",
	"ดูทีมที่ปรึกษาทั้งหมด": "/our-advisors",
	"อ่านบทความทั้งหมด": "/investment-articles",
	"แผนผังเว็บไซต์": "/",
	"วางแผนการเกษียณ": "/services",
	"บริหารพอร์ตการลงทุน": "/our-advisors",
	"ประกันชีวิตและสุขภาพ": "/services",
	Market: "/market-updates",
	"Compliance Disclosure": "/",
	"Whistleblowing Policy": "/",
	"Financial News": "/market-updates",
	"@FA_THAILAND": "https://twitter.com/",
};

const PAGES = [
	{
		slug: "home",
		file: "financialadvisorthailand_Home/code.html",
		route: "/",
	},
	{
		slug: "about-us",
		file: "financialadvisorthailand_About Us/code.html",
		route: "/about-us",
	},
	{
		slug: "services",
		file: "financialadvisorthailand_Services/code.html",
		route: "/services",
	},
	{
		slug: "investment-articles",
		file: "financialadvisorthailand_Investment Articles/code.html",
		route: "/investment-articles",
	},
	{
		slug: "investment-articles-detail",
		file: "financialadvisorthailand_Investment Articles detail/code.html",
		route: "/investment-articles/detail",
	},
	{
		slug: "market-updates",
		file: "financialadvisorthailand_Market Updates/code.html",
		route: "/market-updates",
	},
	{
		slug: "testimonials",
		file: "financialadvisorthailand_Testimonials/code.html",
		route: "/testimonials",
	},
	{
		slug: "faq",
		file: "financialadvisorthailand_Faq/code.html",
		route: "/faq",
	},
	{
		slug: "contact",
		file: "financialadvisorthailand_Contact us/code.html",
		route: "/contact",
	},
	{
		slug: "book-consultation",
		file: "financialadvisorthailand_Book Consultation/code.html",
		route: "/book-consultation",
	},
];

const SOCIAL = {
	facebook: "https://www.facebook.com/",
	linkedin: "https://www.linkedin.com/",
	line: "https://line.me/",
};

/**
 * @param {import('cheerio').CheerioAPI} $
 */
function patchHrefs($) {
	$('a[href="#"]').each((_, el) => {
		const $a = $(el);
		const text = $a.text().replace(/\s+/g, " ").trim();
		const title = ($a.attr("title") || "").toLowerCase();
		if (title === "facebook") {
			$a.attr("href", SOCIAL.facebook);
			return;
		}
		if (title === "linkedin") {
			$a.attr("href", SOCIAL.linkedin);
			return;
		}
		if (title === "line") {
			$a.attr("href", SOCIAL.line);
			return;
		}
		const icon = $a.find(".material-symbols-outlined").first().text().trim();
		if (icon === "public" || icon === "language") {
			$a.attr("href", "/");
			return;
		}
		if (icon === "mail") {
			$a.attr("href", "/contact");
			return;
		}
		if (icon === "call") {
			$a.attr("href", "/contact");
			return;
		}
		if (icon === "share" || icon === "social_leaderboard") {
			$a.attr("href", "/contact");
			return;
		}
		if (icon === "assured_workload") {
			$a.attr("href", "/about-us");
			return;
		}
		if (text.startsWith("อ่านต่อ")) {
			$a.attr("href", "/investment-articles/detail");
			return;
		}
		if (text.includes("ดูบริการทั้งหมด")) {
			$a.attr("href", "/services");
			return;
		}
		if (text.includes("ดูบทความทั้งหมด") || text.includes("อ่านบทความทั้งหมด")) {
			$a.attr("href", "/investment-articles");
			return;
		}
		if (text.includes("ดูทีมที่ปรึกษาทั้งหมด")) {
			$a.attr("href", "/our-advisors");
			return;
		}
		if (text.startsWith("#") && text.length > 1) {
			$a.attr("href", "/investment-articles");
			return;
		}
		const mapped = ROUTE_BY_TEXT[text];
		if (mapped) {
			$a.attr("href", mapped);
		}
	});
	$("nav a, header a").each((_, el) => {
		const $a = $(el);
		if ($a.attr("href") === "#" && /FinancialAdvisorThailand/i.test($a.text())) {
			$a.attr("href", "/");
		}
	});
}

function extractTitle(html) {
	const m = html.match(/<title>([^<]*)<\/title>/i);
	return m ? m[1].trim() : "FinancialAdvisorThailand";
}

mkdirSync(OUT, { recursive: true });

const manifest = [];

for (const page of PAGES) {
	const filePath = join(STITCH, page.file);
	const raw = readFileSync(filePath, "utf8");
	const $ = cheerio.load(raw);
	const body = $("body");
	const bodyClass = body.attr("class") || "";
	const title = extractTitle(raw);
	patchHrefs($);
	const inner = body.html() || "";
	const mainMatch = inner.match(/<main[\s\S]*?<\/main>/i);
	const outHtml = join(OUT, `${page.slug}.html`);
	const toWrite = mainMatch ? mainMatch[0] : inner;
	if (!mainMatch) {
		console.warn("No <main> in", page.file, "— writing full body inner");
	}
	writeFileSync(outHtml, `\n${toWrite}\n`, "utf8");
	manifest.push({
		slug: page.slug,
		route: page.route,
		title,
		bodyClass,
		fragment: `fadvisor-bodies/${page.slug}.html`,
	});
}

writeFileSync(
	join(OUT, "manifest.json"),
	JSON.stringify(manifest, null, 2),
	"utf8"
);
console.log("Wrote", manifest.length, "body fragments to", OUT);
