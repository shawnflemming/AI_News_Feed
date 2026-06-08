import { Category } from "./types";

const RULES: { category: Category; keywords: RegExp }[] = [
  {
    category: "Tips & Tutorials",
    keywords: /\b(how to|tutorial|guide|prompt|workflow|tip|trick|learn(ed|ing)?|walkthrough|cheat ?sheet)\b/i,
  },
  {
    category: "Memes & Hot Takes",
    keywords: /\b(meme|lol|lmao|hot take|unpopular opinion|rant|funny|joke|🤣|😂)\b/i,
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
