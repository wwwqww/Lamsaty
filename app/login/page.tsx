import { AuthForm } from "@/components/auth/auth-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-9">
        <Link href="/" className="text-sm font-bold uppercase tracking-[.2em] text-teal-700">Lamsaty</Link>
        <h1 className="mt-5 text-3xl font-bold">Your digital card</h1>
        <p className="mt-2 text-sm text-slate-600">Create a card or sign in to manage your profile.</p>
        <AuthForm />
      </section>
    </main>
  );
}
