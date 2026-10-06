import { describe, expect, it } from "vitest";
import { ago, dayKey, duration, streak } from "@/lib/format";

describe("duration", () => {
  it("drops seconds and zero minutes", () => {
    expect(duration(45 * 60_000)).toBe("45m");
    expect(duration(72 * 60_000)).toBe("1h 12m");
    expect(duration(120 * 60_000)).toBe("2h");
  });
});

describe("ago", () => {
  it("reads like a person", () => {
    const now = Date.parse("2026-10-06T20:00:00Z");
    expect(ago(now - 12_000, now)).toBe("12s ago");
    expect(ago(now - 5 * 60_000, now)).toBe("5m ago");
    expect(ago(now - 30 * 3600_000, now)).toBe("yesterday");
  });
});

describe("streak", () => {
  it("counts consecutive days ending today", () => {
    expect(streak(["2026-10-04", "2026-10-05", "2026-10-06"], "2026-10-06")).toBe(3);
  });
  it("still counts when today isn't done yet", () => {
    expect(streak(["2026-10-04", "2026-10-05"], "2026-10-06")).toBe(2);
  });
  it("breaks on a missed day", () => {
    expect(streak(["2026-10-02", "2026-10-05", "2026-10-06"], "2026-10-06")).toBe(2);
    expect(streak(["2026-10-03"], "2026-10-06")).toBe(0);
  });
});

describe("dayKey", () => {
  it("uses the writer's time zone, not UTC", () => {
    // 8:30 PM in New York is already the next day in UTC.
    expect(dayKey("2026-10-07T00:30:00Z", "America/New_York")).toBe("2026-10-06");
  });
});
