import type { FeedbackType, FoodFilters, FoodItem, RankedFood, UserPreferences } from "../../shared/food";
import { allergyTerms, extractDeterministic } from "./constraints";

const containsTerm = (source: string, term: string) => { const normalized = term.trim().toLowerCase(); return normalized.length > 1 && source.toLowerCase().includes(normalized); };
const overlaps = (items: string[], terms: string[]) => items.some(item => terms.some(term => containsTerm(item, term) || containsTerm(term, item)));
const inferDifficulty = (minutes: number) => minutes <= 20 ? "easy" : minutes <= 35 ? "medium" : "advanced";

export function hardCompatible(item: FoodItem, preferences: Partial<UserPreferences> & { budget?: number; maxMinutes?: number; diet?: string; cuisine?: string; mealType?: string; ingredients?: string[] }, filters?: FoodFilters, enforceBudget = true): boolean {
  const diet = preferences.diet;
  if (diet === "vegan" && item.diet !== "vegan") return false;
  if (diet === "vegetarian" && !["vegetarian", "vegan"].includes(item.diet)) return false;
  if (diet === "egg" && item.diet !== "egg") return false;
  if (diet === "non_vegetarian" && !["non_vegetarian", "egg"].includes(item.diet)) return false;
  const dangerousTerms = allergyTerms([...(preferences.allergies ?? []), ...(preferences.excludedIngredients ?? [])]);
  if (overlaps(item.allergens, dangerousTerms) || overlaps(item.ingredients, dangerousTerms)) return false;
  if (enforceBudget && typeof preferences.budget === "number" && item.priceINR > preferences.budget) return false;
  if (preferences.maxMinutes && item.prepMinutes > preferences.maxMinutes) return false;
  if (filters?.maxMinutes && item.prepMinutes > filters.maxMinutes) return false;
  const requestedMeal = filters?.mealType && filters.mealType !== "any" ? filters.mealType : preferences.mealType;
  if (requestedMeal && requestedMeal !== "any" && item.mealType !== requestedMeal) return false;
  if (filters?.cuisine && filters.cuisine !== "All cuisines" && item.cuisine !== filters.cuisine) return false;
  if (filters?.diet && filters.diet !== "any") {
    if (filters.diet === "vegan" && item.diet !== "vegan") return false;
    if (filters.diet === "vegetarian" && !["vegetarian", "vegan"].includes(item.diet)) return false;
    if (filters.diet === "egg" && item.diet !== "egg") return false;
    if (filters.diet === "non_vegetarian" && !["non_vegetarian", "egg"].includes(item.diet)) return false;
  }
  if (filters?.ingredients?.length && !overlaps(item.ingredients, filters.ingredients)) return false;
  const wantedDifficulty = filters?.difficulty ?? "any";
  if (wantedDifficulty !== "any" && inferDifficulty(item.prepMinutes) !== wantedDifficulty) return false;
  if (filters?.spice && item.spice > filters.spice) return false;
  const category = filters?.category?.toLowerCase();
  if (category === "quick bites" && item.prepMinutes > 20) return false;
  if (category === "budget-friendly meals" && item.priceINR > 160) return false;
  if (category === "healthy choices" && !item.tags.some(tag => ["protein", "wholesome", "balanced", "light"].includes(tag))) return false;
  if (category === "comfort food" && !item.tags.includes("comfort")) return false;
  return true;
}

type ExtractedPreferences = Partial<UserPreferences> & { budget?: number; maxMinutes?: number; diet?: string; cuisine?: string; ingredients?: string[]; spicy?: boolean };
export function rankFoods(items: FoodItem[], query: string, profile: Partial<UserPreferences>, feedback: { itemId: string; type: FeedbackType }[] = [], filters?: FoodFilters, excludeIds: string[] = [], enforceBudget = true, extracted?: ExtractedPreferences): RankedFood[] {
  const intent = query.toLowerCase();
  const parsed = { ...extractDeterministic(query, profile, filters), ...(extracted ?? {}) };
  const preferences = { ...profile, ...parsed };
  const results = items.filter(item => !excludeIds.includes(item.id) && hardCompatible(item, preferences, filters, enforceBudget));
  const similarSeeds = feedback.filter(entry => entry.type === "similar").map(entry => items.find(candidate => candidate.id === entry.itemId)).filter((item): item is FoodItem => Boolean(item));
  return results.map(item => {
    const queryTerms = intent.split(/[^a-z]+/).filter(term => term.length > 3);
    const dishText = `${item.name} ${item.cuisine} ${item.description} ${item.tags.join(" ")} ${item.ingredients.join(" ")}`.toLowerCase();
    const cravingScore = queryTerms.length ? Math.min(1, queryTerms.filter(term => dishText.includes(term)).length / Math.min(3, queryTerms.length) + (item.tags.some(tag => intent.includes(tag)) ? 0.35 : 0)) : 0.55;
    const cuisineScore = parsed.cuisine ? (item.cuisine.toLowerCase() === parsed.cuisine.toLowerCase() ? 1 : 0.15) : preferences.cuisines?.length ? (preferences.cuisines.includes(item.cuisine) ? 1 : 0.3) : 0.55;
    const spiceTarget = parsed.spice ?? 2;
    const spiceScore = 1 - Math.min(1, Math.abs(item.spice - spiceTarget) * 0.4);
    const goals = preferences.goals ?? [];
    const goalTargets = goals.map(goal => /protein/i.test(goal) ? "protein" : /light|sugar/i.test(goal) ? "light" : /wholesome|balanced/i.test(goal) ? "wholesome" : /comfort/i.test(goal) ? "comfort" : goal.toLowerCase());
    const goalScore = goalTargets.length ? goalTargets.filter(target => item.tags.some(tag => tag.includes(target))).length / goalTargets.length : 0.65;
    const tasteScore = cuisineScore * 0.45 + spiceScore * 0.35 + goalScore * 0.2;
    const budgetScore = typeof preferences.budget === "number" ? Math.max(0.2, 1 - item.priceINR / (preferences.budget * 1.5)) : 0.65;
    const timeScore = Math.max(0.1, 1 - item.prepMinutes / Math.max(30, preferences.cookingMinutes ?? 45));
    const difficultyTarget = preferences.difficulty ?? "any";
    const difficultyScore = difficultyTarget === "any" || inferDifficulty(item.prepMinutes) === difficultyTarget ? 1 : 0.45;
    const modeTarget = preferences.mode ?? "either";
    const modeScore = modeTarget === "cook" ? (item.kind === "recipe" ? 1 : 0.4) : modeTarget === "takeaway" ? (item.kind === "dish" ? 1 : 0.4) : 0.65;
    const convenienceScore = timeScore * 0.65 + difficultyScore * 0.25 + modeScore * 0.1;
    const ingredientScore = parsed.ingredients?.length ? Math.min(1, item.ingredients.filter(ingredient => parsed.ingredients!.some(term => containsTerm(ingredient, term))).length / Math.max(1, Math.min(parsed.ingredients.length, 3))) : 0.65;
    const dietScore = preferences.diet && preferences.diet !== "any" ? 1 : 0.68;
    const compatibilityScore = 0.8 * dietScore + 0.2 * ingredientScore;
    const recent = feedback.filter(entry => entry.itemId === item.id);
    const feedbackDelta = recent.reduce((score, entry) => {
      if (entry.type === "similar") return score;
      return score + ({ love: 1, not_for_me: -1, too_expensive: -0.75, too_spicy: -0.5 }[entry.type]);
    }, 0);
    const similarityScore = similarSeeds.reduce((best, seed) => {
      if (seed.id === item.id) return best;
      const sharedTags = seed.tags.filter(tag => item.tags.includes(tag)).length;
      const affinity = (seed.cuisine === item.cuisine ? 0.55 : 0) + Math.min(0.45, sharedTags * 0.2);
      return Math.max(best, affinity);
    }, 0);
    const personalizationScore = Math.max(0, Math.min(1, 0.5 + feedbackDelta * 0.35 + similarityScore * 0.35));
    const exploreBoost = filters?.category === "Explore cuisines" && !/indian/i.test(item.cuisine) ? 5 : 0;
    const score = Math.min(100, Math.round((cravingScore * 0.3 + tasteScore * 0.2 + compatibilityScore * 0.2 + budgetScore * 0.15 + convenienceScore * 0.1 + personalizationScore * 0.05) * 100 + exploreBoost));
    const reasonBits: string[] = [];
    if ((parsed.spicy || spiceTarget >= 3) && item.spice >= 2) reasonBits.push("brings the spice you asked for");
    if (parsed.cuisine && item.cuisine.toLowerCase() === parsed.cuisine.toLowerCase()) reasonBits.push(`fits your ${item.cuisine} craving`);
    if (typeof preferences.budget === "number" && item.priceINR <= preferences.budget) reasonBits.push(`sits within your ₹${preferences.budget} budget (estimated)`);
    if (parsed.ingredients?.some(term => item.ingredients.some(ingredient => containsTerm(ingredient, term)))) reasonBits.push("uses ingredients you have on hand");
    if (goals.some(goal => goalTargets.some(target => item.tags.some(tag => tag.includes(target))))) reasonBits.push("matches a preference from your taste profile");
    if (item.prepMinutes <= 20) reasonBits.push(`comes together in about ${item.prepMinutes} minutes (estimate)`);
    if (recent.some(entry => entry.type === "love")) reasonBits.push("you've liked this before");
    if (similarityScore >= 0.55) reasonBits.push("similar to a dish you asked for before");
    return { ...item, score, matchReason: reasonBits.slice(0, 2).join(" and ") || `a ${item.cuisine} ${item.diet === "vegan" || item.diet === "vegetarian" ? "plant-forward" : "satisfying"} pick from our curated menu` };
  }).sort((a, b) => b.score - a.score || a.priceINR - b.priceINR);
}
