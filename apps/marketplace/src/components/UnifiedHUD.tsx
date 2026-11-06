import { useState } from "react";

/** A lightweight marketplace dashboard for the unified MAX HUD route. */
export function UnifiedHUD() {
  const [active, setActive] = useState("Overview");
  const sections = ["Overview", "Games", "Apps", "Art", "Media", "Sports", "Institute"];

  return (
    <section className="panel" aria-labelledby="hud-title">
      <div className="eyebrow">MAX ECOSYSTEM</div>
      <h1 id="hud-title">Unified HUD</h1>
      <p>Your marketplace command view for discovering MAX releases.</p>
      <nav aria-label="HUD sections" className="category-grid">
        {sections.map((section) => (
          <button
            aria-pressed={active === section}
            key={section}
            onClick={() => setActive(section)}
            type="button"
          >
            {section}
          </button>
        ))}
      </nav>
      <p role="status">Showing {active.toLowerCase()}.</p>
    </section>
  );
}
