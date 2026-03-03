/**
 * Utility to safely resolve a designation value to a display string.
 *
 * MongoDB may return `designation` as either:
 *  - a plain string (e.g. "Senior Developer")
 *  - a populated object (e.g. { _id, designation, departmentId, status, ... })
 *
 * This helper normalises both cases to a renderable string.
 */
export function resolveDesignation(
  value: unknown,
  fallback: string = ''
): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    // Populated designation document – pick the name field
    if (typeof obj.designation === 'string') return obj.designation;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.title === 'string') return obj.title;
  }
  return fallback;
}
