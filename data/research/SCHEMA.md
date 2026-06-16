# Cross-brand 2026 dataset schema (Canada)

Each brand research file is `data/research/<brand>.json` with this shape:

```json
{
  "brand": "BMW",
  "market": "Canada",
  "year": 2026,
  "currency": "CAD",
  "brandReliability": {
    "score_100": 0,            // 0-100 composite (higher = more reliable). See sources.
    "rank_note": "e.g. 18th of 30 brands, Consumer Reports 2025",
    "predicted_owner_cost_note": "qualitative",
    "sources": ["url"]
  },
  "warranty": {
    "comprehensive": "4 yr / 80,000 km",
    "powertrain": "4 yr / 80,000 km",
    "corrosion": "12 yr / unlimited",
    "roadside": "4 yr / unlimited",
    "ev_battery": "8 yr / 160,000 km",
    "notes": ""
  },
  "maintenance": {
    "complimentary_plan": "e.g. 3 yr/60,000 km BMW Ultimate Care (scheduled maintenance incl.)",
    "est_5yr_service_cad": 0,   // realistic 5-yr scheduled-maintenance out-of-pocket estimate (after any free plan)
    "est_annual_service_cad": 0,
    "notes": "what's included/excluded; brake/tire wear items"
  },
  "models": [
    {
      "model": "X5",
      "bodyStyle": "SUV",            // Sedan | SUV | Coupe | Convertible | Wagon | Hatchback | Minivan
      "segment": "Midsize luxury SUV",
      "modelReliability_100": null,   // model-specific if known, else null
      "trims": [
        {
          "trim": "xDrive40i",
          "price_cad": 87900,         // starting MSRP (note: state if incl freight)
          "freight_incl": false,
          "powertrain": {
            "type": "gas",            // gas | mild-hybrid | hybrid | phev | ev | diesel
            "engine": "3.0L turbo I6 mild hybrid",
            "hp": 375,
            "torque_lbft": 398,
            "drivetrain": "AWD",      // FWD | RWD | AWD
            "transmission": "8-spd auto",
            "fuel_l100_comb": 9.8,    // combined L/100km; null for EV
            "ev_range_km": null,      // EV/PHEV electric range; null for pure ICE
            "battery_kwh": null
          },
          "perf": { "zero_100_s": 5.4, "top_speed_kmh": 209 },
          "seats": 5,
          "notable_features": ["Live Cockpit Pro", "adaptive suspension"],
          "pros": ["strong straight-six", "sharp handling"],
          "cons": ["pricey options", "firm ride on M trims"],
          "confidence": "high"        // high | med | low
        }
      ]
    }
  ],
  "notes": "anything important about coverage/gaps"
}
```

## Rules
- Cover **every 2026 model sold in Canada** for the brand, and **every trim** of each model.
- Prices in **CAD MSRP**. Prefer the brand's Canadian site (bmw.ca / mercedes-benz.ca / audi.ca). State if freight/PDI is included.
- Use real, verifiable numbers. If unsure of an exact figure, give your best estimate and set `confidence` to `med`/`low`. Never invent precise prices you can't support — round/estimate and flag.
- pros/cons should be concise, factual, review-grounded (handling, ride, tech, value, reliability reputation, running costs).
- Keep numbers numeric (no "$", no "km"). Use null where unknown.
