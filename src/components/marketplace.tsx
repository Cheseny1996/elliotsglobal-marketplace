"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { categories, categoryCollections, demoProducts, productImage, type CatalogProduct } from "@/lib/catalog";

type User = {
  name: string;
  email: string;
  role: "shopper" | "seller" | "admin";
  sellerStatus: string;
  storeName?: string;
} | null;
type CartLine = { id: string; quantity: number };
type AuthMode = "login" | "register";
type ProductSort = "featured" | "price-low" | "price-high" | "top-rated";

const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

export default function Marketplace() {
  const [products, setProducts] = useState<CatalogProduct[]>(demoProducts);
  const [activeCategory, setActiveCategory] = useState("All finds");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<ProductSort>("featured");
  const [savedOnly, setSavedOnly] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [signupRole, setSignupRole] = useState<"shopper" | "seller">("shopper");
  const [adminLogin, setAdminLogin] = useState(false);
  const [user, setUser] = useState<User>(null);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("elliotsglobal-cart");
        const favorites = localStorage.getItem("elliotsglobal-favorites");
        if (saved) setCart(JSON.parse(saved) as CartLine[]);
        if (favorites) setLiked(JSON.parse(favorites) as string[]);
      } catch {
        localStorage.removeItem("elliotsglobal-cart");
        localStorage.removeItem("elliotsglobal-favorites");
        setNotice("Your saved bag could not be read, so it was cleared.");
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success") {
        setCart([]);
        localStorage.removeItem("elliotsglobal-cart");
        setNotice("Order placed! Your confirmation is on its way.");
        window.history.replaceState({}, "", "/");
      } else if (params.get("checkout") === "cancelled") {
        const sessionId = params.get("session_id");
        if (sessionId) {
          fetch("/api/checkout/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          }).then(async (response) => {
            const result = await response.json() as { error?: string };
            setNotice(response.ok ? "Checkout was cancelled. Your cart is still here." : result.error ?? "Your checkout is still open; its stock hold will expire automatically.");
          }).catch(() => setNotice("Your checkout is still open; its stock hold will expire automatically."));
        } else {
          setNotice("Checkout was cancelled. Your cart is still here.");
        }
        window.history.replaceState({}, "", "/");
      } else if (params.get("join") === "seller") {
        setSignupRole("seller");
        setAuthMode("register");
        setAccountOpen(true);
        setNotice("");
        window.history.replaceState({}, "", "/");
      }
      setPreferencesLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { signal: controller.signal }).then(async (response) => {
      if (response.ok) {
        const data = await response.json() as { user: User; demo?: boolean };
        setUser(data.user);
        setDemoMode(data.demo === true);
      }
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNotice("Your account status could not be checked. Try refreshing.");
      }
    });
    fetch("/api/products", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { products: Array<Record<string, unknown>> };
      if (!data.products.length) return;
      setProducts(data.products.map((item) => ({
        id: String(item._id),
        name: String(item.name),
        category: String(item.category),
        price: Number(item.priceCents) / 100,
        compareAt: Number(item.compareAtCents ?? item.priceCents) / 100,
        rating: 5,
        reviews: 0,
        seller: typeof item.sellerId === "object" && item.sellerId !== null && "storeName" in item.sellerId
          ? String(item.sellerId.storeName || "Independent shop")
          : "Independent shop",
        image: String(item.imageUrl),
        description: String(item.description),
      })));
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNotice("Live listings could not be refreshed. The sample catalog is still available.");
      }
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const target = new Date("2026-11-27T00:00:00-05:00").getTime();
    const updateCountdown = () => setSecondsLeft(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    const initialTimer = window.setTimeout(updateCountdown, 0);
    const timer = window.setInterval(updateCountdown, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem("elliotsglobal-cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Could not save the shopping bag in browser storage.", error);
    }
  }, [cart, preferencesLoaded]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem("elliotsglobal-favorites", JSON.stringify(liked));
    } catch (error) {
      console.error("Could not save favorites in browser storage.", error);
    }
  }, [liked, preferencesLoaded]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filtered = useMemo(() => {
    const matches = products.filter((product) => {
      const matchesCategory = activeCategory === "All finds" || product.category === activeCategory;
      const text = `${product.name} ${product.category} ${product.seller} ${product.description}`.toLowerCase();
      return matchesCategory
        && (!savedOnly || liked.includes(product.id))
        && text.includes(query.toLowerCase().trim());
    });
    if (sortBy === "price-low") return matches.sort((first, second) => first.price - second.price);
    if (sortBy === "price-high") return matches.sort((first, second) => second.price - first.price);
    if (sortBy === "top-rated") return matches.sort((first, second) => second.rating - first.rating || second.reviews - first.reviews);
    return matches;
  }, [activeCategory, liked, products, query, savedOnly, sortBy]);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartItems = cart.map((line) => ({
    ...line,
    product: products.find((product) => product.id === line.id),
  })).filter((line): line is CartLine & { product: CatalogProduct } => Boolean(line.product));
  const subtotal = cartItems.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const countdown = [
    Math.floor(secondsLeft / 86400),
    Math.floor((secondsLeft % 86400) / 3600),
    Math.floor((secondsLeft % 3600) / 60),
    secondsLeft % 60,
  ];

  function addToCart(product: CatalogProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      return existing
        ? current.map((line) => line.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, 20) } : line)
        : [...current, { id: product.id, quantity: 1 }];
    });
    setNotice(`${product.name} added to your bag.`);
  }

  function changeQuantity(id: string, change: number) {
    setCart((current) => current
      .map((line) => line.id === id ? { ...line, quantity: line.quantity + change } : line)
      .filter((line) => line.quantity > 0));
  }

  function toggleLiked(id: string) {
    setLiked((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setAuthError("");
    try {
      const response = await fetch(`/api/auth/${authMode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const result = await response.json().catch(() => null) as { user?: NonNullable<User>; error?: string; message?: string } | null;
      if (!response.ok || !result?.user) {
        throw new Error(result?.error ?? (response.ok
          ? "The account service returned an invalid response."
          : "Account service is temporarily unavailable. Please try again shortly."));
      }
      if (adminLogin && result.user.role !== "admin") {
        throw new Error("That account does not have administrator access.");
      }
      setUser(result.user);
      setAccountOpen(false);
      setNotice(result.message ?? `Welcome back, ${result.user.name.split(" ")[0]}.`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Account service is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    if (!user) {
      setCartOpen(false);
      setAuthMode("login");
      setAccountOpen(true);
      setAuthError("Sign in or create an account to check out.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })) }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Checkout is unavailable.");
      window.location.assign(result.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Checkout could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setNotice("You’ve signed out.");
  }

  return (
    <main>
      <div className="announcement">
        <span className="announcement-star">✳</span>
        <span>THE BIGGEST LITTLE FINDS OF THE SEASON</span>
        <span className="announcement-divider">·</span>
        <span>BLACK FRIDAY IS ALMOST HERE</span>
        <div className="countdown" aria-label="Black Friday countdown">
          {countdown.map((part, index) => (
            <span className="countdown-part" key={index}>
              <b>{String(part).padStart(2, "0")}</b>
              <small>{["D", "H", "M", "S"][index]}</small>
            </span>
          ))}
        </div>
        <span className="announcement-star">✳</span>
      </div>

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Elliot’s Global home">
          <span className="brand-mark">eg<span>.</span></span>
          <span className="brand-name">elliot&apos;s<span>global</span></span>
        </Link>
        <div className="header-actions">
          <label className="header-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find your thing" aria-label="Search products" />
            <kbd>⌘ K</kbd>
          </label>
          {user ? (
            <Link className="icon-button account-link" href={user.role === "admin" ? "/admin" : user.role === "seller" ? "/seller" : "/account"} title="Your account">
              <span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            </Link>
          ) : (
            <button className="icon-button account-button" onClick={() => { setAuthMode("login"); setAdminLogin(false); setAccountOpen(true); }} aria-label="Sign in or create account">
              <span className="user-avatar">E</span>
            </button>
          )}
          <button
            className={`bag-button ${itemCount ? "bag-button-has-items" : ""}`}
            onClick={() => setCartOpen(true)}
            aria-label={`Open shopping bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}, subtotal ${money(subtotal)}`}
            aria-expanded={cartOpen}
            aria-controls={cartOpen ? "shopping-bag-panel" : undefined}
          >
            <span className="bag-icon-wrap">
              <ShoppingCart size={21} strokeWidth={2.2} />
              <b key={itemCount} className="bag-count">{itemCount > 99 ? "99+" : itemCount}</b>
            </span>
            <span className="bag-copy"><strong>Your bag</strong><small>{money(subtotal)}</small></span>
          </button>
        </div>
      </header>

      <label className="mobile-header-search">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search independent shops and finds" aria-label="Search products" />
      </label>

      <nav className="discovery-rail" aria-label="Browse marketplace">
        <div className="discovery-links">
          <a
            className={`discovery-link ${activeCategory === "All finds" && !savedOnly ? "discovery-link-active" : ""}`}
            href="#shop"
            onClick={() => { setActiveCategory("All finds"); setSavedOnly(false); }}
          >
            All finds
          </a>
          <a className="discovery-link discovery-link-deal" href="#black-friday"><Sparkles size={14} /> Black Friday</a>
          {categories.slice(1).map((category) => (
            <button
              className={`discovery-link ${activeCategory === category && !savedOnly ? "selected" : ""}`}
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setSavedOnly(false);
                document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {category}
            </button>
          ))}
          <a className="discovery-link" href="#our-story">Meet the makers</a>
        </div>
      </nav>

      {user && (
        <div className="signed-in-strip">
          <span>Hey, {user.name.split(" ")[0]}! You&apos;re shopping Elliot&apos;s Global.</span>
          <div className="signed-in-links">
            {user.role === "seller" && <Link href="/seller">Seller studio <ArrowUpRight size={13} /></Link>}
            {user.role === "admin" && <Link href="/admin">Admin console <ArrowUpRight size={13} /></Link>}
            <button onClick={logout}>Sign out</button>
          </div>
        </div>
      )}

      {demoMode && <div className="demo-strip"><Sparkles size={14} /><span>CURATED PREVIEW</span><span>Sample products are ready to explore. Connect MongoDB and Stripe to activate live shops and checkout.</span><Link href="/seller">Open a shop <ArrowUpRight size={13} /></Link></div>}

      <section className="hero campaign-hero" aria-label="Featured collections">
        <a
          className="campaign-card campaign-card-featured"
          href="#shop"
          onClick={() => { setActiveCategory("Style"); setSavedOnly(false); }}
          style={{ backgroundImage: `url("${productImage("photo-1483985988355-763728e1935b", 1200)}")` }}
        >
          <span className="campaign-kicker">THE FEEL-GOOD GIFT EDIT</span>
          <span className="campaign-title">Their kind<br />of wonderful.</span>
          <span className="campaign-cta">Find a gift with a story <ArrowRight size={15} /></span>
          <span className="campaign-index">01 — 03</span>
        </a>
        <a
          className="campaign-card campaign-card-sale"
          href="#black-friday"
          style={{ backgroundImage: `linear-gradient(180deg, #25160a0a 10%, #25160acc 100%), url("${productImage("photo-1600210492486-724fe5c67fb0", 900)}")` }}
        >
          <span className="campaign-kicker">NOV 27 — DEC 1</span>
          <span className="campaign-title">Black Friday.<br /><em>Good-hearted.</em></span>
          <span className="campaign-cta">Small-shop deals are coming <ArrowRight size={15} /></span>
          <span className="campaign-badge">MADE BY<br />REAL PEOPLE</span>
        </a>
        <a
          className="campaign-card campaign-card-makers"
          href="#our-story"
          style={{ backgroundImage: `url("${productImage("photo-1452860606245-08befc0ff44b", 900)}")` }}
        >
          <span className="campaign-kicker">A MARKETPLACE WITH A HEARTBEAT</span>
          <span className="campaign-title">Meet the<br />hands behind it.</span>
          <span className="campaign-cta">Get to know our makers <ArrowRight size={15} /></span>
        </a>
      </section>

      <section className="perks-row" aria-label="Shopping benefits">
        <div><span className="perk-icon"><Truck size={18} /></span><span><b>Free shipping over $75</b><small>Little extra, on us</small></span></div>
        <div><span className="perk-icon"><ShieldCheck size={18} /></span><span><b>Good people, vetted</b><small>Every shop is human-approved</small></span></div>
        <div><span className="perk-icon"><Heart size={18} /></span><span><b>Shopping with a point</b><small>Small businesses, big impact</small></span></div>
        <div className="perks-rating"><span className="stars">★★★★★</span><span><b>4.9/5</b><small>from people with good taste</small></span></div>
      </section>

      <section className="shop-section" id="shop">
        <div className="section-heading shop-heading">
          <div><span className="eyebrow">YOUR NEW FAVORITES, PROBABLY</span><h2>The good <em>finds.</em></h2></div>
          <div className="shop-sort">
            <span>{filtered.length} lovely {filtered.length === 1 ? "find" : "finds"}</span>
            <label>
              <span className="sort-label">Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as ProductSort)} aria-label="Sort products">
                <option value="featured">Featured</option>
                <option value="top-rated">Top rated</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
        </div>
        <div className="filter-row">
          {categories.map((category) => (
            <button
              key={category}
              className={`filter-chip ${activeCategory === category && !savedOnly ? "active" : ""}`}
              aria-pressed={activeCategory === category && !savedOnly}
              onClick={() => { setActiveCategory(category); setSavedOnly(false); }}
            >
              {category}
            </button>
          ))}
          <button className={`filter-chip saved-chip ${savedOnly ? "active" : ""}`} aria-pressed={savedOnly} onClick={() => { setActiveCategory("All finds"); setSavedOnly((current) => !current); }}>
            <Heart size={13} fill={savedOnly ? "currentColor" : "none"} /> Saved ({liked.length})
          </button>
          <label className="mobile-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search finds" /></label>
        </div>
        {filtered.length ? (
          <div className="product-grid">
            {filtered.map((product, index) => (
              <article className="product-card" key={product.id}>
                <button className="product-image-wrap" onClick={() => setSelected(product)} aria-label={`View ${product.name}`}>
                  <span className="product-image-fallback" aria-hidden="true">{product.category}</span>
                  <Image
                    className="product-image"
                    src={product.image.startsWith("https://") ? product.image : productImage(product.image)}
                    alt={product.name}
                    loading="lazy"
                    fill
                    sizes="(max-width: 760px) 50vw, (max-width: 1040px) 33vw, 25vw"
                    unoptimized
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  {index % 5 === 2 && <span className="product-sale">−{Math.round((1 - product.price / product.compareAt) * 100)}%</span>}
                </button>
                <button className={`favorite-button ${liked.includes(product.id) ? "liked" : ""}`} onClick={() => toggleLiked(product.id)} aria-label={liked.includes(product.id) ? "Remove from saved finds" : "Save this find"}>
                  <Heart size={17} fill={liked.includes(product.id) ? "currentColor" : "none"} />
                </button>
                <button className="product-info" onClick={() => setSelected(product)}>
                  <span className="product-category">{product.category}</span>
                  <span className="product-name">{product.name}</span>
                  <span className="product-meta"><span><Star size={12} fill="currentColor" /> {product.rating} <small>({product.reviews})</small></span><span className="seller-by">by {product.seller}</span></span>
                  <span className="product-prices"><b>{money(product.price)}</b><s>{money(product.compareAt)}</s></span>
                </button>
                <button className="quick-add" onClick={() => addToCart(product)}><Plus size={15} /> Quick add</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-products"><Search size={25} /><b>{savedOnly && liked.length === 0 ? "Your saved shelf is waiting." : "No little treasures found."}</b><span>{savedOnly && liked.length === 0 ? "Tap a heart on anything you love and it will be waiting here." : "Try another search, or ask us to show you everything."}</span><button className="text-link" onClick={() => { setQuery(""); setActiveCategory("All finds"); setSavedOnly(false); }}>Show me everything</button></div>
        )}
        <button className="button button-outline shop-more" onClick={() => { setActiveCategory("All finds"); setQuery(""); setSavedOnly(false); setSortBy("featured"); }}>See all the good finds <ArrowDownRight size={16} /></button>
      </section>

      <section className="categories-section" id="categories">
        <div className="section-heading">
          <div><span className="eyebrow">A LITTLE BIT OF EVERYTHING</span><h2>Shop by <em>feeling.</em></h2></div>
          <a href="#shop" className="text-link">All departments <ArrowRight size={15} /></a>
        </div>
        <div className="category-tiles">
          {categoryCollections.map(({ name, caption, image }, index) => {
            const count = products.filter((product) => product.category === name).length;
            return (
              <button
                className="category-tile"
                key={name}
                onClick={() => {
                  setActiveCategory(name);
                  setSavedOnly(false);
                  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span className="category-photo" style={{ backgroundImage: `url("${productImage(image, 600)}")` }} />
                <span className="category-number">{String(index + 1).padStart(2, "0")} <small>{count} {count === 1 ? "find" : "finds"}</small></span>
                <span className="category-caption"><b>{name}</b><small>{caption}</small></span>
                <span className="category-arrow"><ArrowUpRight size={18} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="black-friday-banner" id="black-friday">
        <div className="bf-orbit orbit-one">✳</div><div className="bf-orbit orbit-two">✳</div>
        <div className="bf-left"><span className="bf-label">THE GOOD STUFF SALE</span><h2>Black Friday,<br /><em>good-hearted.</em></h2><p>Big little deals from shops that deserve the spotlight.</p></div>
        <div className="bf-center"><span className="bf-sale">UP TO</span><strong>40<span>%</span></strong><span className="bf-sale">OFF THE GOOD STUFF</span></div>
        <div className="bf-right"><span className="bf-date">NOV 27 — DEC 1</span><a className="button button-light" href="#shop">Shop early deals <ArrowRight size={16} /></a><small>Thoughtful finds. Feel-good prices.</small></div>
      </section>

      <section className="maker-section" id="our-story">
        <div className="maker-photo"><span className="maker-tag">GOOD PEOPLE, MAKING GOOD THINGS</span></div>
        <div className="maker-copy"><span className="eyebrow">A MARKETPLACE WITH A HEARTBEAT</span><h2>Every shop has<br />a <em>someone</em><br />behind it.</h2><p>We bring the one-person studios, neighborhood favorites, and just-starting-out dreamers together in one lovely place. When you shop here, you&apos;re part of their story.</p><Link className="button button-dark" href="/seller">Meet your next favorite shop <ArrowRight size={16} /></Link><span className="maker-handwritten">the people<br />make the place <ArrowDownRight size={20} /></span></div>
      </section>

      <section className="newsletter">
        <span className="newsletter-star">✳</span><div><span className="eyebrow">A GOOD EMAIL, ON PURPOSE</span><h2>Little notes. <em>Lovely finds.</em></h2><p>New maker stories, fresh arrivals, and the occasional very good deal. Never the noisy stuff.</p></div>
        <form className="newsletter-form" onSubmit={(event) => { event.preventDefault(); setNotice("You’re on the list. Keep an eye on your inbox!"); (event.currentTarget as HTMLFormElement).reset(); }}><input type="email" placeholder="Your email address" required aria-label="Email address" /><button type="submit" aria-label="Subscribe"><ArrowRight size={19} /></button><small>By subscribing, you agree to our delightfully short emails.</small></form>
      </section>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand"><a className="brand" href="#"><span className="brand-mark">eg<span>.</span></span><span className="brand-name">elliot&apos;s<span>global</span></span></a><p>A little marketplace for a lot of good things.</p><span className="footer-note">Made for people who care where their stuff comes from.</span></div>
          <div className="footer-links"><b>THE MARKET</b><a href="#shop">Shop everything</a><a href="#categories">Departments</a><a href="#black-friday">Black Friday</a><Link href="/seller">Open a shop</Link></div>
          <div className="footer-links"><b>THE DETAILS</b><a href="#our-story">Our story</a><a href="#shipping">Shipping & returns</a><a href="#help">Help & contact</a><a href="#privacy">Privacy, please</a></div>
          <div className="footer-links footer-social"><b>GOOD COMPANY</b><a href="#instagram">Instagram <ArrowUpRight size={13} /></a><a href="#pinterest">Pinterest <ArrowUpRight size={13} /></a><a href="#tiktok">TikTok <ArrowUpRight size={13} /></a><span>Say hello: <a href="mailto:hello@elliotsglobal.com">hello@elliotsglobal.com</a></span></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Elliot&apos;s Global. Shopping can be a good thing.</span><span>Thoughtfully found in the USA <span className="footer-heart">♥</span></span><a href="#top">Back to the sunshine ↑</a></div>
      </footer>

      {notice && <div className="toast" role="status"><Check size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}

      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
        <aside className="side-panel cart-panel" id="shopping-bag-panel" role="dialog" aria-modal="true" aria-labelledby="shopping-bag-title">
          <div className="panel-heading"><div><span className="eyebrow">THE GOOD STUFF</span><h2 id="shopping-bag-title">Your bag <span>({itemCount})</span></h2></div><button className="close-button" onClick={() => setCartOpen(false)} aria-label="Close bag"><X size={21} /></button></div>
          {cartItems.length ? <>
            <div className="cart-lines">{cartItems.map(({ product, quantity }) => <div className="cart-line" key={product.id}><span className="cart-thumb" style={{ backgroundImage: `url("${product.image.startsWith("https://") ? product.image : productImage(product.image, 300)}")` }} /><div className="cart-line-info"><b>{product.name}</b><small>{product.seller}</small><div className="quantity-control"><button onClick={() => changeQuantity(product.id, -1)} aria-label="Remove one"><Minus size={13} /></button><span>{quantity}</span><button onClick={() => changeQuantity(product.id, 1)} aria-label="Add one"><Plus size={13} /></button></div></div><b className="cart-line-price">{money(product.price * quantity)}</b></div>)}</div>
            <div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Shipping</span><span>{subtotal >= 75 ? "On us" : "$7.95"}</span></div><p>{subtotal >= 75 ? "You unlocked free shipping. Nice one!" : `You’re ${money(75 - subtotal)} away from free shipping.`}</p><button className="button button-dark checkout-button" onClick={checkout} disabled={busy}>{busy ? "One moment…" : "Secure checkout"} <ArrowRight size={16} /></button><small><ShieldCheck size={14} /> Safe checkout powered by Stripe</small></div>
          </> : <div className="empty-cart"><span className="empty-bag-icon"><ShoppingBag size={25} /></span><h3>Your bag is taking a little break.</h3><p>There are a lot of lovely things out there.</p><button className="button button-dark" onClick={() => setCartOpen(false)}>Go find something <ArrowRight size={16} /></button></div>}
        </aside>
      </div>}

      {selected && <div className="overlay modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section className="product-modal" aria-label={selected.name}>
          <button className="close-button modal-close" onClick={() => setSelected(null)} aria-label="Close details"><X size={21} /></button>
          <div className="modal-image" style={{ backgroundImage: `url("${selected.image.startsWith("https://") ? selected.image : productImage(selected.image)}")` }} />
          <div className="modal-details"><span className="eyebrow">{selected.category} · MADE BY {selected.seller.toUpperCase()}</span><h2>{selected.name}</h2><span className="modal-rating"><span className="stars">★★★★★</span> {selected.rating} <small>({selected.reviews} reviews)</small></span><p>{selected.description}</p><div className="modal-price"><b>{money(selected.price)}</b><s>{money(selected.compareAt)}</s><span>Save {money(selected.compareAt - selected.price)}</span></div><button className="button button-dark modal-add" onClick={() => { addToCart(selected); setSelected(null); }}>Add to your bag <Plus size={16} /></button><div className="modal-delivery"><Truck size={16} /><span>Free shipping on orders $75+<small>Estimated delivery in 3–5 business days</small></span></div><div className="seller-promise"><ShieldCheck size={16} /><span>From a human-approved independent shop.</span></div></div>
        </section>
      </div>}

      {accountOpen && <div className="overlay modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
        <section className="auth-modal">
          <button className="close-button modal-close" onClick={() => setAccountOpen(false)} aria-label="Close sign in"><X size={21} /></button>
          <span className="brand-mark auth-mark">eg<span>.</span></span><span className="eyebrow">GOOD TO HAVE YOU HERE</span>          <h2>{authMode === "login" ? adminLogin ? "Admin sign in." : "Welcome back." : signupRole === "seller" ? "Open your shop." : "Come on in."}</h2><p>{authMode === "login" ? adminLogin ? "Sign in with your approved administrator account." : "Your next favorite thing might be waiting." : signupRole === "seller" ? "Bring your little shop to a marketplace with a big heart." : "Join as a client and discover independent shops."}</p>
          {authMode === "register" ? (
            <div className="join-role-picker" aria-label="Choose how to join">
              <button type="button" className={`join-role-card ${signupRole === "shopper" ? "selected" : ""}`} aria-pressed={signupRole === "shopper"} onClick={() => setSignupRole("shopper")}>
                <span className="join-role-icon"><ShoppingBag size={18} /></span>
                <span><b>Client</b><small>I want to shop</small></span>
                <span className="join-role-check">{signupRole === "shopper" ? <Check size={14} /> : null}</span>
              </button>
              <button type="button" className={`join-role-card ${signupRole === "seller" ? "selected" : ""}`} aria-pressed={signupRole === "seller"} onClick={() => setSignupRole("seller")}>
                <span className="join-role-icon"><Store size={18} /></span>
                <span><b>Vendor</b><small>I want to sell</small></span>
                <span className="join-role-check">{signupRole === "seller" ? <Check size={14} /> : null}</span>
              </button>
            </div>
          ) : (
            <div className="account-entry-options">
              <span>New here? Join as a</span>
              <button type="button" onClick={() => { setSignupRole("shopper"); setAuthMode("register"); setAdminLogin(false); setAuthError(""); }}>client</button>
              <span>or</span>
              <button type="button" onClick={() => { setSignupRole("seller"); setAuthMode("register"); setAdminLogin(false); setAuthError(""); }}>vendor</button>
            </div>
          )}
          <form onSubmit={submitAuth} className="auth-form">
            {authMode === "register" && <><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label></>}
            <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} required minLength={authMode === "login" ? 1 : 12} maxLength={128} />{authMode === "register" && <small>Use at least 12 characters.</small>}</label>
            {authMode === "register" && <input type="hidden" name="role" value={signupRole} />}
            {authMode === "register" && signupRole === "seller" && <label>Shop name<input name="storeName" autoComplete="organization" minLength={2} maxLength={100} placeholder="Your brand name" required /></label>}
            {authError && <p className="form-error" role="alert">{authError}</p>}
            <button className="button button-dark auth-submit" disabled={busy}>{busy ? "One moment…" : authMode === "login" ? adminLogin ? "Sign in to admin" : "Sign in" : signupRole === "seller" ? "Apply as a vendor" : "Create client account"} <ArrowRight size={16} /></button>
          </form>
          <div className="auth-switch">{authMode === "login" ? "New around here?" : "Already have an account?"}<button onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAdminLogin(false); setAuthError(""); }}>{authMode === "login" ? "Create an account" : "Sign in"}</button></div>
          <button
            className="admin-login-link"
            type="button"
            onClick={() => {
              if (adminLogin) {
                setAdminLogin(false);
              } else {
                setAuthMode("login");
                setAdminLogin(true);
              }
              setAuthError("");
            }}
          >
            {adminLogin ? "Back to client sign in" : "Admin? Sign in to your console"}
          </button>
          {authMode === "register" && signupRole === "seller" && <small className="seller-approval-note"><ShieldCheck size={14} /> Vendor applications are reviewed before listings can go live. Admin access is invite-only.</small>}
        </section>
      </div>}
    </main>
  );
}
