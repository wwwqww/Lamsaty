export type ProfileLanguage = "ar" | "fr" | "en";

export function preferredProfileLanguage(acceptLanguage: string | null | undefined): ProfileLanguage {
  for (const preference of (acceptLanguage ?? "").split(",")) {
    const language = preference.split(";")[0].trim().toLowerCase();
    if (language.startsWith("ar")) return "ar";
    if (language.startsWith("fr")) return "fr";
    if (language.startsWith("en")) return "en";
  }
  return "en";
}
