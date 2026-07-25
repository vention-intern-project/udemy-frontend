function invalidResponse(context: string): TypeError {
  return new TypeError(`Invalid response ${context}`);
}

export function readRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw invalidResponse(context);
  return value as Record<string, unknown>;
}

export function readString(value: unknown, context: string): string {
  if (typeof value !== 'string') throw invalidResponse(context);
  return value;
}

export function readNullableString(value: unknown, context: string): string | null {
  return value === null ? null : readString(value, context);
}

export function readPositiveInteger(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw invalidResponse(context);
  return value;
}

export function readNonNegativeInteger(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw invalidResponse(context);
  return value;
}

export function readBoolean(value: unknown, context: string): boolean {
  if (typeof value !== 'boolean') throw invalidResponse(context);
  return value;
}
