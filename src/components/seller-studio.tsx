"use client";

import { ArrowLeft, ArrowUpRight, Check, CircleAlert, PackagePlus, Pencil, ShieldCheck, Store, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { categories } from "@/lib/catalog";

type Product = {
  _id: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  compareAtCents?: number;
  stock: number;
  imageUrl: string;
  status: "pending" | "active" | "rejected" | "archived";
};
type Overview = {
  sellerStatus: string;
  products: Product[];
  sales: Array<{ name: string; quantity: number; unitPriceCents: number; sellerPayoutCents: number; platformFeeCents: number; orderId: string; orderStatus: string; payoutStatus: string }>;
  stats: { activeProducts: number; pendingProducts: number; unitsSold: number; grossCents: number; earningsCents: number };
};
type Draft = { name: string; description: string; category: string; price: string; compareAt: string; stock: string; imageUrl: string };
const emptyDraft: Draft = { name: "", description: "", category: "Home & living", price: "", compareAt: "", stock: "10", imageUrl: "" };

export default function SellerStudio() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/seller/overview");
    const data = await response.json() as Overview & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Seller studio could not load.");
    setOverview(data);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/seller/overview", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as Overview & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Seller studio could not load.");
        return result;
      })
      .then(setOverview)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof Error ? reason.message : "Seller studio could not load.");
        }
      });
    return () => controller.abort();
  }, []);

  function editProduct(product: Product) {
    setEditing(product._id);
    setDraft({
      name: product.name,
      description: product.description,
      category: product.category,
      price: (product.priceCents / 100).toFixed(2),
      compareAt: product.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : "",
      stock: String(product.stock),
      imageUrl: product.imageUrl,
    });
    document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const body = {
      name: draft.name,
      description: draft.description,
      category: draft.category,
      priceCents: Math.round(Number(draft.price) * 100),
      compareAtCents: draft.compareAt ? Math.round(Number(draft.compareAt) * 100) : undefined,
      stock: Number(draft.stock),
      imageUrl: draft.imageUrl,
    };
    try {
      const response = await fetch(editing ? `/api/products/${editing}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Product could not be saved.");
      setMessage(result.message ?? "Product saved.");
      setDraft(emptyDraft);
      setEditing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveProduct(product: Product) {
    if (!window.confirm(`Archive “${product.name}”? It will no longer be listed for sale.`)) return;
    const response = await fetch(`/api/products/${product._id}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error ?? "Product could not be archived."); return; }
    await load();
  }

  return (
    <main className="portal-page">
      <header className="portal-header"><Link className="portal-brand" href="/"><span className="brand-mark">eg<span>.</span></span><span className="brand-name">elliot&apos;s<span>global</span></span></Link><Link href="/" className="portal-back"><ArrowLeft size={15} /> Back to the marketplace</Link></header>
      <div className="portal-main">
        <div className="portal-title-row"><div><span className="eyebrow"><Store size={13} /> YOUR LITTLE CORNER OF THE MARKET</span><h1>Seller <em>studio.</em></h1><p>Manage your shop, keep listings fresh, and follow your sales.</p></div><a className="button button-outline" href="#product-form">Add a product <PackagePlus size={16} /></a></div>
        {error && <div className="portal-alert error"><CircleAlert size={16} />{error}</div>}
        {message && <div className="portal-alert success"><Check size={16} />{message}</div>}
        {overview?.sellerStatus === "pending" && <div className="approval-banner"><span className="approval-pulse" /><div><b>Your seller application is in review.</b><p>Our admin team will approve your shop before products can go live. You can still draft and submit listings now.</p></div></div>}
        {overview?.sellerStatus === "rejected" && <div className="approval-banner rejected"><CircleAlert size={18} /><div><b>Your seller application wasn’t approved.</b><p>Contact hello@elliotsglobal.com if you think this was a mistake.</p></div></div>}
        {overview && <>
          <div className="portal-stat-grid"><div><span>LIVE LISTINGS</span><b>{overview.stats.activeProducts}</b></div><div><span>AWAITING REVIEW</span><b>{overview.stats.pendingProducts}</b></div><div><span>UNITS SOLD</span><b>{overview.stats.unitsSold}</b></div><div><span>GROSS SALES</span><b>{(overview.stats.grossCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</b></div><div><span>YOUR EARNINGS</span><b>{(overview.stats.earningsCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</b></div></div>
          <div className="portal-columns">
            <section className="portal-card listings-card"><div className="portal-card-heading"><div><span className="eyebrow">YOUR CATALOG</span><h2>Products <small>({overview.products.length})</small></h2></div><a href="#product-form">Add new <PackagePlus size={15} /></a></div>
              {overview.products.length ? <div className="seller-product-list">{overview.products.map((product) => <div className="seller-product" key={product._id}><span className="seller-product-image" style={{ backgroundImage: `url("${product.imageUrl}")` }} /><div className="seller-product-info"><b>{product.name}</b><span>{product.category} · ${(product.priceCents / 100).toFixed(2)}</span></div><span className={`status-pill status-${product.status}`}>{product.status}</span><button className="mini-icon" onClick={() => editProduct(product)} aria-label={`Edit ${product.name}`}><Pencil size={14} /></button><button className="mini-icon danger" onClick={() => archiveProduct(product)} aria-label={`Archive ${product.name}`}><Trash2 size={14} /></button></div>)}</div> : <div className="portal-empty"><PackagePlus size={24} /><b>Your shop starts with one good thing.</b><span>Add a product and send it for review.</span></div>}
            </section>
            <section className="portal-card sales-card"><div className="portal-card-heading"><div><span className="eyebrow">THE GOOD NEWS</span><h2>Recent sales</h2></div></div>
              {overview.sales.length ? <div className="sales-list">{overview.sales.map((sale, index) => <div className="sale-row" key={`${sale.orderId}-${index}`}><div><b>{sale.name}</b><span>Order #{sale.orderId.slice(-7).toUpperCase()} · ×{sale.quantity}</span></div><div><b>${(sale.sellerPayoutCents / 100).toFixed(2)}</b><span>{sale.orderStatus} · your payout · {sale.payoutStatus}</span></div></div>)}</div> : <div className="portal-empty"><span className="sales-spark">✳</span><b>Your first sale is out there.</b><span>Once a customer checks out, you’ll see it here.</span></div>}
            </section>
          </div>
          <section className="portal-card product-form-card" id="product-form"><div className="portal-card-heading"><div><span className="eyebrow">{editing ? "MAKE IT JUST RIGHT" : "ADD SOMETHING LOVELY"}</span><h2>{editing ? "Edit listing" : "New product"}</h2></div>{editing && <button className="text-link" onClick={() => { setEditing(null); setDraft(emptyDraft); }}>Cancel edit</button>}</div>
            <form className="seller-form" onSubmit={submitProduct}>
              <label>Product name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} minLength={3} maxLength={120} required /></label>
              <label>Department<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="seller-description">A little about it<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} minLength={12} maxLength={3000} rows={4} required /></label>
              <label>Price (USD)<input type="number" step="0.01" min="0.50" max="10000" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required /></label>
              <label>Compare-at price<input type="number" step="0.01" min="0" max="10000" value={draft.compareAt} onChange={(event) => setDraft({ ...draft, compareAt: event.target.value })} /></label>
              <label>Available stock<input type="number" min="0" max="100000" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} required /></label>
              <label className="seller-image">Product photo URL (HTTPS)<input type="url" placeholder="https://…" value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} required /></label>
              <div className="seller-form-actions"><span><ShieldCheck size={15} /> New and updated listings go through a quick admin review.</span><button className="button button-dark" disabled={busy}>{busy ? "Saving…" : editing ? "Save for review" : "Submit for review"} <ArrowUpRight size={15} /></button></div>
            </form>
          </section>
        </>}
        {!overview && !error && <div className="portal-loading">Opening your studio…</div>}
        <footer className="portal-footer">Need a hand? <a href="mailto:hello@elliotsglobal.com">Talk to a real person <ArrowUpRight size={13} /></a></footer>
      </div>
    </main>
  );
}
