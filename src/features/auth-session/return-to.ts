const FALLBACK_ORIGIN = 'http://localhost';

export function sanitizeInternalReturnTo(
  candidate: string | null | undefined,
  origin = globalThis.location?.origin ?? FALLBACK_ORIGIN,
): string | null {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return null;
  }

  try {
    const url = new URL(candidate, origin);
    if (url.origin !== origin || url.username || url.password) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
