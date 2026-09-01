export function safeAdminDestination(value: string | null): string {
  if (!value || !/^\/admin(?:[/?#]|$)/.test(value) || value.startsWith("//")) {
    return "/admin";
  }

  try {
    const destination = new URL(value, "https://snackcheck.invalid");
    return destination.origin === "https://snackcheck.invalid" &&
      /^\/admin(?:\/|$)/.test(destination.pathname)
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : "/admin";
  } catch {
    return "/admin";
  }
}
