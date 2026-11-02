import "server-only";
import { cache } from "react";
import type { z } from "zod";
import { db } from "@/lib/db";
import {
  announcementSchema,
  benefitsSchema,
  DEFAULT_FOOTER,
  DEFAULT_NAVIGATION,
  footerSchema,
  heroSchema,
  navigationSchema,
  promoSchema,
  type Promo,
} from "./types";

function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> | null {
  const r = schema.safeParse(value);
  return r.success ? r.data : null;
}

export const getBlock = cache(async (key: string) => db.contentBlock.findFirst({ where: { key, isActive: true } }));

export const getAnnouncement = cache(async () => {
  const b = await getBlock("announcement");
  return b ? parse(announcementSchema, b.data) : null;
});

export async function getHero() {
  const b = await getBlock("hero");
  return b ? parse(heroSchema, b.data) : null;
}

export async function getBenefits() {
  const b = await getBlock("benefits");
  return b ? parse(benefitsSchema, b.data) : null;
}

export async function getPromos(): Promise<Array<Promo & { key: string }>> {
  const blocks = await db.contentBlock.findMany({ where: { type: "promo", isActive: true }, orderBy: { sortOrder: "asc" } });
  return blocks.flatMap((b) => {
    const p = parse(promoSchema, b.data);
    return p ? [{ ...p, key: b.key }] : [];
  });
}

export const getSetting = cache(async (key: string) => (await db.siteSetting.findUnique({ where: { key } }))?.value ?? null);

export const getNavigation = cache(async () => parse(navigationSchema, await getSetting("navigation")) ?? DEFAULT_NAVIGATION);
export const getFooter = cache(async () => parse(footerSchema, await getSetting("footer")) ?? DEFAULT_FOOTER);

export async function getPage(slug: string) {
  return db.page.findUnique({ where: { slug } });
}

export async function getFaqs() {
  return db.faq.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } });
}
