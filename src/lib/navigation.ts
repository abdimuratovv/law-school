/** Only existing protected student routes may be an auth return destination. */
export function safeStudentReturn(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  const path = value.split(/[?#]/)[0];
  return /^(?:\/|\/(?:tests|progress|mistakes|profile|getting-started)|\/tests\/[^/]+|\/exam\/[^/]+|\/results\/[^/]+(?:\/q\/\d+)?)$/.test(path) ? value : '/';
}
