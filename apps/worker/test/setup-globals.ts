import { env, SELF, createExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/types";

const bindings = env as unknown as Env;
const get = (path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  if ((!init?.method || init.method === "GET") && !headers.has("Authorization"))
    headers.set("Authorization", "Bearer synthetic-test-token");
  return SELF.fetch(`https://portal.test${path}`, { ...init, headers });
};
