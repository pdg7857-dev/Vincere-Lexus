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

  /* --- The 7 marques you specialise in ----------------------------------- */
  marques: ["Lexus", "Jaguar", "Mercedes-Benz", "BMW", "Volvo", "Porsche", "Audi"],

  /* --- Credibility stats (Room 3). Edit freely. -------------------------- */
  stats: [
    { value: "150+", label: "Cars sourced" },        // [PLACEHOLDER]
    { value: "12 yrs", label: "In the trade" },       // [PLACEHOLDER]
    { value: "7", label: "Marques specialised" },
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

  /* --- The sourcing process (Room 2) ------------------------------------- */
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

  /* --- About copy (Room 3) ----------------------------------------------- */
  about: {
    lead: "I source cars for people who value their time and their taste.",
    body: [
      "Phil Dave is a private luxury car sourcer based in the Greater Toronto Area. I don't run a dealership — I work for the buyer. That means finding the right car, verifying it properly, negotiating the price down, and handling every detail of the acquisition so you don't have to.",
      "Years in the trade have built a network that reaches well past the public listings. Whether it's a specific Porsche allocation, a low-kilometre Lexus, or the exact Mercedes spec you've been picturing, I find it — quietly, and on your terms.",
    ],
  },

  /* --- INVENTORY (Room 1) ------------------------------------------------
     Data-driven. Add a car by copying one block. `status` is one of:
     "Available", "Sourced", "Sold". `image` is optional — leave "" to show an
     elegant marque card instead of a photo. If you add photos, drop them in
     /phil-dave/assets/ and reference them like "assets/my-car.jpg".          */
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
      make: "BMW", model: "M4 Competition", year: 2023, body: "coupe",
      note: "Isle of Man Green, carbon package, full PPF. Currently being inspected for a client.",
      status: "Available", image: "",
    },
    {
      make: "Jaguar", model: "F-Type R", year: 2021, body: "coupe",
      note: "Supercharged V8, Santorini Black. Quiet listing — never advertised publicly.",
      status: "Available", image: "",
    },
    {
      make: "Audi", model: "RS 6 Avant", year: 2024, body: "wagon",
      note: "Nardo Grey, Dynamic package plus. The wagon everyone wants. Allocation secured.",
      status: "Sourced", image: "",
    },
  ],

  /* --- The four rooms (hero hotspots map to these) ----------------------- */
  rooms: [
    { id: "inventory", label: "Inventory",   hint: "Current & sourced cars" },
    { id: "process",   label: "Sourcing",    hint: "How it works" },
    { id: "about",     label: "About Phil",  hint: "Why clients trust me" },
    { id: "contact",   label: "Request a Car", hint: "Tell me what you want" },
  ],

  /* --- Hero asset swapping ----------------------------------------------
     heroImage: path to a high-res car-on-pedestal PHOTO (PNG/WebP with a
                transparent or dark background works best). Leave "" to use
                the built-in platinum car illustration.
     heroModel: path to a .glb car model. If a file exists here, the site
                upgrades the hero to a real Three.js turntable automatically
                (drag to rotate). Leave "" to stay on the 2D hero.            */
  heroImage: "",                 // e.g. "assets/hero-car.webp"
  heroModel: "",                 // e.g. "models/car.glb"
};
