"use client";

import { ArrowLeft, ArrowUpRight, Check, CircleAlert, PackageCheck, ShieldCheck, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Overview = {
  pendingSellers: Array<{ _id: string; name: string; email: string; storeName?: string; createdAt: string }>;
  pendingProducts: Array<{ _id: string; name: string; category: string; description: string; imageUrl: string; priceCents: number; stock: number; sellerId: { storeName?: string; email: string } }>;
  recentOrders: Array<{ _id: string; status: string; totalCents: number; createdAt: string; customerId: { name: string; email: string }; lines: Array<{ name: string; quantity: number; sellerId: string | { _id: string; storeName?: string; email: string }; unitPriceCents: number; sellerPayoutCents: number; platformFeeCents: number; payoutStatus: string; payoutReference?: string }> }>;
  stats: { sellers: number; products: number; orders: number; grossCents: number; platformFeeCents: number };
};

const currency = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function AdminConsole() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const response = await fetch("/api/admin/overview");
    const result = await response.json() as Overview & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Admin console is unavailable.");
    setData(result);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/overview", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as Overview & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Admin console is unavailable.");
        return result;
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof Error ? reason.message : "Admin console is unavailable.");
        }
      });
    return () => controller.abort();
  }, []);

  async function update(path: string, body: Record<string, string>, success: string) {
    setBusy(path);
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Update failed.");
      setMessage(success);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Update failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="portal-page admin-page">
      <header className="portal-header"><Link className="portal-brand" href="/"><span className="brand-mark">eg<span>.</span></span><span className="brand-name">elliot&apos;s<span>global</span></span></Link><Link href="/" className="portal-back"><ArrowLeft size={15} /> Back to the marketplace</Link></header>
      <div className="portal-main">
        <div className="portal-title-row"><div><span className="eyebrow"><ShieldCheck size={13} /> THE PEOPLE BEHIND THE MARKET</span><h1>Admin <em>desk.</em></h1><p>Welcome in. Here’s what needs a thoughtful look today.</p></div><span className="admin-access"><span /> ADMIN ACCESS</span></div>
        {error && <div className="portal-alert error"><CircleAlert size={16} />{error}</div>}
        {message && <div className="portal-alert success"><Check size={16} />{message}</div>}
        {data && <>
          <div className="portal-stat-grid"><div><span>APPROVED SHOPS</span><b>{data.stats.sellers}</b></div><div><span>LIVE PRODUCTS</span><b>{data.stats.products}</b></div><div><span>ORDERS PAID</span><b>{data.stats.orders}</b></div><div><span>GROSS SALES</span><b>{currency(data.stats.grossCents)}</b></div><div><span>PLATFORM COMMISSION</span><b>{currency(data.stats.platformFeeCents)}</b></div></div>
          <section className="portal-card admin-queue"><div className="portal-card-heading"><div><span className="eyebrow">NEW SHOPS, NEW STORIES</span><h2>Seller applications <small>({data.pendingSellers.length})</small></h2></div><Store size={21} /></div>
            {data.pendingSellers.length ? <div className="admin-rows">{data.pendingSellers.map((seller) => <div className="admin-row" key={seller._id}><div className="admin-row-main"><span className="admin-icon"><Store size={18} /></span><div><b>{seller.storeName || "New shop"}</b><span>{seller.name} · {seller.email}</span><small>Applied {new Date(seller.createdAt).toLocaleDateString()}</small></div></div><div className="admin-row-actions"><button className="button button-outline" disabled={Boolean(busy)} onClick={() => update(`/api/admin/sellers/${seller._id}`, { decision: "rejected" }, "Seller application declined.")}>Decline</button><button className="button button-dark" disabled={Boolean(busy)} onClick={() => update(`/api/admin/sellers/${seller._id}`, { decision: "approved" }, "Seller approved. They can now list products.")}>{busy.includes(seller._id) ? "Saving…" : "Approve shop"} <Check size={15} /></button></div></div>)}</div> : <div className="admin-empty">All caught up. No seller applications need review.</div>}
          </section>

          <section className="portal-card admin-queue"><div className="portal-card-heading"><div><span className="eyebrow">A QUICK QUALITY CHECK</span><h2>Product review <small>({data.pendingProducts.length})</small></h2></div><PackageCheck size={21} /></div>
            {data.pendingProducts.length ? <div className="admin-rows">{data.pendingProducts.map((product) => <div className="admin-row product-review-row" key={product._id}><span className="review-product-image" style={{ backgroundImage: `url("${product.imageUrl}")` }} /><div className="admin-row-main"><div><b>{product.name}</b><span>{product.category} · {currency(product.priceCents)} · {product.stock} in stock</span><small>Shop: {product.sellerId?.storeName || product.sellerId?.email || "Seller"}</small><p>{product.description}</p></div></div><div className="admin-row-actions"><button className="button button-outline" disabled={Boolean(busy)} onClick={() => update(`/api/admin/products/${product._id}`, { decision: "rejected" }, "Product listing declined.")}>Decline</button><button className="button button-dark" disabled={Boolean(busy)} onClick={() => update(`/api/admin/products/${product._id}`, { decision: "active" }, "Product approved and listed.")}>{busy.includes(product._id) ? "Saving…" : "Approve listing"} <Check size={15} /></button></div></div>)}</div> : <div className="admin-empty">No product listings are waiting for review.</div>}
          </section>

          <section className="portal-card admin-queue order-queue"><div className="portal-card-heading"><div><span className="eyebrow">FULFILLMENT & MANUAL SELLER PAYOUTS</span><h2>Recent orders <small>({data.recentOrders.length})</small></h2></div><Truck size={21} /></div>
            {data.recentOrders.length ? <div className="order-table-wrap"><table className="admin-order-table"><thead><tr><th>ORDER / CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>FULFILLMENT</th><th>SELLER PAYOUTS</th></tr></thead><tbody>{data.recentOrders.map((order) => {
              const payouts = Object.values(order.lines.reduce<Record<string, { sellerId: string; name: string; amount: number; commission: number; status: string; reference: string }>>((groups, line) => {
                const sellerId = typeof line.sellerId === "string" ? line.sellerId : line.sellerId._id;
                const sellerName = typeof line.sellerId === "string" ? "Seller" : line.sellerId.storeName || line.sellerId.email;
                const group = groups[sellerId] ?? { sellerId, name: sellerName, amount: 0, commission: 0, status: "paid", reference: "" };
                group.amount += line.sellerPayoutCents;
                group.commission += line.platformFeeCents;
                if (line.payoutStatus !== "paid") group.status = "unpaid";
                if (line.payoutReference) group.reference = line.payoutReference;
                groups[sellerId] = group;
                return groups;
              }, {} as Record<string, { sellerId: string; name: string; amount: number; commission: number; status: string; reference: string }>));
              const nextStatuses: Record<string, string[]> = { paid: ["processing", "cancelled"], processing: ["shipped", "cancelled"], shipped: ["delivered"] };
              return <tr key={order._id}><td><b>#{order._id.slice(-7).toUpperCase()}</b><span>{order.customerId?.name || "Customer"} · {order.customerId?.email || ""}</span><small>{new Date(order.createdAt).toLocaleDateString()}</small></td><td>{order.lines.map((line) => `${line.name} ×${line.quantity}`).join(", ")}</td><td>{currency(order.totalCents)}</td><td><select value={order.status} disabled={Boolean(busy) || !nextStatuses[order.status]} onChange={(event) => update(`/api/admin/orders/${order._id}`, { status: event.target.value }, "Order status updated.")}><option value={order.status}>{order.status}</option>{(nextStatuses[order.status] ?? []).map((status) => <option value={status} key={status}>{status}</option>)}</select></td><td><div className="vendor-payout-list">{payouts.map((payout) => <div className="vendor-payout-row" key={payout.sellerId}><span>{payout.name}<small>{currency(payout.amount)} net · {currency(payout.commission)} commission{payout.reference ? ` · Ref ${payout.reference}` : ""}</small></span><button className={`payout-button ${payout.status === "paid" ? "payout-done" : ""}`} disabled={Boolean(busy) || payout.status === "paid" || !["paid", "processing", "shipped", "delivered"].includes(order.status)} onClick={() => {
                const reference = window.prompt(`Enter the transfer reference for ${payout.name} (${currency(payout.amount)}):`);
                if (reference?.trim()) void update(`/api/admin/orders/${order._id}`, { payoutSellerId: payout.sellerId, payoutStatus: "paid", payoutReference: reference.trim() }, "Seller payout recorded.");
              }}>{payout.status === "paid" ? <><Check size={13} /> Paid</> : <>Record payout <ArrowUpRight size={13} /></>}</button></div>)}</div></td></tr>;
            })}</tbody></table></div> : <div className="admin-empty">Orders will appear here after the first customer checkout.</div>}
          </section>
        </>}
        {!data && !error && <div className="portal-loading">Opening the admin desk…</div>}
        <footer className="portal-footer">Every good marketplace starts with good people. <a href="mailto:hello@elliotsglobal.com">Need support? <ArrowUpRight size={13} /></a></footer>
      </div>
    </main>
  );
}
