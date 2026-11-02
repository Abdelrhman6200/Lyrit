// Imports real photos named per docs/PHOTO_SHOT_LIST.md, optimises them to WebP, and points the
// database at them. Usage: node scripts/import-photos.mjs <folder-with-photos> [--no-db]
//   <slug>-1.jpg / <slug>-2.jpg  → product gallery (4:5, 1200×1500)
//   categories/<slug>.jpg or category-<slug>.jpg → category circle (1:1, subject padded for circle crop)
//   hero.jpg, hero-mobile.jpg, promo-*.jpg, about.jpg → homepage/editorial
import { readdirSync, mkdirSync, statSync } from "fs";
import path from "path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const [, , inputDir, flag] = process.argv;
if (!inputDir) throw new Error("Usage: node scripts/import-photos.mjs <folder> [--no-db]");
const OUT = "public/images/photos";
const IMG = /\.(jpe?g|png|webp|avif)$/i;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));

/** Square image with the subject scaled down onto a background sampled from the photo's left edge. */
async function categoryImage(src, dest) {
  const meta = await sharp(src).metadata();
  const strip = await sharp(src).extract({ left: 0, top: 0, width: Math.max(20, Math.round(meta.width * 0.15)), height: meta.height }).toBuffer();
  const bg = await sharp(strip).resize(800, 800, { fit: "fill" }).blur(30).toBuffer();
  const inner = await sharp(src).resize({ height: 640, width: 640, fit: "inside" }).toBuffer();
  const { width: W, height: H } = await sharp(inner).metadata();
  const f = Math.round(Math.min(W, H) * 0.09);
  const mask = Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><defs><filter id='b'><feGaussianBlur stdDeviation='${f / 2.7}'/></filter></defs><rect x='${f}' y='${f}' width='${W - 2 * f}' height='${H - 2 * f}' rx='40' fill='white' filter='url(#b)'/></svg>`);
  const feathered = await sharp(inner).ensureAlpha().composite([{ input: await sharp(mask).resize(W, H).toBuffer(), blend: "dest-in" }]).png().toBuffer();
  await sharp(bg).composite([{ input: feathered, left: Math.round((800 - W) / 2), top: Math.round((800 - H) / 2) }]).webp({ quality: 84 }).toFile(dest);
}

const db = flag === "--no-db" ? null : new PrismaClient();
const done = [];
for (const file of walk(inputDir).filter((f) => IMG.test(f))) {
  const base = path.basename(file).replace(IMG, "").toLowerCase();
  const isCat = file.includes(`${path.sep}categories${path.sep}`) || base.startsWith("category-");
  if (isCat) {
    const slug = base.replace(/^category-/, "");
    mkdirSync(`${OUT}/categories`, { recursive: true });
    const dest = `${OUT}/categories/${slug}.webp`;
    await categoryImage(file, dest);
    if (db) await db.category.updateMany({ where: { slug }, data: { thumbnailUrl: `/${dest.replace(/^public\//, "")}` } });
    done.push(dest);
    continue;
  }
  const m = base.match(/^(.*)-(\d)$/);
  if (m && !base.startsWith("promo") && !base.startsWith("hero")) {
    const [, slug, n] = m;
    mkdirSync(`${OUT}/products`, { recursive: true });
    const dest = `${OUT}/products/${slug}-${n}.webp`;
    await sharp(file).resize(1200, 1500, { fit: "cover", position: "centre" }).webp({ quality: 86 }).toFile(dest);
    if (db) {
      const url = `/${dest.replace(/^public\//, "")}`;
      const product = await db.product.findUnique({ where: { slug }, include: { images: { orderBy: { sortOrder: "asc" } } } });
      if (!product) console.warn(`  ! no product with slug "${slug}" — file converted but not linked`);
      else {
        const idx = Number(n) - 1;
        const existing = product.images[idx];
        if (existing) await db.productImage.update({ where: { id: existing.id }, data: { url } });
        else await db.productImage.create({ data: { productId: product.id, url, altText: `${product.name}${idx ? " — lifestyle" : ""}`, sortOrder: idx } });
      }
    }
    done.push(dest);
    continue;
  }
  // Editorial images
  const size = base === "about" ? [1600, 2000] : [2000, 1500];
  const dest = `${OUT}/${base}.webp`;
  await sharp(file).resize(size[0], size[1], { fit: "cover" }).webp({ quality: 84 }).toFile(dest);
  const url = `/${dest.replace(/^public\//, "")}`;
  if (db && (base === "hero" || base === "hero-mobile")) {
    const hero = await db.contentBlock.findUnique({ where: { key: "hero" } });
    if (hero) await db.contentBlock.update({ where: { key: "hero" }, data: { data: { ...hero.data, [base === "hero" ? "imageDesktop" : "imageMobile"]: url } } });
  }
  if (db && base.startsWith("promo-")) {
    const block = await db.contentBlock.findUnique({ where: { key: base } });
    if (block) await db.contentBlock.update({ where: { key: base }, data: { data: { ...block.data, image: url } } });
  }
  done.push(dest);
}
console.log(`Imported ${done.length} image(s):\n  ${done.join("\n  ")}`);
await db?.$disconnect();
