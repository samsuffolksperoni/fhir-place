import { serve } from "@hono/node-server";
import { openDb } from "../db/client.js";
import { createApp } from "./app.js";
import { createConnectionStore } from "./services/connection-store.js";

const port = Number(process.env.WORKBENCH_PORT ?? 5175);
const db = openDb();
const connections = createConnectionStore(db);
const app = createApp({ connections });

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`workbench server listening on http://127.0.0.1:${info.port}`);
});
