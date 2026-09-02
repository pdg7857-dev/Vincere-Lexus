#!/usr/bin/env python3
"""
Facebook Marketplace copy generation.

Produces THREE wording variants per vehicle that state the *same facts* in
different phrasing / sentence order, so multi-account/multi-city posts don't
read as carbon copies.

OMVIC compliance is the hard constraint: no variant may add, drop, soften, or
invent any material fact or price disclosure. To enforce that:
  * a locked `facts` dict is the single source of truth,
  * the LLM (if used) is told to reword only — never change facts,
  * every generated variant is validated to still contain price, odometer and
    stock; any that fails is replaced by the deterministic template.

If ANTHROPIC_API_KEY is not set, a deterministic 3-variant template is used
(no external call). Set FB_PRICE_DISCLOSURE to your dealer's correct all-in
price line — YOU are responsible for the disclosure being OMVIC-correct.
"""
from __future__ import annotations

import json
import os
import re
import urllib.request

# Neutral default. Override with the env var to match your OMVIC-compliant wording.
PRICE_DISCLOSURE = os.environ.get(
    "FB_PRICE_DISCLOSURE", "Advertised price plus HST and licensing."
)
# Automated-account listings should not impersonate Phil; point buyers to text him.
CONTACT_LINE = os.environ.get(
    "FB_CONTACT_LINE", "Message to confirm availability — I'm Phil's assistant; text Phil directly."
)


def facts_for(unit: dict) -> dict:
    """The single, locked source of truth for a vehicle's advertised facts."""
    return {
        "year": unit.get("year"),
        "make": (unit.get("brand") or "Lexus"),
        "model": unit.get("model") or "",
        "trim": unit.get("trim") or "",
        "condition": unit.get("condition") or "",
        "certified": bool(unit.get("certified")),
        "price": unit.get("price"),
        "odometer_km": unit.get("odometer"),
        "exterior_color": unit.get("exterior") or "",
        "stock": unit.get("stock") or "",
        "vin": unit.get("vin") or "",
        "url": unit.get("url") or "",
    }


def _title(f: dict) -> str:
    make, model = (f["make"] or "").strip(), (f["model"] or "").strip()
    # The dealer's JSON-LD model usually already includes the make ("Lexus NX");
    # only prepend the make when it isn't already there.
    make_part = "" if (not make or model.lower().startswith(make.lower())) else make
    bits = [str(f["year"] or "").strip(), make_part, model, f["trim"]]
    return re.sub(r"\s+", " ", " ".join(b for b in bits if b)).strip()


def _price_str(f: dict) -> str:
    return f"${f['price']:,}" if isinstance(f["price"], int) else "Price on request"


def _km_str(f: dict) -> str:
    return f"{f['odometer_km']:,} km" if isinstance(f["odometer_km"], int) else "kilometres on request"


# ------------------------------------------------------- deterministic templates
def _template_variants(f: dict) -> list[str]:
    title, price, km = _title(f), _price_str(f), _km_str(f)
    colour = f["exterior_color"]
    cond = "Certified Pre-Owned" if f["certified"] else (f["condition"] or "Pre-owned")
    stock = f["stock"]
    colour_clause = f" Finished in {colour}." if colour else ""
    v1 = (
        f"{title} — {price}. {cond}, {km}.{colour_clause} "
        f"Stock #{stock}. {PRICE_DISCLOSURE} {CONTACT_LINE}"
    )
    v2 = (
        f"{cond} {title}.{colour_clause} {km}, priced at {price} (stock #{stock}). "
        f"{PRICE_DISCLOSURE} {CONTACT_LINE}"
    )
    v3 = (
        f"Now available: {title}. {price}, {km}, {cond.lower()}.{colour_clause} "
        f"Ref stock #{stock}. {PRICE_DISCLOSURE} {CONTACT_LINE}"
    )
    return [re.sub(r"\s+", " ", v).strip() for v in (v1, v2, v3)]


# ------------------------------------------------------------- LLM (optional)
_SYSTEM = (
    "You write Facebook Marketplace listing copy for a licensed Ontario (OMVIC) "
    "car dealership. You will be given a vehicle's FACTS as JSON. Produce exactly "
    "three listing variants that convey the SAME facts in different wording and "
    "sentence order. HARD RULES: (1) Never add, drop, soften, exaggerate or invent "
    "any fact, feature, price, or disclosure. (2) Use only the facts given. (3) "
    "Include the price, the kilometres, the stock number, the given price "
    "disclosure line, and the given contact line in every variant. (4) No emojis, "
    "no ALL-CAPS hype, no claims about condition/warranty beyond what is given. "
    "Return ONLY a JSON array of three strings."
)


def _llm_variants(f: dict) -> list[str] | None:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    prompt = (
        f"FACTS (JSON):\n{json.dumps(f, ensure_ascii=False)}\n\n"
        f"PRICE_DISCLOSURE (use verbatim): {PRICE_DISCLOSURE}\n"
        f"CONTACT_LINE (use verbatim): {CONTACT_LINE}\n\n"
        "Return a JSON array of exactly three listing strings."
    )
    body = json.dumps(
        {
            "model": os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
            "max_tokens": 1200,
            "system": _SYSTEM,
            "messages": [{"role": "user", "content": prompt}],
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read())
        text = "".join(b.get("text", "") for b in data.get("content", []))
        m = re.search(r"\[.*\]", text, re.S)
        variants = json.loads(m.group(0)) if m else None
        if isinstance(variants, list) and len(variants) >= 3:
            return [str(v).strip() for v in variants[:3]]
    except Exception as e:  # noqa: BLE001
        print(f"  copy: LLM generation failed ({e}); using template", flush=True)
    return None


def _valid(variant: str, f: dict) -> bool:
    """Guardrail: the fact-bearing tokens must survive in the copy."""
    if f["stock"] and f["stock"] not in variant:
        return False
    if isinstance(f["price"], int) and f"{f['price']:,}" not in variant:
        return False
    if isinstance(f["odometer_km"], int) and f"{f['odometer_km']:,}" not in variant:
        return False
    return True


def marketplace_copy(unit: dict) -> dict:
    """Return {title, facts, variants[3], source}."""
    f = facts_for(unit)
    template = _template_variants(f)
    variants = _llm_variants(f)
    source = "anthropic"
    if not variants:
        variants, source = template, "template"
    else:
        # Replace any variant that dropped a hard fact with the safe template.
        variants = [v if _valid(v, f) else template[i] for i, v in enumerate(variants)]
        if all(v in template for v in variants):
            source = "template"
    return {"title": _title(f), "facts": f, "variants": variants, "source": source}
