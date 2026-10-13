import type { Diet, Difficulty, FoodFilters, UserPreferences } from "../../shared/food";
import { DEFAULT_PREFERENCES } from "../../shared/food";

const allergyAliases: Record<string, string[]> = {
  dairy: ["dairy", "milk", "paneer", "yogurt", "curd", "cheese", "butter", "cream"],
  milk: ["dairy", "milk", "paneer", "yogurt", "curd", "cheese", "butter", "cream"],
  peanuts: ["peanut", "peanuts"], peanut: ["peanut", "peanuts"],
  nuts: ["almond", "cashew", "walnut", "pistachio", "nuts"],
  egg: ["egg", "eggs"], eggs: ["egg", "eggs"],
  gluten: ["gluten", "wheat", "flour", "bread", "noodles"],
  soy: ["soy", "soy sauce", "tofu"], sesame: ["sesame", "tahini"],
  shellfish: ["shellfish", "shrimp", "prawn", "crab"], fish: ["fish", "fish sauce"],
};

export function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((v): v is string => typeof v === "string").map(v => v.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}
export function allergyTerms(values: string[]): string[] {
  return [...new Set(values.flatMap(value => allergyAliases[value.toLowerCase()] ?? [value.toLowerCase()]))];
}

type ParsedPreferences = Partial<UserPreferences> & { ingredients: string[]; budget?: number; maxMinutes?: number; diet?: Diet; cuisine?: string; spicy?: boolean; mealType?: string };
export function extractDeterministic(query: string, profile?: Partial<UserPreferences>, filters?: FoodFilters): ParsedPreferences {
  const q = query.slice(0, 1200).toLowerCase();
  const prefs: ParsedPreferences = { ingredients: [] };
  const budget = q.match(/(?:under|below|less than|up to|upto|within|maximum of|max(?:imum)?\s*)\s*₹?\s*(\d{2,5})/i) ?? q.match(/₹\s*(\d{2,5})/i);
  if (budget) prefs.budget = Number(budget[1]);
  if (/\bvegan\b/.test(q)) prefs.diet = "vegan";
  else if (/\bvegetarian\b|\bveg\b/.test(q)) prefs.diet = "vegetarian";
  else if (/\beggs?\b|\begg-based\b|\beggetarian\b/.test(q)) prefs.diet = "egg";
  else if (/\bnon[- ]?veg(?:etarian)?\b|\bchicken\b|\bmeat\b|\bfish\b/.test(q)) prefs.diet = "non_vegetarian";
  const cuisines = ["South Indian", "North Indian", "Indo-Chinese", "East Asian", "Mediterranean", "Himalayan", "Indian"];
  const foundCuisine = cuisines.find(c => q.includes(c.toLowerCase()));
  if (foundCuisine) prefs.cuisine = foundCuisine;
  if (/mild|not too spicy|not spicy|less spicy/.test(q)) { prefs.spice = 1; prefs.spicy = false; }
  else if (/spicy|hot|fiery|chilli|chili/.test(q)) { prefs.spicy = true; prefs.spice = 3; }
  const time = q.match(/(?:under|below|within|in|ready in|less than|up to|no more than)\s*(\d{1,3})\s*(?:minutes?|mins?)\b/i);
  if (time) { prefs.cookingMinutes = Math.max(1, Math.min(240, Number(time[1]))); prefs.maxMinutes = prefs.cookingMinutes; }
  if (/\b(easy|quick|simple|beginner|low[- ]effort)\b/.test(q)) prefs.difficulty = "easy";
  else if (/\b(medium|moderate)\s+(?:difficulty|effort)\b/.test(q)) prefs.difficulty = "medium";
  else if (/\b(advanced|challenging|complex)\b/.test(q)) prefs.difficulty = "advanced";
  if (/high[- ]?protein|protein[- ]rich|more protein/.test(q)) prefs.goals = [...(prefs.goals ?? []), "More protein"];
  if (/lighter meal|light meal|low[- ]?sugar|less sugar/.test(q)) prefs.goals = [...(prefs.goals ?? []), "Lighter meals"];
  if (/wholesome|balanced meal/.test(q)) prefs.goals = [...(prefs.goals ?? []), "Wholesome"];
  if (/comfort food|comforting|cozy|rainy evening/.test(q)) prefs.goals = [...(prefs.goals ?? []), "Comfort first"];
  if (/breakfast|brunch/.test(q)) prefs.mealType = "breakfast";
  else if (/lunch/.test(q)) prefs.mealType = "lunch";
  else if (/dinner|supper/.test(q)) prefs.mealType = "dinner";
  else if (/snack|bite/.test(q)) prefs.mealType = "snack";
  if (/takeaway|takeout|order(?:ing)?|restaurant/.test(q)) prefs.mode = "takeaway";
  else if (/cook at home|home[- ]cooked|make (?:it|this|something)|recipe|cook(?:ing)? myself/.test(q)) prefs.mode = "cook";
  const ingredientMatch = q.match(/(?:i have|with|using|use my ingredients|ingredients? (?:are|:))\s+([^.!?]{2,180})/i);
  if (ingredientMatch) prefs.ingredients = ingredientMatch[1].split(/,| and /).map(s => s.trim()).filter(Boolean).slice(0, 12);
  const allergyMatch = q.match(/\ballerg(?:y|ic|ies)\s*(?:(?:to|is|are)\s+|:\s*)?([^.!?]{2,100})/i) ?? q.match(/\b([\w ,]+?)\s+allerg(?:y|ies)\b/i);
  const allergyMentioned = allergyMatch?.[1]?.split(/,| and | or /).map(s => s.replace(/^\s*(?:to|is|are)\s+/i, "").trim()).filter(Boolean).slice(0, 8) ?? [];
  const exclusion = q.match(/\b(?:avoid(?:ing)?|without|no)\s+([^.!?]{2,100})/i);
  const excludedMentioned = exclusion?.[1]?.split(/,| and | or /).map(s => s.trim()).filter(Boolean).slice(0, 8) ?? [];
  prefs.allergies = [...new Set([...normalizeList(profile?.allergies), ...normalizeList(allergyMentioned)])];
  prefs.excludedIngredients = [...new Set([...normalizeList(profile?.excludedIngredients), ...normalizeList(allergyMentioned), ...normalizeList(excludedMentioned)])];
  if (profile) {
    if (!prefs.diet && profile.diet && profile.diet !== "any") prefs.diet = profile.diet;
    if (profile.cuisines?.length) prefs.cuisines = normalizeList(profile.cuisines);
    if (!prefs.spice && typeof profile.spice === "number") prefs.spice = profile.spice;
    if (!prefs.difficulty && profile.difficulty && profile.difficulty !== "any") prefs.difficulty = profile.difficulty;
    prefs.goals = [...new Set([...(profile.goals ?? []), ...(prefs.goals ?? [])])];
  }
  if (filters?.diet) prefs.diet = filters.diet;
  if (filters?.cuisine && filters.cuisine !== "All cuisines") prefs.cuisine = filters.cuisine;
  if (typeof filters?.maxBudget === "number") prefs.budget = Math.min(prefs.budget ?? Infinity, filters.maxBudget);
  if (typeof filters?.maxMinutes === "number") { prefs.cookingMinutes = filters.maxMinutes; prefs.maxMinutes = filters.maxMinutes; }
  if (typeof filters?.spice === "number") prefs.spice = filters.spice;
  if (filters?.difficulty && filters.difficulty !== "any") prefs.difficulty = filters.difficulty;
  if (filters?.mealType && filters.mealType !== "any") prefs.mealType = filters.mealType;
  if (filters?.ingredients?.length) prefs.ingredients = [...new Set([...prefs.ingredients, ...normalizeList(filters.ingredients)])];
  return prefs;
}

export function effectiveProfile(profile?: Partial<UserPreferences>): UserPreferences {
  return { ...DEFAULT_PREFERENCES, ...(profile ?? {}), allergies: normalizeList(profile?.allergies), excludedIngredients: normalizeList(profile?.excludedIngredients), cuisines: normalizeList(profile?.cuisines), goals: normalizeList(profile?.goals) };
}
