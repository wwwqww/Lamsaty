export type Profile = {
  user_id: string;
  username: string;
  full_name: string;
  job_title: string;
  company: string;
  bio: string;
  photo_url: string | null;
  logo_url: string | null;
  theme_template: "classic" | "modern" | "dark";
  theme_color: string;
  language: "ar" | "fr" | "en" | null;
  services: string[];
  plan: "free" | "premium";
  is_published: boolean;
};

export const LINK_KINDS = [
  "call", "whatsapp", "email", "website", "location",
  "instagram", "facebook", "linkedin", "tiktok",
] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export type ProfileLink = { id?: string; user_id?: string; kind: LinkKind; value: string; sort_order: number };
export type GalleryItem = { id: string; user_id: string; image_url: string; alt_text: string; sort_order: number };
