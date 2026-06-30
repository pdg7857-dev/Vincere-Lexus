import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_MODEL } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// Natural-language task parsing via the Anthropic API (§5.2).
//
// Hard rule (§2): this NEVER throws to the caller and NEVER causes task loss.
// The task row is always persisted first; this only enriches it. On any failure
// (API down, malformed JSON) we return a safe default so the raw task survives.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedTask {
  title: string;
  notes: string | null;
  priority: number; // 1 | 2 | 3
  dueDate: string | null; // ISO 8601
  needsCalendar: boolean;
  calendarEventTime: string | null; // ISO 8601
}

export interface ParseResult {
  ok: boolean;
  parsed: ParsedTask;
  error?: string;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You convert a short free-text personal task note into structured fields.
You MUST respond with a single JSON object and nothing else — no prose, no markdown code fences.

Schema (all keys required):
{
  "title": "string, a concise cleaned-up title for the task",
  "notes": "string or null, any extra detail that isn't part of the title",
  "priority": 1,            // integer: 1 low, 2 medium, 3 high
  "dueDate": "ISO 8601 string or null",
  "needsCalendar": false,   // boolean
  "calendarEventTime": "ISO 8601 string or null"
}

Rules:
- Priority words: "urgent"/"asap"/"critical"/"high"/"important" => 3; "medium"/"soon" => 2; otherwise => 1.
  Explicit forms like "p3", "p2", "p1", "level 3", "level 2", "level 1", "priority 3" map directly.
- Resolve relative dates ("by the 5th", "Friday", "end of week", "tomorrow", "next Monday", "in 2 days")
  against the supplied current date/time. Output an absolute ISO 8601 timestamp (with timezone offset if known,
  otherwise local). If only a day is implied with no time, use 09:00 local for dueDate.
- Set needsCalendar=true ONLY if the task implies a scheduled meeting/appointment/call at a specific time,
  OR the user explicitly says to add it to the calendar.
- If needsCalendar is true and a specific time is implied, set calendarEventTime to that ISO 8601 time;
  otherwise calendarEventTime is null.
- Keep the title faithful to the user's intent; do not invent details.`;

export async function parseTask(
  rawInput: string,
  now: Date = new Date(),
): Promise<ParseResult> {
  const safeDefault: ParsedTask = {
    title: rawInput.trim().slice(0, 200) || 'Untitled task',
    notes: null,
    priority: 1,
    dueDate: null,
    needsCalendar: false,
    calendarEventTime: null,
  };

  try {
    const resp = await getClient().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current date/time: ${now.toISOString()} (also: ${now.toString()})\n\nTask note:\n${rawInput}`,
        },
      ],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const parsed = coerce(extractJson(text), safeDefault);
    return { ok: true, parsed };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, parsed: safeDefault, error };
  }
}

/** Pull a JSON object out of the model output, tolerating stray fences if any. */
function extractJson(text: string): unknown {
  let candidate = text.trim();
  // Strip accidental ```json ... ``` fences.
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();
  // Otherwise grab the first {...} span.
  if (!candidate.startsWith('{')) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      candidate = candidate.slice(start, end + 1);
    }
  }
  return JSON.parse(candidate);
}

/** Validate/normalize the parsed object; fall back per-field on bad values. */
function coerce(raw: unknown, fallback: ParsedTask): ParsedTask {
  const o = (raw ?? {}) as Record<string, unknown>;

  let priority = Number(o.priority);
  if (!Number.isFinite(priority) || priority < 1 || priority > 3) priority = 1;
  priority = Math.round(priority);

  const title =
    typeof o.title === 'string' && o.title.trim() ? o.title.trim().slice(0, 300) : fallback.title;

  const notes = typeof o.notes === 'string' && o.notes.trim() ? o.notes.trim() : null;

  return {
    title,
    notes,
    priority,
    dueDate: normalizeDate(o.dueDate),
    needsCalendar: o.needsCalendar === true,
    calendarEventTime: normalizeDate(o.calendarEventTime),
  };
}

function normalizeDate(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
