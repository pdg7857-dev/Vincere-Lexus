// Local MCP server — the "text updates via Claude" bridge.
//
// Add this to your Claude Desktop config so you can tell Claude things like
// "log a call with Mr. Tan, wants a white RX 350 under $80k" and it writes
// straight into the CRM. It talks to the CRM over HTTP (the token-protected
// /api/intake + /api/customers/search endpoints) — so the CRM must be running
// (npm run dev). Nothing is exposed publicly; everything stays on localhost.
//
//   Claude Desktop config (claude_desktop_config.json):
//   {
//     "mcpServers": {
//       "vincere-crm": {
//         "command": "npx",
//         "args": ["tsx", "/abs/path/to/crm/mcp/server.ts"],
//         "env": { "INTAKE_API_TOKEN": "<your token>", "CRM_BASE_URL": "http://localhost:3000" }
//       }
//     }
//   }
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.CRM_BASE_URL || "http://localhost:3000";
const TOKEN = process.env.INTAKE_API_TOKEN || "";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    json = { raw };
  }
  return { status: res.status, json };
}

const server = new McpServer({ name: "vincere-crm", version: "0.1.0" });

server.registerTool(
  "crm_capture",
  {
    title: "Capture a CRM update",
    description:
      "Log a sales update (call, note, text, meeting, or email) into the CRM. " +
      "Matches an existing customer by email, phone, or exact name, otherwise " +
      "creates a new lead for review. Pass as much identity as you know.",
    inputSchema: {
      text: z.string().describe("The update to log — your summary or the verbatim note."),
      customerName: z.string().optional().describe("Customer name, if known."),
      customerEmail: z.string().optional().describe("Customer email, if known."),
      customerPhone: z.string().optional().describe("Customer phone, if known."),
      type: z
        .enum(["CALL", "EMAIL", "NOTE", "MEETING", "TEXT"])
        .optional()
        .describe("Interaction type (default NOTE)."),
    },
  },
  async (args) => {
    const { status, json } = await api("/api/intake", {
      method: "POST",
      body: JSON.stringify({
        body: args.text,
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone,
        type: args.type,
      }),
    });
    const j = json as { ok?: boolean; customerId?: string; created?: boolean };
    const text =
      status === 200 && j.ok
        ? `Logged to CRM (customer ${j.customerId}${j.created ? ", newly created — pending review" : ""}).`
        : `Failed (HTTP ${status}): ${JSON.stringify(json)}`;
    return { content: [{ type: "text" as const, text }] };
  },
);

server.registerTool(
  "crm_search_customers",
  {
    title: "Search CRM customers",
    description: "Find customers by name, business, email, or phone.",
    inputSchema: { query: z.string().describe("Search text.") },
  },
  async (args) => {
    const { status, json } = await api(
      `/api/customers/search?q=${encodeURIComponent(args.query)}`,
    );
    const text =
      status === 200
        ? JSON.stringify((json as { results?: unknown }).results ?? json, null, 2)
        : `Failed (HTTP ${status}).`;
    return { content: [{ type: "text" as const, text }] };
  },
);

async function main() {
  if (!TOKEN) {
    console.error("INTAKE_API_TOKEN is not set — set it in .env or the MCP env block.");
  }
  await server.connect(new StdioServerTransport());
  console.error(`vincere-crm MCP server connected (CRM at ${BASE}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
