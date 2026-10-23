/** Relative app destinations only; never OAuth/API URLs or protocol-relative redirects. */
export function safeAppReturn(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//')) return '/';
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return '/'; }
  if (/[\\\u0000-\u0020\u007f]/.test(decoded) || decoded.startsWith('//')) return '/';
  const path = decoded.split(/[?#]/)[0];
  if (!/^(?:\/|\/(?:tests|progress|history|mistakes|profile|getting-started)|\/tests\/[\w-]+|\/exam\/[\w-]+|\/results\/[\w-]+(?:\/q\/\d+)?|\/admin(?:\/(?:bank|grading|students|analytics|import|builder|editor(?:\/[\w-]+)?))?)$/.test(path ?? '')) return '/';
  return value;
}
