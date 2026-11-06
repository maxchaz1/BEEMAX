declare global {
  const Env: typeof import("../src/types").Env;
  const bindings: import("../src/types").Env;
  const SELF: typeof import("cloudflare:test").SELF;
  const worker: typeof import("../src/index").default;
  const createExecutionContext: typeof import("cloudflare:test").createExecutionContext;
  const get: (path: string, init?: RequestInit) => Promise<Response>;
  const describe: typeof import("vitest").describe;
  const it: typeof import("vitest").it;
  const expect: typeof import("vitest").expect;
}
export {};
