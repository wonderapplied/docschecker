import { describe, expect, it } from "vitest";
import { ageFrom } from "@/lib/legal";

describe("ageFrom", () => {
  const now = new Date(2026, 9, 9); // Oct 9, 2026
  it("counts a birthday month that has passed", () => {
    expect(ageFrom(2013, 9, now)).toBe(13);
  });
  it("treats this month as not yet", () => {
    expect(ageFrom(2013, 10, now)).toBe(12);
  });
  it("handles later months", () => {
    expect(ageFrom(2013, 11, now)).toBe(12);
    expect(ageFrom(2000, 1, now)).toBe(26);
  });
});
