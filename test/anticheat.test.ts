import { describe, expect, it } from "vitest";
import { addedWords, isPaste, junkFlags } from "@/lib/anticheat";
import { wordFrequencies } from "@/lib/count";
import { fraction, status } from "@/lib/progress";

const prose =
  "The rain kept falling on the old harbor while Mara counted boats and wondered whether her brother would " +
  "ever answer the letter she sent last spring about the farm the debt and their mother who still waited " +
  "by the window every evening hoping someone might walk up the road with good news";

describe("isPaste", () => {
  it("flags 300+ words in a normal poll", () => {
    expect(isPaste(300, 45)).toBe(true);
    expect(isPaste(120, 45)).toBe(false);
  });
  it("scales with long gaps between polls", () => {
    expect(isPaste(500, 10 * 60)).toBe(false);
    expect(isPaste(3500, 10 * 60)).toBe(true);
  });
});

describe("junkFlags", () => {
  it("passes normal prose", () => {
    expect(junkFlags(wordFrequencies(prose))).toEqual([]);
  });
  it("flags the the the", () => {
    expect(junkFlags(wordFrequencies("the ".repeat(80)))).toContain("repetitive");
  });
  it("flags lorem ipsum", () => {
    const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ".repeat(3);
    expect(junkFlags(wordFrequencies(lorem))).toContain("lorem");
  });
  it("only looks at words added since the baseline", () => {
    const baseline = wordFrequencies("the ".repeat(500));
    expect(junkFlags(addedWords(baseline, wordFrequencies("the ".repeat(500) + prose)))).toEqual([]);
  });
});

describe("progress", () => {
  it("needs both goals when both are set", () => {
    expect(fraction({ goalWords: 100, goalSentences: 10 }, 100, 5)).toBe(0.5);
  });
  it("never counts below zero (net deletions)", () => {
    expect(fraction({ goalWords: 100, goalSentences: null }, -40, 0)).toBe(0);
  });
  it("maps fraction to status", () => {
    expect(status(0.5, false)).toBe("writing");
    expect(status(0.8, false)).toBe("almost");
    expect(status(1, false)).toBe("unlocked");
  });
});
