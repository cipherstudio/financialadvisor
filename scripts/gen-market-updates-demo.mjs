/**
 * สร้าง JSON array ของ content.market_updates ตัวอย่าง (stdout)
 * ใช้: node scripts/gen-market-updates-demo.mjs >> /tmp/mu.json
 */
const START = "2026-03-29";
const END = "2026-04-29";

const MONTH_TH = [
	"",
	"มกราคม",
	"กุมภาพันธ์",
	"มีนาคม",
	"เมษายน",
	"พฤษภาคม",
	"มิถุนายน",
	"กรกฎาคม",
	"สิงหาคม",
	"กันยายน",
	"ตุลาคม",
	"พฤศจิกายน",
	"ธันวาคม",
];

function* eachIsoDay(fromStr, toStr) {
	let cur = new Date(`${fromStr}T12:00:00.000Z`);
	const end = new Date(`${toStr}T12:00:00.000Z`);
	while (cur <= end) {
		yield cur.toISOString().slice(0, 10);
		cur.setUTCDate(cur.getUTCDate() + 1);
	}
}

function hash(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
	return Math.abs(h);
}

function fmtThaiTitle(iso) {
	const [y, m, d] = iso.split("-").map(Number);
	const be = y + 543;
	return `รายงานภาวะตลาด — ${d} ${MONTH_TH[m]} ${be}`;
}

function summaryLine(iso, idx) {
	const moods = [
		"ตลาดหุ้นไทยปรับตัวในกรอบแคบ โฟกัสกลุ่มการลงทุนและค้าปลีกเป็นหลัก",
		"ภาวะตลาดเคลื่อนไหวสอดคล้องภูมิภาค กลุ่มเทคโนโลยีและพลังงานเป็นตัวขับ",
		"นักลงทุนจับตาปัจจัยต่างประเทศ ขณะที่สภาพคล่องในประเทศยังอยู่ในระดับที่เหมาะสม",
		"การซื้อขายบางตัวหุ้นในกลุ่มแบงก์และไฟแนนซ์มีแรงสนับสนุนจากปันผลเชิงคาดการณ์",
	];
	return moods[idx % moods.length];
}

function buildEntry(iso, seq) {
	const h = hash(iso);
	const setBase = 1420 + (h % 120) + (seq % 7) * 0.05;
	const sp = 5600 + (h % 400);
	const nq = 17800 + (h % 900);
	const gold = 2650 + (h % 150);
	const oil = 68 + (h % 8);
	const signs = ["+", "+", "+", "-", "+", "-", "+"];
	const ch = (i, mag) => `${signs[(h + i) % signs.length]}${(h >> i) % mag}.${(h >> (i + 3)) % 10}%`;

	const sentiments = ["Bullish", "Neutral", "Cautious"];
	const market_sentiment = sentiments[h % 3];

	const id = `01jkdemomu${iso.replace(/-/g, "")}`;

	return {
		id,
		slug: iso,
		status: "published",
		data: {
			market_calendar_day: iso,
			title: fmtThaiTitle(iso),
			market_sentiment,
			market_summary: [
				{
					_type: "block",
					style: "normal",
					children: [
						{
							_type: "span",
							text: `${summaryLine(iso, seq)} ณ วันที่อ้างอิงรายงานนี้ (${iso})`,
						},
					],
				},
			],
			indices_data: [
				{ name: "SET Index", value: Math.round(setBase * 100) / 100, change: ch(0, 3) },
				{ name: "S&P 500", value: Math.round(sp * 100) / 100, change: ch(1, 2) },
				{ name: "NASDAQ", value: Math.round(nq * 100) / 100, change: ch(2, 3) },
				{ name: "Gold (Spot)", value: Math.round(gold * 100) / 100, change: ch(3, 2) },
				{ name: "Crude Oil", value: Math.round(oil * 100) / 100, change: ch(4, 2) },
			],
			top_gainers: [
				{
					symbol: "DELTA",
					company_name: "DELTA ELECTRONICS (THAILAND)",
					price: (128 + (h % 5) * 0.25).toFixed(2),
					change: `+${(1 + (h % 3)).toFixed(2)}%`,
				},
				{
					symbol: "GULF",
					company_name: "GULF ENERGY DEVELOPMENT",
					price: (64 + (h % 4) * 0.5).toFixed(2),
					change: `+${(0.5 + (h % 4) * 0.3).toFixed(2)}%`,
				},
				{
					symbol: "CPALL",
					company_name: "CP ALL PUBLIC COMPANY",
					price: (63 + (h % 6) * 0.25).toFixed(2),
					change: `+${(0.8 + (h % 5) * 0.2).toFixed(2)}%`,
				},
				{
					symbol: "KTC",
					company_name: "KRUNGTHAI CARD",
					price: (47 + (h % 5) * 0.5).toFixed(2),
					change: `+${(0.5 + (h % 4) * 0.2).toFixed(2)}%`,
				},
			],
			top_losers: [
				{
					symbol: "PTT",
					company_name: "PTT PUBLIC COMPANY",
					price: (33 + (h % 4) * 0.25).toFixed(2),
					change: `-${(0.5 + (h % 4) * 0.3).toFixed(2)}%`,
				},
				{
					symbol: "ADVANC",
					company_name: "ADVANCED INFO SERVICE",
					price: (268 + (h % 8)).toFixed(2),
					change: `-${(0.4 + (h % 5) * 0.2).toFixed(2)}%`,
				},
				{
					symbol: "SCB",
					company_name: "SCB X PUBLIC COMPANY",
					price: (112 + (h % 5) * 0.5).toFixed(2),
					change: `-${(0.3 + (h % 4) * 0.15).toFixed(2)}%`,
				},
				{
					symbol: "BANPU",
					company_name: "BANPU PUBLIC COMPANY",
					price: (6 + (h % 5) * 0.15).toFixed(2),
					change: `-${(0.4 + (h % 3) * 0.2).toFixed(2)}%`,
				},
			],
		},
	};
}

const days = [...eachIsoDay(START, END)];
const entries = days.map((iso, i) => buildEntry(iso, i));
process.stdout.write(JSON.stringify(entries, null, "\t"));
