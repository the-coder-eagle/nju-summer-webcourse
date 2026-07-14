/* Input validation helpers */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate that value is a non-negative integer.
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    !Number.isNaN(value)
  );
}

/**
 * Validate and trim comment content (BR-14: 1-500 chars after trim).
 */
export function validateCommentContent(
  content: unknown,
): { valid: true; value: string } | { valid: false; error: string } {
  if (typeof content !== "string") {
    return { valid: false, error: "评论内容必须是字符串" };
  }
  const trimmed = content.trim();
  if (trimmed.length < 1) {
    return { valid: false, error: "评论内容不能为空" };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: "评论内容不能超过 500 个字符" };
  }
  return { valid: true, value: trimmed };
}

/**
 * Validate league parameter.
 */
export function validateLeague(
  value: unknown,
): { valid: true; value: "worldcup" | "spl" } | { valid: false; error: string } {
  if (value !== "worldcup" && value !== "spl") {
    return {
      valid: false,
      error: '联赛参数必须是 "worldcup" 或 "spl"',
    };
  }
  return { valid: true, value };
}

/**
 * Validate score fields (BR-08: non-negative integers).
 */
export function validateScore(
  value: unknown,
  fieldName: string,
): { valid: true; value: number } | { valid: false; error: string } {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} 是必填字段` };
  }
  if (!isNonNegativeInteger(value)) {
    return { valid: false, error: `${fieldName} 必须是非负整数` };
  }
  return { valid: true, value: value as number };
}

/**
 * Parse pagination parameters.
 */
export function parsePagination(query: Record<string, unknown>): {
  page: number;
  pageSize: number;
} {
  const page = Math.max(1, parseInt(String(query.page), 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(String(query.pageSize), 10) || 20),
  );
  return { page, pageSize };
}
