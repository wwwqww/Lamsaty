import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel, type AdminOrder, type AdminUser } from "@/components/admin/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/dashboard");

  const [profilesResult, ordersResult] = await Promise.all([
    supabase.from("profiles").select("user_id,username,full_name,plan,created_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("id,customer_id,quantity,card_type,status,created_at").order("created_at", { ascending: false }),
  ]);
  if (profilesResult.error) throw new Error(`Could not load users: ${profilesResult.error.message}`);
  if (ordersResult.error) throw new Error(`Could not load orders: ${ordersResult.error.message}`);
  const profiles = (profilesResult.data ?? []) as AdminUser[];
  const names = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const orders = (ordersResult.data ?? []).map((order) => ({
    ...order,
    username: names.get(order.customer_id)?.username ?? "Unknown",
    customer_name: names.get(order.customer_id)?.full_name ?? "",
  })) as AdminOrder[];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex items-center justify-between">
          <div><Link href="/" className="text-sm font-bold uppercase tracking-[.18em] text-teal-700">Lamsaty</Link><h1 className="mt-1 text-2xl font-bold">Admin panel</h1></div>
          <Link href="/dashboard" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Dashboard</Link>
        </header>
        <AdminPanel profiles={profiles} orders={orders} />
      </div>
    </main>
  );
}
