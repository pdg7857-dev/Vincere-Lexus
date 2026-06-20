// Anthropic integration for email-signature extraction + note summarization.
//
// Model is read from ANTHROPIC_MODEL (.env), defaulting to claude-sonnet-4-6 —
// the model the brief chose; appropriate and cost-effective for extraction and
// summarization. The key is read from .env and NEVER hardcoded.
//
// Everything degrades gracefully: with no ANTHROPIC_API_KEY, parseSignature
// returns null and summarize returns null, so the intake pipeline still runs
// (just without AI enrichment). All calls are wrapped so a model/API hiccup
// never breaks intake.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
let _client: Anthropic | null = null;

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Pull the first {...} JSON object out of a model reply, tolerating fences/prose. */
function looseJson(s: string): Record<string, unknown> | null {
  const cleaned = s.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const v = JSON.parse(cleaned.slice(start, end + 1));
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export type Signature = {
  name?: string;
  company?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
};

/** Extract a contact from an email signature block. Returns null if unavailable. */
export async function parseSignature(emailBody: string): Promise<Signature | null> {
  const c = client();
  if (!c || !emailBody?.trim()) return null;
  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 400,
      system:
        "You extract contact details from an email's signature block. " +
        "Respond with ONLY a JSON object with keys: name, company, title, phone, email, website. " +
        "Use null for anything not clearly present. No prose, no code fences.",
      messages: [{ role: "user", content: `Email:\n\n${emailBody.slice(0, 4000)}` }],
    });
    const obj = looseJson(textOf(msg));
    if (!obj) return null;
    const pick = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : undefined;
    return {
      name: pick(obj.name),
      company: pick(obj.company),
      title: pick(obj.title),
      phone: pick(obj.phone),
      email: pick(obj.email),
      website: pick(obj.website),
    };
  } catch {
    return null;
  }
}

/** One- or two-sentence summary of an interaction for the activity timeline. */
export async function summarize(text: string, context = ""): Promise<string | null> {
  const c = client();
  if (!c || !text?.trim()) return null;
  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 220,
      system:
        "Summarize this sales interaction in 1-2 concise sentences for a CRM activity log. " +
        "Capture intent, any vehicles, budget, timeline, and the next step if present. " +
        "Output only the summary text.",
      messages: [
        { role: "user", content: `${context ? context + "\n\n" : ""}${text.slice(0, 6000)}` },
      ],
    });
    return textOf(msg) || null;
  } catch {
    return null;
  }
}
