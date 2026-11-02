# Photo Shot List

**Status:** first-pass AI-generated images are in place for everything below (cropped from a low-resolution ChatGPT contact sheet, so they look soft and some label text is garbled). Replace them with high-resolution files or real photography before launch.

These are all the photos the storefront needs to replace the current illustrated placeholders. Use it as a brief for a photographer, or as a search list for licensed stock images.

## Style (PRD §3)
- **Real photography:** no 3D renders and no illustrations.
- **Look:** soft natural daylight, premium and minimal, generous negative space, editorial beauty feel.
- **Backgrounds:** warm ivory `#F8F5EF`, soft beige `#E9DED0` or sand `#C9B49A`. Props can be travertine stone, linen, dried botanicals, or water/oil droplets.
- **Packaging:** plain or LYRIT-branded packaging only. Never show other brands' logos.
- **Format:** JPEG/WebP, at least 2000 px on the long edge, sRGB, under 5 MB after export.

## 1. Product photos: 15 products × 2 shots = 30 photos
**Ratio 4:5, portrait (2000×2500)**

| Shot | What it shows | Where it's used |
|---|---|---|
| **-1 Packshot** | Product centred on a plain ivory/beige background with a soft shadow | Main image on product cards and product pages |
| **-2 Lifestyle / texture** | Product with props or in use, or a close-up of the texture (lather, cream, oil drop) | Hover image and the second gallery image |

| # | Product | Category | Sizes (SKU) | Files |
|---|---|---|---|---|
| 1 | Argan Repair Shampoo | Shampoos | 250 ml (LY-SH-ARG-250), 500 ml (LY-SH-ARG-500) | `argan-repair-shampoo-1`, `argan-repair-shampoo-2` |
| 2 | Hydrating Rose Shampoo | Shampoos | 250 ml (LY-SH-ROS-250) | `hydrating-rose-shampoo-1`, `hydrating-rose-shampoo-2` |
| 3 | Volume Clarifying Shampoo | Shampoos | 250 ml (LY-SH-VOL-250) | `volume-clarifying-shampoo-1`, `volume-clarifying-shampoo-2` |
| 4 | Argan Repair Conditioner | Conditioners | 250/500 ml (LY-CO-ARG-*) | `argan-repair-conditioner-1`, `argan-repair-conditioner-2` |
| 5 | Hydrating Rose Conditioner | Conditioners | 250/500 ml (LY-CO-ROS-*) | `hydrating-rose-conditioner-1`, `hydrating-rose-conditioner-2` |
| 6 | Volume Clarifying Conditioner | Conditioners | 250/500 ml (LY-CO-VOL-*) | `volume-clarifying-conditioner-1`, `volume-clarifying-conditioner-2` |
| 7 | Argan Repair Mask | Hair Masks | 200 ml (LY-MA-ARG-200) | `argan-repair-mask-1`, `argan-repair-mask-2` |
| 8 | Hydrating Rose Mask | Hair Masks | 200 ml (LY-MA-ROS-200) | `hydrating-rose-mask-1`, `hydrating-rose-mask-2` |
| 9 | Volume Clarifying Mask | Hair Masks | 200 ml (LY-MA-VOL-200) | `volume-clarifying-mask-1`, `volume-clarifying-mask-2` |
| 10 | Argan Hair Oil | Hair Oils | 50/100 ml (LY-OI-ARG-*) | `argan-hair-oil-1`, `argan-hair-oil-2` |
| 11 | Rose Hair Oil | Hair Oils | 50 ml (LY-OI-ROS-050) | `rose-hair-oil-1`, `rose-hair-oil-2` |
| 12 | Scalp Tonic | Hair Treatments | 100 ml (LY-TR-SCA-100) | `scalp-tonic-1`, `scalp-tonic-2` |
| 13 | Heat Protect Spray | Hair Treatments | 150 ml (LY-TR-HPS-150) | `heat-protect-spray-1`, `heat-protect-spray-2` |
| 14 | Argan Repair Ritual | Bundles | 3-piece set (LY-BU-ARG-003) | `argan-repair-ritual-1`, `argan-repair-ritual-2` |
| 15 | The Complete Collection | Bundles | Full set (LY-BU-ALL-001) | `complete-collection-1`, `complete-collection-2` |

## 2. Category circles: 6 photos
**Ratio 1:1, square (1200×1200).** Keep the subject centred, because the image is cropped to a circle.

| Category | Suggested image | File |
|---|---|---|
| Shampoos | A shampoo bottle with lather | `categories/shampoos` |
| Conditioners | A conditioner bottle with a cream swatch | `categories/conditioners` |
| Hair Oils | An amber dropper with an oil drop | `categories/hair-oils` |
| Hair Masks | An open jar, top-down | `categories/hair-masks` |
| Hair Treatments | A serum or treatment bottle | `categories/hair-treatments` |
| Bundles | A group of products | `categories/bundles` |

## 3. Homepage and editorial: 5 photos

| Slot | Ratio / size | Suggested image | File |
|---|---|---|---|
| Hero (desktop) | ~4:3 landscape, 2400×1800 | Product range on stone, or a model with healthy hair, with space on the left for text | `hero` |
| Hero (mobile, optional) | 4:3, 1200×900 | A tighter crop of the hero | `hero-mobile` |
| Promo: Treatments | 4:3, 1600×1200 | A treatment bottle in a lifestyle setting | `promo-treatments` |
| Promo: Bundles (green block) | 4:3, 1600×1200 | Gift set on a dark green background | `promo-bundles` |
| About page | 4:5, 2000×2500 | Brand or lifestyle image | `about` |

## Total: 41 images
- 30 product photos
- 6 category photos
- 5 homepage and editorial photos

Name files as above (for example `argan-repair-shampoo-1.jpg`). They can be uploaded through the admin, or dropped into `public/images/` so the developer can swap them in.

## Importing photos
Put the files in one folder, named as above. Category images go in a `categories/` subfolder or use a `category-<slug>` prefix. Then run:
```bash
node scripts/import-photos.mjs ./my-photos
```
The script resizes and optimises the images to WebP in `public/images/photos/`, links them to the right products, categories and homepage blocks in the database, and the seed then uses them for fresh installs. Add `--no-db` to only convert the files.
