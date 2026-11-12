import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "Digital business card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("profiles").select("full_name,job_title,company,theme_color")
    .eq("username", username.toLowerCase()).eq("is_published", true).maybeSingle();
  if (error) throw new Error(`Could not load profile for Open Graph image: ${error.message}`);
  if (!profile) notFound();
  const name = profile.full_name || "Digital business card";
  const role = [profile.job_title, profile.company].filter(Boolean).join(" · ");
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#f7f8f5", color: "#17211f", borderTop: `28px solid ${profile.theme_color || "#0f766e"}` }}>
      <div style={{ fontSize: 64, fontWeight: 700 }}>{name}</div>
      <div style={{ marginTop: 24, fontSize: 34, color: "#64736f" }}>{role}</div>
      <div style={{ marginTop: 50, fontSize: 24, color: "#0f766e" }}>Lamsaty · NFC + QR</div>
    </div>,
    size,
  );
}
