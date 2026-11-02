import { z } from "zod";

const link = z.object({ label: z.string().min(1).max(60), href: z.string().min(1).max(300) });

export const announcementSchema = z.object({
  messages: z.array(z.object({ text: z.string().min(1).max(160), href: z.string().max(300).optional().or(z.literal("")) })).max(5),
});

export const heroSchema = z.object({
  eyebrow: z.string().max(60).optional().or(z.literal("")),
  headline: z.string().min(1).max(120),
  description: z.string().max(400),
  primaryCta: link,
  secondaryCta: link.optional().nullable(),
  imageDesktop: z.string().min(1).max(500),
  imageMobile: z.string().max(500).optional().or(z.literal("")),
  imageAlt: z.string().max(200),
});

export const benefitsSchema = z.object({
  items: z.array(z.object({ icon: z.enum(["leaf", "shield", "truck", "chat", "drop", "sparkle"]), title: z.string().min(1).max(60), text: z.string().max(160) })).max(4),
});

export const promoSchema = z.object({
  eyebrow: z.string().max(60).optional().or(z.literal("")),
  headline: z.string().min(1).max(120),
  description: z.string().max(300),
  cta: link,
  image: z.string().min(1).max(500),
  imageAlt: z.string().max(200),
  theme: z.enum(["beige", "green", "ivory"]).default("beige"),
});

export const navigationSchema = z.object({ items: z.array(link).max(10) });

export const footerSchema = z.object({
  description: z.string().max(300),
  email: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  social: z.array(link).max(6),
  supportLinks: z.array(link).max(8),
});

export type Announcement = z.infer<typeof announcementSchema>;
export type Hero = z.infer<typeof heroSchema>;
export type Benefits = z.infer<typeof benefitsSchema>;
export type Promo = z.infer<typeof promoSchema>;
export type Navigation = z.infer<typeof navigationSchema>;
export type FooterContent = z.infer<typeof footerSchema>;

export const DEFAULT_NAVIGATION: Navigation = {
  items: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Hair Care", href: "/collections/shampoos" },
    { label: "Treatments", href: "/collections/hair-treatments" },
    { label: "Bundles", href: "/collections/bundles" },
    { label: "About", href: "/about" },
  ],
};

export const DEFAULT_FOOTER: FooterContent = {
  description: "Thoughtful hair care designed to nourish, strengthen and restore your hair's natural beauty.",
  email: "hello@lyrit.example",
  phone: "",
  address: "Cairo, Egypt",
  social: [
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "Facebook", href: "https://facebook.com/" },
    { label: "TikTok", href: "https://tiktok.com/" },
  ],
  supportLinks: [
    { label: "Contact us", href: "/contact" },
    { label: "FAQs", href: "/faq" },
    { label: "Shipping & Returns", href: "/shipping-returns" },
    { label: "My account", href: "/account" },
  ],
};
