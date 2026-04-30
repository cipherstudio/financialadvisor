import { definePlugin } from "emdash";
import { z } from "astro/zod";

import {
	assertHoneypot,
	consumeRateLimitSlot,
	HONEYPOT_FIELD,
	recaptchaMinScore,
	recaptchaSecret,
	verifyRecaptchaV3IfConfigured,
} from "../form-security.js";

const submitInput = z.object({
	full_name: z.string().min(1).max(200),
	phone: z.string().max(50).default(""),
	email: z.string().email().max(320),
	service_slug: z.string().min(1).max(200),
	service_name: z.string().min(1).max(500),
	preferred_date: z.string().min(1).max(50),
	preferred_time: z.string().min(1).max(200),
	message: z.string().max(20000).default(""),
	privacy_consent: z.boolean().refine((v) => v === true, "Privacy consent is required"),
	[HONEYPOT_FIELD]: z.string().max(500).optional().default(""),
	recaptcha_token: z.string().max(8000).optional().default(""),
});

type SubmitBody = z.infer<typeof submitInput>;

function parseNotificationEmails(raw: string | null | undefined): string[] {
	if (!raw?.trim()) return [];
	return raw
		.split(/[\n,;]+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function getNotificationEmailsFromPage(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	const value = (data as Record<string, unknown>).notification_emails;
	return typeof value === "string" ? value : null;
}

function getNotificationSubjectFromPage(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	const value = (data as Record<string, unknown>).notification_subject;
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function applyTemplate(
	template: string,
	vars: Record<string, string>,
): string {
	return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key: string) => {
		return vars[key] ?? "";
	});
}

/**
 * Book consultation form: saves to `book_consultation_submissions` and emails like contact form.
 */
export function createPlugin() {
	return definePlugin({
		id: "fadvisor-book-consultation",
		version: "1.0.0",
		capabilities: ["write:content", "email:send", "network:fetch"],
		allowedHosts: ["www.google.com"],
		admin: {},
		routes: {
			submit: {
				public: true,
				input: submitInput,
				handler: async (ctx) => {
					if (!ctx.content?.create) {
						throw new Error("Content write API unavailable");
					}
					if (!ctx.http) {
						throw new Error("HTTP client unavailable");
					}

					assertHoneypot(ctx.input as Record<string, unknown>);
					await consumeRateLimitSlot(ctx.kv, "fadvisor-book-consultation", ctx.requestMeta.ip);
					await verifyRecaptchaV3IfConfigured({
						http: ctx.http,
						secret: recaptchaSecret(),
						token: (ctx.input as SubmitBody).recaptcha_token,
						remoteIp: ctx.requestMeta.ip,
						minScore: recaptchaMinScore(),
						expectedAction: "book_consultation_submit",
						log: ctx.log,
					});

					const {
						full_name,
						phone,
						email,
						service_slug,
						service_name,
						preferred_date,
						preferred_time,
						message,
						privacy_consent,
					} = ctx.input as SubmitBody;
					const title = `${full_name} · ${email}`.slice(0, 200);

					const item = await ctx.content.create("book_consultation_submissions", {
						title,
						full_name,
						phone: phone || "",
						email,
						service_slug,
						service_name,
						preferred_date,
						preferred_time,
						message: message || "",
						privacy_consent,
					});

					const pageList = await ctx.content.list("book_consultation_page", {
						limit: 20,
					});
					const pageMain = pageList.items.find((entry) => entry.slug === "main");
					const pageEmailRaw = getNotificationEmailsFromPage(pageMain?.data);
					const pageSubject = getNotificationSubjectFromPage(pageMain?.data);
					const fallbackEmailsRaw = await ctx.kv.get<string>("settings:notification_emails");
					const recipients = parseNotificationEmails(pageEmailRaw ?? fallbackEmailsRaw);
					let emailSent = 0;
					const emailErrors: string[] = [];

					if (recipients.length > 0 && ctx.email) {
						const rows: Array<[string, string]> = [
							["รายการ", title],
							["ID", item.id],
							["ชื่อ", full_name],
							["โทร", phone || "—"],
							["อีเมล", email],
							["บริการ", `${service_name} (${service_slug})`],
							["วันที่สะดวก", preferred_date],
							["ช่วงเวลา", preferred_time],
							["ข้อความเพิ่มเติม", message || "—"],
						];
						const text = rows.map(([k, v]) => `${k} | ${v}`).join("\n");
						const htmlRows = rows
							.map(
								([k, v]) =>
									`<tr><td style="padding:8px 12px;border:1px solid #d1d5db;background:#f8fafc;font-weight:600;">${escapeHtml(k)}</td><td style="padding:8px 12px;border:1px solid #d1d5db;">${escapeHtml(v)}</td></tr>`,
							)
							.join("");
						const html = `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #d1d5db;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;"><tbody>${htmlRows}</tbody></table>`;
						const emailSubjectRaw = pageSubject
							? applyTemplate(pageSubject, {
									full_name,
									phone: phone || "",
									email,
									service_slug,
									service_name,
									preferred_date,
									preferred_time,
									message: message || "",
									id: item.id,
									title,
								})
							: `[Book consultation] ${title}`;
						const emailSubject = emailSubjectRaw.trim() || `[Book consultation] ${title}`;
						for (const to of recipients) {
							try {
								await ctx.email.send({
									to,
									subject: emailSubject,
									text,
									html,
								});
								emailSent++;
							} catch (e) {
								emailErrors.push(
									e instanceof Error ? e.message : String(e),
								);
								ctx.log.error("Book consultation: failed to send notification email", {
									to,
									error: e,
								});
							}
						}
					}

					return {
						success: true,
						id: item.id,
						notificationsSent: emailSent,
						emailSkipped: recipients.length === 0,
						emailErrors: emailErrors.length ? emailErrors : undefined,
					};
				},
			},
		},
	});
}
