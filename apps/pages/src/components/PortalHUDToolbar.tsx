import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import "./PortalHUDToolbar.css";

type EntitySummary = {
  entity_id: string;
  category: string;
  title: string;
  status: string;
};
type EntityDetail = EntitySummary & {
  ui_binding: { component_type?: string; theme?: string };
};
type EntityListResponse = { entities: EntitySummary[] };

export function PortalHUDToolbar() {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<EntityListResponse>("/api/entities")
      .then(({ entities: found }) => {
        if (!cancelled) setEntities(found);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load interfaces");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function selectEntity(id: string) {
    setSelectedId(id);
    setSelected(null);
    setError("");
    if (!id) return;
    try {
      const entity = await api<EntityDetail>(`/api/entities?id=${encodeURIComponent(id)}`);
      setSelected(entity);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load interface");
    }
  }

  return (
    <aside className="portal-hud-toolbar" aria-label="Universal Portal HUD toolbar">
      <label className="portal-hud-toolbar__select-label" htmlFor="portal-hud-entity">
        <span className="portal-hud-toolbar__signal" aria-hidden="true" />
        Interface
      </label>
      <select
        id="portal-hud-entity"
        value={selectedId}
        onChange={(event) => void selectEntity(event.target.value)}
        disabled={loading || entities.length === 0}
        aria-describedby="portal-hud-status"
      >
        <option value="">{loading ? "Loading interfaces…" : entities.length ? "Select interface…" : "No active interfaces"}</option>
        {entities.map((entity) => (
          <option key={entity.entity_id} value={entity.entity_id}>
            {entity.title} · {entity.category}
          </option>
        ))}
      </select>
      <span className="portal-hud-toolbar__status" id="portal-hud-status" aria-live="polite">
        {error || (selected ? `${selected.ui_binding.component_type ?? "Interface"} · ${selected.ui_binding.theme ?? "default theme"}` : "Staff workspace")}
      </span>
      <Link className="portal-hud-toolbar__reality" to="/hud" aria-label="Launch MAX REALITY spatial HUD">
        <span aria-hidden="true">◈</span> MAX REALITY
      </Link>
    </aside>
  );
}
