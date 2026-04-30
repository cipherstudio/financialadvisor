/**
 * Read EmDash boolean fields — stored as true/false or 1/0 in SQLite.
 * When unset (null/undefined), returns defaultValue (typically show sections by default).
 */
export function cmsBool(value: unknown, defaultValue = true): boolean {
	if (value === true || value === 1) return true;
	if (value === false || value === 0) return false;
	if (value == null) return defaultValue;
	if (typeof value === "string") {
		const t = value.trim().toLowerCase();
		if (t === "0" || t === "false") return false;
		if (t === "1" || t === "true") return true;
	}
	return defaultValue;
}
