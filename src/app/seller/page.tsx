import { getSession } from "@/lib/auth";
import SellerStudio from "@/components/seller-studio";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Store } from "lucide-react";
import Link from "next/link";

export const instant = false;

export default async function SellerPage() {
  const user = await getSession();
  if (!user || user.role !== "seller") {
    if (user?.role === "admin") redirect("/admin");
    if (user) redirect("/");
    return (
      <main className="seller-landing">
        <header className="portal-header"><Link className="portal-brand" href="/"><span className="brand-mark">eg<span>.</span></span><span className="brand-name">elliot&apos;s<span>global</span></span></Link><Link href="/" className="portal-back"><ArrowLeft size={15} /> Explore the marketplace</Link></header>
        <section className="seller-landing-content">
          <span className="eyebrow"><Store size={13} /> YOUR LITTLE CORNER OF THE MARKET</span>
          <h1>Your good thing<br />deserves <em>to be found.</em></h1>
          <p>Bring your independent shop to a marketplace that cares about the people behind the products. You make the good stuff—we’ll help it find its people.</p>
          <ul><li><Check size={16} /> A storefront that feels like you</li><li><Check size={16} /> Simple listings, stock, and sales tools</li><li><Check size={16} /> Real human review before anything goes live</li><li><Check size={16} /> No listing fees during our early launch</li></ul>
          <Link className="button button-dark" href="/?join=seller">Apply to open a shop <ArrowRight size={16} /></Link>
          <span className="seller-landing-footnote">Seller applications are reviewed by the Elliot&apos;s Global team. Payments are collected by the marketplace; seller payouts are handled manually.</span>
        </section>
      </main>
    );
  }
  return <SellerStudio />;
}
