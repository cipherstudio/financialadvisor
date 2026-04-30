/**
 * Regenerates patches/@emdash-cms__admin@0.6.0.patch from the unpatched
 * @emdash-cms/admin dist/index.js (pnpm store). Run after updating transforms.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const argPath = process.argv[2];
const VANILLA =
	argPath ||
	join(
		root,
		"node_modules/.pnpm/@emdash-cms+admin@0.6.0_@date-fns+tz@1.4.1_@floating-ui+dom@1.7.6_@tiptap+extension-col_d54ed1e4175943fe7f62dea5c096b375/node_modules/@emdash-cms/admin/dist/index.js"
	);

if (!existsSync(VANILLA)) {
	console.error("Missing vanilla dist/index.js. Pass path as argv[1] or keep unpatched admin in pnpm store.");
	process.exit(1);
}

let s = readFileSync(VANILLA, "utf8");

s = s.replace(
	"_key: obj._key || `item-${i}-${Date.now()}`",
	"_key: obj._key || `repeater-row-${i}`"
);
s = s.replace(
	'for (const sf of subFields) newItem[sf.slug] = sf.type === "boolean" ? false : sf.type === "number" || sf.type === "integer" ? null : "";',
	'for (const sf of subFields) newItem[sf.slug] = sf.type === "boolean" ? false : sf.type === "number" || sf.type === "integer" || sf.type === "image" || sf.type === "file" ? null : "";'
);

const imageCaseNeedle = `\t\t})] });
\t\tdefault: return /* @__PURE__ */ jsx(Input, {`;
if (
	s.includes(imageCaseNeedle) &&
	!s.includes("ImageFieldRenderer, {\n\t\t\tid: void 0,\n\t\t\tlabel: subField.label")
) {
	s = s.replace(
		imageCaseNeedle,
		`\t\t})] });
\t\tcase "image": {
\t\t\tconst imageValue = value != null && typeof value === "object" ? value : void 0;
\t\t\treturn /* @__PURE__ */ jsx(ImageFieldRenderer, {
\t\t\t\tid: void 0,
\t\t\t\tlabel: subField.label,
\t\t\t\tdescription: void 0,
\t\t\t\tvalue: imageValue,
\t\t\t\tonChange,
\t\t\t\trequired: subField.required
\t\t\t});
\t\t}
\t\tdefault: return /* @__PURE__ */ jsx(Input, {`
	);
}

s = s.replace(
	"\t\tsubFields: field.validation?.subFields ? field.validation.subFields : [],",
	"\t\tsubFields: field.validation?.subFields ? field.validation.subFields.map((sfd) => ({\n\t\t\t...sfd,\n\t\t\toptions: Array.isArray(sfd.options) ? sfd.options.join(\"\\n\") : typeof sfd.options === \"string\" ? sfd.options : sfd.type === \"select\" ? \"\" : sfd.options\n\t\t})) : [],"
);

s = s.replace(
	`if (formState.subFields.length > 0) validation.subFields = formState.subFields.map((sf) => ({
				slug: sf.slug,
				type: sf.type,
				label: sf.label,
				required: sf.required || void 0
			}));`,
	`if (formState.subFields.length > 0) validation.subFields = formState.subFields.map((sf) => {
				const row = { slug: sf.slug, type: sf.type, label: sf.label, required: sf.required || void 0 };
				if (sf.type === "select" && sf.options) {
					const subOpts = (typeof sf.options === "string" ? sf.options : String(sf.options || "")).split("\\n").map((o) => o.trim()).filter(Boolean);
					if (subOpts.length > 0) row.options = subOpts;
				}
				return row;
			});`
);

s = s.replace(
	`subFields: [...prev.subFields, {
												slug: "",
												type: "string",
												label: "",
												required: false
											}]`,
	`subFields: [...prev.subFields, {
												slug: "",
												type: "string",
												label: "",
												required: false,
												options: ""
											}]`
);

s = s.replace(
	`onChange: (e) => {
													const updated = [...formState.subFields];
													updated[i] = {
														...sf,
														type: e.target.value
													};
													setFormState((prev) => ({
														...prev,
														subFields: updated
													}));
												},
												children: [
													/* @__PURE__ */ jsx("option", {
														value: "string",`,
	`onChange: (e) => {
													const updated = [...formState.subFields];
													const t = e.target.value;
													updated[i] = { ...sf, type: t, options: t === "select" ? (sf.options ?? "") : void 0 };
													setFormState((prev) => ({
														...prev,
														subFields: updated
													}));
												},
												children: [
													/* @__PURE__ */ jsx("option", {
														value: "string",`
);

const inputAreaAfter = `											})]
										})]
									}), /* @__PURE__ */ jsx(Button, {
										variant: "ghost",`;
if (s.includes(inputAreaAfter) && !s.includes("const updated2 = [...formState.subFields]")) {
	s = s.replace(
		inputAreaAfter,
		`											})]
										}),
										sf.type === "select" && /* @__PURE__ */ jsx(InputArea, {
											label: _t({
												message: "Options (one per line)"
											}),
											value: typeof sf.options === "string" ? sf.options : "",
											onChange: (e) => {
												const updated2 = [...formState.subFields];
												updated2[i] = { ...sf, options: e.target.value };
												setFormState((prev) => ({
													...prev,
													subFields: updated2
												}));
											},
											rows: 4
										})]
									}), /* @__PURE__ */ jsx(Button, {
										variant: "ghost",`
	);
}

s = s.replace(
	`			}), /* @__PURE__ */ jsx(PortableTextEditor, {
				value: content,
				onChange: (value) => setContent(value),
				minimal: true,
				placeholder: "Write widget content...",`,
	`			}), /* @__PURE__ */ jsx(PortableTextEditor, {
				value: content,
				onChange: (value) => setContent(value),
				minimal: false,
				placeholder: "Write widget content...",`
);

if (s === readFileSync(VANILLA, "utf8")) {
	console.error("No changes applied; check that vanilla matches unpatched @emdash-cms/admin@0.6.0");
	process.exit(1);
}

const patchedPath = join(root, "node_modules/.tmp-admin-patched.js");
writeFileSync(patchedPath, s, "utf8");

let diff;
try {
	diff = execSync(`diff -u "${VANILLA}" "${patchedPath}"`, {
		encoding: "utf8",
		maxBuffer: 2 * 1024 * 1024
	});
} catch (e) {
	if (e?.status === 1 && e.stdout) diff = e.stdout.toString("utf8");
	else throw e;
}
const body = diff.split("\n").slice(2).join("\n");
	// No "diff --git" / "index" header: GNU patch 2.7 otherwise treats the
	// file as new and tries -R (pnpm applies patches with system `patch`, not `git apply`).
const out = ["--- a/dist/index.js", "+++ b/dist/index.js", body].join("\n");

const patchFile = join(root, "patches/@emdash-cms__admin@0.6.0.patch");
writeFileSync(patchFile, out, "utf8");
console.log("Wrote", patchFile);
unlinkSync(patchedPath);
