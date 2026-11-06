import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { request, type Item } from "../api";

/** A compact marketplace HUD for quick access to catalog activity and key routes. */
export function UnifiedHUD() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    request<{ items: Item[] }>("/api/products?limit=6", { signal: controller.signal })
      .then((result) => {
        setItems(result.items);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, []);

  return (
    <section aria-labelledby="hud-title" style={{ padding: "clamp(24px, 5vw, 64px) 0" }}>
      <div className="eyebrow">MAX MARKETPLACE · LIVE OVERVIEW</div>
      <h1 id="hud-title" style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(34px, 6vw, 64px)", margin: "0 0 12px" }}>
        Unified HUD
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 620, lineHeight: 1.8 }}>
        Your marketplace at a glance. Explore categories, recent releases, and your personal library.
      </p>
      <nav aria-label="Marketplace shortcuts" className="category-grid" style={{ marginTop: 28 }}>
        {[["/", "Discover"], ["/games", "Games"], ["/apps", "Apps"], ["/art", "Art"], ["/sports", "Sports"], ["/library", "Library"]].map(([to, label]) => (
          <Link className="category" key={to} to={to}>
            <span aria-hidden="true">↗</span><div><strong>{label}</strong><small>Open {label.toLowerCase()}</small></div>
          </Link>
        ))}
      </nav>
      <section aria-labelledby="hud-releases-title">
        <div className="section-heading"><div className="eyebrow">MARKETPLACE SIGNAL</div><h2 id="hud-releases-title">Recent releases</h2></div>
        {status === "loading" && <p role="status" className="notice">Loading marketplace activity…</p>}
        {status === "error" && <p role="alert" className="notice error">Marketplace activity is temporarily unavailable.</p>}
        {status === "ready" && (items.length ? (
          <div className="products-grid">{items.map((item) => (
            <Link className={`product-card ${item.type}`} key={item.id} to={`/product/${item.slug}`}>
              <div className="product-art"><span>{item.title.slice(0, 1)}</span><small>{item.type}</small></div>
              <div className="product-copy"><span className="creator">{item.creatorName}</span><h3>{item.title}</h3><p>{item.summary}</p></div>
            </Link>
          ))}</div>
        ) : <div className="empty"><h3>No releases yet</h3><p>Newly published marketplace items will appear here.</p></div>)}
      </section>
    </section>
  );
}
