// Shared bearer-token check for the machine-to-machine intake endpoints
// (the Claude bridge / MCP server). These are NOT session-protected — they
// authenticate with INTAKE_API_TOKEN from .env. The proxy skips /api, so each
// route enforces this itself.
export function intakeAuthorized(req: Request): boolean {
  const token = process.env.INTAKE_API_TOKEN;
  if (!token) return false; // refuse all intake until a token is configured
  const hdr = req.headers.get("authorization") || "";
  const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7).trim() : "";
  const alt = (req.headers.get("x-intake-token") || "").trim();
  return bearer === token || alt === token;
}
