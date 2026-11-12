import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardEditor } from "@/components/dashboard/dashboard-editor";
import type { GalleryItem, Profile, ProfileLink } from "@/types/profile";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (profileError) throw new Error(`Could not load your profile: ${profileError.message}`);
  if (!profile) throw new Error("Your profile could not be found. Please sign out and sign in again.");

  const [linksResult, galleryResult] = await Promise.all([
    supabase.from("links").select("id,user_id,kind,value,sort_order").eq("user_id", user.id).order("sort_order"),
    supabase.from("gallery_items").select("id,user_id,image_url,alt_text,sort_order").eq("user_id", user.id).order("sort_order"),
  ]);
  if (linksResult.error) throw new Error(`Could not load profile links: ${linksResult.error.message}`);
  if (galleryResult.error) throw new Error(`Could not load gallery: ${galleryResult.error.message}`);

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const { data: events, error: eventsError } = profile.plan === "premium"
    ? await supabase.from("visits").select("event_type,target,occurred_at").eq("user_id", user.id).gte("occurred_at", since.toISOString()).order("occurred_at")
    : { data: [], error: null };
  if (eventsError) throw new Error(`Could not load stats: ${eventsError.message}`);

  return <DashboardEditor
    initialProfile={profile as Profile}
    initialLinks={(linksResult.data ?? []) as ProfileLink[]}
    initialGallery={(galleryResult.data ?? []) as GalleryItem[]}
    events={events ?? []}
    isAdmin={user.app_metadata?.role === "admin"}
  />;
}
