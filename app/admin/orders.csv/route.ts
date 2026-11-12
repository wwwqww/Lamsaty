import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [ordersResult, profilesResult] = await Promise.all([
    supabase.from("orders").select("id,customer_id,quantity,card_type,status,created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("user_id,username,full_name"),
  ]);
  if (ordersResult.error) throw new Error(`Could not export orders: ${ordersResult.error.message}`);
  if (profilesResult.error) throw new Error(`Could not export customers: ${profilesResult.error.message}`);
  const customers = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
  const rows = [
    ["Order ID", "Customer", "Username", "Quantity", "Card type", "Status", "Created at"],
    ...(ordersResult.data ?? []).map((order) => {
      const customer = customers.get(order.customer_id);
      return [order.id, customer?.full_name ?? "", customer?.username ?? "", order.quantity, order.card_type, order.status, order.created_at];
    }),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lamsaty-orders.csv"',
      "Cache-Control": "no-store",
    },
  });
}
