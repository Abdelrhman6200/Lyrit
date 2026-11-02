# Photo Shot List

These are all the photos the storefront needs to replace the current illustrated placeholders. Use it as a brief for a photographer, or as a search list for licensed stock images.

## Style (PRD §3)
- **Real photography:** no 3D renders and no illustrations.
- **Look:** soft natural daylight, premium and minimal, generous negative space, editorial beauty feel.
- **Backgrounds:** warm ivory `#F8F5EF`, soft beige `#E9DED0` or sand `#C9B49A`. Props can be travertine stone, linen, dried botanicals, or water/oil droplets.
- **Packaging:** plain or LYRIT-branded packaging only. Never show other brands' logos.
- **Format:** JPEG/WebP, at least 2000 px on the long edge, sRGB, under 5 MB after export.

## 1. Product photos: 13 products × 2 shots = 26 photos
**Ratio 4:5, portrait (2000×2500)**

| Shot | What it shows | Where it's used |
|---|---|---|
| **-1 Packshot** | Product centred on a plain ivory/beige background with a soft shadow | Main image on product cards and product pages |
| **-2 Lifestyle / texture** | Product with props or in use, or a close-up of the texture (lather, cream, oil drop) | Hover image and the second gallery image |

| # | Product | Category | Sizes (SKU) | Packaging to shoot | Texture/lifestyle idea | Files |
|---|---|---|---|---|---|---|
| 1 | Argan Repair Shampoo | Shampoos | 250 ml (LY-SH-ARG-250), 500 ml (LY-SH-ARG-500) | Tall bottle with pump or flip cap; ideally both sizes side by side | Creamy lather, argan nuts | `argan-repair-shampoo-1`, `-2` |
| 2 | Hydrating Rose Shampoo | Shampoos | 250 ml (LY-SH-ROS-250) | Bottle | Rose petals, water droplets | `hydrating-rose-shampoo-1`, `-2` |
| 3 | Volume Clarifying Shampoo | Shampoos | 250 ml (LY-SH-VOL-250) | Bottle | Fresh mint leaves, light foam | `volume-clarifying-shampoo-1`, `-2` |
| 4 | Silk Smooth Conditioner | Conditioners | 250 ml (LY-CO-SLK-250), 500 ml (LY-CO-SLK-500) | Bottle or squeeze tube | Silky cream swatch | `silk-smooth-conditioner-1`, `-2` |
| 5 | Nourishing Leave-In Conditioner | Conditioners | 150 ml (LY-CO-LVI-150) | Spray bottle | Fine mist spray in the air | `nourishing-leave-in-conditioner-1`, `-2` |
| 6 | Golden Argan Hair Oil | Hair Oils | 50 ml (LY-OI-ARG-050), 100 ml (LY-OI-ARG-100) | Amber glass dropper bottle | Golden oil drop on a pipette | `golden-argan-hair-oil-1`, `-2` |
| 7 | Rosemary Scalp Oil | Hair Oils | 50 ml (LY-OI-ROS-050) | Dropper bottle | Fresh rosemary sprigs | `rosemary-growth-oil-1`, `-2` |
| 8 | Deep Repair Hair Mask | Hair Masks | 200 ml (LY-MA-REP-200) | Wide jar, lid off | Thick cream texture, spatula | `deep-repair-hair-mask-1`, `-2` |
| 9 | Shea Butter Moisture Mask | Hair Masks | 200 ml (LY-MA-SHE-200) | Wide jar | Shea butter, rich cream swirl | `shea-butter-moisture-mask-1`, `-2` |
| 10 | Keratin Bond Treatment | Hair Treatments | 100 ml (LY-TR-KER-100) | Slim tube or pump | Cream ribbon on stone | `keratin-bond-treatment-1`, `-2` |
| 11 | Scalp Renewal Serum | Hair Treatments | 50 ml (LY-TR-SCA-050) | Dropper or roller bottle | Clear serum drops | `scalp-renewal-serum-1`, `-2` |
| 12 | Repair Duo | Bundles | 2-piece set (LY-BU-REP-002) | Products #1 and #8 together | Set styled on linen | `repair-duo-bundle-1`, `-2` |
| 13 | The Complete Ritual | Bundles | 4-piece set (LY-BU-RIT-004) | Products #1, #4, #8 and #6 together | Gift box or flat lay | `complete-ritual-bundle-1`, `-2` |

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

## Total: 37 images
- 26 product photos
- 6 category photos
- 5 homepage and editorial photos

Name files as above (for example `argan-repair-shampoo-1.jpg`). They can be uploaded through the admin, or dropped into `public/images/` so the developer can swap them in.

## Importing photos
Put the files in one folder, named as above. Category images go in a `categories/` subfolder or use a `category-<slug>` prefix. Then run:
```bash
node scripts/import-photos.mjs ./my-photos
```
The script resizes and optimises the images to WebP in `public/images/photos/`, links them to the right products, categories and homepage blocks in the database, and the seed then uses them for fresh installs. Add `--no-db` to only convert the files.
