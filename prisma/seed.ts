/**
 * Seeds a development/staging catalog and default content. Idempotent — safe to re-run.
 * All copy and prices are PLACEHOLDERS pending LYRIT brand approval (PRD §5.3, §26).
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync } from "fs";

/** Prefer real photography (public/images/photos, see scripts/import-photos.mjs) over SVG placeholders. */
const img = (photo: string, fallback: string) => (existsSync(`public${photo}`) ? photo : fallback);

const db = new PrismaClient();
const EGP = (pounds: number) => pounds * 100;

const CATEGORIES = [
  { slug: "shampoos", name: "Shampoos", description: "Gentle cleansers that respect your hair's natural balance." },
  { slug: "conditioners", name: "Conditioners", description: "Lightweight hydration for soft, manageable hair." },
  { slug: "hair-oils", name: "Hair Oils", description: "Nourishing oils for shine, softness and scalp care." },
  { slug: "hair-masks", name: "Hair Masks", description: "Weekly rituals for deeply conditioned hair." },
  { slug: "hair-treatments", name: "Hair Treatments", description: "Targeted care for specific hair concerns." },
  { slug: "bundles", name: "Bundles", description: "Complete routines, thoughtfully paired." },
];

type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  short: string;
  description: string;
  benefits: string[];
  ingredients: string;
  usage: string;
  tags: string[];
  featured?: number;
  variants: { name: string; sku: string; price: number; compareAt?: number; stock: number }[];
};

const PRECAUTIONS = "For external use only. Avoid contact with eyes; if contact occurs, rinse thoroughly with water. Discontinue use if irritation occurs. Patch test before first use. Keep out of reach of children.";

const PRODUCTS: SeedProduct[] = [
  {
    slug: "argan-repair-shampoo", name: "Argan Repair Shampoo", category: "shampoos", featured: 1,
    short: "A gentle, sulfate-free cleanser enriched with argan oil for dry and damaged hair.",
    description: "Our signature shampoo lifts away impurities while helping hair feel soft and replenished.\n\nFormulated for everyday use on dry, coloured or heat-styled hair.",
    benefits: ["Sulfate-free cleansing", "Leaves hair feeling soft", "Suitable for coloured hair", "Light, natural fragrance"],
    ingredients: "Aqua, Sodium Cocoyl Isethionate, Cocamidopropyl Betaine, Argania Spinosa (Argan) Kernel Oil, Glycerin, Panthenol, Parfum, Citric Acid. (Placeholder — final INCI list to be supplied by LYRIT.)",
    usage: "Massage into wet hair and scalp.\nRinse thoroughly. Repeat if desired.\nFollow with Silk Smooth Conditioner.",
    tags: ["argan", "dry hair", "repair", "sulfate-free"],
    variants: [{ name: "250 ml", sku: "LY-SH-ARG-250", price: 420, stock: 40 }, { name: "500 ml", sku: "LY-SH-ARG-500", price: 690, compareAt: 760, stock: 18 }],
  },
  {
    slug: "hydrating-rose-shampoo", name: "Hydrating Rose Shampoo", category: "shampoos", featured: 5,
    short: "A softly scented shampoo with rose water for normal to dry hair.",
    description: "A delicate daily cleanser that leaves hair fresh, light and easy to detangle.",
    benefits: ["Gentle daily cleanse", "Delicate rose scent", "Easy detangling"],
    ingredients: "Aqua, Rosa Damascena Flower Water, Decyl Glucoside, Glycerin, Aloe Barbadensis Leaf Juice, Parfum. (Placeholder.)",
    usage: "Apply to wet hair, lather and rinse.",
    tags: ["rose", "hydrating", "daily"],
    variants: [{ name: "250 ml", sku: "LY-SH-ROS-250", price: 390, stock: 32 }],
  },
  {
    slug: "volume-clarifying-shampoo", name: "Volume Clarifying Shampoo", category: "shampoos",
    short: "A refreshing clarifying shampoo for fine hair that needs lift.",
    description: "Removes styling residue and buildup to help fine hair feel lighter and fuller.",
    benefits: ["Removes product buildup", "Lightweight feel", "Refreshing mint notes"],
    ingredients: "Aqua, Coco-Glucoside, Mentha Piperita Oil, Citric Acid, Glycerin. (Placeholder.)",
    usage: "Use once or twice a week in place of your regular shampoo.",
    tags: ["volume", "fine hair", "clarifying"],
    variants: [{ name: "250 ml", sku: "LY-SH-VOL-250", price: 410, stock: 3 }],
  },
  {
    slug: "silk-smooth-conditioner", name: "Silk Smooth Conditioner", category: "conditioners", featured: 2,
    short: "A lightweight conditioner that detangles and softens without weighing hair down.",
    description: "A creamy conditioner that helps smooth the hair surface for a soft, silky finish.",
    benefits: ["Detangles instantly", "Smooth, soft finish", "Lightweight"],
    ingredients: "Aqua, Cetearyl Alcohol, Behentrimonium Chloride, Argania Spinosa Kernel Oil, Panthenol, Parfum. (Placeholder.)",
    usage: "After shampooing, apply to mid-lengths and ends.\nLeave for 2–3 minutes, then rinse.",
    tags: ["smooth", "detangle", "argan"],
    variants: [{ name: "250 ml", sku: "LY-CO-SLK-250", price: 440, stock: 35 }, { name: "500 ml", sku: "LY-CO-SLK-500", price: 720, stock: 12 }],
  },
  {
    slug: "nourishing-leave-in-conditioner", name: "Nourishing Leave-In Conditioner", category: "conditioners",
    short: "A light leave-in spray for daily softness and easy styling.",
    description: "Mist onto damp or dry hair to help detangle and add softness throughout the day.",
    benefits: ["No-rinse formula", "Helps detangle", "Light hold-free finish"],
    ingredients: "Aqua, Glycerin, Hydrolyzed Wheat Protein, Panthenol, Parfum. (Placeholder.)",
    usage: "Spray onto towel-dried hair and comb through. Do not rinse.",
    tags: ["leave-in", "detangle", "daily"],
    variants: [{ name: "150 ml", sku: "LY-CO-LVI-150", price: 380, stock: 0 }],
  },
  {
    slug: "golden-argan-hair-oil", name: "Golden Argan Hair Oil", category: "hair-oils", featured: 3,
    short: "A lightweight finishing oil for shine and softness.",
    description: "A silky blend of argan and jojoba oils that absorbs quickly to tame flyaways and add gloss.",
    benefits: ["Adds shine", "Tames flyaways", "Non-greasy finish"],
    ingredients: "Argania Spinosa Kernel Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Tocopherol, Parfum. (Placeholder.)",
    usage: "Warm 2–3 drops between palms and smooth over mid-lengths and ends of damp or dry hair.",
    tags: ["argan", "shine", "oil", "frizz"],
    variants: [{ name: "50 ml", sku: "LY-OI-ARG-050", price: 520, stock: 25 }, { name: "100 ml", sku: "LY-OI-ARG-100", price: 880, compareAt: 980, stock: 10 }],
  },
  {
    slug: "rosemary-growth-oil", name: "Rosemary Scalp Oil", category: "hair-oils", featured: 6,
    short: "A pre-wash scalp oil with rosemary for a nourishing massage ritual.",
    description: "Massage into the scalp before washing as part of a relaxing weekly ritual.",
    benefits: ["Pre-wash scalp massage", "Herbal rosemary aroma", "Lightweight blend"],
    ingredients: "Ricinus Communis (Castor) Seed Oil, Rosmarinus Officinalis Leaf Oil, Argania Spinosa Kernel Oil, Tocopherol. (Placeholder.)",
    usage: "Massage a few drops into the scalp. Leave for at least 30 minutes, then shampoo.",
    tags: ["rosemary", "scalp", "oil"],
    variants: [{ name: "50 ml", sku: "LY-OI-ROS-050", price: 460, stock: 22 }],
  },
  {
    slug: "deep-repair-hair-mask", name: "Deep Repair Hair Mask", category: "hair-masks", featured: 4,
    short: "A rich weekly mask for dry, stressed lengths.",
    description: "An indulgent conditioning treatment that helps hair feel stronger, softer and more manageable.",
    benefits: ["Intensive conditioning", "Softer, smoother lengths", "Weekly ritual"],
    ingredients: "Aqua, Cetearyl Alcohol, Butyrospermum Parkii (Shea) Butter, Argania Spinosa Kernel Oil, Hydrolyzed Keratin, Parfum. (Placeholder.)",
    usage: "Apply generously to clean, damp hair.\nLeave for 5–10 minutes, then rinse thoroughly.",
    tags: ["repair", "mask", "dry hair", "keratin"],
    variants: [{ name: "200 ml", sku: "LY-MA-REP-200", price: 560, stock: 20 }],
  },
  {
    slug: "shea-butter-moisture-mask", name: "Shea Butter Moisture Mask", category: "hair-masks",
    short: "A creamy shea butter mask for thick or curly hair.",
    description: "A cushiony mask that helps define and soften curls and coils.",
    benefits: ["Rich moisture", "Curl-friendly", "Softening"],
    ingredients: "Aqua, Butyrospermum Parkii Butter, Cocos Nucifera Oil, Glycerin, Parfum. (Placeholder.)",
    usage: "Apply to damp hair, leave for 10 minutes, rinse.",
    tags: ["shea", "curly", "moisture"],
    variants: [{ name: "200 ml", sku: "LY-MA-SHE-200", price: 540, stock: 14 }],
  },
  {
    slug: "keratin-bond-treatment", name: "Keratin Bond Treatment", category: "hair-treatments", featured: 7,
    short: "A leave-in treatment cream for heat-styled hair.",
    description: "A lightweight cream applied before styling to help protect and smooth hair.",
    benefits: ["Use before heat styling", "Smoothing", "Lightweight cream"],
    ingredients: "Aqua, Hydrolyzed Keratin, Cetearyl Alcohol, Panthenol, Parfum. (Placeholder.)",
    usage: "Apply to towel-dried hair before blow-drying or styling.",
    tags: ["keratin", "heat", "treatment"],
    variants: [{ name: "100 ml", sku: "LY-TR-KER-100", price: 650, stock: 16 }],
  },
  {
    slug: "scalp-renewal-serum", name: "Scalp Renewal Serum", category: "hair-treatments",
    short: "A refreshing, lightweight serum for scalp care.",
    description: "A water-light serum that leaves the scalp feeling fresh and comfortable.",
    benefits: ["Refreshing feel", "Non-greasy", "Daily use"],
    ingredients: "Aqua, Niacinamide, Panthenol, Mentha Piperita Oil. (Placeholder.)",
    usage: "Apply a few drops directly to the scalp and massage gently. Do not rinse.",
    tags: ["scalp", "serum", "treatment"],
    variants: [{ name: "50 ml", sku: "LY-TR-SCA-050", price: 590, stock: 9 }],
  },
  {
    slug: "complete-ritual-bundle", name: "The Complete Ritual", category: "bundles", featured: 8,
    short: "Shampoo, conditioner, mask and oil — a full LYRIT routine.",
    description: "Our four best-loved essentials, curated as one complete hair care ritual. Makes a beautiful gift.",
    benefits: ["Complete routine", "Value set", "Gift-ready packaging"],
    ingredients: "See individual products.",
    usage: "Shampoo, condition, mask weekly and finish with oil.",
    tags: ["bundle", "gift", "routine"],
    variants: [{ name: "4-piece set", sku: "LY-BU-RIT-004", price: 1690, compareAt: 1940, stock: 8 }],
  },
  {
    slug: "repair-duo-bundle", name: "Repair Duo", category: "bundles",
    short: "Argan Repair Shampoo and Deep Repair Hair Mask.",
    description: "A simple two-step routine for dry, stressed hair.",
    benefits: ["Two-step routine", "Value pairing"],
    ingredients: "See individual products.",
    usage: "Use the shampoo daily and the mask weekly.",
    tags: ["bundle", "repair"],
    variants: [{ name: "2-piece set", sku: "LY-BU-REP-002", price: 890, compareAt: 980, stock: 11 }],
  },
];

const PAGES = [
  {
    slug: "about",
    title: "About LYRIT",
    body: "LYRIT was created with a simple belief: beautiful hair begins with thoughtful care.\n\nWe develop considered formulas that nourish, strengthen and restore — designed to bring calm and ritual to your everyday routine.\n\n**Placeholder copy — to be replaced with the approved LYRIT brand story.**",
  },
  {
    slug: "shipping-returns",
    title: "Shipping & Returns",
    body: "## Delivery\n\n- Greater Cairo & Giza: 1–3 working days.\n- Other governorates: 3–6 working days.\n- Free delivery on qualifying orders (see checkout for your area).\n\n## Returns\n\nUnopened products in their original packaging may be returned within 14 days of delivery. For hygiene reasons, opened products can only be returned if faulty.\n\nTo start a return, [contact us](/contact) with your order number.\n\n**Placeholder policy — LYRIT to supply the approved policy before launch.**",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    body: "This Privacy Policy explains how LYRIT collects and uses your personal information when you visit or shop with us.\n\n## Information we collect\n\n- Contact details you provide (name, email, phone, delivery address).\n- Order history and preferences.\n- Technical information such as device and browser type.\n\n## How we use it\n\nTo process and deliver your orders, provide customer support, and — only with your consent — send marketing emails.\n\n## Payments\n\nCard payments are processed by our payment partner. LYRIT never stores your full card details.\n\n**Placeholder policy — to be reviewed and approved by LYRIT before launch.**",
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    body: "By using this website and placing an order you agree to these terms.\n\n## Orders & pricing\n\nAll prices are shown in Egyptian pounds (EGP). We reserve the right to cancel orders in the event of pricing errors or stock unavailability, in which case any payment will be refunded.\n\n**Placeholder terms — to be reviewed and approved by LYRIT before launch.**",
  },
];

const FAQS = [
  ["How long does delivery take?", "Orders within Greater Cairo usually arrive in 1–3 working days; other governorates in 3–6 working days."],
  ["Can I pay cash on delivery?", "Yes — cash on delivery is available in most areas. Available options are shown at checkout."],
  ["Do I need an account to order?", "No. You can check out as a guest. Creating an account lets you track orders and save addresses."],
  ["Are your products suitable for coloured hair?", "Each product page lists its ingredients and directions. If you have specific concerns, contact us before purchasing."],
  ["How do I return a product?", "Unopened products can be returned within 14 days. Contact us with your order number to start a return."],
];

async function main() {
  // Categories
  const catIds: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      create: { ...c, sortOrder: i, thumbnailUrl: img(`/images/photos/categories/${c.slug}.webp`, `/images/categories/${c.slug}.svg`) },
      update: {},
    });
    catIds[c.slug] = cat.id;
  }

  // Products
  for (const p of PRODUCTS) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    const product = await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        shortDescription: p.short,
        description: p.description,
        benefits: p.benefits,
        ingredients: p.ingredients,
        usageInstructions: p.usage,
        precautions: PRECAUTIONS,
        tags: p.tags,
        status: "PUBLISHED",
        publishedAt: new Date(),
        isFeatured: !!p.featured,
        featuredOrder: p.featured ?? 0,
        categories: { create: [{ categoryId: catIds[p.category] }] },
        images: {
          create: [
            { url: img(`/images/photos/products/${p.slug}-1.webp`, `/images/products/${p.slug}-1.svg`), altText: `${p.name} bottle`, sortOrder: 0 },
            { url: img(`/images/photos/products/${p.slug}-2.webp`, `/images/products/${p.slug}-2.svg`), altText: `${p.name} alternate view`, sortOrder: 1 },
          ],
        },
      },
    });
    for (const [i, v] of p.variants.entries()) {
      const variant = await db.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          variantName: v.name,
          attributes: { size: v.name },
          priceMinor: EGP(v.price),
          compareAtPriceMinor: v.compareAt ? EGP(v.compareAt) : null,
          stockQuantity: v.stock,
          sortOrder: i,
        },
      });
      if (v.stock > 0) await db.inventoryMovement.create({ data: { variantId: variant.id, delta: v.stock, balance: v.stock, reason: "INITIAL", note: "Seed" } });
    }
  }

  // Shipping zones
  if ((await db.shippingZone.count()) === 0) {
    await db.shippingZone.createMany({
      data: [
        { name: "Greater Cairo & Giza", regions: ["Cairo", "Giza"], feeMinor: EGP(60), freeShippingThreshold: EGP(1000), estimatedDaysMin: 1, estimatedDaysMax: 3, sortOrder: 0 },
        { name: "Alexandria & Delta", regions: ["Alexandria", "Qalyubia", "Dakahlia", "Sharqia", "Gharbia", "Monufia", "Beheira", "Kafr El Sheikh", "Damietta"], feeMinor: EGP(80), freeShippingThreshold: EGP(1500), estimatedDaysMin: 2, estimatedDaysMax: 4, sortOrder: 1 },
        { name: "Rest of Egypt", regions: [], feeMinor: EGP(110), freeShippingThreshold: EGP(2000), estimatedDaysMin: 3, estimatedDaysMax: 6, codAvailable: true, sortOrder: 2 },
      ],
    });
  }

  // Discounts
  await db.discountCode.upsert({
    where: { code: "WELCOME10" },
    create: { code: "WELCOME10", description: "10% off first order (sample)", type: "PERCENTAGE", value: 10, perCustomerLimit: 1, maxDiscountMinor: EGP(300) },
    update: {},
  });
  await db.discountCode.upsert({
    where: { code: "RITUAL100" },
    create: { code: "RITUAL100", description: "EGP 100 off orders over EGP 1,200 (sample)", type: "FIXED_AMOUNT", value: EGP(100), minOrderMinor: EGP(1200), usageLimit: 200 },
    update: {},
  });

  // Content
  const blocks: { key: string; type: string; data: Prisma.InputJsonValue; sortOrder?: number }[] = [
    { key: "announcement", type: "announcement", data: { messages: [{ text: "Free delivery in Cairo & Giza on orders over EGP 1,000", href: "/shipping-returns" }, { text: "Cash on delivery available across Egypt" }, { text: "New: The Complete Ritual gift set", href: "/products/complete-ritual-bundle" }] } },
    {
      key: "hero",
      type: "hero",
      data: {
        eyebrow: "Premium hair care",
        headline: "Naturally Beautiful Hair Starts Here",
        description: "Discover thoughtful hair care designed to nourish, strengthen, and restore your hair's natural beauty.",
        primaryCta: { label: "Shop Now", href: "/shop" },
        secondaryCta: { label: "Explore treatments", href: "/collections/hair-treatments" },
        imageDesktop: "/images/hero.svg",
        imageMobile: "",
        imageAlt: "LYRIT shampoo, hair oil and hair mask arranged together",
      },
    },
    {
      key: "benefits",
      type: "benefits",
      data: {
        items: [
          { icon: "sparkle", title: "Premium Quality", text: "Thoughtfully formulated hair care." },
          { icon: "shield", title: "Secure Payments", text: "Card, wallet or cash on delivery." },
          { icon: "truck", title: "Reliable Delivery", text: "Fast delivery across Egypt." },
          { icon: "chat", title: "Customer Support", text: "Real people, ready to help." },
        ],
      },
    },
    { key: "promo-treatments", type: "promo", sortOrder: 0, data: { eyebrow: "Targeted care", headline: "Treatments for every hair story", description: "From pre-styling creams to scalp serums — focused care for the results you want.", cta: { label: "Shop treatments", href: "/collections/hair-treatments" }, image: "/images/promo-treatments.svg", imageAlt: "LYRIT treatment bottle", theme: "beige" } },
    { key: "promo-bundles", type: "promo", sortOrder: 1, data: { eyebrow: "Gift sets", headline: "The Complete Ritual", description: "Four essentials, one beautiful routine. Save when you shop the set.", cta: { label: "Shop bundles", href: "/collections/bundles" }, image: "/images/promo-bundles.svg", imageAlt: "LYRIT bundle of hair care products", theme: "green" } },
  ];
  for (const b of blocks) {
    await db.contentBlock.upsert({ where: { key: b.key }, create: { ...b, sortOrder: b.sortOrder ?? 0 }, update: {} });
  }
  for (const p of PAGES) await db.page.upsert({ where: { slug: p.slug }, create: p, update: {} });
  if ((await db.faq.count()) === 0) await db.faq.createMany({ data: FAQS.map(([question, answer], i) => ({ question, answer, sortOrder: i })) });

  // Super admin
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@lyrit.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (password && !(await db.user.findUnique({ where: { email } }))) {
    await db.user.create({
      data: {
        email,
        name: "LYRIT Admin",
        passwordHash: await bcrypt.hash(password, 12),
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: "SUPER_ADMIN" }] },
      },
    });
    console.log(`Created super admin ${email} — change this password after first sign-in.`);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
