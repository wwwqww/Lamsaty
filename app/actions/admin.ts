"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.app_metadata?.role !== "admin") throw new Error("Administrator access is required.");
  return supabase;
}

export async function createOrder(input: { customer_id: string; quantity: number; card_type: "pvc" | "metal" | "wood" }) {
  const supabase = await requireAdmin();
  if (!input.customer_id || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10000) {
    throw new Error("Choose a customer and a quantity between 1 and 10,000.");
  }
  if (!["pvc", "metal", "wood"].includes(input.card_type)) throw new Error("Choose a valid card type.");
  const { error } = await supabase.from("orders").insert({ ...input, status: "new" });
  if (error) throw new Error(`Could not create order: ${error.message}`);
  revalidatePath("/admin");
}

export async function updateOrderStatus(orderId: string, status: "new" | "printing" | "shipped" | "delivered") {
  const supabase = await requireAdmin();
  if (!["new", "printing", "shipped", "delivered"].includes(status)) throw new Error("Choose a valid order status.");
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw new Error(`Could not update order: ${error.message}`);
  revalidatePath("/admin");
}
