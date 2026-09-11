export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
