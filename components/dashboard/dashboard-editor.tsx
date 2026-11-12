"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { saveProfile, deleteGalleryItem, type ProfileFormData } from "@/app/actions/profile";
import type { GalleryItem, LinkKind, Profile, ProfileLink } from "@/types/profile";

const linkFields: { kind: LinkKind; label: string; placeholder: string }[] = [
  { kind: "call", label: "Phone", placeholder: "+212 6 00 00 00 00" },
  { kind: "whatsapp", label: "WhatsApp", placeholder: "+212 6 00 00 00 00" },
  { kind: "email", label: "Email", placeholder: "hello@example.com" },
  { kind: "website", label: "Website", placeholder: "example.ma" },
  { kind: "location", label: "Location", placeholder: "Casablanca, Morocco" },
  { kind: "instagram", label: "Instagram", placeholder: "@username or URL" },
  { kind: "facebook", label: "Facebook", placeholder: "Page name or URL" },
  { kind: "linkedin", label: "LinkedIn", placeholder: "Profile URL or handle" },
  { kind: "tiktok", label: "TikTok", placeholder: "@username" },
];

type EventRow = { event_type: "page_view" | "contact_save" | "button_click"; target: string | null; occurred_at: string };
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600";

export function DashboardEditor({
  initialProfile, initialLinks, initialGallery, events, isAdmin,
}: { initialProfile: Profile; initialLinks: ProfileLink[]; initialGallery: GalleryItem[]; events: EventRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [links, setLinks] = useState<Record<LinkKind, string>>(() => Object.fromEntries(
    linkFields.map(({ kind }) => [kind, initialLinks.find((link) => link.kind === kind)?.value ?? ""]),
  ) as Record<LinkKind, string>);
  const [gallery, setGallery] = useState(initialGallery);
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState("");
  const [busyImage, setBusyImage] = useState(false);

  const dailyStats = useMemo(() => {
    const days: { date: string; visits: number; saves: number; clicks: number }[] = [];
    for (let offset = 29; offset >= 0; offset--) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = date.toISOString().slice(0, 10);
      const entries = events.filter((event) => event.occurred_at.slice(0, 10) === key);
      days.push({
        date: key,
        visits: entries.filter((event) => event.event_type === "page_view").length,
        saves: entries.filter((event) => event.event_type === "contact_save").length,
        clicks: entries.filter((event) => event.event_type === "button_click").length,
      });
    }
    return days;
  }, [events]);
  const totals = dailyStats.reduce((sum, day) => ({ visits: sum.visits + day.visits, saves: sum.saves + day.saves, clicks: sum.clicks + day.clicks }), { visits: 0, saves: 0, clicks: 0 });

  async function uploadImage(file: File, kind: "photo" | "logo" | "gallery") {
    setMessage("");
    setBusyImage(true);
    try {
      if (kind === "gallery" && profile.plan !== "premium") throw new Error("Gallery uploads require the Premium plan.");
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Your session expired. Please sign in again.");
      const blob = await compressImage(file, kind === "gallery" ? 1600 : 1000);
      const path = `${user.id}/${kind === "gallery" ? "gallery" : "profile"}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from("profile-media").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
      const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
      if (kind === "photo") setProfile((current) => ({ ...current, photo_url: data.publicUrl }));
      if (kind === "logo") setProfile((current) => ({ ...current, logo_url: data.publicUrl }));
      if (kind === "gallery") {
        const { data: inserted, error } = await supabase.from("gallery_items").insert({
          user_id: user.id, image_url: data.publicUrl, alt_text: file.name.replace(/\.[^.]+$/, ""), sort_order: gallery.length,
        }).select("id,user_id,image_url,alt_text,sort_order").single();
        if (error) throw new Error(`Could not add gallery image: ${error.message}`);
        setGallery((current) => [...current, inserted as GalleryItem]);
      }
      setMessage("Image uploaded. Save your profile to publish profile photo or logo changes.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Image upload failed.");
    } finally {
      setBusyImage(false);
    }
  }

  function submit() {
    setMessage("");
    const input: ProfileFormData = {
      username: profile.username, full_name: profile.full_name, job_title: profile.job_title,
      company: profile.company, bio: profile.bio, photo_url: profile.photo_url, logo_url: profile.logo_url,
      theme_template: profile.theme_template, theme_color: profile.theme_color, language: profile.language,
      services: profile.services, is_published: profile.is_published, links,
    };
    startSaving(async () => {
      try {
        const result = await saveProfile(input);
        setMessage("Profile saved.");
        setProfile((current) => ({ ...current, username: result.username }));
        router.refresh();
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : "Could not save profile.");
      }
    });
  }

  async function signOut() {
    const { error } = await createClient().auth.signOut();
    if (error) setMessage(`Could not sign out: ${error.message}`);
    else router.push("/login");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div><Link href="/" className="text-sm font-bold uppercase tracking-[.18em] text-teal-700">Lamsaty</Link><h1 className="mt-1 text-2xl font-bold">Your dashboard</h1></div>
          <div className="flex items-center gap-2">
            {isAdmin && <Link href="/admin" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Admin</Link>}
            <button onClick={signOut} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Sign out</button>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><h2 className="text-xl font-bold">Edit your card</h2><p className="mt-1 text-sm text-slate-500">Public URL: /{profile.username}</p></div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase text-teal-800">{profile.plan}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username"><input className={inputClass} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase() })} maxLength={30} /></Field>
              <Field label="Name"><input className={inputClass} value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></Field>
              <Field label="Job title"><input className={inputClass} value={profile.job_title} onChange={(e) => setProfile({ ...profile, job_title: e.target.value })} /></Field>
              <Field label="Company"><input className={inputClass} value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} /></Field>
              <Field label="Language">
                <select className={inputClass} value={profile.language ?? ""} onChange={(e) => setProfile({ ...profile, language: e.target.value ? e.target.value as Exclude<Profile["language"], null> : null })}>
                  <option value="">Browser default</option><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option>
                </select>
              </Field>
              <Field label="Template">
                <select className={inputClass} value={profile.theme_template} onChange={(e) => setProfile({ ...profile, theme_template: e.target.value as Profile["theme_template"] })}>
                  <option value="classic">Classic</option><option value="modern">Modern</option><option value="dark">Dark / premium</option>
                </select>
              </Field>
              <Field label="Theme color"><input type="color" className={`${inputClass} h-11 p-1`} value={profile.theme_color} onChange={(e) => setProfile({ ...profile, theme_color: e.target.value })} /></Field>
              <Field label="Short bio"><textarea className={`${inputClass} min-h-24`} maxLength={400} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} /></Field>
              <Field label="Profile photo (auto-compressed)"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busyImage} className="block w-full text-sm" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], "photo")} /></Field>
              <Field label="Company logo (auto-compressed)"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busyImage} className="block w-full text-sm" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], "logo")} /></Field>
            </div>

            <div className="mt-7 border-t border-slate-100 pt-6">
              <h3 className="mb-3 font-semibold">Contact and social links</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {linkFields.map(({ kind, label, placeholder }) => (
                  <Field key={kind} label={label}>
                    <input className={inputClass} placeholder={placeholder} value={links[kind]} onChange={(e) => setLinks({ ...links, [kind]: e.target.value })} />
                  </Field>
                ))}
              </div>
            </div>

            <div className="mt-7 border-t border-slate-100 pt-6">
              <label className="grid gap-1.5 text-sm font-semibold">Services (one per line)
                <textarea className={`${inputClass} min-h-24`} value={profile.services.join("\n")} disabled={profile.plan !== "premium"}
                  onChange={(e) => setProfile({ ...profile, services: e.target.value.split("\n") })} placeholder={profile.plan === "premium" ? "Consulting\nDesign" : "Available on Premium"} />
              </label>
            </div>

            <label className="mt-5 flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={profile.is_published} onChange={(e) => setProfile({ ...profile, is_published: e.target.checked })} className="h-4 w-4 accent-teal-700" />
              Publish my profile at /{profile.username}
            </label>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={submit} disabled={saving || busyImage} className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button>
              {profile.is_published && <Link href={`/${profile.username}`} target="_blank" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">View public page</Link>}
              {message && <span role="status" className="text-sm text-slate-600">{message}</span>}
            </div>
          </section>

          <aside className="grid gap-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">Live preview</h2>
              <div className={`profile-${profile.theme_template} rounded-2xl p-6 text-center`} dir={profile.language === "ar" ? "rtl" : "ltr"} style={{ borderTop: `4px solid ${profile.theme_color}` }}>
                {profile.photo_url ? <Image src={profile.photo_url} alt="" width={80} height={80} unoptimized className="mx-auto mb-3 h-20 w-20 rounded-full object-cover" /> : <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-black/10 text-2xl">{profile.full_name.slice(0, 1)}</div>}
                {profile.logo_url && <Image src={profile.logo_url} alt="" width={96} height={32} unoptimized className="mx-auto mb-2 max-h-8 max-w-24 object-contain" />}
                <h3 className="text-xl font-bold">{profile.full_name || "Your name"}</h3>
                <p className="mt-1 text-sm opacity-70">{[profile.job_title, profile.company].filter(Boolean).join(" · ") || "Job title · Company"}</p>
                <p className="mt-3 text-xs opacity-70">{profile.bio || "Your short bio appears here."}</p>
                <div className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: profile.theme_color }}>Save contact</div>
              </div>
            </section>

            {profile.plan === "premium" ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Last 30 days</h2><span className="text-xs text-slate-500">Stats</span></div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat label="Visits" value={totals.visits} /><Stat label="Contact saves" value={totals.saves} /><Stat label="Button clicks" value={totals.clicks} />
                </div>
                <div className="stats-bars mt-5 grid h-24 items-end gap-1" aria-label="Daily profile visits for the last 30 days">
                  {dailyStats.map((day) => <div key={day.date} title={`${day.date}: ${day.visits} visits`} className="min-h-1 rounded-t bg-teal-600" style={{ height: `${Math.max(4, day.visits / Math.max(1, ...dailyStats.map((item) => item.visits)) * 100)}%` }} />)}
                </div>
                <p className="mt-2 text-xs text-slate-500">Daily visits (most recent 30 days)</p>
              </section>
            ) : (
              <section className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
                <h2 className="font-bold">Free plan</h2><p className="mt-2 text-sm text-slate-700">Premium includes 30-day stats, a photo gallery, and no Lamsaty badge.</p>
              </section>
            )}

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Photo gallery</h2>
              {profile.plan === "premium" ? <>
                <label className="mt-3 block text-sm text-slate-600">Add images (auto-compressed)
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busyImage} className="mt-2 block w-full text-sm" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], "gallery")} />
                </label>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {gallery.map((item) => <div key={item.id} className="relative">
                    <Image src={item.image_url} alt={item.alt_text} width={300} height={300} unoptimized className="aspect-square w-full rounded-lg object-cover" />
                    <button aria-label={`Remove ${item.alt_text}`} onClick={async () => {
                      try { await deleteGalleryItem(item.id); setGallery((items) => items.filter((candidate) => candidate.id !== item.id)); }
                      catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not remove image."); }
                    }} className="absolute right-1 top-1 rounded-full bg-white px-2 py-1 text-xs font-bold text-red-700">×</button>
                  </div>)}
                </div>
              </> : <p className="mt-2 text-sm text-slate-600">Gallery uploads are available on Premium.</p>}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}{children}</label>;
}
function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>;
}
