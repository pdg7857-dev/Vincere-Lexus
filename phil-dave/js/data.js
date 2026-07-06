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
    { key: "lamborghini", title: "Lamborghini" },
    { key: "zenvo", title: "Zenvo" },
    { key: "tedson", title: "Tedson Motors" },
  ],
  brandsLabel: "Brands I source",

  /* --- Credibility stats (Room 3). Edit freely. -------------------------- */
  stats: [
    { value: "150+", label: "Cars sourced" },        // [PLACEHOLDER]
    { value: "12 yrs", label: "In the trade" },       // [PLACEHOLDER]
    { value: "11", label: "Marques" },
    { value: "100%", label: "Discretion" },
  ],

  /* --- Client quotes (Room 3). Add/remove freely. ------------------------ */
  testimonials: [
    {
      quote: "Phil found the exact spec I'd been chasing for a year, and made the whole thing feel effortless.",
      author: "M., Forest Hill", // [PLACEHOLDER]
    },
    {
      quote: "Discreet, fast, and he negotiated better than I ever could. The only person I call now.",
      author: "A., Oakville", // [PLACEHOLDER]
    },
    {
      quote: "Delivered to my door, detailed, paperwork done. This is how buying a car should feel.",
      author: "R., Yorkville", // [PLACEHOLDER]
    },
  ],

  /* --- The sourcing process (Room 3) --------------------------------------- */
  process: [
    {
      step: "01",
      title: "Consultation",
      body: "We start with a quiet conversation about the car you want: spec, colour, feel, budget and timeline. No pressure, just a plan.",
    },
    {
      step: "02",
      title: "Search & Source",
      body: "I work my private network across the GTA and beyond to locate the right car, including quiet listings you'll never see publicly.",
    },
    {
      step: "03",
      title: "Inspection & Negotiation",
      body: "Every car is independently inspected with a full history check. I negotiate hard on your behalf so the number is right before you commit.",
    },
    {
      step: "04",
      title: "Delivery",
      body: "Paperwork handled, car detailed and delivered to your door. Everything looked after from first call to keys in hand.",
    },
  ],

  /* --- About copy (Room 2) -------------------------------------------------- */
  about: {
    /* portrait shown beside the story — replace the assets/phil-*.webp
       files to change it (black & white keeps the look consistent) */
    photo: "assets/phil-700.webp",
    photoSrcset: "assets/phil-440.webp 440w, assets/phil-700.webp 700w, assets/phil-1100.webp 1100w",
    photoAlt: "Phil Dave, on the phone beside a sourced coupe at the harbour",
    photoCaption: "Phil Dave, luxury car sourcing specialist",
    lead: "I source cars for people who value their time and their taste.",
    body: [
      "Phil Dave is a luxury car sourcing specialist based in the Greater Toronto Area. I'm not a private seller. I work within an established luxury dealership group, and I'm your personal way in: I find the right car, verify it properly, fight for the right number, and have everything ready before you walk through the door.",
      "And because clients trade in cars of every marque, what comes through my hands runs well past any single brand: Mercedes, Audi, or something rarer. When the right car surfaces, the purchase completes at the dealership, fully licensed, with financing and warranty available and the paperwork as clean as the car. Every deal has a full dealership standing behind it, but you deal with me.",
      "I grew up in Atlantic Canada and speak fluent French. Service available in English and French, across the GTA and beyond.",
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
      make: "Porsche", model: "911 Carrera Coupe", year: 2021, body: "coupe",
      note: "992 generation, PDK. The benchmark sports car, kept exactly as it should be.",
      /* ⚠ render + model use a CC BY-NC-SA source — replace with a CC-BY
         render or a real photo before commercial launch (like the Supra)   */
      status: "Available", image: "assets/car-911.webp",
      /* opening the card streams this model in and it spins over the still */
      spinModel: "models/car-911.glb", spinLength: 4.53,
      spinTune: [{ match: "PorschePorsche_911TurboS992_2021RegionA1", envMapIntensity: 0.5 }],
      specs: [
        { label: "Mileage", value: "38,851 km" },
        { label: "Engine", value: "3.0L twin turbo flat six" },
        { label: "Gearbox", value: "8 speed PDK" },
        { label: "Drive", value: "Rear wheel drive" },
        { label: "History", value: "Clean history, fully serviced" }, // [PLACEHOLDER — confirm]
      ],
      story: [
        "The 911 is the reference point every sports car gets measured against, and the 992 is its eighth generation. Launched in 2019, it still carries the silhouette Ferdinand Alexander Porsche drew in 1963, refined for six decades and never abandoned.",
        "Developed under Porsche design chief Michael Mauer, the 992 keeps the rear engined layout that makes a 911 a 911, adds a wider body and a sharper chassis, and pairs its twin turbo flat six with a PDK gearbox that shifts faster than thought. It is the everyday supercar, and it holds its value like almost nothing else on the road.",
      ],
    },
    {
      make: "Lexus", model: "LX 600", year: 2026, body: "suv",
      note: "The flagship 4WD. Twin turbo V6, three rows, and presence that needs no introduction.",
      status: "Available", image: "",
    },
    {
      make: "BMW", model: "X5 xDrive40i", year: 2024, body: "suv",
      note: "M Sport package, certified by BMW. The luxury SUV that does everything well.",
      status: "Available", image: "assets/car-x5.webp",
      spinModel: "models/car-x5.glb", spinLength: 4.94,
      spinTune: [{ match: "Marina_Bay_Blue_Metallic", envMapIntensity: 0.55 }],
      specs: [
        { label: "Mileage", value: "On request" }, // [PLACEHOLDER — real km]
        { label: "Engine", value: "3.0L turbocharged inline six" },
        { label: "Gearbox", value: "8 speed automatic, xDrive AWD" },
        { label: "Package", value: "M Sport, certified by BMW" },
        { label: "History", value: "Certified, inspected, warranty backed" },
      ],
      story: [
        "BMW invented its idea of the Sport Activity Vehicle with the first X5 in 1999, an SUV that drove like a 5 Series and reset what buyers expected from the whole segment. The G05 generation, launched in 2018, is the fourth and most complete expression of that idea.",
        "The xDrive40i pairs BMW's silky inline six with an eight speed automatic and intelligent all wheel drive, and the M Sport package sharpens the stance without costing any comfort. It is the default choice in the class for a reason.",
      ],
    },
    {
      make: "Volvo", model: "XC90 Recharge T8", year: 2024, body: "suv",
      note: "Electrified AWD, seven seats. Scandinavian calm with instant torque.",
      status: "Available", image: "",
    },
  ],

  /* --- The private-inventory invitation under the showroom --------------- */
  inventoryCta: {
    lead: "The showroom doesn't end here.",
    body: "What you see is a glimpse. Contact me to see the full inventory, or tell me what you're dreaming of and I'll find it.",
    button: "Request a car",
  },

  /* --- FAQ (shown in the Request room, above your direct contact) -------
     The questions discerning buyers actually ask. Edit freely.            */
  faq: [
    {
      q: "How does it work, and what are the terms?",
      a: "Simple, transparent terms agreed before any search begins, with no surprises and no hidden costs. Ask me and I'll walk you through exactly how it works.", // [PLACEHOLDER — confirm your model]
    },
    {
      q: "Do you only work within the GTA?",
      a: "My base and network are the Greater Toronto Area, but I source nationally and arrange transport when the right car sits elsewhere.",
    },
    {
      q: "Can you find a car outside the marques you list?",
      a: "The marques in the showroom are my specialties, but the network runs deeper. If you're after something else, just ask. I'll tell you honestly whether I'm the right person for it.",
    },
    {
      q: "How discreet is the process?",
      a: "Completely. Names, numbers and negotiations stay private. Many of the cars I place are never advertised publicly, and neither are my clients.",
    },
    {
      q: "Do you handle inspection and paperwork?",
      a: "Yes. Inspection before purchase, history and lien checks, negotiation, financing if wanted, registration and delivery. Everything closes through licensed, professional channels, end to end.",
    },
  ],

  /* (Section navigation now derives from `bays` below — each bay unlocks
     one section of the site.) */

  /* --- The garage: bays -----------------------------------------------------
     The site IS a garage. Each bay pairs a hero scene with ONE section of
     the website — you enter a bay to see that information. The four labelled
     pins over the car are the bay buttons ("About Me — Enter Bay 01"); the
     chevron door pin walks you to the next bay in order.

     Per bay:
       section: which page section this bay unlocks
               ("about" | "inventory" | "process" | "contact")
       label:   the button text shown on the pin
       car:     name engraved on the floor plaque
       type:    "photo" (image+srcset) · "illustration" (platinum car
                artwork on the lit pedestal) · "ghost" (empty pedestal with
                a faint silhouette — perfect for "your car here")
       pins:    the four bay-button positions {x,y} (percent of the photo
                in photo bays, of the whole stage otherwise)
       door:    where the next-bay chevron floats in the darkness

     To give Bay 03/04 a real car later: set type "photo" and add
     image/srcset/alt like the first two bays.                              */
  bays: [
    {
      key: "supra", bay: "Bay 01", label: "About Me", section: "about",
      car: "2025 Toyota GR Supra", type: "photo",
      /* model: this bay shows ONLY the spinning 3D car (no photo) wherever
         WebGL runs; the photo below is the fallback for reduced-motion /
         very old browsers. modelLength is the car's REAL length in metres —
         all bays share one scale, so walking bay to bay keeps the cars'
         sizes realistic relative to each other.
         Shared scale across bays: Supra 4.38 · LC 500 4.77 · M4 4.79 ·
         Urus 5.11 — walking bay to bay keeps relative sizes realistic.     */
      model: "models/car.glb",
      modelLength: 4.38,
      spin3d: true,
      /* material overrides applied in-engine at load (names from the .glb):
         satin CU-Later-Grey body with reflections tamed so real GPUs don't
         silver it out, black roof/glass surrounds and trim like the photo  */
      paintTune: [
        { match: "PaletteMaterial003", color: "#3a4149", stripMap: true,
          metalness: 0.1, roughness: 0.52, clearcoat: 0.4, clearcoatRoughness: 0.4, envMapIntensity: 0.3 },
        { match: "PaletteMaterial002", color: "#101114",
          metalness: 0.6, roughness: 0.35, envMapIntensity: 0.5 },
        { match: "PaletteMaterial001", color: "#17181b",
          metalness: 0.6, roughness: 0.4, envMapIntensity: 0.5 },
      ],
      image: "assets/hero-car-1536.webp",
      srcset: "assets/hero-car-600.webp 600w, assets/hero-car-900.webp 900w, assets/hero-car-1536.webp 1536w",
      alt: "Grey Toyota GR Supra on a lit studio podium",
      pins: [{ x: 27, y: 56 }, { x: 53, y: 30 }, { x: 81, y: 44 }, { x: 54, y: 70 }],
      door: { x: 89, y: 22 },
    },
    {
      key: "lc500", bay: "Bay 02", label: "The Show Room", section: "inventory",
      car: "Lexus LC 500", type: "photo",
      image: "assets/hero-lc500-1536.webp",
      srcset: "assets/hero-lc500-600.webp 600w, assets/hero-lc500-900.webp 900w, assets/hero-lc500-1536.webp 1536w",
      alt: "Red Lexus LC 500 on a dark studio podium",
      model: "models/lc500.glb",
      modelLength: 4.77,
      /* Infrared body is recoloured inside the model's palette texture;
         here we tame the shared atlas material so the red reads rich on
         real GPUs, and keep the carbon-fibre trim black                    */
      paintTune: [
        { match: "PaletteMaterial001",
          metalness: 0.3, roughness: 0.42, envMapIntensity: 0.35 },
        { match: "material_8", color: "#101114",
          metalness: 0.5, roughness: 0.5, envMapIntensity: 0.4 },
      ],
      pins: [{ x: 26, y: 54 }, { x: 60, y: 29 }, { x: 85, y: 47 }, { x: 53, y: 64 }],
      door: { x: 10, y: 22 },
    },
    {
      key: "m4", bay: "Bay 03", label: "Sourcing", section: "process",
      car: "BMW M4 Competition", type: "photo",
      image: "assets/hero-m4-1536.webp",
      srcset: "assets/hero-m4-600.webp 600w, assets/hero-m4-900.webp 900w, assets/hero-m4-1536.webp 1536w",
      alt: "Green BMW M4 Competition on a dark studio podium",
      model: "models/m4.glb",
      modelLength: 4.79,
      /* Source model shipped untextured, so its materials were re-authored
         from the part names baked into the file (M4Paint, M4Glass, …).
         Body is Signal Green matched to the photo; roof/aero stay carbon.  */
      paintTune: [
        { match: "M4Paint", color: "#0e8038",
          metalness: 0.15, roughness: 0.4, envMapIntensity: 0.35 },
        { match: "M4Carbon", envMapIntensity: 0.35 },
        { match: "M4Trim", envMapIntensity: 0.45 },
        { match: "M4Rim", envMapIntensity: 0.4 },
      ],
      pins: [{ x: 27, y: 55 }, { x: 57, y: 30 }, { x: 85, y: 49 }, { x: 58, y: 66 }],
      door: { x: 88, y: 18 },
    },
    {
      key: "urus", bay: "Bay 04", label: "Request a Car", section: "contact",
      car: "Lamborghini Urus SE", type: "photo",
      /* fallback photo still shows the Revuelto — swap it when an Urus
         podium shot arrives (photo only appears if 3D can't run)          */
      image: "assets/hero-revuelto-1536.webp",
      srcset: "assets/hero-revuelto-600.webp 600w, assets/hero-revuelto-900.webp 900w, assets/hero-revuelto-1536.webp 1536w",
      alt: "White Lamborghini supercar on a dark studio podium",
      model: "models/urus.glb",
      modelLength: 5.11,
      /* factory Arancio orange lives in the file's own materials — only
         the reflections are tamed so real GPUs don't blow the paint out   */
      paintTune: [
        { match: "LLamborghini_UrusPHEVRewardRecycled_2024Paint_Material1",
          metalness: 0.2, roughness: 0.3, envMapIntensity: 0.35 },
      ],
      pins: [{ x: 33, y: 54 }, { x: 62, y: 33 }, { x: 88, y: 48 }, { x: 61, y: 63 }],
      door: { x: 12, y: 18 },
    },
  ],

  /* Legacy single-photo fields (used only if bays is empty), plus the
     optional .glb turntable that activates when no photos are set at all.  */
  heroImage: "",
  heroImageSrcset: "",
  heroModel: "",                 // legacy single-hero mode only — bays use bays[].model

  /* Attribution for the 3D model (required by its Creative Commons license).
     ⚠ Current model is CC BY-NC (non-commercial) — replace it with a CC-BY
     model or get the artist's permission before using the site commercially. */
  modelCredits: [
    { text: "GR Supra by J5nnym1r™", url: "https://sketchfab.com/3d-models/toyota-gr-supra-371c9c1ded6440699b7c261c0fb82a2c", license: "CC BY-NC 4.0" },
    { text: "Lexus LC 500 by Socksthecat", url: "https://sketchfab.com/3d-models/lexus-lc-500-3f6118da005a457a9ce6d737e5d1e37d", license: "CC BY 4.0" },
    { text: "BMW M4 G82 Competition by DR1KING100K", url: "https://sketchfab.com/3d-models/bmw-m4-g82-competition-e7ec00b1dbe54901a5fc07801667897b", license: "CC BY 4.0" },
    { text: "2025 Lamborghini Urus SE by Ddiaz Design", url: "https://sketchfab.com/3d-models/2025-lamborghini-urus-se-cc113385b7e34481af5e50a2fb8b6b2e", license: "CC BY 4.0" },
    { text: "911 Turbo S render from a model by Ddiaz Design", url: "https://sketchfab.com/3d-models/2021-porsche-911-turbo-s-992-b6756fc06654405a839bf14e931e4c83", license: "CC BY-NC-SA 4.0" },
    { text: "BMW X5 M render from a model by GT Cars: Hyperspeed", url: "https://sketchfab.com/3d-models/bmw-x5-m-g05-4abeaa4dfee24ae5a49e12b624882e1b", license: "CC BY 4.0" },
  ],
};
