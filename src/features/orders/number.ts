import { randomInt } from "crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Human-friendly, collision-resistant order number, e.g. LY-26-7KQ4M9. Uniqueness is enforced by the DB. */
export function generateOrderNumber(now = new Date()): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `LY-${String(now.getUTCFullYear()).slice(2)}-${suffix}`;
}
