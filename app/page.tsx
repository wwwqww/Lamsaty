import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-3xl rounded-[2rem] bg-white p-8 shadow-sm sm:p-14">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-teal-700">Lamsaty</p>
        <h1 className="mt-4 max-w-xl text-4xl font-bold tracking-tight sm:text-6xl">Votre carte, toujours avec vous.</h1>
        <p className="mt-5 max-w-xl leading-7 text-slate-600">Une carte de visite numérique accessible en un geste avec NFC ou QR code.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">Créer ma carte</Link>
          <Link href="/login" className="rounded-xl border border-slate-200 px-5 py-3 font-semibold">Se connecter</Link>
        </div>
      </section>
    </main>
  );
}
