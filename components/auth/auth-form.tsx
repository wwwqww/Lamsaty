"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateUsername } from "@/lib/username";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setMessage("");
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    if (mode === "signup") {
      const usernameError = validateUsername(username);
      if (usernameError) {
        setMessage(usernameError);
        return;
      }
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const result = mode === "signup"
        ? await supabase.auth.signUp({
          email, password,
          options: { data: { username, full_name: String(formData.get("full_name") ?? "").trim() } },
        })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      });
      if (error) throw error;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Google sign-in failed.");
    }
  }

  return (
    <div className="mt-7">
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Account action">
        {(["signup", "login"] as const).map((item) => (
          <button key={item} role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setMessage(""); }}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === item ? "bg-white shadow-sm" : "text-slate-500"}`}>
            {item === "signup" ? "Create account" : "Log in"}
          </button>
        ))}
      </div>
      <form action={(data) => void submit(data)} className="grid gap-4">
        {mode === "signup" && <>
          <label className="grid gap-1.5 text-sm font-medium">Name
            <input name="full_name" autoComplete="name" required className="rounded-xl border border-slate-200 px-3 py-3" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Username
            <input name="username" autoComplete="username" minLength={3} maxLength={30} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}" required className="rounded-xl border border-slate-200 px-3 py-3" />
          </label>
        </>}
        <label className="grid gap-1.5 text-sm font-medium">Email
          <input name="email" type="email" autoComplete="email" required className="rounded-xl border border-slate-200 px-3 py-3" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">Password
          <input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required className="rounded-xl border border-slate-200 px-3 py-3" />
        </label>
        <button disabled={busy} className="mt-1 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
      <button onClick={signInWithGoogle} className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold">Continue with Google</button>
      {message && <p role="status" className="mt-4 text-sm text-slate-700">{message}</p>}
    </div>
  );
}
