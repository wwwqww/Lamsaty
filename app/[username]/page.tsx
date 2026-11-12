import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { preferredProfileLanguage } from "@/lib/language";
import { ProfileCard } from "@/components/profile/profile-card";
import type { GalleryItem, Profile, ProfileLink } from "@/types/profile";

export const dynamic = "force-dynamic";

const getProfile = cache(async (username: string) => {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  if (!profile) return null;

  const [linkResult, galleryResult] = await Promise.all([
    supabase.from("links").select("id,user_id,kind,value,sort_order").eq("user_id", profile.user_id).order("sort_order"),
    profile.plan === "premium"
      ? supabase.from("gallery_items").select("id,user_id,image_url,alt_text,sort_order").eq("user_id", profile.user_id).order("sort_order")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (linkResult.error) throw new Error(`Could not load profile links: ${linkResult.error.message}`);
  if (galleryResult.error) throw new Error(`Could not load profile gallery: ${galleryResult.error.message}`);
  return {
    profile: profile as Profile,
    links: (linkResult.data ?? []) as ProfileLink[],
    gallery: (galleryResult.data ?? []) as GalleryItem[],
  };
});

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const result = await getProfile(username);
  if (!result) return { title: "Profile not found" };
  const { profile } = result;
  const description = profile.bio || [profile.job_title, profile.company].filter(Boolean).join(" — ");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const image = `${siteUrl}/${profile.username}/opengraph-image`;
  return {
    title: `${profile.full_name}${profile.company ? ` — ${profile.company}` : ""}`,
    description: description.slice(0, 160),
    openGraph: { title: profile.full_name, description, images: [image], type: "profile", url: `${siteUrl}/${profile.username}` },
    twitter: { card: "summary_large_image", title: profile.full_name, description, images: [image] },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const result = await getProfile(username);
  if (!result) notFound();
  const requestHeaders = await headers();
  const defaultLanguage = preferredProfileLanguage(requestHeaders.get("accept-language"));
  return <ProfileCard {...result} defaultLanguage={defaultLanguage} />;
}
