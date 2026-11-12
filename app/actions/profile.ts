"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/username";
import { LINK_KINDS, type LinkKind, type Profile } from "@/types/profile";

export type ProfileFormData = Pick<Profile,
  "username" | "full_name" | "job_title" | "company" | "bio" |
  "photo_url" | "logo_url" | "theme_template" | "theme_color" | "language" |
  "services" | "is_published"
> & { links: Partial<Record<LinkKind, string>> };

export async function saveProfile(input: ProfileFormData) {
  const usernameError = validateUsername(input.username);
  if (usernameError) throw new Error(usernameError);
  if (!/^#[0-9A-Fa-f]{6}$/.test(input.theme_color)) throw new Error("Choose a valid six-digit theme color.");
  if (!["classic", "modern", "dark"].includes(input.theme_template)) throw new Error("Choose a valid template.");
  if (input.language !== null && !["ar", "fr", "en"].includes(input.language)) throw new Error("Choose a valid language.");
  if (!Array.isArray(input.services) || input.services.some((item) => typeof item !== "string")) {
    throw new Error("Services must be a list of text values.");
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Please sign in again to save your profile.");

  const profileUpdate = {
    username: input.username.trim().toLowerCase(),
    full_name: input.full_name.trim(),
    job_title: input.job_title.trim(),
    company: input.company.trim(),
    bio: input.bio.trim(),
    photo_url: input.photo_url || null,
    logo_url: input.logo_url || null,
    theme_template: input.theme_template,
    theme_color: input.theme_color,
    language: input.language,
    services: input.services.map((service) => service.trim()).filter(Boolean).slice(0, 20),
    is_published: input.is_published,
  };
  const { error: updateError } = await supabase.from("profiles").update(profileUpdate).eq("user_id", user.id);
  if (updateError) throw new Error(`Could not save profile: ${updateError.message}`);

  const submittedLinks = LINK_KINDS.flatMap((kind) => {
    const value = input.links[kind]?.trim();
    return value ? [{ user_id: user.id, kind, value, sort_order: LINK_KINDS.indexOf(kind) }] : [];
  });
  const { error: deleteError } = await supabase.from("links").delete().eq("user_id", user.id);
  if (deleteError) throw new Error(`Profile saved, but old links could not be replaced: ${deleteError.message}`);
  if (submittedLinks.length) {
    const { error: insertError } = await supabase.from("links").insert(submittedLinks);
    if (insertError) throw new Error(`Profile saved, but links could not be saved: ${insertError.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/${profileUpdate.username}`);
  return { username: profileUpdate.username };
}

export async function deleteGalleryItem(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to manage your gallery.");
  const { error } = await supabase.from("gallery_items").delete().eq("id", itemId).eq("user_id", user.id);
  if (error) throw new Error(`Could not remove gallery image: ${error.message}`);
  revalidatePath("/dashboard");
}
