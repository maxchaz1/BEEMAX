import { applyD1Migrations, env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import type { D1Migration } from "@cloudflare/vitest-plugin";
import type { Env } from "../src/types";

const bindings = env as unknown as Env & { TEST_MIGRATIONS: D1Migration[] };
const allowedOrigin = "https://portal-os1.pages.dev";
const entity = {
  entity_id: "ent_bemax_cog_01",
  category: "COGNITIVE_ARCHITECTURE",
  title: "BEMAX Autonomous Processing Vector",
  status: "active",
  ui_binding: {
    component_type: "HUD_CYBER_TERMINAL",
    theme: "quantum-dark",
    layout_grid: { cols: 12, rows: 8 },
  },
  state_payload: {
    entropy_level: 0.042,
    active_icvs: ["ICV-ALPHA-9", "ICV-DELTA-4"],
    processing_node: "cloudflare-edge-iad",
    sync_timestamp: 1778342400,
  },
  telemetry_stream: {
    endpoint: "/api/rpc/telemetry",
    poll_interval_ms: 1000,
    metric_keys: ["latency_ms", "memory_allocation_mb", "sync_state"],
  },
  controls: [
    { action_id: "realign_vector", label: "Realign Component Vectors", method: "POST", payload_template: { target: "all" } },
    { action_id: "purge_cache", label: "Purge Edge Cache", method: "DELETE" },
  ],
};

beforeAll(async () => {
  await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS);
});

describe("staff entity registry API", () => {
  it("requires staff authentication for reads", async () => {
    const response = await SELF.fetch("https://portal.test/api/entities?id=ent_bemax_cog_01", {
      headers: { Origin: allowedOrigin },
    });
    expect(response.status).toBe(401);
  });

  it("rejects origins outside the configured allowlist", async () => {
    const response = await SELF.fetch("https://portal.test/api/entities?id=ent_bemax_cog_01", {
      headers: { Origin: "https://untrusted.example", Authorization: "Bearer synthetic-test-token" },
    });
    expect(response.status).toBe(403);
  });

  it("stores and returns the complete structured entity for staff", async () => {
    const headers = { Origin: allowedOrigin, Authorization: "Bearer synthetic-test-token" };
    const create = await SELF.fetch("https://portal.test/api/entities", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(entity),
    });
    expect(create.status).toBe(201);

    const read = await SELF.fetch("https://portal.test/api/entities?id=ent_bemax_cog_01", { headers });
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual(entity);
    expect(read.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects malformed or unsafe entity configurations", async () => {
    const response = await SELF.fetch("https://portal.test/api/entities", {
      method: "POST",
      headers: { Origin: allowedOrigin, Authorization: "Bearer synthetic-test-token", "Content-Type": "application/json" },
      body: JSON.stringify({ ...entity, telemetry_stream: { ...entity.telemetry_stream, endpoint: "https://attacker.example/collect" } }),
    });
    expect(response.status).toBe(400);
  });
});
