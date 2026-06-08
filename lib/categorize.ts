import { Category } from "./types";

const RULES: { category: Category; keywords: RegExp }[] = [
  {
    category: "Prompt Engineering",
    keywords:
      /\bprompt engineering\b|\bprompting\b|\bsystem prompts?\b|\bmeta[- ]?prompt|few[- ]?shot|chain[- ]of[- ]thought|\bprompt (design|template|injection|library)\b/i,
  },
  {
    category: "Context Engineering",
    keywords:
      /\bcontext engineering\b|\bcontext window\b|\bcontext management\b|retrieval[- ]augmented|\brag\b|long[- ]context|\bcontext length\b|\bmemory (management|systems?)\b/i,
  },
  {
    category: "Tips & Tutorials",
    keywords: /\b(how to|tutorial|guide|prompt|workflow|tip|trick|learn(ed|ing)?|walkthrough|cheat ?sheet)\b/i,
  },
  {
    category: "Research & News",
    keywords: /\b(paper|research|study|benchmark|arxiv|announc(e|ed|ement|ing)|launch(es|ed)?|release[ds]?|funding|raises?|acqui(re|sition)|report)\b/i,
  },
  {
    category: "Tools & Products",
    keywords: /\b(tool|app|product|model|agent|plugin|extension|library|framework|API|open[- ]?source|sdk)\b/i,
  },
];

export function categorize(text: string): Category {
  for (const rule of RULES) {
    if (rule.keywords.test(text)) return rule.category;
  }
  return "Tools & Products";
}
