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

/**
 * Catalog aligned with the LYRIT photography set: three ranges (Argan Repair, Hydrating Rose,
 * Volume Clarifying) × shampoo / conditioner / mask, plus oils, treatments and bundles.
 * Ingredient lists are PLACEHOLDERS — LYRIT must supply the final INCI lists.
 */
const RANGE = {
  argan: { name: "Argan Repair", tags: ["argan", "repair", "dry hair", "damaged hair"], scent: "warm, nutty argan" },
  rose: { name: "Hydrating Rose", tags: ["rose", "hydrating", "normal hair", "dry hair"], scent: "soft rose" },
  volume: { name: "Volume Clarifying", tags: ["volume", "clarifying", "fine hair", "oily scalp"], scent: "fresh mint and rosemary" },
} as const;

const rangeProducts = (key: keyof typeof RANGE, code: string, featured: { sh?: number; co?: number; ma?: number }): SeedProduct[] => {
  const r = RANGE[key];
  const slug = r.name.toLowerCase().replace(/ /g, "-");
  return [
    {
      slug: `${slug}-shampoo`, name: `${r.name} Shampoo`, category: "shampoos", featured: featured.sh,
      short: key === "argan" ? "A gentle, sulfate-free cleanser enriched with argan oil for dry and damaged hair."
        : key === "rose" ? "A softly scented daily shampoo with rose water for normal to dry hair."
        : "A refreshing clarifying shampoo that lifts away buildup for fine hair that needs lift.",
      description: `The first step in the ${r.name} ritual. A rich lather cleanses hair and scalp while leaving lengths feeling soft and easy to manage.\n\nScented with ${r.scent}.`,
      benefits: key === "argan" ? ["Sulfate-free cleansing", "Leaves hair feeling soft", "Suitable for coloured hair"]
        : key === "rose" ? ["Gentle daily cleanse", "Delicate rose scent", "Easy detangling"]
        : ["Removes product buildup", "Lightweight feel", "Refreshing mint notes"],
      ingredients: "Aqua, Sodium Cocoyl Isethionate, Cocamidopropyl Betaine, Glycerin, Panthenol, Parfum, Citric Acid. (Placeholder — final INCI list to be supplied by LYRIT.)",
      usage: `Massage into wet hair and scalp.\nRinse thoroughly. Repeat if desired.\nFollow with ${r.name} Conditioner.`,
      tags: [...r.tags, "shampoo"],
      variants: key === "argan"
        ? [{ name: "250 ml", sku: `LY-SH-${code}-250`, price: 420, stock: 40 }, { name: "500 ml", sku: `LY-SH-${code}-500`, price: 690, compareAt: 760, stock: 18 }]
        : [{ name: "250 ml", sku: `LY-SH-${code}-250`, price: key === "rose" ? 390 : 410, stock: key === "volume" ? 4 : 30 }],
    },
    {
      slug: `${slug}-conditioner`, name: `${r.name} Conditioner`, category: "conditioners", featured: featured.co,
      short: `A lightweight conditioner that detangles and softens — the second step of the ${r.name} ritual.`,
      description: `A creamy conditioner that helps smooth the hair surface for a soft, manageable finish without weighing hair down.\n\nScented with ${r.scent}.`,
      benefits: ["Detangles instantly", "Smooth, soft finish", "Lightweight"],
      ingredients: "Aqua, Cetearyl Alcohol, Behentrimonium Chloride, Glycerin, Panthenol, Parfum. (Placeholder.)",
      usage: "After shampooing, apply to mid-lengths and ends.\nLeave for 2–3 minutes, then rinse.",
      tags: [...r.tags, "conditioner"],
      variants: [{ name: "250 ml", sku: `LY-CO-${code}-250`, price: 440, stock: 25 }, { name: "500 ml", sku: `LY-CO-${code}-500`, price: 720, stock: 10 }],
    },
    {
      slug: `${slug}-mask`, name: `${r.name} Mask`, category: "hair-masks", featured: featured.ma,
      short: `A rich weekly treatment mask from the ${r.name} range.`,
      description: `An indulgent conditioning mask for a weekly ritual. Leaves hair feeling softer, smoother and more manageable.\n\nScented with ${r.scent}.`,
      benefits: ["Intensive conditioning", "Softer, smoother lengths", "Weekly ritual"],
      ingredients: "Aqua, Cetearyl Alcohol, Butyrospermum Parkii (Shea) Butter, Glycerin, Hydrolyzed Protein, Parfum. (Placeholder.)",
      usage: "Apply generously to clean, damp hair.\nLeave for 5–10 minutes, then rinse thoroughly.",
      tags: [...r.tags, "mask"],
      variants: [{ name: "200 ml", sku: `LY-MA-${code}-200`, price: 560, stock: key === "volume" ? 0 : 18 }],
    },
  ];
};

const PRODUCTS: SeedProduct[] = [
  ...rangeProducts("argan", "ARG", { sh: 1, ma: 4 }),
  ...rangeProducts("rose", "ROS", { sh: 5, co: 6 }),
  ...rangeProducts("volume", "VOL", { co: 8 }),
  {
    slug: "argan-hair-oil", name: "Argan Hair Oil", category: "hair-oils", featured: 2,
    short: "A lightweight finishing oil for shine and softness.",
    description: "A silky argan oil blend that absorbs quickly to tame flyaways and add gloss without a greasy finish.",
    benefits: ["Adds shine", "Tames flyaways", "Non-greasy finish"],
    ingredients: "Argania Spinosa (Argan) Kernel Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Tocopherol, Parfum. (Placeholder.)",
    usage: "Warm 2–3 drops between palms and smooth over mid-lengths and ends of damp or dry hair.",
    tags: ["argan", "oil", "shine", "frizz"],
    variants: [{ name: "50 ml", sku: "LY-OI-ARG-050", price: 520, stock: 25 }, { name: "100 ml", sku: "LY-OI-ARG-100", price: 880, compareAt: 980, stock: 10 }],
  },
  {
    slug: "rose-hair-oil", name: "Rose Hair Oil", category: "hair-oils", featured: 7,
    short: "A delicate rose-scented oil for soft, glossy lengths.",
    description: "A light floral oil blend for a soft, glossy finish and a lingering rose scent.",
    benefits: ["Glossy finish", "Delicate rose scent", "Lightweight"],
    ingredients: "Prunus Amygdalus Dulcis (Sweet Almond) Oil, Rosa Canina Fruit Oil, Tocopherol, Parfum. (Placeholder.)",
    usage: "Smooth 2–3 drops through mid-lengths and ends.",
    tags: ["rose", "oil", "shine"],
    variants: [{ name: "50 ml", sku: "LY-OI-ROS-050", price: 490, stock: 20 }],
  },
  {
    slug: "scalp-tonic", name: "Scalp Tonic", category: "hair-treatments",
    short: "A refreshing, lightweight tonic for daily scalp care.",
    description: "A water-light mist that leaves the scalp feeling fresh and comfortable.",
    benefits: ["Refreshing feel", "Non-greasy", "Daily use"],
    ingredients: "Aqua, Niacinamide, Panthenol, Rosmarinus Officinalis Leaf Extract. (Placeholder.)",
    usage: "Mist directly onto the scalp and massage gently. Do not rinse.",
    tags: ["scalp", "tonic", "treatment", "rosemary"],
    variants: [{ name: "100 ml", sku: "LY-TR-SCA-100", price: 590, stock: 9 }],
  },
  {
    slug: "heat-protect-spray", name: "Heat Protect Spray", category: "hair-treatments", featured: 3,
    short: "A light pre-styling mist for blow-drying and hot tools.",
    description: "Mist onto damp hair before heat styling for a smooth, soft finish.",
    benefits: ["Use before heat styling", "Smoothing", "Lightweight mist"],
    ingredients: "Aqua, Hydrolyzed Wheat Protein, Panthenol, Glycerin, Parfum. (Placeholder.)",
    usage: "Spray evenly over damp hair before blow-drying or styling.",
    tags: ["heat", "styling", "spray", "treatment"],
    variants: [{ name: "150 ml", sku: "LY-TR-HPS-150", price: 520, stock: 16 }],
  },
  {
    slug: "argan-repair-ritual", name: "Argan Repair Ritual", category: "bundles",
    short: "Argan Repair Shampoo, Argan Repair Mask and Argan Hair Oil.",
    description: "A complete three-step ritual for dry, stressed hair — cleanse, treat and finish.",
    benefits: ["Three-step routine", "Value set", "Gift-ready"],
    ingredients: "See individual products.",
    usage: "Shampoo, mask weekly and finish with oil.",
    tags: ["bundle", "gift", "argan", "repair"],
    variants: [{ name: "3-piece set", sku: "LY-BU-ARG-003", price: 1390, compareAt: 1500, stock: 10 }],
  },
  {
    slug: "complete-collection", name: "The Complete Collection", category: "bundles",
    short: "The full LYRIT collection — a gift for the hair care lover.",
    description: "Every LYRIT essential in one beautiful set. Makes a memorable gift.",
    benefits: ["Full collection", "Best value", "Gift-ready packaging"],
    ingredients: "See individual products.",
    usage: "Build your own ritual from the full range.",
    tags: ["bundle", "gift", "collection"],
    variants: [{ name: "Full set", sku: "LY-BU-ALL-001", price: 5900, compareAt: 7100, stock: 5 }],
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
    await db.$transaction(async (tx) => {
    const product = await tx.product.create({
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
            { url: img(`/images/photos/products/${p.slug}-1.webp`, "/images/placeholder.svg"), altText: `${p.name} by LYRIT`, sortOrder: 0 },
            { url: img(`/images/photos/products/${p.slug}-2.webp`, "/images/placeholder.svg"), altText: `${p.name} styled with natural ingredients`, sortOrder: 1 },
          ],
        },
      },
    });
    for (const [i, v] of p.variants.entries()) {
      const variant = await tx.productVariant.create({
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
      if (v.stock > 0) await tx.inventoryMovement.create({ data: { variantId: variant.id, delta: v.stock, balance: v.stock, reason: "INITIAL", note: "Seed" } });
    }
    });
  }

  const keep = PRODUCTS.map((p) => p.slug);
  const archived = await db.product.updateMany({ where: { slug: { notIn: keep }, status: { not: "ARCHIVED" }, variants: { some: { sku: { startsWith: "LY-" } } } }, data: { status: "ARCHIVED", isFeatured: false } });
  if (archived.count) console.log(`Archived ${archived.count} product(s) no longer in the seed catalog.`);

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
    { key: "announcement", type: "announcement", data: { messages: [{ text: "Free delivery in Cairo & Giza on orders over EGP 1,000", href: "/shipping-returns" }, { text: "Cash on delivery available across Egypt" }, { text: "New: The Complete Collection gift set", href: "/products/complete-collection" }] } },
    {
      key: "hero",
      type: "hero",
      data: {
        eyebrow: "Premium hair care",
        headline: "Naturally Beautiful Hair Starts Here",
        description: "Discover thoughtful hair care designed to nourish, strengthen, and restore your hair's natural beauty.",
        primaryCta: { label: "Shop Now", href: "/shop" },
        secondaryCta: { label: "Explore treatments", href: "/collections/hair-treatments" },
        imageDesktop: img("/images/photos/hero.webp", "/images/hero.svg"),
        imageMobile: "",
        imageAlt: "LYRIT Argan Repair Shampoo, Mask and Hair Oil on stone",
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
    { key: "promo-treatments", type: "promo", sortOrder: 0, data: { eyebrow: "Targeted care", headline: "Treatments for every hair story", description: "From scalp tonic to heat protection — focused care for the results you want.", cta: { label: "Shop treatments", href: "/collections/hair-treatments" }, image: img("/images/photos/promo-treatments.webp", "/images/promo-treatments.svg"), imageAlt: "Argan nuts, rose petals and botanicals", theme: "beige" } },
    { key: "promo-bundles", type: "promo", sortOrder: 1, data: { eyebrow: "Gift sets", headline: "The Complete Collection", description: "Every LYRIT essential in one beautiful set. Save when you shop the collection.", cta: { label: "Shop bundles", href: "/collections/bundles" }, image: img("/images/photos/promo-bundles.webp", "/images/promo-bundles.svg"), imageAlt: "The full LYRIT hair care collection", theme: "green" } },
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
