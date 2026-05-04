#!/usr/bin/env node
/**
 * CLI entrypoint for @fhir-place/mcp.
 *
 * Usage:
 *   npx @fhir-place/mcp --base-url https://hapi.fhir.org/baseR4
 *   npx @fhir-place/mcp --base-url https://hapi.fhir.org/baseR4 --bearer "$TOKEN"
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFhirMcpServer } from "../dist/index.js";

const args = process.argv.slice(2);

function flag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

const baseUrl = flag("--base-url");
const bearer = flag("--bearer");

if (!baseUrl) {
  console.error("Usage: @fhir-place/mcp --base-url <url> [--bearer <token>]");
  process.exit(1);
}

const headers = bearer ? { Authorization: `Bearer ${bearer}` } : undefined;

createFhirMcpServer({ baseUrl, headers })
  .then(async (server) => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Keep alive — stdio transport owns the process lifetime.
  })
  .catch((err) => {
    console.error("Failed to start FHIR MCP server:", err);
    process.exit(1);
  });
