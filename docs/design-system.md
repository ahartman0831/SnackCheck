# SnackCheck design system

Phase 3 visual foundation, consumed by the Phase 4 public UI. Tokens and primitives stay here; route-level product behavior lives in the public pages.

## Brand

- **Name:** SnackCheck
- **Promise:** Scan it. Search it. Know before you bring it.
- **Historical name:** _Can I Bring This?_ — scaffold-only; do not use in current UI, metadata, or User-Agent strings.
- **Domain:** `NEXT_PUBLIC_APP_URL`. Development default is `http://localhost:3000`. No production domain is hard-coded.

The mark is a rounded indigo-to-cyan tile with scan corners and a packaged-food check. It is not a government seal, medical cross, or allergy-safety symbol.

## Type

- Geist for interface text (`--font-geist-sans`)
- Geist Mono for UPCs, hashes, technical metadata, and dates (`--font-geist-mono`)
- Tabular numbers on codes, percents, and timestamps

## Color tokens

Brand gradients (`--brand-from` / `--brand-to`) are for identity only. They never replace PASS, FAIL, or VERIFY colors.

### Light

| Token                           | Value                 | Use                               |
| ------------------------------- | --------------------- | --------------------------------- |
| `--background`                  | `#F4F6FB`             | Page                              |
| `--foreground`                  | `#0F172A`             | Text                              |
| `--surface`                     | `#FFFFFF`             | Cards                             |
| `--accent`                      | `#4F46E5`             | Brand actions                     |
| `--accent-strong`               | `#0891B2`             | Secondary brand / focus companion |
| `--on-accent`                   | `#FFFFFF`             | Text on filled accent actions     |
| `--pass` / `--pass-surface`     | `#047857` / `#D1FAE5` | PASS                              |
| `--fail` / `--fail-surface`     | `#B91C1C` / `#FEE2E2` | FAIL                              |
| `--verify` / `--verify-surface` | `#B45309` / `#FEF3C7` | VERIFY                            |

### Dark

| Token                           | Value                 | Use                           |
| ------------------------------- | --------------------- | ----------------------------- |
| `--background`                  | `#0B1220`             | Page                          |
| `--foreground`                  | `#F8FAFC`             | Text                          |
| `--surface`                     | `#111827`             | Cards                         |
| `--accent`                      | `#818CF8`             | Brand actions                 |
| `--accent-strong`               | `#22D3EE`             | Secondary brand / focus       |
| `--on-accent`                   | `#0B1220`             | Text on filled accent actions |
| `--pass` / `--pass-surface`     | `#6EE7B7` / `#064E3B` | PASS                          |
| `--fail` / `--fail-surface`     | `#FCA5A5` / `#7F1D1D` | FAIL                          |
| `--verify` / `--verify-surface` | `#FCD34D` / `#78350F` | VERIFY                        |

Status badges always include an icon and the words PASS, FAIL, or VERIFY.

## Shape and motion

- Radii 14–20px
- Minimum 44×44 touch targets
- Restrained borders and inner highlights
- Grid/noise only in brand areas (gallery header, future marketing slabs)
- Theme defaults to system preference, persists `snackcheck-theme` in `localStorage`, and applies a blocking script to avoid flash
- `prefers-reduced-motion` disables animation and scanner-style motion

## Shell

Desktop: wordmark, Search, What I can bring, Barcode (or Scan when the camera flag is on), Arizona rules, theme control.

Mobile: Home, Search, prominent Barcode/Scan, Browse, Rules. Hidden on `/scan/*`, `/admin/*`, and `/auth/*`. Safe-area insets and content padding keep the bar from covering page content.

Scan copy must follow existing feature flags. When `FEATURE_BARCODE_CAMERA` is off, the Barcode action opens manual entry only. When the flag is on, the same page can start a rear camera after a user gesture and still keeps typed entry. Do not advertise photo extraction until that flag is on.

## Gallery

`/dev/ui` shows every primitive and representative states. It returns 404 in production and is disallowed in `robots.ts`.
