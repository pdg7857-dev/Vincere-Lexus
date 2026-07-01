/* ============================================================================
   Phil Dave — Luxury Car Sourcer (GTA)
   CONTENT & CONFIG
   ----------------------------------------------------------------------------
   Everything you'll want to edit lives in THIS file. You never need to touch
   the animation code (main.js) to update copy, cars, contact details, or the
   lead-form destination.

   Replace anything marked [PLACEHOLDER] with your real information.
   ========================================================================== */

window.SITE = {
  /* --- Brand ------------------------------------------------------------- */
  brand: "Phil Dave",
  // Short, confident tagline shown under the name on the hero.
  tagline: "Your dream car, sourced.", // [PLACEHOLDER — your tagline]
  region: "Greater Toronto Area",

  /* --- Direct contact (used in Room 4 + footer) -------------------------- */
  contact: {
    phone: "+1 (000) 000-0000",               // [PLACEHOLDER — your phone]
    email: "hello@phildave.example",          // [PLACEHOLDER — your email]
    instagram: "@phildave",                   // [PLACEHOLDER — your handle]
    instagramUrl: "https://instagram.com/",   // [PLACEHOLDER — your IG link]
  },

  /* --- Lead form destination --------------------------------------------
     Easiest option: create a free form at https://formspree.io and paste the
     endpoint below (looks like "https://formspree.io/f/abcwxyz"). Until you
     set this, the form runs in DEMO mode (shows a success state, logs the
     payload to the console, and offers a mailto: fallback to your email).   */
  formEndpoint: "", // [PLACEHOLDER — e.g. "https://formspree.io/f/xxxxxxx"]

  /* --- The marques you source --------------------------------------------
     Drives both auto-scrolling logo marquees (under the hero and in About).
     Each key needs a matching assets/marques/<key>.webp                    */
  brands: [
    { key: "porsche", title: "Porsche" },
    { key: "bmw", title: "BMW" },
    { key: "lexus", title: "Lexus" },
    { key: "mercedes-benz", title: "Mercedes-Benz" },
    { key: "audi", title: "Audi" },
    { key: "volvo", title: "Volvo" },
    { key: "acura", title: "Acura" },
    { key: "land-rover", title: "Land Rover" },
    { key: "zenvo", title: "Zenvo" },
    { key: "tedson", title: "Tedson Motors" },
  ],
  brandsLabel: "Brands I source",

  /* --- Credibility stats (Room 3). Edit freely. -------------------------- */
  stats: [
    { value: "150+", label: "Cars sourced" },        // [PLACEHOLDER]
    { value: "12 yrs", label: "In the trade" },       // [PLACEHOLDER]
    { value: "10", label: "Marques" },
    { value: "100%", label: "Discretion" },
  ],

  /* --- Client quotes (Room 3). Add/remove freely. ------------------------ */
  testimonials: [
    {
      quote: "Phil found the exact spec I'd been chasing for a year — and made the whole thing feel effortless.",
      author: "M. — Forest Hill", // [PLACEHOLDER]
    },
    {
      quote: "Discreet, fast, and he negotiated better than I ever could. The only person I call now.",
      author: "A. — Oakville", // [PLACEHOLDER]
    },
    {
      quote: "Delivered to my door, detailed, paperwork done. This is how buying a car should feel.",
      author: "R. — Yorkville", // [PLACEHOLDER]
    },
  ],

  /* --- The sourcing process (Room 3) --------------------------------------- */
  process: [
    {
      step: "01",
      title: "Consultation",
      body: "We start with a quiet conversation about the car you want — spec, colour, feel, budget and timeline. No pressure, no showroom.",
    },
    {
      step: "02",
      title: "Search & Source",
      body: "I work my private network across the GTA and beyond to locate the right car — including quiet listings you'll never see publicly.",
    },
    {
      step: "03",
      title: "Inspection & Negotiation",
      body: "Every car is independently inspected and history-checked. I negotiate hard on your behalf so the number is right before you commit.",
    },
    {
      step: "04",
      title: "Delivery",
      body: "Paperwork handled, car detailed and delivered to your door. White-glove from first call to keys in hand.",
    },
  ],

  /* --- About copy (Room 2) -------------------------------------------------- */
  about: {
    /* portrait shown beside the story — replace the assets/phil-*.webp
       files to change it (black & white keeps the look consistent) */
    photo: "assets/phil-700.webp",
    photoSrcset: "assets/phil-440.webp 440w, assets/phil-700.webp 700w, assets/phil-1100.webp 1100w",
    photoAlt: "Phil Dave, on the phone beside a sourced coupe at the harbour",
    photoCaption: "Phil Dave — luxury car sourcer",
    lead: "I source cars for people who value their time and their taste.",
    body: [
      "Phil Dave is a private luxury car sourcer based in the Greater Toronto Area. Every search is handled by me personally — finding the right car, verifying it properly, negotiating the number, and looking after every detail so you don't have to.",
      "Years in the trade have built a network that reaches well past the public listings, and every deal closes through licensed, established channels — the paperwork as clean as the car. Whether it's a specific Porsche allocation, a low-kilometre Lexus, or the exact Mercedes spec you've been picturing, I find it — quietly, and on your terms.",
      "Born in France, based in Toronto — service available in English and French.",
    ],
  },

  /* --- INVENTORY (Room 1) ------------------------------------------------
     Data-driven. Add a car by copying one block. `status` is one of:
     "Available", "Sourced", "Sold". `image` is optional — leave "" to show an
     elegant marque card instead of a photo. If you add photos, drop them in
     /phil-dave/assets/ and reference them like "assets/my-car.jpg".          */
  /* A curated selection — highlight 3 or 4 cars, no more. The full
     inventory stays private; the panel below the grid invites a request.
     `status`: "Available", "Sourced" (for a client), or "Sold".            */
  inventory: [
    {
      make: "Porsche", model: "911 Carrera S", year: 2023, body: "coupe",
      note: "GT Silver over black. Sport Chrono, PASM, ceramic brakes. Sourced privately for a returning client.",
      status: "Sourced", image: "",
    },
    {
      make: "Lexus", model: "LC 500", year: 2024, body: "coupe",
      note: "Naturally-aspirated V8. Infrared over Circuit Red. One of the cleanest examples in Ontario.",
      status: "Available", image: "",
    },
    {
      make: "Mercedes-Benz", model: "G 63 AMG", year: 2022, body: "suv",
      note: "Obsidian Black, Manufaktur interior. Located and delivered within nine days.",
      status: "Sold", image: "",
    },
    {
      make: "Audi", model: "RS 6 Avant", year: 2024, body: "wagon",
      note: "Nardo Grey, Dynamic package plus. The wagon everyone wants. Allocation secured.",
      status: "Sourced", image: "",
    },
  ],

  /* --- The private-inventory invitation under the showroom --------------- */
  inventoryCta: {
    lead: "The showroom doesn't end here.",
    body: "What you see is a glimpse. Contact me to see the full inventory — or tell me what you're dreaming of, and I'll find it.",
    button: "Request a car",
  },

  /* --- FAQ (shown in the Request room, above your direct contact) -------
     The questions discerning buyers actually ask. Edit freely.            */
  faq: [
    {
      q: "How does it work — fees, terms?",
      a: "Simple, transparent terms agreed before any search begins — no surprises, no hidden costs. Ask me and I'll walk you through exactly how it works.", // [PLACEHOLDER — confirm your model]
    },
    {
      q: "Do you only work within the GTA?",
      a: "My base and network are the Greater Toronto Area, but I source nationally and arrange transport when the right car sits elsewhere.",
    },
    {
      q: "Can you find a car outside the marques you list?",
      a: "The marques in the showroom are my specialties, but the network runs deeper. If you're after something else, ask — I'll tell you honestly whether I'm the right person for it.",
    },
    {
      q: "How discreet is the process?",
      a: "Completely. Names, numbers and negotiations stay private. Many of the cars I place are never advertised publicly, and neither are my clients.",
    },
    {
      q: "Do you handle inspection and paperwork?",
      a: "Yes — pre-purchase inspection, history and lien checks, negotiation, financing if wanted, registration and delivery. Everything closes through licensed, professional channels. White-glove, end to end.",
    },
  ],

  /* --- The four rooms (hero hotspots map to these; page order) ------------ */
  rooms: [
    { id: "about",     label: "About Phil",    hint: "The man behind the cars" },
    { id: "inventory", label: "The Show Room", hint: "Curated & sourced cars" },
    { id: "process",   label: "Sourcing",      hint: "How it works" },
    { id: "contact",   label: "Request a Car", hint: "Tell me what you want" },
  ],

  /* --- Hero asset swapping ----------------------------------------------
     Priority: heroImage (a real photo — used on ALL devices, wins over 3D)
             → heroModel (.glb on the 3D turntable, desktop only)
             → built-in procedural 3D car (desktop) / illustration (mobile).

     heroImage:       your car-on-a-podium photo. Shot on a black studio
                      background works best — it melts into the page.
     heroImageSrcset: optional responsive variants so phones download the
                      small file. Leave "" to always use heroImage.
     heroModel:       path to your own .glb car model (only used when
                      heroImage is ""); auto-scaled and grounded.            */
  heroImage: "assets/hero-car-1536.webp",
  heroImageSrcset: "assets/hero-car-600.webp 600w, assets/hero-car-900.webp 900w, assets/hero-car-1536.webp 1536w",
  heroModel: "",                 // e.g. "models/car.glb"
};
