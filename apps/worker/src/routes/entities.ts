import type { Env } from "../types";

const MAX_BODY_BYTES = 32 * 1024;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

type JsonObject = Record<string, unknown>;
type Entity = {
  entity_id: string;
  category: string;
  title: string;
  status: string;
  ui_binding: JsonObject;
  state_payload: JsonObject;
  telemetry_stream: JsonObject;
  controls: JsonObject[];
};

const fail = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 256 && value.every((item) => isJsonValue(item, depth + 1));
  return isObject(value) && Object.keys(value).length <= 128 && Object.values(value).every((item) => isJsonValue(item, depth + 1));
}

function validateEntity(value: unknown): Entity | null {
  if (!isObject(value)) return null;
  const { entity_id, category, title, status, ui_binding, state_payload, telemetry_stream, controls } = value;
  if (!isText(entity_id, 120) || !ID_PATTERN.test(entity_id)) return null;
  if (!isText(category, 80) || !KEY_PATTERN.test(category)) return null;
  if (!isText(title, 200) || !isText(status, 40)) return null;
  if (!isObject(ui_binding) || !isObject(state_payload) || !isObject(telemetry_stream) || !Array.isArray(controls)) return null;
  if (!isText(ui_binding.component_type, 80) || !KEY_PATTERN.test(ui_binding.component_type)) return null;
  if (!isText(ui_binding.theme, 80)) return null;
  if (!isObject(ui_binding.layout_grid) || !Number.isInteger(ui_binding.layout_grid.cols) || !Number.isInteger(ui_binding.layout_grid.rows)) return null;
  const cols = ui_binding.layout_grid.cols as number;
  const rows = ui_binding.layout_grid.rows as number;
  if (cols < 1 || cols > 24 || rows < 1 || rows > 24) return null;
  if (!isText(telemetry_stream.endpoint, 200) || !telemetry_stream.endpoint.startsWith("/api/")) return null;
  if (!Number.isInteger(telemetry_stream.poll_interval_ms) || (telemetry_stream.poll_interval_ms as number) < 250 || (telemetry_stream.poll_interval_ms as number) > 60_000) return null;
  if (!Array.isArray(telemetry_stream.metric_keys) || telemetry_stream.metric_keys.length > 32 || !telemetry_stream.metric_keys.every((key) => isText(key, 64) && KEY_PATTERN.test(key))) return null;
  if (controls.length > 32 || !controls.every((control) => {
    if (!isObject(control) || !isText(control.action_id, 80) || !KEY_PATTERN.test(control.action_id) || !isText(control.label, 120)) return false;
    if (control.method !== "POST" && control.method !== "DELETE") return false;
    return control.payload_template === undefined || (isObject(control.payload_template) && isJsonValue(control.payload_template));
  })) return null;
  if (!isJsonValue(state_payload) || !isJsonValue(ui_binding) || !isJsonValue(telemetry_stream) || !isJsonValue(controls)) return null;
  return { entity_id, category, title, status, ui_binding, state_payload, telemetry_stream, controls };
}

function parseStoredJson(value: unknown): unknown {
  if (typeof value !== "string") throw new Error("Invalid stored JSON");
  const parsed: unknown = JSON.parse(value);
  if (!isJsonValue(parsed)) throw new Error("Invalid stored JSON");
  return parsed;
}

/** Called after the global portal guard authenticates staff and checks origin. */
export async function handleEntityRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/entities") return null;
  const headers = { "Cache-Control": "no-store" };

  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (id === null) {
      const rows = await env.DB.prepare(
        "SELECT entity_id, category, title, status FROM entity_registry WHERE status = 'active' ORDER BY category, title LIMIT 100",
      ).all<{ entity_id: string; category: string; title: string; status: string }>();
      return Response.json({ entities: rows.results }, { headers });
    }
    if (!ID_PATTERN.test(id)) return fail("A valid entity ID is required", 400);
    const row = await env.DB.prepare(
      "SELECT entity_id, category, title, status, ui_binding, state_payload, telemetry_stream, controls FROM entity_registry WHERE entity_id = ?",
    ).bind(id).first<Record<string, unknown>>();
    if (!row) return fail("Entity not found", 404);
    try {
      return Response.json({
        entity_id: row.entity_id,
        category: row.category,
        title: row.title,
        status: row.status,
        ui_binding: parseStoredJson(row.ui_binding),
        state_payload: parseStoredJson(row.state_payload),
        telemetry_stream: parseStoredJson(row.telemetry_stream),
        controls: parseStoredJson(row.controls),
      }, { headers });
    } catch {
      return fail("Stored entity data is invalid", 500);
    }
  }

  if (request.method !== "POST") return fail("Method not allowed", 405);
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return fail("Entity payload is too large", 413);
  let raw: string;
  try {
    raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return fail("Entity payload is too large", 413);
  } catch {
    return fail("Unable to read entity payload", 400);
  }
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return fail("Request body must be valid JSON", 400);
  }
  const entity = validateEntity(input);
  if (!entity) return fail("Entity does not match the supported schema", 400);
  await env.DB.prepare(
    `INSERT INTO entity_registry (entity_id, category, title, status, ui_binding, state_payload, telemetry_stream, controls, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(entity_id) DO UPDATE SET category=excluded.category, title=excluded.title,
       status=excluded.status, ui_binding=excluded.ui_binding, state_payload=excluded.state_payload,
       telemetry_stream=excluded.telemetry_stream, controls=excluded.controls, updated_at=excluded.updated_at`,
  ).bind(
    entity.entity_id,
    entity.category,
    entity.title,
    entity.status,
    JSON.stringify(entity.ui_binding),
    JSON.stringify(entity.state_payload),
    JSON.stringify(entity.telemetry_stream),
    JSON.stringify(entity.controls),
    Math.floor(Date.now() / 1000),
  ).run();
  return Response.json({ success: true, entity_id: entity.entity_id }, { status: 201, headers });
}
