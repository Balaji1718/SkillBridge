// Comprehensive skill suggestions dataset for autocomplete
// Organized by category for better UX

export type SkillCategory = 
  | "Programming"
  | "Web Development"
  | "Mobile Development"
  | "Design"
  | "Writing"
  | "Languages"
  | "Music"
  | "Business"
  | "Creative"
  | "Academic"
  | "Fitness"
  | "Personal Development"
  | "Other";

export interface Skill {
  name: string;
  category: SkillCategory;
  aliases?: string[]; // Alternative names for the skill
}

// Comprehensive skill list with common technical and non-technical skills
export const SKILL_SUGGESTIONS: Skill[] = [
  // Programming Languages
  { name: "JavaScript", category: "Programming", aliases: ["JS", "Node.js"] },
  { name: "Python", category: "Programming" },
  { name: "Java", category: "Programming" },
  { name: "C++", category: "Programming", aliases: ["CPP", "C Plus Plus"] },
  { name: "C#", category: "Programming", aliases: ["C Sharp"] },
  { name: "Go", category: "Programming", aliases: ["Golang"] },
  { name: "Rust", category: "Programming" },
  { name: "Ruby", category: "Programming" },
  { name: "PHP", category: "Programming" },
  { name: "TypeScript", category: "Programming", aliases: ["TS"] },
  { name: "Kotlin", category: "Programming" },
  { name: "Swift", category: "Programming" },
  { name: "SQL", category: "Programming" },
  { name: "R", category: "Programming" },

  // Web Development
  { name: "React", category: "Web Development", aliases: ["React.js", "ReactJS"] },
  { name: "Vue", category: "Web Development", aliases: ["Vue.js", "VueJS"] },
  { name: "Angular", category: "Web Development" },
  { name: "Svelte", category: "Web Development" },
  { name: "HTML", category: "Web Development" },
  { name: "CSS", category: "Web Development" },
  { name: "Next.js", category: "Web Development", aliases: ["NextJS", "Next"] },
  { name: "Express.js", category: "Web Development", aliases: ["Express", "ExpressJS"] },
  { name: "Django", category: "Web Development" },
  { name: "Flask", category: "Web Development" },
  { name: "GraphQL", category: "Web Development" },
  { name: "REST API", category: "Web Development", aliases: ["RESTful API", "REST"] },
  { name: "Tailwind CSS", category: "Web Development", aliases: ["Tailwind"] },
  { name: "Bootstrap", category: "Web Development" },

  // Mobile Development
  { name: "React Native", category: "Mobile Development", aliases: ["React Native"] },
  { name: "Flutter", category: "Mobile Development" },
  { name: "Android Development", category: "Mobile Development" },
  { name: "iOS Development", category: "Mobile Development" },
  { name: "Xamarin", category: "Mobile Development" },

  // Design
  { name: "Photoshop", category: "Design", aliases: ["Adobe Photoshop", "PS"] },
  { name: "Figma", category: "Design" },
  { name: "Adobe Illustrator", category: "Design", aliases: ["Illustrator", "AI"] },
  { name: "Adobe XD", category: "Design", aliases: ["XD"] },
  { name: "Sketch", category: "Design" },
  { name: "UI Design", category: "Design" },
  { name: "UX Design", category: "Design" },
  { name: "Graphic Design", category: "Design" },
  { name: "Video Editing", category: "Design", aliases: ["Video Edit"] },
  { name: "Animation", category: "Design" },
  { name: "3D Modeling", category: "Design", aliases: ["3D Model", "Blender"] },
  { name: "Adobe Premiere", category: "Design", aliases: ["Premiere"] },
  { name: "Adobe After Effects", category: "Design", aliases: ["After Effects"] },

  // Writing
  { name: "Creative Writing", category: "Writing" },
  { name: "Technical Writing", category: "Writing" },
  { name: "Copywriting", category: "Writing" },
  { name: "Blogging", category: "Writing" },
  { name: "Editing", category: "Writing" },
  { name: "Proofreading", category: "Writing" },
  { name: "Resume Building", category: "Writing", aliases: ["Resume Writing"] },
  { name: "Cover Letter Writing", category: "Writing" },

  // Languages
  { name: "Spanish", category: "Languages", aliases: ["Español"] },
  { name: "French", category: "Languages", aliases: ["Français"] },
  { name: "German", category: "Languages", aliases: ["Deutsch"] },
  { name: "Mandarin", category: "Languages", aliases: ["Chinese", "中文"] },
  { name: "Japanese", category: "Languages", aliases: ["日本語"] },
  { name: "Korean", category: "Languages", aliases: ["한국어"] },
  { name: "Italian", category: "Languages", aliases: ["Italiano"] },
  { name: "Portuguese", category: "Languages", aliases: ["Português"] },
  { name: "Russian", category: "Languages", aliases: ["Русский"] },
  { name: "Arabic", category: "Languages", aliases: ["العربية"] },
  { name: "Hindi", category: "Languages", aliases: ["हिंदी"] },

  // Music
  { name: "Piano", category: "Music" },
  { name: "Guitar", category: "Music" },
  { name: "Violin", category: "Music" },
  { name: "Drums", category: "Music" },
  { name: "Singing", category: "Music", aliases: ["Vocals", "Voice"] },
  { name: "Music Production", category: "Music", aliases: ["Producing"] },
  { name: "Music Theory", category: "Music" },
  { name: "Audio Engineering", category: "Music" },

  // Business
  { name: "Excel", category: "Business", aliases: ["Spreadsheet"] },
  { name: "Accounting", category: "Business" },
  { name: "Project Management", category: "Business" },
  { name: "Marketing", category: "Business" },
  { name: "Sales", category: "Business" },
  { name: "Public Speaking", category: "Business" },
  { name: "Presentation Skills", category: "Business" },
  { name: "Business Writing", category: "Business" },
  { name: "Social Media Marketing", category: "Business" },
  { name: "Email Marketing", category: "Business" },
  { name: "SEO", category: "Business", aliases: ["Search Engine Optimization"] },
  { name: "Digital Marketing", category: "Business" },

  // Creative
  { name: "Photography", category: "Creative" },
  { name: "Videography", category: "Creative" },
  { name: "Drawing", category: "Creative" },
  { name: "Painting", category: "Creative" },
  { name: "Sculpting", category: "Creative" },
  { name: "Fashion Design", category: "Creative" },
  { name: "Interior Design", category: "Creative" },
  { name: "Landscape Design", category: "Creative" },

  // Academic
  { name: "Math", category: "Academic" },
  { name: "Physics", category: "Academic" },
  { name: "Chemistry", category: "Academic" },
  { name: "Biology", category: "Academic" },
  { name: "History", category: "Academic" },
  { name: "Economics", category: "Academic" },
  { name: "Statistics", category: "Academic" },
  { name: "Test Preparation", category: "Academic", aliases: ["SAT", "GRE", "GMAT"] },

  // Fitness
  { name: "Fitness Training", category: "Fitness" },
  { name: "Yoga", category: "Fitness" },
  { name: "Pilates", category: "Fitness" },
  { name: "Strength Training", category: "Fitness" },
  { name: "Cardio", category: "Fitness" },
  { name: "Nutrition", category: "Fitness" },
  { name: "Weightlifting", category: "Fitness" },

  // Personal Development
  { name: "Leadership", category: "Personal Development" },
  { name: "Communication Skills", category: "Personal Development" },
  { name: "Time Management", category: "Personal Development" },
  { name: "Career Coaching", category: "Personal Development" },
  { name: "Meditation", category: "Personal Development" },
  { name: "Mindfulness", category: "Personal Development" },
];

/**
 * Get skill suggestions based on input query
 * Supports partial matching and alias matching
 * @param query - User input
 * @param limit - Max results to return
 * @returns Array of suggested skills
 */
export function getSkillSuggestions(query: string, limit: number = 10): Skill[] {
  if (!query.trim()) {
    return SKILL_SUGGESTIONS.slice(0, limit);
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Filter and score skills
  const scored = SKILL_SUGGESTIONS.map((skill) => {
    const skillName = skill.name.toLowerCase();
    const aliasMatches = skill.aliases?.map(a => a.toLowerCase()) || [];

    let score = 0;

    // Exact match or starts with query (highest priority)
    if (skillName === normalizedQuery) score = 1000;
    else if (skillName.startsWith(normalizedQuery)) score = 900;
    else if (aliasMatches.some(a => a === normalizedQuery)) score = 800;
    else if (aliasMatches.some(a => a.startsWith(normalizedQuery))) score = 700;
    // Partial match (includes query)
    else if (skillName.includes(normalizedQuery)) score = 500;
    else if (aliasMatches.some(a => a.includes(normalizedQuery))) score = 400;

    return { skill, score };
  });

  // Filter and sort by score
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ skill }) => skill)
    .slice(0, limit);
}

/**
 * Normalize a skill name to standard form
 * Handles variants like React/React.js/reactjs
 * @param skill - Skill name
 * @returns Normalized skill name
 */
export function normalizeSkillName(skill: string): string {
  const normalized = skill.toLowerCase().trim();

  // Find if this skill or an alias matches our dictionary
  for (const suggestionSkill of SKILL_SUGGESTIONS) {
    const skillName = suggestionSkill.name.toLowerCase();
    const aliases = suggestionSkill.aliases?.map(a => a.toLowerCase()) || [];

    if (skillName === normalized) {
      return suggestionSkill.name;
    }

    if (aliases.includes(normalized)) {
      return suggestionSkill.name;
    }
  }

  // If not found in dictionary, return original but cleaned
  return normalized;
}

/**
 * Get all skills organized by category
 * Useful for category-based filtering
 * @returns Map of category to skills
 */
export function getSkillsByCategory(): Map<SkillCategory, Skill[]> {
  const categoryMap = new Map<SkillCategory, Skill[]>();

  for (const skill of SKILL_SUGGESTIONS) {
    if (!categoryMap.has(skill.category)) {
      categoryMap.set(skill.category, []);
    }
    categoryMap.get(skill.category)!.push(skill);
  }

  return categoryMap;
}
