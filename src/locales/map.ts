import type { LocaleSettings } from "../config/types.js";
import { normalizeLocaleCode } from "./normalize.js";

function normalizeLocaleMap(
  localeSettings?: LocaleSettings,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(localeSettings?.map ?? {}).map(([sourceLocale, targetLocale]) => [
      normalizeLocaleCode(sourceLocale),
      normalizeLocaleCode(targetLocale),
    ]),
  );
}

export function mapLocaleCode(
  locale: string,
  localeSettings?: LocaleSettings,
): string {
  const normalizedLocale = normalizeLocaleCode(locale);
  const localeMap = normalizeLocaleMap(localeSettings);

  return localeMap[normalizedLocale] ?? normalizedLocale;
}

export function mapLocaleCodes(
  locales: string[],
  localeSettings?: LocaleSettings,
): string[] {
  return locales.map((locale) => mapLocaleCode(locale, localeSettings));
}
