// Text extraction from a Google Docs `documents.get` response and word/sentence counting.

type TextRun = { content?: string };
type ParagraphElement = { textRun?: TextRun };
type StructuralElement = {
  paragraph?: { elements?: ParagraphElement[] };
  table?: { tableRows?: { tableCells?: { content?: StructuralElement[] }[] }[] };
  tableOfContents?: { content?: StructuralElement[] };
};
type Body = { content?: StructuralElement[] };
type Tab = { documentTab?: { body?: Body }; childTabs?: Tab[] };
export type GoogleDoc = { title?: string; body?: Body; tabs?: Tab[] };

function walk(elements: StructuralElement[] | undefined, out: string[]) {
  for (const el of elements ?? []) {
    if (el.paragraph) {
      for (const pe of el.paragraph.elements ?? []) {
        if (pe.textRun?.content) out.push(pe.textRun.content);
      }
    } else if (el.table) {
      for (const row of el.table.tableRows ?? []) {
        for (const cell of row.tableCells ?? []) walk(cell.content, out);
      }
    }
    // tableOfContents is generated from headings, so it's skipped to avoid double counting.
    // Headers, footers and footnotes live outside `body` and are never read.
  }
}

function walkTabs(tabs: Tab[] | undefined, out: string[]) {
  for (const tab of tabs ?? []) {
    walk(tab.documentTab?.body?.content, out);
    walkTabs(tab.childTabs, out);
  }
}

/** Pulls the body text out of a doc fetched with or without `includeTabsContent=true`. */
export function extractText(doc: GoogleDoc): string {
  const out: string[] = [];
  if (doc.tabs?.length) walkTabs(doc.tabs, out);
  else walk(doc.body?.content, out);
  return out.join("");
}

const wordSegmenter = new Intl.Segmenter("en", { granularity: "word" });
const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });

export function words(text: string): string[] {
  const result: string[] = [];
  for (const s of wordSegmenter.segment(text)) if (s.isWordLike) result.push(s.segment);
  return result;
}

// ICU breaks after "Dr. " when the next word is capitalized, so a segment ending in one of
// these is glued to the next one.
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "mx", "dr", "prof", "sr", "jr", "st", "mt", "ft", "vs", "etc",
  "fig", "no", "vol", "ch", "gen", "col", "lt", "sgt", "capt", "rev", "hon", "inc", "co", "corp", "ltd",
]);

function endsWithAbbreviation(segment: string): boolean {
  const m = segment.trimEnd().match(/(?:^|[^\p{L}])(\p{L}+)\.$/u);
  return !!m && ABBREVIATIONS.has(m[1].toLowerCase());
}

const hasWord = (s: string) => /[\p{L}\p{N}]/u.test(s);

export function sentences(text: string): string[] {
  const result: string[] = [];
  let pending = "";
  for (const { segment } of sentenceSegmenter.segment(text)) {
    pending += segment;
    // Don't glue across a line break: "Dr.\n" ends a paragraph.
    if (endsWithAbbreviation(pending) && !/\n\s*$/.test(segment)) continue;
    if (hasWord(pending)) result.push(pending.trim());
    pending = "";
  }
  if (hasWord(pending)) result.push(pending.trim());
  return result;
}

export type Counts = { words: number; sentences: number };

export function count(text: string): Counts {
  return { words: words(text).length, sentences: sentences(text).length };
}

/** Lower-cased word frequency map, used by junk detection to look at only the added words. */
export function wordFrequencies(text: string): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const w of words(text)) {
    const k = w.toLowerCase();
    freq[k] = (freq[k] ?? 0) + 1;
  }
  return freq;
}
