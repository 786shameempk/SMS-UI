# Translating SMS UI screens (i18n conventions)

The web app uses **i18next + react-i18next** (`src/i18n/`). Supported interface languages: English (`en`, default), Malayalam (`ml`), Hindi (`hi`), Tamil (`ta`), Arabic (`ar`, right-to-left).

## Keys are the English text

```tsx
import { useTranslation } from "react-i18next";

export default function FeesTab() {
  const { t } = useTranslation("fees");          // namespace = the feature folder name
  return <Button>{t("Record payment")}</Button>;  // key = the exact English text
}
```

- English is never stored in a file: a key with no translation renders the English text itself, so a screen is never left showing a raw key.
- `keySeparator` and `nsSeparator` are off, so dots and colons in English text are fine.
- Interpolation: `t("{{count}} students selected", { count })`, `t("Due on {{date}}", { date: formatDate(d) })`. Never build sentences by concatenating translated fragments; translate the whole sentence with placeholders (word order differs between languages).
- Plurals: prefer wording that works for any number ("Students: {{count}}"). If a real plural is needed, write both forms as separate keys and choose in code.
- `t` from a namespace falls back to `common` (shared words such as "Save", "Cancel", "Search…" live in `common`).

## What to translate

Everything a person reads: headings, descriptions, button text, labels, placeholders, `aria-label`s, `title`s, empty/error/loading states, table column headers, select option labels, toasts, validation messages shown in the UI, confirm dialogs.

Do **not** translate: data from the server (names, notes, messages), enum values sent to the API, route paths, CSS classes, ids, test ids, console logs, analytics names, units/codes like "INR", "QR", "SMS" when they are part of a product name.

Constants files (option lists with `label: "..."`) keep English labels; translate where they render: `t(option.label)`. Zod/validation messages defined at module scope: translate where displayed: `t(errors.name.message ?? "")`.

## Files

`src/i18n/locales/<lng>/<namespace>.json` for `ml`, `hi`, `ta`, `ar`, a flat object `{ "English text": "translation" }`. Loaded on demand when a screen first uses the namespace. Keep keys sorted roughly in screen order; every key used in code should appear in all four files.

Translations in this repository were drafted by an AI model (2026-10) and **need review by native speakers** before being presented as official. Keep wording plain and school-appropriate; keep placeholders like `{{count}}` unchanged; keep brand/product names (School Sphere, WhatsApp, Razorpay, QR) as they are.

## Dates, numbers and money

Use `formatDate`, `formatDateTime`, `formatRelativeDay`, `formatCurrency`, `formatNumber` from `@/utils/format`; they follow the interface language (Latin digits everywhere). Avoid `toLocaleDateString(undefined, …)` and hard-coded `"en-IN"` in new code.

## Right-to-left

Use logical Tailwind utilities: `ms-/me-` (not `ml-/mr-`), `ps-/pe-`, `start-/end-`, `text-start/text-end`, `border-s/border-e`, `rounded-s/rounded-e`. Directional icons (chevrons, arrows) are mirrored by CSS in `index.css`. For anything else that must flip, use the `rtl:` variant.

## Adding a language

Add it to `src/i18n/languages.ts` (code, native name, direction, locale, font) and to `AccountPreferencesHandler.Supported` in AuthService, then add `src/i18n/locales/<code>/*.json`. Untranslated screens show English until the files are filled in.
