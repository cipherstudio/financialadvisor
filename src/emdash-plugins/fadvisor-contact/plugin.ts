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
	subject: z.string().min(1).max(500),
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

function getNotificationEmailsFromContactPage(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	const value = (data as Record<string, unknown>).notification_emails;
	return typeof value === "string" ? value : null;
}

function getNotificationSubjectFromContactPage(data: unknown): string | null {
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
 * Contact form: saves to `contact_submissions` and emails plugin recipients (if configured).
 */
export function createPlugin() {
	return definePlugin({
		id: "fadvisor-contact",
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
					await consumeRateLimitSlot(ctx.kv, "fadvisor-contact", ctx.requestMeta.ip);
					await verifyRecaptchaV3IfConfigured({
						http: ctx.http,
						secret: recaptchaSecret(),
						token: (ctx.input as SubmitBody).recaptcha_token,
						remoteIp: ctx.requestMeta.ip,
						minScore: recaptchaMinScore(),
						expectedAction: "contact_submit",
						log: ctx.log,
					});

					const { full_name, phone, email, subject, message, privacy_consent } =
						ctx.input as SubmitBody;
					const title = `${full_name} · ${email}`.slice(0, 200);

					const item = await ctx.content.create("contact_submissions", {
						title,
						full_name,
						phone: phone || "",
						email,
						subject,
						message: message || "",
						privacy_consent,
					});

					const pageList = await ctx.content.list("contact_page", { limit: 20 });
					const pageMain = pageList.items.find((entry) => entry.slug === "main");
					const pageEmailRaw = getNotificationEmailsFromContactPage(pageMain?.data);
					const pageSubject = getNotificationSubjectFromContactPage(pageMain?.data);
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
							["หัวข้อ", subject],
							["รายละเอียด", message || "—"],
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
									subject,
									message: message || "",
									id: item.id,
									title,
								})
							: `[Contact] ${title}`;
						const emailSubject = emailSubjectRaw.trim() || `[Contact] ${title}`;
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
								ctx.log.error("Contact form: failed to send notification email", {
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
