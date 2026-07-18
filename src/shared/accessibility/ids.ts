export function joinIds(
  ...ids: Array<string | null | undefined | false>
): string | undefined {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}
