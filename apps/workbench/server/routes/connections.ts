import { Hono } from "hono";
import type { Context } from "hono";
import { CreateConnectionInput } from "../schemas.js";
import type { ConnectionStore } from "../services/connection-store.js";

export function connectionsRoutes(store: ConnectionStore) {
  const app = new Hono();

  app.get("/", (c) => c.json({ connections: store.list() }));

  app.post("/", async (c) => {
    const body = await safeJson(c);
    const parsed = CreateConnectionInput.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
    }
    const row = store.create(parsed.data);
    return c.json({ connection: row }, 201);
  });

  app.get("/:id", (c) => {
    const id = c.req.param("id");
    const row = store.get(id);
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json({ connection: row });
  });

  app.post("/:id/test", async (c) => {
    const id = c.req.param("id");
    const out = await store.test(id);
    if (!out) return c.json({ error: "not_found" }, 404);
    return c.json({ connection: out.row, capability: out.result });
  });

  app.delete("/:id", (c) => {
    const id = c.req.param("id");
    const deleted = store.delete(id);
    if (!deleted) return c.json({ error: "not_found" }, 404);
    return c.body(null, 204);
  });

  return app;
}

async function safeJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}
