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
  tagline: "Your Lexus, sourced.", // [PLACEHOLDER — your tagline]
  region: "Greater Toronto Area",

  /* --- Direct contact (used in Room 4 + footer) -------------------------- */
  contact: {
    phone: "514-943-3730",
    email: "pgelinas@northwestlexus.com",
    instagram: "@lexusphildave",
    instagramUrl: "https://instagram.com/lexusphildave",
  },

  /* --- WhatsApp "send me a text" bubble ----------------------------------
     `number` in international format, digits only (country code + number).
     Opens a WhatsApp chat to you, prefilled with `text`.                   */
  whatsapp: {
    number: "15149433730",           // +1 514 943 3730
    label: "Send me a text",
    text: "Hi Phil, I'm on your site and I'd like to ask about a car.",
    popup: "Hey 👋 how can I help?", // chat bubble that pops up after a delay
    popupDelaySeconds: 30,           // when it appears (with a soft chime)
    popupSound: true,
  },

  /* --- Lead form destination --------------------------------------------
     Easiest option: create a free form at https://formspree.io and paste the
     endpoint below (looks like "https://formspree.io/f/abcwxyz"). Until you
     set this, the form runs in DEMO mode (shows a success state, logs the
     payload to the console, and offers a mailto: fallback to your email).   */
  formEndpoint: "https://script.google.com/macros/s/AKfycbyNDlgwsTBHuUcnRWreNkLqr2S_y5-6CZ7Z_kz3Zwq34MmEvB3EsjHEuZ9WPiNlVFjPFg/exec",

  /* --- Newsletter (rendered at the bottom of every bay) -------------------
     Collects name, number, email and city. Until `endpoint` is set it runs
     in DEMO mode (success state + payload in the console).                 */
  newsletter: {
    kicker: "The daily drop",
    title: "New stock in your inbox, before anyone else.",
    body: "One email a day: the newest vehicles in stock and tips worth reading. Tell me who you are and where you are, and you're in.",
    button: "Subscribe",
    endpoint: "", // [PLACEHOLDER — e.g. a Formspree endpoint for the list]
  },

  /* --- The marques you source --------------------------------------------
     Drives both auto-scrolling logo marquees (under the hero and in About).
     Each key needs a matching assets/marques/<key>.webp                    */
  brands: [
    { key: "lexus-word", title: "Lexus", logo: "assets/marques/lexus-word.webp" },
    { key: "lexus-emblem", title: "Lexus", logo: "assets/marques/lexus-emblem.webp" },
  ],
  brandsLabel: "The pursuit of perfection",

  /* --- Make → model catalogue (drives the "Request a Car" typeahead) ------
     Picking a make filters the model suggestions, so what lands in the
     sheet stays consistent. "Other" lets someone free-type anything.       */
  carMakes: ["Lexus", "Porsche", "BMW", "Mercedes-Benz", "Audi", "Volvo", "Acura", "Land Rover", "Jaguar", "Lamborghini", "Zenvo", "Other"],
  carModels: {
    "Lexus": ["ES 300h", "IS 300", "IS 350", "LS 500", "LS 500h", "LC 500", "RC 350", "UX 250h", "NX 250", "NX 350", "NX 350h", "NX 450h+", "RX 350", "RX 350h", "RX 500h", "RZ 450e", "GX 550", "LX 600", "TX 350", "TX 500h"],
    "Porsche": ["911 Carrera", "911 Turbo S", "911 GT3", "718 Cayman", "718 Boxster", "Panamera", "Taycan", "Macan", "Cayenne", "Cayenne Coupe"],
    "BMW": ["2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "8 Series", "X1", "X3", "X5", "X6", "X7", "M2", "M3", "M4", "M5", "M8", "i4", "i5", "i7", "iX", "Z4"],
    "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLE", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "AMG GT", "EQE", "EQS"],
    "Audi": ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron GT", "Q4 e-tron", "S5", "RS5", "RS6", "RS7", "R8", "TT"],
    "Volvo": ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90", "C40 Recharge", "EX30", "EX90"],
    "Acura": ["Integra", "TLX", "RDX", "MDX", "ZDX", "NSX"],
    "Land Rover": ["Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque", "Discovery", "Discovery Sport", "Defender 90", "Defender 110", "Defender 130"],
    "Jaguar": ["F-Pace", "E-Pace", "I-Pace", "XE", "XF", "F-Type"],
    "Lamborghini": ["Urus", "Urus SE", "Huracan", "Revuelto"],
    "Zenvo": ["TSR-S", "Aurora"],
    "Other": []
  },

  /* --- Credibility stats (shown above About). Edit freely. --------------- */
  statsKicker: "Access to",
  stats: [
    { value: "50+", label: "Brand-new Lexus" },
    { value: "30+", label: "Certified pre-owned Lexus" },
    { value: "100+", label: "Used cars" },
    { value: "100%", label: "Customer satisfaction" },
  ],

  /* --- Client quotes (Room 3). Add/remove freely. ------------------------ */
  testimonials: [
    {
      quote: "Phil found the exact spec I'd been chasing for a year, and made the whole thing feel effortless.",
      author: "M., Forest Hill", // [PLACEHOLDER]
    },
    {
      quote: "Discreet, fast, and he found exactly what I asked for. The only person I call now.",
      author: "A., Oakville", // [PLACEHOLDER]
    },
    {
      quote: "Detailed, paperwork done, keys in hand. This is how buying a car should feel.",
      author: "R., Yorkville", // [PLACEHOLDER]
    },
  ],

  /* --- The sourcing process (Room 3) --------------------------------------- */
  process: [
    {
      step: "01",
      title: "Fill Out the Form",
      body: "Tell me the car you want right on the request form: make, model, colour, budget and timeline. No calls to book, no pressure. That's all I need to get started.",
    },
    {
      step: "02",
      title: "Search & Source",
      body: "I work my private network across the GTA and beyond to locate the right car, including quiet listings you'll never see publicly.",
    },
    {
      step: "03",
      title: "Inspection & Verification",
      body: "Every car is independently inspected with a full history check, so the car is exactly what it says it is before you commit.",
    },
    {
      step: "04",
      title: "Handover",
      body: "Paperwork prepared and the car detailed, ready for you at the dealership. Everything looked after from first request to keys in hand.",
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
      "Phil Dave is a luxury car sourcing specialist based in the Greater Toronto Area. I'm not a private seller. I work within an established luxury dealership group, and I'm your personal way in: I find the right car, verify it properly, and have everything ready before you walk through the door.",
      "I primarily focus on Lexus, but I can source any car from any make. When the right car surfaces, the purchase completes at the dealership, fully licensed, with financing and warranty available and the paperwork as clean as the car. Every deal has a full dealership standing behind it, but you deal with me.",
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
  /* A hand-picked showcase — the halo trims (one per model) and a few
     rare finds. Not the full book; the panel below invites a request. */
  inventory: [
    {
      make: "Lexus", model: "LC 500", year: 2025, body: "coupe",
      note: "The 5.0 V8 grand tourer. A naturally aspirated masterpiece Lexus builds almost by hand — and the coolest car it makes.",
      status: "Available", image: "assets/car-lc500.webp?v=3",
      spinModel: "models/lc500.glb", spinLength: 4.77,
      specs: [
        { label: "Mileage", value: "On request" },
        { label: "Engine", value: "5.0L naturally aspirated V8, 471 hp" },
        { label: "Gearbox", value: "10 speed automatic, rear wheel drive" },
        { label: "0–100", value: "4.4 seconds" },
        { label: "History", value: "Full history at the dealership" },
      ],
      story: [
        "The LC 500 is the car that proved Lexus could build emotion. It took the LF-LC concept to production almost unchanged, kept the free-breathing 5.0 V8 when the rest of the world turned to turbos, and wrapped it in one of the most beautiful bodies of the decade.",
        "It is hand-finished, rear-driven, and sounds like nothing else on the road. The flagship coupé for someone who wants presence without a badge that shouts.",
      ],
    },
    {
      make: "Lexus", model: "IS 500 F SPORT Performance", year: 2025, body: "sedan",
      note: "A V8 sleeper. 472 hp of naturally aspirated muscle in a compact sedan — the last of a dying breed.",
      status: "Available", image: "",
      specs: [
        { label: "Mileage", value: "On request" },
        { label: "Engine", value: "5.0L naturally aspirated V8, 472 hp" },
        { label: "Gearbox", value: "8 speed automatic, rear wheel drive" },
        { label: "0–100", value: "4.4 seconds" },
        { label: "History", value: "Full history at the dealership" },
      ],
      story: [
        "Lexus slotted its 5.0 V8 into the compact IS body and left the outside almost anonymous. The result is a proper sleeper: a limited-slip differential, adaptive dampers, and a soundtrack that turns heads long before the badge does.",
        "In an era of turbo fours, an atmospheric V8 sedan is a genuine collector's pick. This is one for the enthusiast who's done showing off.",
      ],
    },
    {
      make: "Lexus", model: "RC F", year: 2024, body: "coupe",
      note: "The V8 coupé. Track-bred, hand-built engine, and a howl only a naturally aspirated Lexus makes.",
      status: "Available", image: "",
      specs: [
        { label: "Mileage", value: "On request" },
        { label: "Engine", value: "5.0L naturally aspirated V8, 472 hp" },
        { label: "Gearbox", value: "8 speed automatic, Torsen LSD" },
        { label: "Chassis", value: "Adaptive dampers, Brembo brakes" },
        { label: "History", value: "Full history at the dealership" },
      ],
      story: [
        "The RC F is Lexus's answer to the German coupés, and it goes its own way: no turbos, no downsizing, just a hand-assembled 5.0 V8 that pulls to 7,300 rpm.",
        "A Torsen limited-slip diff, big Brembos and a torque-vectoring rear axle make it a genuine driver's car — one that will only get rarer.",
      ],
    },
    {
      make: "Lexus", model: "RX 500h F SPORT Performance", year: 2025, body: "suv",
      note: "The performance hybrid RX. Turbo-electric power, F SPORT chassis, and Direct4 all-wheel drive.",
      status: "Available", image: "",
      spinModel: "models/lexus-rx.glb", spinLength: 4.89, spinHide: ["Plate", "License"],
      specs: [
        { label: "Mileage", value: "On request" },
        { label: "Engine", value: "2.4L turbo hybrid, 366 hp combined" },
        { label: "Gearbox", value: "6 speed automatic, Direct4 AWD" },
        { label: "Chassis", value: "F SPORT adaptive suspension" },
        { label: "History", value: "Full history at the dealership" },
      ],
      story: [
        "The 500h is the RX with the volume turned up: a turbocharged hybrid driveline, the Direct4 all-wheel-drive system, and rear-wheel steering to shrink it in corners.",
        "It keeps everything that makes an RX effortless — the quiet, the quality, the ease — and adds a genuine turn of pace. The daily luxury SUV with a performance heart.",
      ],
    },
    {
      make: "Lexus", model: "LX 600 F SPORT", year: 2024, body: "suv",
      note: "The flagship 4WD. Twin turbo V6, three rows, and presence that needs no introduction.",
      status: "Available", image: "assets/car-lx.webp?v=3",
      spinModel: "models/lexus-lx.glb", spinLength: 5.10, spinHide: ["Plate", "License"],
      specs: [
        { label: "Mileage", value: "On request" },
        { label: "Engine", value: "3.4L twin turbo V6, 409 hp" },
        { label: "Gearbox", value: "10 speed automatic, full time 4WD" },
        { label: "Audio", value: "25 speaker Mark Levinson" },
        { label: "History", value: "Full history at the dealership" },
      ],
      story: [
        "LX is the flagship badge Lexus has reserved for its largest machine since 1996, and every generation has shared bones with the unstoppable Toyota Land Cruiser. This one rides on the newest 300 series platform: full boxed frame, locking centre differential, and the kind of engineering that gets measured in decades, not model years.",
        "Inside it is pure Lexus: semi aniline leather and a cabin assembled with fanatical care. It is the truck for people who could buy anything and want it to last forever.",
      ],
    },
    {
      make: "Lexus", model: "GX 550 Overtrail", year: 2024, body: "suv",
      note: "The body-on-frame Lexus that goes anywhere and comes back in comfort. Twin turbo V6, proper off-road hardware.",
      status: "Available", image: "assets/car-gx.webp?v=3",
      spinModel: "models/lexus-gx.glb", spinLength: 4.95, spinHide: ["Plate", "License"],
      specs: [
        { label: "Mileage", value: "On request" },
        { label: "Engine", value: "3.4L twin turbo V6, 349 hp" },
        { label: "Gearbox", value: "10 speed automatic, full time 4WD" },
        { label: "Capability", value: "Locking diffs, low range, 33\" tyres" },
        { label: "History", value: "Full history at the dealership" },
      ],
      story: [
        "The GX is the Lexus for people who actually go where the road ends. Built on a boxed ladder frame and sharing its bones with the Land Cruiser, it is engineered to outlast the pavement.",
        "Overtrail spec adds locking front and rear diffs, all-terrain tyres and a disconnecting sway bar — proper hardware, wrapped in leather-lined Lexus calm.",
      ],
    },
    {
      make: "Mercedes-AMG", model: "GT 63 S 4-Door", year: 2023, body: "coupe",
      note: "A rare trade-in. Hand-built 4.0 twin turbo V8, 630 hp, and everyday usability. The kind of car that doesn't sit long.",
      status: "Available", image: "",
      specs: [
        { label: "Mileage", value: "Low — on request" },
        { label: "Engine", value: "4.0L twin turbo V8, 630 hp" },
        { label: "Gearbox", value: "9 speed, AMG Performance 4MATIC+" },
        { label: "0–100", value: "3.2 seconds" },
        { label: "History", value: "Full history, inspected" },
      ],
      story: [
        "Not everything I place wears a Lexus badge. This AMG GT 63 S came through a trade and it's exactly the sort of car worth featuring: a hand-assembled twin-turbo V8, four proper doors, and supercar pace with room for the family.",
        "Cars like this move on relationships, not listings. If it speaks to you, ask — it won't be here long.",
      ],
    },
    {
      make: "Porsche", model: "911 Carrera S (992)", year: 2022, body: "coupe",
      note: "The benchmark sports car. Flat-six, rear-engined, and endlessly usable. A clean example, quietly available.",
      status: "Available", image: "",
      specs: [
        { label: "Mileage", value: "Low — on request" },
        { label: "Engine", value: "3.0L twin turbo flat-six, 443 hp" },
        { label: "Gearbox", value: "8 speed PDK, rear wheel drive" },
        { label: "0–100", value: "3.5 seconds" },
        { label: "History", value: "Full history, inspected" },
      ],
      story: [
        "The 992-generation 911 is the sports car every other sports car is measured against — fast, precise, and genuinely liveable every day of the year.",
        "A well-kept Carrera S rarely reaches the open market. This is one of the quiet ones. Ask and I'll tell you everything about it.",
      ],
    },
    {
      make: "BMW", model: "M4 Competition", year: 2023, body: "coupe",
      note: "A rare find. Twin turbo straight-six, 503 hp, and one of the sharpest chassis in the class.",
      status: "Available", image: "",
      specs: [
        { label: "Mileage", value: "Low — on request" },
        { label: "Engine", value: "3.0L twin turbo inline-six, 503 hp" },
        { label: "Gearbox", value: "8 speed automatic, rear wheel drive" },
        { label: "0–100", value: "3.9 seconds" },
        { label: "History", value: "Full history, inspected" },
      ],
      story: [
        "The Competition-spec M4 is BMW at its most focused: a 503 hp straight-six, an adaptive chassis, and the kind of steering feel that's getting harder to find.",
        "This is the sort of car that comes to me through the network before it's ever advertised. If it's on your list, let's talk.",
      ],
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
      a: "Completely. Names and numbers stay private. Many of the cars I place are never advertised publicly, and neither are my clients.",
    },
    {
      q: "Do you handle inspection and paperwork?",
      a: "Yes. Inspection before purchase, history and lien checks, financing if wanted, and registration. Everything closes through licensed, professional channels, end to end.",
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
      key: "lx", bay: "Bay 01", label: "About Me", section: "about",
      car: "Lexus LX 600", type: "photo",
      /* Lexus flagship SUV. Renders in its native paint; plate meshes hidden. */
      model: "models/lexus-lx.glb",
      modelLength: 5.10,
      spin3d: true,
      hideParts: ["Plate", "License"],
      image: "assets/hero-lc500-1536.webp",
      srcset: "assets/hero-lc500-600.webp 600w, assets/hero-lc500-900.webp 900w, assets/hero-lc500-1536.webp 1536w",
      alt: "Lexus on a lit studio podium",
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
      /* Find your Lexus bay — its own model (RX 350), plate hidden. */
      key: "rx", bay: "Bay 03", label: "Find your Lexus", section: "lexus",
      car: "Lexus RX 350", type: "photo",
      image: "assets/hero-lc500-1536.webp",
      srcset: "assets/hero-lc500-600.webp 600w, assets/hero-lc500-900.webp 900w, assets/hero-lc500-1536.webp 1536w",
      alt: "Lexus RX on a dark studio podium",
      model: "models/lexus-rx.glb",
      modelLength: 4.89,
      hideParts: ["Plate", "License"],
      pins: [{ x: 26, y: 54 }, { x: 60, y: 29 }, { x: 85, y: 47 }, { x: 53, y: 64 }],
      door: { x: 10, y: 22 },
    },
    {
      /* Request a Car bay — the halo: a Toyota GR Supra on the podium. */
      key: "supra", bay: "Bay 04", label: "Request a Car", section: "contact",
      car: "Toyota GR Supra", type: "photo",
      image: "assets/hero-lc500-1536.webp",
      srcset: "assets/hero-lc500-600.webp 600w, assets/hero-lc500-900.webp 900w, assets/hero-lc500-1536.webp 1536w",
      alt: "Toyota GR Supra on a dark studio podium",
      model: "models/supra.glb",
      modelLength: 4.38,
      hideParts: ["Plate", "License"],
      pins: [{ x: 33, y: 54 }, { x: 62, y: 33 }, { x: 88, y: 48 }, { x: 61, y: 63 }],
      door: { x: 12, y: 18 },
    },
  ],

  /* --- Bay 06 · Registration & credentials (OMVIC) ------------------------
     Ontario dealers and salespeople register with OMVIC; every deal is
     protected by the Motor Vehicle Dealers Act. Replace the registration
     numbers with your real ones before launch.                            */
  omvic: {
    lead: "Every deal is done by the book.",
    body: "I'm a registered salesperson working through a licensed Ontario dealership, so every purchase is covered by the same rules and protections as any franchised showroom, not a private sale.",
    badges: [
      { title: "OMVIC registered", text: "Registered salesperson under the Ontario Motor Vehicle Industry Council.", ref: "Reg. #000000" }, // [PLACEHOLDER — your OMVIC number]
      { title: "Licensed dealership", text: "Deals complete through a licensed Ontario motor vehicle dealer, bonded and in good standing." },
      { title: "Consumer protection", text: "Backed by the Motor Vehicle Dealers Act and the OMVIC Compensation Fund." },
      { title: "UCDA member", text: "Dealership is a member of the Used Car Dealers Association of Ontario." }, // [PLACEHOLDER — confirm]
    ],
    note: "Verify any Ontario registration at omvic.on.ca.",
  },

  /* --- Members area (Bay 05) ----------------------------------------------
     Access: anyone who subscribed on this device, or an email that your
     membership endpoint recognises. Point `endpoint` at a Google Apps
     Script web app that checks your Google Sheet and answers
     { "member": true | false } for ?email=...                             */
  members: {
    endpoint: "https://script.google.com/macros/s/AKfycbyNDlgwsTBHuUcnRWreNkLqr2S_y5-6CZ7Z_kz3Zwq34MmEvB3EsjHEuZ9WPiNlVFjPFg/exec",
  },

  /* Legacy single-photo fields (used only if bays is empty), plus the
     optional .glb turntable that activates when no photos are set at all.  */
  heroImage: "",
  heroImageSrcset: "",
  heroModel: "",                 // legacy single-hero mode only — bays use bays[].model

  /* Attribution for the 3D model (required by its Creative Commons license).
     ⚠ Current model is CC BY-NC (non-commercial) — replace it with a CC-BY
     model or get the artist's permission before using the site commercially. */
  modelCredits: [
    { text: "Lexus LC 500 by Socksthecat", url: "https://sketchfab.com/3d-models/lexus-lc-500-3f6118da005a457a9ce6d737e5d1e37d", license: "CC BY 4.0" },
    { text: "Lexus ES, GX, LX & RX 3D models via Sketchfab", url: "https://sketchfab.com/tags/lexus", license: "CC Attribution" },
  ],
};
