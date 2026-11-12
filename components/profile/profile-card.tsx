"use client";

import {
  Facebook, Globe, Instagram, Linkedin, Mail, MapPin, MessageCircle,
  Music2, Phone, QrCode, Contact, Download,
} from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import { recordProfileEvent } from "@/app/actions/events";
import type { GalleryItem, LinkKind, Profile, ProfileLink } from "@/types/profile";
import type { ProfileLanguage } from "@/lib/language";

const translations = {
  en: { save: "Save contact", services: "Services", gallery: "Gallery", powered: "Powered by Lamsaty", qr: "Show QR code", download: "Download QR", error: "Could not create the contact file. Please try again.", links: { call: "Call", whatsapp: "WhatsApp", email: "Email", website: "Website", location: "Location", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok" } },
  fr: { save: "Enregistrer le contact", services: "Services", gallery: "Galerie", powered: "Propulsé par Lamsaty", qr: "Afficher le QR code", download: "Télécharger le QR", error: "Impossible de créer le contact. Veuillez réessayer.", links: { call: "Appeler", whatsapp: "WhatsApp", email: "E-mail", website: "Site web", location: "Adresse", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok" } },
  ar: { save: "حفظ جهة الاتصال", services: "الخدمات", gallery: "المعرض", powered: "مدعوم من Lamsaty", qr: "عرض رمز QR", download: "تنزيل رمز QR", error: "تعذر إنشاء ملف جهة الاتصال. حاول مرة أخرى.", links: { call: "اتصال", whatsapp: "واتساب", email: "البريد الإلكتروني", website: "الموقع الإلكتروني", location: "الموقع", instagram: "إنستغرام", facebook: "فيسبوك", linkedin: "لينكد إن", tiktok: "تيك توك" } },
} as const;

const icons = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  website: Globe,
  location: MapPin,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
} satisfies Record<LinkKind, typeof Phone>;

function hrefFor(kind: LinkKind, value: string) {
  const trimmed = value.trim();
  switch (kind) {
    case "call": return `tel:${trimmed}`;
    case "email": return `mailto:${trimmed}`;
    case "whatsapp": {
      const digits = trimmed.replace(/\D/g, "");
      return `https://wa.me/${digits}`;
    }
    case "location": return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
    case "instagram": return `https://instagram.com/${trimmed.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`;
    case "facebook": return trimmed.startsWith("http") ? trimmed : `https://facebook.com/${trimmed}`;
    case "linkedin": return trimmed.startsWith("http") ? trimmed : `https://linkedin.com/in/${trimmed}`;
    case "tiktok": return `https://tiktok.com/@${trimmed.replace(/^@/, "")}`;
    case "website": return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function foldVCardLine(line: string) {
  const chunks: string[] = [];
  let chunk = "";
  let byteLength = 0;
  const encoder = new TextEncoder();
  for (const character of line) {
    const characterBytes = encoder.encode(character).length;
    if (byteLength + characterBytes > 75) {
      chunks.push(chunk);
      chunk = ` ${character}`;
      byteLength = characterBytes + 1;
    } else {
      chunk += character;
      byteLength += characterBytes;
    }
  }
  chunks.push(chunk);
  return chunks.join("\r\n");
}

export function ProfileCard({
  profile, links, gallery, defaultLanguage,
}: { profile: Profile; links: ProfileLink[]; gallery: GalleryItem[]; defaultLanguage: ProfileLanguage }) {
  const [language, setLanguage] = useState<ProfileLanguage>(profile.language ?? defaultLanguage);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [error, setError] = useState("");
  const pageViewTracked = useRef(false);
  const text = translations[language];
  const sortedLinks = useMemo(() => [...links].sort((a, b) => a.sort_order - b.sort_order), [links]);

  useEffect(() => {
    if (pageViewTracked.current) return;
    pageViewTracked.current = true;
    void recordProfileEvent(profile.username, "page_view", deviceType())
      .catch((reason: unknown) => console.error("Could not record profile view.", reason));
  }, [profile.username]);

  useEffect(() => {
    const url = `${window.location.origin}/${profile.username}`;
    void QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: "#10211e", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setError("QR code could not be generated."));
  }, [profile.username]);

  async function saveContact() {
    setError("");
    try {
      let photo = "";
      if (profile.photo_url) {
        const response = await fetch(profile.photo_url);
        if (!response.ok) throw new Error("Profile photo could not be loaded.");
        const blob = await response.blob();
        const image = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Photo conversion is unavailable.");
        context.drawImage(image, 0, 0);
        image.close();
        const jpeg = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Photo conversion failed.")), "image/jpeg", 0.9);
        });
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid photo data."));
          reader.onerror = () => reject(new Error("Photo conversion failed."));
          reader.readAsDataURL(jpeg);
        });
        photo = `PHOTO;ENCODING=b;TYPE=JPEG:${dataUrl.split(",")[1]}`;
      }

      const value = (kind: LinkKind) => links.find((link) => link.kind === kind)?.value ?? "";
      const lines = [
        "BEGIN:VCARD", "VERSION:3.0",
        `FN:${escapeVCard(profile.full_name)}`,
        `ORG:${escapeVCard(profile.company)}`,
        `TITLE:${escapeVCard(profile.job_title)}`,
        `TEL;TYPE=CELL:${escapeVCard(value("call"))}`,
        `EMAIL:${escapeVCard(value("email"))}`,
        `URL:${escapeVCard(value("website"))}`,
        photo, "END:VCARD",
      ].filter(Boolean);
      const blob = new Blob([lines.map(foldVCardLine).join("\r\n")], { type: "text/vcard;charset=utf-8" });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${profile.username}.vcf`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      void recordProfileEvent(profile.username, "contact_save", deviceType())
        .catch((reason: unknown) => console.error("Could not record contact save.", reason));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.error);
    }
  }

  return (
    <main className={`profile-${profile.theme_template} min-h-screen`} dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pb-8 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(["ar", "fr", "en"] as const).map((locale) => (
              <button key={locale} onClick={() => setLanguage(locale)} aria-pressed={language === locale}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${language === locale ? "bg-black/10" : "opacity-60 hover:opacity-100"}`}>
                {locale.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => setShowQr((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-current/15 px-3 py-2 text-sm" aria-expanded={showQr}>
            <QrCode size={17} /> {text.qr}
          </button>
        </div>

        <section className={`rounded-[2rem] p-7 text-center ${profile.theme_template === "dark" ? "bg-white/5" : "bg-white shadow-sm"} ${profile.theme_template === "modern" ? "border-t-4" : ""}`}
          style={{ borderColor: profile.theme_color }}>
          {profile.photo_url ? (
            <Image src={profile.photo_url} alt={`${profile.full_name} profile`} width={112} height={112} unoptimized priority className="mx-auto mb-4 h-28 w-28 rounded-full object-cover" />
          ) : (
            <div className="mx-auto mb-4 grid h-28 w-28 place-items-center rounded-full bg-black/5 text-3xl font-semibold" aria-label="Profile photo placeholder">
              {profile.full_name.slice(0, 1).toUpperCase() || "L"}
            </div>
          )}
          {profile.logo_url && <Image src={profile.logo_url} alt={`${profile.company} logo`} width={144} height={48} unoptimized className="mx-auto mb-4 max-h-12 max-w-36 object-contain" />}
          <h1 className="text-3xl font-bold tracking-tight">{profile.full_name}</h1>
          {(profile.job_title || profile.company) && <p className="muted mt-2 text-base opacity-70">{[profile.job_title, profile.company].filter(Boolean).join(" · ")}</p>}
          {profile.bio && <p className="muted mx-auto mt-4 max-w-md text-sm leading-6 opacity-80">{profile.bio}</p>}

          <button onClick={saveContact} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white shadow-sm"
            style={{ backgroundColor: profile.theme_color }}>
            <Contact size={19} /> {text.save}
          </button>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

          {showQr && qrDataUrl && (
            <div className="mt-5 rounded-2xl bg-white p-4 text-slate-900">
              <Image src={qrDataUrl} alt={`QR code for ${profile.full_name}'s digital card`} width={192} height={192} unoptimized className="mx-auto h-48 w-48" />
              <a href={qrDataUrl} download={`${profile.username}-qr.png`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                <Download size={16} /> {text.download}
              </a>
            </div>
          )}
        </section>

        <nav aria-label="Contact and social links" className="mt-4 grid grid-cols-2 gap-3">
          {sortedLinks.map((link) => {
            const Icon = icons[link.kind];
            const action = ["call", "whatsapp", "email", "website", "location"].includes(link.kind);
            return (
              <a key={link.kind} href={hrefFor(link.kind, link.value)} target={link.kind === "call" || link.kind === "email" ? undefined : "_blank"}
                rel={link.kind === "call" || link.kind === "email" ? undefined : "noreferrer"}
                onClick={() => void recordProfileEvent(profile.username, "button_click", deviceType(), link.kind)
                  .catch((reason: unknown) => console.error("Could not record profile link click.", reason))}
                className={`flex min-h-14 items-center gap-3 rounded-xl px-4 ${action ? "bg-white shadow-sm" : "border border-current/10"} ${profile.theme_template === "dark" ? "bg-white/5" : ""}`}>
                <Icon size={20} style={{ color: profile.theme_color }} aria-hidden="true" />
                <span className="text-sm font-semibold">{text.links[link.kind]}</span>
              </a>
            );
          })}
        </nav>

        {profile.plan === "premium" && profile.services.length > 0 && (
          <section className="mt-7">
            <h2 className="mb-3 text-lg font-bold">{text.services}</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {profile.services.map((service, index) => <li key={`${service}-${index}`} className="rounded-xl bg-black/[0.04] px-4 py-3 text-sm">{service}</li>)}
            </ul>
          </section>
        )}

        {profile.plan === "premium" && gallery.length > 0 && (
          <section className="mt-7">
            <h2 className="mb-3 text-lg font-bold">{text.gallery}</h2>
            <div className="grid grid-cols-2 gap-3">
              {gallery.map((item) => <Image key={item.id} src={item.image_url} alt={item.alt_text || text.gallery} width={600} height={600} unoptimized className="aspect-square w-full rounded-xl object-cover" />)}
            </div>
          </section>
        )}
        {profile.plan === "free" && <p className="muted mt-auto pt-8 text-center text-xs opacity-60">{text.powered}</p>}
      </div>
    </main>
  );
}
