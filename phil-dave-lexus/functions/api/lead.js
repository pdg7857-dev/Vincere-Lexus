// Cloudflare Pages Function — POST /api/lead
// ---------------------------------------------------------------------------
// Verifies a Cloudflare Turnstile token, then inserts the lead into Supabase.
// This runs on Cloudflare's edge (server-side), so a bot can't skip the check
// the way it could a client-only widget.
//
// Set these as environment variables on the Pages project
// (Cloudflare dashboard → your Pages project → Settings → Environment variables):
//   TURNSTILE_SECRET   — the Turnstile SECRET key (pairs with the site key)
//   SUPABASE_URL       — https://xgvawsupcfasksvvxyyi.supabase.co
//   SUPABASE_ANON_KEY  — your Supabase anon key
//
// Nothing secret ships to the browser: the site only holds the Turnstile SITE
// key; the secret + Supabase keys live only here, in the Pages env.

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();

    // 1) verify the Turnstile token with Cloudflare
    const token = body["cf-turnstile-response"];
    if (!token) return json({ ok: false, error: "missing-token" }, 400);

    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET || "");
    form.append("response", token);
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) form.append("remoteip", ip);

    const verify = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const outcome = await verify.json();
    if (!outcome.success) return json({ ok: false, error: "failed-captcha" }, 403);

    // 2) build the lead row (drop the token; keep the rest as payload)
    const data = Object.assign({}, body);
    delete data["cf-turnstile-response"];
    const row = {
      source: data.source || "Website",
      name: data.name || data.dreamcar || "",
      phone: data.phone || "",
      email: data.email || "",
      payload: data,
    };

    // 3) insert into Supabase
    const r = await fetch(
      env.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/leads",
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: "Bearer " + env.SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(row),
      }
    );
    if (!r.ok) return json({ ok: false, error: "insert-failed" }, 502);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "bad-request" }, 400);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}
