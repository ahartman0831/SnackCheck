export const APP_NAME = "SnackCheck";
export const APP_SHORT_NAME = "SnackCheck";
export const APP_TAGLINE = "Scan it. Search it. Know before you bring it.";
export const APP_DESCRIPTION =
  "Arizona Healthy Schools Act ingredient checker. Search a packaged food and see PASS, FAIL, or VERIFY with sources and freshness.";

/** Historical product name used before the SnackCheck rebrand. Do not use as current branding. */
export const LEGACY_PRODUCT_NAME = "Can I Bring This?";

export const THEME_STORAGE_KEY = "snackcheck-theme";
export const THEME_COLOR_LIGHT = "#4F46E5";
export const THEME_COLOR_DARK = "#0B1220";
export const BACKGROUND_LIGHT = "#F4F6FB";
export const BACKGROUND_DARK = "#0B1220";

export function publicAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
