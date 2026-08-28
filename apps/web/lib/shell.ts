const HIDDEN_PREFIXES = ["/admin", "/scan", "/auth"];

export function hideAppChrome(pathname: string): boolean {
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
