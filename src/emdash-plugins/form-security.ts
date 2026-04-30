import { PluginRouteError } from "emdash";
import type { HttpAccess, KVAccess, LogAccess } from "emdash";

/** ชื่อฟิลด์ honeypot — ต้องตรงกับฟอร์มฝั่ง client */
export const HONEYPOT_FIELD = "company_fax" as const;

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX = 15;

function rateLimitKey(formId: string, ip: string, windowIndex: number): string {
	return `state:fadvisor-form-rl:${formId}:${ip}:w${windowIndex}`;
}

export function assertHoneypot(input: Record<string, unknown>): void {
	const raw = input[HONEYPOT_FIELD];
	if (raw == null) return;
	if (String(raw).trim() !== "") {
		throw PluginRouteError.badRequest("Invalid request");
	}
}

/**
 * จำกัดจำนวนครั้งต่อ IP ต่อช่วงเวลา (คงที่) ใช้ KV
 */
export async function consumeRateLimitSlot(
	kv: KVAccess,
	formId: string,
	ip: string | null | undefined,
	maxRequests: number = DEFAULT_MAX,
	windowMs: number = DEFAULT_WINDOW_MS,
): Promise<void> {
	const safeIp = (ip && String(ip).trim()) || "unknown";
	const windowIndex = Math.floor(Date.now() / windowMs);
	const key = rateLimitKey(formId, safeIp, windowIndex);
	const raw = await kv.get<unknown>(key);
	let count = 0;
	if (typeof raw === "number" && Number.isFinite(raw)) {
		count = raw;
	} else if (raw != null && typeof raw === "object" && "count" in raw) {
		const c = (raw as { count?: unknown }).count;
		if (typeof c === "number" && Number.isFinite(c)) count = c;
	}
	if (count >= maxRequests) {
		throw new PluginRouteError(
			"RATE_LIMITED",
			"Too many requests. Please try again later.",
			429,
		);
	}
	await kv.set(key, count + 1);
}

export type RecaptchaVerifyOptions = {
	http: HttpAccess;
	secret: string | undefined;
	token: string | undefined;
	remoteIp: string | null | undefined;
	minScore: number;
	expectedAction: string;
	log: LogAccess;
};

/**
 * ถ้าไม่ตั้ง RECAPTCHA_SECRET_KEY จะข้ามการตรวจ
 */
export async function verifyRecaptchaV3IfConfigured(
	opts: RecaptchaVerifyOptions,
): Promise<void> {
	const secret = opts.secret?.trim();
	if (!secret) return;

	const token = opts.token?.trim();
	if (!token) {
		throw PluginRouteError.badRequest("Verification required");
	}

	const body = new URLSearchParams();
	body.set("secret", secret);
	body.set("response", token);
	const ip = opts.remoteIp?.trim();
	if (ip) body.set("remoteip", ip);

	let res: Response;
	try {
		res = await opts.http.fetch("https://www.google.com/recaptcha/api/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});
	} catch (e) {
		opts.log.error("reCAPTCHA: siteverify request failed", { error: e });
		throw PluginRouteError.badRequest("Verification failed");
	}

	const json = (await res.json().catch(() => ({}))) as {
		success?: boolean;
		score?: number;
		action?: string;
		"error-codes"?: string[];
	};

	if (!json.success) {
		opts.log.warn("reCAPTCHA: siteverify rejected", {
			errors: json["error-codes"],
		});
		throw PluginRouteError.badRequest("Verification failed");
	}

	if (json.action && json.action !== opts.expectedAction) {
		opts.log.warn("reCAPTCHA: action mismatch", {
			expected: opts.expectedAction,
			got: json.action,
		});
		throw PluginRouteError.badRequest("Verification failed");
	}

	const score = typeof json.score === "number" ? json.score : 0;
	if (score < opts.minScore) {
		opts.log.warn("reCAPTCHA: score below threshold", {
			score,
			minScore: opts.minScore,
		});
		throw PluginRouteError.badRequest("Verification failed");
	}
}

export function recaptchaSecret(): string | undefined {
	return (
		(typeof process !== "undefined" && process.env.RECAPTCHA_SECRET_KEY) ||
		(typeof import.meta !== "undefined" &&
			import.meta.env &&
			(import.meta.env as { RECAPTCHA_SECRET_KEY?: string }).RECAPTCHA_SECRET_KEY)
	)?.trim();
}

export function recaptchaMinScore(): number {
	const raw =
		(typeof process !== "undefined" && process.env.RECAPTCHA_MIN_SCORE) ||
		(typeof import.meta !== "undefined" &&
			import.meta.env &&
			(import.meta.env as { RECAPTCHA_MIN_SCORE?: string }).RECAPTCHA_MIN_SCORE);
	const n = raw != null && String(raw).trim() !== "" ? Number(raw) : NaN;
	return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
}
