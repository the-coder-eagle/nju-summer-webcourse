/**
 * Convert a date value from SQLite (or already-ISO string) to ISO 8601.
 *
 * SQLite CURRENT_TIMESTAMP produces "YYYY-MM-DD HH:MM:SS" (no T, no Z).
 * JavaScript new Date().toISOString() produces "YYYY-MM-DDTHH:mm:ss.sssZ".
 * This function is idempotent — passing an already-valid ISO string returns it unchanged.
 */
export function toISODate(val: string): string {
  // Already a full JS ISO string with milliseconds and Z suffix
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(val)) {
    return val;
  }
  // SQLite format: "YYYY-MM-DD HH:MM:SS" → convert
  const iso = val.includes("T") ? val : `${val.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${val}`);
  }
  return date.toISOString();
}
