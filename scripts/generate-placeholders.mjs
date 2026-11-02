// Generates elegant SVG placeholder imagery (products, categories, hero, promos) until real
// LYRIT photography is supplied. Run: node scripts/generate-placeholders.mjs
import { mkdirSync, writeFileSync } from "fs";

const out = "public/images";
mkdirSync(`${out}/products`, { recursive: true });
mkdirSync(`${out}/categories`, { recursive: true });

const bg = ["#E9DED0", "#EFE6DA", "#E4D8C6", "#F1EBE1", "#DCCFBC"];

function bottle({ kind, body, cap, label, name }) {
  const shapes = {
    shampoo: `<rect x="300" y="250" width="200" height="420" rx="40" fill="${body}"/><rect x="345" y="190" width="110" height="70" rx="12" fill="${cap}"/><rect x="370" y="140" width="60" height="60" rx="8" fill="${cap}"/>`,
    conditioner: `<path d="M290 300 Q290 250 340 250 H460 Q510 250 510 300 V640 Q510 670 480 670 H320 Q290 670 290 640Z" fill="${body}"/><rect x="330" y="680" width="140" height="40" rx="10" fill="${cap}"/>`,
    oil: `<rect x="320" y="330" width="160" height="340" rx="30" fill="${body}"/><rect x="370" y="270" width="60" height="70" fill="${body}"/><rect x="355" y="180" width="90" height="100" rx="14" fill="${cap}"/><ellipse cx="400" cy="175" rx="30" ry="22" fill="${cap}"/>`,
    mask: `<rect x="260" y="420" width="280" height="230" rx="30" fill="${body}"/><rect x="250" y="370" width="300" height="70" rx="20" fill="${cap}"/>`,
    treatment: `<rect x="340" y="300" width="120" height="370" rx="26" fill="${body}"/><rect x="375" y="220" width="50" height="90" rx="8" fill="${cap}"/><rect x="390" y="170" width="20" height="60" rx="6" fill="${cap}"/>`,
    bundle: `<rect x="200" y="300" width="150" height="370" rx="30" fill="${body}"/><rect x="235" y="250" width="80" height="60" rx="10" fill="${cap}"/><rect x="380" y="380" width="120" height="290" rx="26" fill="${cap}" opacity=".9"/><rect x="410" y="330" width="60" height="60" rx="8" fill="${body}"/><rect x="520" y="470" width="110" height="200" rx="24" fill="${body}" opacity=".85"/><rect x="510" y="440" width="130" height="40" rx="10" fill="${cap}"/>`,
  };
  const labelY = kind === "mask" ? 540 : kind === "bundle" ? 480 : 470;
  const labelX = kind === "bundle" ? 275 : 400;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">${shapes[kind]}
<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Georgia,serif" font-size="${kind === "bundle" ? 22 : 30}" letter-spacing="8" fill="${label}">LYRIT</text>
<text x="${labelX}" y="${labelY + 34}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="14" letter-spacing="3" fill="${label}" opacity=".8">${name.toUpperCase()}</text></svg>`;
}

function frame(inner, bgColor, w = 800, h = 1000) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs>
<rect width="100%" height="100%" fill="${bgColor}"/><rect width="100%" height="100%" fill="url(#g)"/>
<ellipse cx="${w / 2}" cy="${h * 0.73}" rx="${w * 0.32}" ry="${h * 0.025}" fill="#000" opacity=".08"/>
${inner.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}
<path d="M40 ${h - 120} q60 -80 120 -40 t120 -20" stroke="#C9B49A" stroke-width="2" fill="none" opacity=".5"/>
</svg>`;
}

export const PRODUCTS = [
  ["argan-repair-shampoo", "shampoo", "#173D2F", "#C9B49A", "#F8F5EF", "Repair Shampoo"],
  ["hydrating-rose-shampoo", "shampoo", "#D9B8A8", "#8C7464", "#282522", "Hydrating Shampoo"],
  ["volume-clarifying-shampoo", "shampoo", "#F8F5EF", "#173D2F", "#173D2F", "Clarifying Shampoo"],
  ["silk-smooth-conditioner", "conditioner", "#C9B49A", "#173D2F", "#F8F5EF", "Silk Conditioner"],
  ["nourishing-leave-in-conditioner", "conditioner", "#E9DED0", "#8C7464", "#282522", "Leave-In"],
  ["golden-argan-hair-oil", "oil", "#B88A4A", "#282522", "#F8F5EF", "Argan Oil"],
  ["rosemary-growth-oil", "oil", "#4E6B4A", "#C9B49A", "#F8F5EF", "Rosemary Oil"],
  ["deep-repair-hair-mask", "mask", "#F8F5EF", "#173D2F", "#173D2F", "Repair Mask"],
  ["shea-butter-moisture-mask", "mask", "#E4CDB0", "#8C7464", "#282522", "Moisture Mask"],
  ["keratin-bond-treatment", "treatment", "#282522", "#C9B49A", "#F8F5EF", "Bond Treatment"],
  ["scalp-renewal-serum", "treatment", "#E9DED0", "#173D2F", "#173D2F", "Scalp Serum"],
  ["complete-ritual-bundle", "bundle", "#173D2F", "#C9B49A", "#F8F5EF", "Ritual Set"],
  ["repair-duo-bundle", "bundle", "#C9B49A", "#173D2F", "#F8F5EF", "Repair Duo"],
];

PRODUCTS.forEach(([slug, kind, body, cap, label, name], i) => {
  writeFileSync(`${out}/products/${slug}-1.svg`, frame(bottle({ kind, body, cap, label, name }), bg[i % bg.length]));
  writeFileSync(`${out}/products/${slug}-2.svg`, frame(bottle({ kind, body: cap, cap: body, label: body === "#F8F5EF" ? "#F8F5EF" : label, name }), bg[(i + 2) % bg.length]));
});

const cats = [["shampoos", "shampoo", "#173D2F"], ["conditioners", "conditioner", "#C9B49A"], ["hair-oils", "oil", "#B88A4A"], ["hair-masks", "mask", "#F8F5EF"], ["hair-treatments", "treatment", "#282522"], ["bundles", "bundle", "#173D2F"]];
cats.forEach(([slug, kind, body], i) => {
  writeFileSync(`${out}/categories/${slug}.svg`, frame(bottle({ kind, body, cap: "#C9B49A", label: "#F8F5EF", name: "" }), bg[i % bg.length], 800, 800).replace('viewBox="0 0 800 800"', 'viewBox="0 100 800 800"'));
});

const heroInner = `<g transform="translate(150 60)">${bottle({ kind: "shampoo", body: "#173D2F", cap: "#C9B49A", label: "#F8F5EF", name: "Shampoo" }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
<g transform="translate(420 140) scale(.85)">${bottle({ kind: "oil", body: "#B88A4A", cap: "#282522", label: "#F8F5EF", name: "Oil" }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
<g transform="translate(-60 260) scale(.75)">${bottle({ kind: "mask", body: "#F8F5EF", cap: "#173D2F", label: "#173D2F", name: "Mask" }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`;
writeFileSync(`${out}/hero.svg`, frame(`<svg>${heroInner}</svg>`, "#E4D8C6", 1000, 900).replace('viewBox="0 0 1000 900"', 'viewBox="0 0 1000 900"'));
writeFileSync(`${out}/about.svg`, frame(`<svg>${heroInner}</svg>`, "#E9DED0", 1000, 1000));
writeFileSync(`${out}/promo-treatments.svg`, frame(bottle({ kind: "treatment", body: "#282522", cap: "#C9B49A", label: "#F8F5EF", name: "Treatment" }), "#DCCFBC"));
writeFileSync(`${out}/promo-bundles.svg`, frame(bottle({ kind: "bundle", body: "#F8F5EF", cap: "#C9B49A", label: "#173D2F", name: "Set" }), "#1F4D3C"));
console.log("Placeholders written to", out);
