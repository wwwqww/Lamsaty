"use client";

import { useState, useTransition } from "react";
import { createOrder, updateOrderStatus } from "@/app/actions/admin";

export type AdminUser = { user_id: string; username: string; full_name: string; plan: "free" | "premium"; created_at: string };
export type AdminOrder = { id: string; customer_id: string; username: string; customer_name: string; quantity: number; card_type: "pvc" | "metal" | "wood"; status: "new" | "printing" | "shipped" | "delivered"; created_at: string };
const input = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export function AdminPanel({ profiles, orders: initialOrders }: { profiles: AdminUser[]; orders: AdminOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [customerId, setCustomerId] = useState(profiles[0]?.user_id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [cardType, setCardType] = useState<"pvc" | "metal" | "wood">("pvc");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submitOrder() {
    setMessage("");
    startTransition(async () => {
      try {
        await createOrder({ customer_id: customerId, quantity, card_type: cardType });
        setMessage("Order created.");
        window.location.reload();
      } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not create order."); }
    });
  }

  function changeStatus(orderId: string, status: AdminOrder["status"]) {
    setMessage("");
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, status);
        setOrders((items) => items.map((item) => item.id === orderId ? { ...item, status } : item));
      } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not update order."); }
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold">Create card order</h2><p className="mt-1 text-sm text-slate-500">New orders start with the “new” status.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_160px_auto]">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">Customer
            <select className={input} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {profiles.map((profile) => <option key={profile.user_id} value={profile.user_id}>{profile.full_name || profile.username} (@{profile.username})</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">Quantity
            <input className={input} type="number" min={1} max={10000} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">Card type
            <select className={input} value={cardType} onChange={(e) => setCardType(e.target.value as typeof cardType)}>
              <option value="pvc">PVC</option><option value="metal">Metal</option><option value="wood">Wood</option>
            </select>
          </label>
          <button disabled={pending || !profiles.length} onClick={submitOrder} className="self-end rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Create order</button>
        </div>
        {message && <p role="status" className="mt-4 text-sm text-slate-600">{message}</p>}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Orders</h2><p className="mt-1 text-sm text-slate-500">{orders.length} total</p></div>
          <a href="/admin/orders.csv" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Export CSV</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs uppercase text-slate-500"><th className="py-3">Customer</th><th>Quantity</th><th>Type</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>{orders.map((order) => <tr key={order.id} className="border-b border-slate-50">
              <td className="py-3"><span className="font-semibold">{order.customer_name || order.username}</span><span className="ml-1 text-slate-500">@{order.username}</span></td>
              <td>{order.quantity}</td><td className="uppercase">{order.card_type}</td>
              <td><select aria-label={`Status for order ${order.id}`} disabled={pending} className={input} value={order.status} onChange={(e) => changeStatus(order.id, e.target.value as AdminOrder["status"])}>
                <option value="new">New</option><option value="printing">Printing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option>
              </select></td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
            </tr>)}</tbody>
          </table>
          {!orders.length && <p className="py-8 text-center text-sm text-slate-500">No orders yet.</p>}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold">Users and plans</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs uppercase text-slate-500"><th className="py-3">Name</th><th>Username</th><th>Plan</th><th>Joined</th></tr></thead>
            <tbody>{profiles.map((profile) => <tr key={profile.user_id} className="border-b border-slate-50">
              <td className="py-3">{profile.full_name || "—"}</td><td>@{profile.username}</td><td className="capitalize">{profile.plan}</td><td>{new Date(profile.created_at).toLocaleDateString()}</td>
            </tr>)}</tbody>
          </table>
          {!profiles.length && <p className="py-8 text-center text-sm text-slate-500">No users found.</p>}
        </div>
      </section>
    </div>
  );
}
