import { SKILL_SUGGESTIONS, type SkillCategory as SuggestionSkillCategory } from "@/lib/skillSuggestions";
import { normalizeSkill } from "@/lib/utils";

export type SkillCategory =
  | "Programming"
  | "Design"
  | "Marketing"
  | "Communication"
  | "Business"
  | "Productivity"
  | "Creative Arts"
  | "Language Learning"
  | "Academic"
  | "Technical Tools"
  | "AI Tools"
  | "Career Development"
  | "Other";

export const SKILL_CATEGORY_OPTIONS: Array<{ value: SkillCategory | "all"; label: string }> = [
  { value: "all", label: "All Categories" },
  { value: "Programming", label: "Programming" },
  { value: "Design", label: "Design" },
  { value: "Marketing", label: "Marketing" },
  { value: "Communication", label: "Communication" },
  { value: "Business", label: "Business" },
  { value: "Productivity", label: "Productivity" },
  { value: "Creative Arts", label: "Creative Arts" },
  { value: "Language Learning", label: "Language Learning" },
  { value: "Academic", label: "Academic" },
  { value: "Technical Tools", label: "Technical Tools" },
  { value: "AI Tools", label: "AI Tools" },
  { value: "Career Development", label: "Career Development" },
  { value: "Other", label: "Other" },
];

const CATEGORY_KEYWORDS: Array<{ category: SkillCategory; words: string[] }> = [
  { category: "Programming", words: ["programming", "code", "javascript", "typescript", "python", "java", "c++", "c#", "sql", "react", "vue", "angular", "svelte", "next", "node", "express", "django", "flask", "flutter", "swift", "kotlin", "go", "rust", "ruby", "php", "mobile", "web development"] },
  { category: "Design", words: ["design", "ui", "ux", "figma", "photoshop", "illustrator", "xd", "sketch", "graphic", "video", "animation", "3d", "photography", "videography", "drawing", "painting", "fashion", "interior"] },
  { category: "Marketing", words: ["marketing", "seo", "social media", "email marketing", "sales", "advertising", "brand", "content marketing"] },
  { category: "Communication", words: ["communication", "public speaking", "presentation", "copywriting", "writing", "editing", "proofreading", "blogging", "business writing"] },
  { category: "Business", words: ["business", "project management", "accounting", "excel", "spreadsheet", "finance", "leadership", "management", "strategy", "entrepreneur"] },
  { category: "Productivity", words: ["productivity", "time management", "organization", "planning", "notion", "workflow", "task", "calendar"] },
  { category: "Creative Arts", words: ["creative", "art", "music", "piano", "guitar", "violin", "drums", "singing", "music production", "audio engineering", "dance", "craft"] },
  { category: "Language Learning", words: ["language", "spanish", "french", "german", "mandarin", "japanese", "korean", "italian", "portuguese", "russian", "arabic", "hindi", "english", "conversation"] },
  { category: "Academic", words: ["academic", "math", "physics", "chemistry", "biology", "history", "economics", "statistics", "test preparation", "tutoring", "study"] },
  { category: "Technical Tools", words: ["tool", "technical", "excel", "sql", "graphql", "rest api", "bootstrap", "tailwind", "xamarin", "xampp", "github", "git", "linux"] },
  { category: "AI Tools", words: ["ai", "chatgpt", "prompt", "llm", "machine learning", "generative", "copilot", "automation"] },
  { category: "Career Development", words: ["career", "resume", "cv", "cover letter", "interview", "job search", "networking", "career coaching", "personal development"] },
];

const normalizedSuggestionIndex = new Map<string, { name: string; category: SkillCategory }>();
const normalizedAliasIndex = new Map<string, { name: string; category: SkillCategory }>();

function mapSuggestionCategory(category: SuggestionSkillCategory): SkillCategory {
  switch (category) {
    case "Programming":
    case "Web Development":
    case "Mobile Development":
      return "Programming";
    case "Design":
    case "Music":
    case "Creative":
      return category === "Music" ? "Creative Arts" : category === "Creative" ? "Creative Arts" : "Design";
    case "Writing":
      return "Communication";
    case "Languages":
      return "Language Learning";
    case "Business":
      return "Business";
    case "Academic":
      return "Academic";
    case "Fitness":
      return "Productivity";
    case "Personal Development":
      return "Career Development";
    default:
      return "Other";
  }
}

for (const suggestion of SKILL_SUGGESTIONS) {
  const mappedCategory = mapSuggestionCategory(suggestion.category);
  normalizedSuggestionIndex.set(normalizeSkill(suggestion.name), {
    name: suggestion.name,
    category: mappedCategory,
  });

  for (const alias of suggestion.aliases || []) {
    normalizedAliasIndex.set(normalizeSkill(alias), {
      name: suggestion.name,
      category: mappedCategory,
    });
  }
}

export function getSkillCategoryLabel(category: SkillCategory | undefined | null): string {
  return category || "Other";
}

export function getSkillCategory(skill: string | undefined | null): SkillCategory {
  if (!skill) return "Other";

  const normalized = normalizeSkill(skill);
  const suggestion = normalizedSuggestionIndex.get(normalized) || normalizedAliasIndex.get(normalized);
  if (suggestion) return suggestion.category;

  const lower = skill.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.words.some((word) => lower.includes(word))) {
      return entry.category;
    }
  }

  return "Other";
}

export function skillsShareCategory(left: string | undefined | null, right: string | undefined | null): boolean {
  return getSkillCategory(left) === getSkillCategory(right);
}

export function groupSkillsByCategory(skills: string[] = []) {
  const grouped = new Map<SkillCategory, string[]>();

  for (const skill of skills) {
    const category = getSkillCategory(skill);
    const existing = grouped.get(category) || [];
    if (!existing.includes(skill)) {
      existing.push(skill);
    }
    grouped.set(category, existing);
  }

  return grouped;
}

export function categoryBadgeClasses(category: SkillCategory) {
  const classes: Record<SkillCategory, string> = {
    Programming: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    Design: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
    Marketing: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    Communication: "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    Business: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    Productivity: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    "Creative Arts": "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    "Language Learning": "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    Academic: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    "Technical Tools": "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    "AI Tools": "border-primary/20 bg-primary/10 text-primary",
    "Career Development": "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    Other: "border-muted-foreground/20 bg-muted/60 text-muted-foreground",
  };

  return classes[category];
}
