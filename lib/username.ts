export const RESERVED_USERNAMES = new Set([
  "admin", "api", "dashboard", "auth", "login", "signup", "register",
  "settings", "help", "about", "contact", "privacy", "terms", "_next",
  "favicon", "robots", "sitemap",
]);

export function validateUsername(username: string): string | null {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(normalized)) {
    return "Use 3–30 lowercase letters, numbers, hyphens, or underscores.";
  }
  if (RESERVED_USERNAMES.has(normalized)) return "That username is reserved.";
  return null;
}
