import { describe, expect, it } from "vitest";
import { count, extractText, sentences, words, type GoogleDoc } from "@/lib/count";

const para = (text: string) => ({ paragraph: { elements: [{ textRun: { content: text } }] } });

describe("extractText", () => {
  it("reads paragraphs and tables from the body", () => {
    const doc: GoogleDoc = {
      body: {
        content: [
          para("Hello world.\n"),
          { table: { tableRows: [{ tableCells: [{ content: [para("In a cell.\n")] }] }] } },
          { tableOfContents: { content: [para("Hello world\n")] } },
        ],
      },
    };
    expect(extractText(doc)).toBe("Hello world.\nIn a cell.\n");
  });

  it("reads every tab, including child tabs", () => {
    const doc: GoogleDoc = {
      tabs: [
        { documentTab: { body: { content: [para("One.\n")] } }, childTabs: [{ documentTab: { body: { content: [para("Two.\n")] } } }] },
        { documentTab: { body: { content: [para("Three.\n")] } } },
      ],
    };
    expect(extractText(doc)).toBe("One.\nTwo.\nThree.\n");
  });
});

describe("words", () => {
  it("counts word-like segments only", () => {
    expect(words("Hello, world! It's 3.5 o'clock — go.")).toEqual(["Hello", "world", "It's", "3.5", "o'clock", "go"]);
  });
  it("ignores empty docs", () => {
    expect(count("\n\n")).toEqual({ words: 0, sentences: 0 });
  });
});

describe("sentences", () => {
  it("doesn't split on titles like Dr.", () => {
    expect(sentences("I met Dr. Smith today. He said hi.")).toEqual(["I met Dr. Smith today.", "He said hi."]);
  });
  it("doesn't split on e.g.", () => {
    expect(sentences("Use tools, e.g. hammers. Then stop.")).toHaveLength(2);
  });
  it("treats paragraph breaks as boundaries and skips blank lines", () => {
    expect(sentences("Title\nFirst one. Second one!\n\nNext para")).toEqual(["Title", "First one.", "Second one!", "Next para"]);
  });
});
