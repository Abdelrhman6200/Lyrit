import { describe, expect, it } from "vitest";
import { formatMoney, minorToMajorString, parseMajorToMinor, percentOf } from "@/lib/money";

describe("money", () => {
  it("parses major-unit strings to integer minor units without float error", () => {
    expect(parseMajorToMinor("149.5")).toBe(14950);
    expect(parseMajorToMinor("0.29")).toBe(29);
    expect(parseMajorToMinor("1000")).toBe(100000);
    expect(parseMajorToMinor("19.999")).toBeNull();
    expect(parseMajorToMinor("-5")).toBeNull();
    expect(parseMajorToMinor("abc")).toBeNull();
  });
  it("round-trips minor to major strings", () => {
    expect(minorToMajorString(14950)).toBe("149.50");
    expect(minorToMajorString(100000)).toBe("1000");
    expect(minorToMajorString(5)).toBe("0.05");
  });
  it("computes integer percentages with half-up rounding", () => {
    expect(percentOf(1000, 10)).toBe(100);
    expect(percentOf(999, 15)).toBe(150); // 149.85 → 150
    expect(percentOf(333, 50)).toBe(167); // 166.5 → 167
  });
  it("formats EGP", () => {
    expect(formatMoney(42000, "EGP")).toMatch(/420/);
  });
});
