"use client";

import { ArrowLeft, ArrowUpRight, CircleAlert, PackageCheck, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  _id: string;
  status: string;
  totalCents: number;
  createdAt: string;
  lines: Array<{ name: string; quantity: number; unitPriceCents: number; imageUrl: string }>;
  shippingAddress?: { city?: string; state?: string; postal_code?: string };
};
const currency = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CustomerAccount({ name, email }: { name: string; email: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customer/orders")
      .then(async (response) => {
        const result = await response.json() as { orders?: Order[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Your orders could not load.");
        setOrders(result.orders ?? []);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Your orders could not load."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="portal-page account-page">
      <header className="portal-header"><Link className="portal-brand" href="/"><span className="brand-mark">eg<span>.</span></span><span className="brand-name">elliot&apos;s<span>global</span></span></Link><Link href="/" className="portal-back"><ArrowLeft size={15} /> Keep looking around</Link></header>
      <div className="portal-main">
        <div className="portal-title-row"><div><span className="eyebrow"><ShieldCheck size={13} /> YOUR LITTLE CORNER</span><h1>Your <em>account.</em></h1><p>Hi {name}. Here are your good finds, all in one place.</p><span className="account-email">{email}</span></div><Link className="button button-outline" href="/">Back to shopping <ArrowUpRight size={15} /></Link></div>
        {error && <div className="portal-alert error"><CircleAlert size={16} />{error}</div>}
        <section className="portal-card customer-orders"><div className="portal-card-heading"><div><span className="eyebrow">TRACK THE GOOD STUFF</span><h2>Your orders</h2></div><PackageCheck size={21} /></div>
          {loading ? <div className="portal-loading"><RefreshCw size={18} /> Finding your orders…</div> : orders.length ? <div className="customer-order-list">{orders.map((order) => <article className="customer-order" key={order._id}><div className="customer-order-heading"><div><b>ORDER #{order._id.slice(-7).toUpperCase()}</b><span>Placed {new Date(order.createdAt).toLocaleDateString()}</span></div><span className={`order-status-pill order-${order.status}`}>{order.status}</span></div><div className="customer-order-body">{order.lines.map((line, index) => <div className="customer-order-line" key={`${order._id}-${index}`}><span className="customer-order-image" style={{ backgroundImage: `url("${line.imageUrl}")` }} /><span>{line.name}<small>Qty {line.quantity}</small></span><b>{currency(line.unitPriceCents * line.quantity)}</b></div>)}</div><div className="customer-order-footer"><span>{order.shippingAddress?.city ? <><Truck size={14} /> Shipping to {order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""} {order.shippingAddress.postal_code}</> : <><Truck size={14} /> Shipment updates appear here after payment</>}</span><b>Total {currency(order.totalCents)}</b></div></article>)}</div> : <div className="portal-empty account-empty"><span className="sales-spark">✳</span><b>Nothing in the mail just yet.</b><span>Your next favorite thing might be waiting.</span><Link className="button button-dark" href="/">Find something lovely <ArrowLeft size={15} /></Link></div>}
        </section>
        <footer className="portal-footer">Questions about an order? <a href="mailto:hello@elliotsglobal.com">We’re real people—say hello <ArrowUpRight size={13} /></a></footer>
      </div>
    </main>
  );
}
