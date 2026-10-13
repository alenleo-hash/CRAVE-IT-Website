import { Router } from "express";
import { z } from "zod";
import { CURATED_FOODS, DEFAULT_PREFERENCES, type FoodFilters, type UserPreferences } from "../../shared/food";
import { extractDeterministic, normalizeList } from "./constraints";
import { aiConfigured, extractWithAI, generateGroundedReply } from "./agent";
import { rankFoods } from "./ranking";
import { searchRecipes } from "./recipes";

const router = Router();
const limiter = new Map<string, { start: number; count: number }>();
router.use((req, res, next) => {
  const now = Date.now();
  const key = req.ip || "unknown";
  const current = limiter.get(key);
  if (!current || now - current.start > 60_000) limiter.set(key, { start: now, count: 1 });
  else if (++current.count > 30) return res.status(429).json({ error: "A few too many requests. Please try again in a minute." });
  if (limiter.size > 2000) for (const [k, v] of limiter) if (now - v.start > 60_000) limiter.delete(k);
  next();
});

const prefsSchema = z.object({ diet: z.enum(["any", "vegetarian", "vegan", "egg", "non_vegetarian"]).optional(), cuisines: z.array(z.string().max(60)).max(12).optional(), spice: z.number().min(1).max(3).optional(), budget: z.number().min(0).max(10000).optional(), allergies: z.array(z.string().max(80)).max(20).optional(), excludedIngredients: z.array(z.string().max(80)).max(20).optional(), cookingMinutes: z.number().min(5).max(240).optional(), difficulty: z.enum(["any", "easy", "medium", "advanced"]).optional(), goals: z.array(z.string().max(80)).max(12).optional(), mode: z.enum(["cook", "takeaway", "either"]).optional() }).partial();
const filtersSchema = z.object({ cuisine: z.string().max(80).optional(), diet: z.enum(["any", "vegetarian", "vegan", "egg", "non_vegetarian"]).optional(), maxBudget: z.number().min(0).max(10000).optional(), maxMinutes: z.number().min(1).max(240).optional(), difficulty: z.enum(["any", "easy", "medium", "advanced"]).optional(), spice: z.number().min(1).max(3).optional(), mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "any"]).optional(), ingredients: z.array(z.string().max(60)).max(15).optional(), category: z.string().max(60).optional() }).optional();
const recommendSchema = z.object({ query: z.string().max(1200).default("surprise me with a delicious meal"), preferences: prefsSchema.optional(), filters: filtersSchema, feedback: z.array(z.object({ itemId: z.string().max(80), type: z.enum(["love", "not_for_me", "too_expensive", "too_spicy", "similar"]) })).max(60).optional(), excludeIds: z.array(z.string().max(80)).max(30).optional(), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(500) })).max(12).optional() }).strict();

function blendAI(base: ReturnType<typeof extractDeterministic>, ai: Awaited<ReturnType<typeof extractWithAI>>) {
  if (!ai) return base;
  const merged = { ...base, ingredients: normalizeList([...(base.ingredients ?? []), ...(ai.ingredients ?? [])]), allergies: normalizeList([...(base.allergies ?? []), ...(ai.allergies ?? [])]), spice: base.spicy === undefined ? (ai.spiceLevel ?? base.spice) : base.spice };
  if (!base.diet && ai.diet && ai.diet !== "any") merged.diet = ai.diet;
  if (!base.cuisine && ai.cuisine) merged.cuisine = ai.cuisine;
  if (typeof base.budget !== "number" && typeof ai.budget === "number") merged.budget = ai.budget;
  if (!base.difficulty && ai.difficulty) merged.difficulty = ai.difficulty;
  if (typeof base.maxMinutes !== "number" && typeof ai.cookingMinutes === "number") { merged.cookingMinutes = ai.cookingMinutes; merged.maxMinutes = ai.cookingMinutes; }
  if (!base.mode && ai.mode) merged.mode = ai.mode;
  return merged;
}

function buildResult(body: z.infer<typeof recommendSchema>, aiIntent: Awaited<ReturnType<typeof extractWithAI>>) {
  const preferences = { ...DEFAULT_PREFERENCES, ...(body.preferences ?? {}) } as UserPreferences;
  const parsed = blendAI(extractDeterministic(body.query, preferences, body.filters as FoodFilters | undefined), aiIntent);
  if (aiIntent?.allergies?.length) parsed.allergies = [...new Set([...(parsed.allergies ?? []), ...normalizeList(aiIntent.allergies)])];
  const appliedConstraints: string[] = [];
  if (parsed.diet && parsed.diet !== "any") appliedConstraints.push(`Diet: ${parsed.diet.replace("_", " ")}`);
  if (parsed.allergies?.length) appliedConstraints.push(`Excluded: ${parsed.allergies.join(", ")}`);
  if (typeof parsed.budget === "number") appliedConstraints.push(`Estimated budget up to ₹${parsed.budget}`);
  if (body.filters?.cuisine && body.filters.cuisine !== "All cuisines") appliedConstraints.push(`Cuisine: ${body.filters.cuisine}`);
  if (body.filters?.ingredients?.length) appliedConstraints.push(`Must match at least one on-hand ingredient: ${body.filters.ingredients.join(", ")}`);
  if (aiIntent?.seasonalIntent || /\bseasonal|in season|seasonal ingredients\b/i.test(body.query)) appliedConstraints.push("Seasonal availability is not verified; matching the curated catalog only.");
  const requestsPlaces = /\b(?:restaurant|near me|nearby|order food|delivery|takeaway|takeout)\b/i.test(body.query);
  const ranked = rankFoods(CURATED_FOODS, [body.query, ...(aiIntent?.flavors ?? [])].join(" "), preferences, body.feedback, body.filters as FoodFilters | undefined, body.excludeIds, true, parsed);
  let limitation: string | null = requestsPlaces ? "Live restaurant and nearby-place results are not enabled. These are curated dish ideas only—not verified local businesses, delivery availability or live menu prices." : null;
  let recommendations = ranked.slice(0, 6);
  if (recommendations.length === 0) {
    const relaxedBudget = rankFoods(CURATED_FOODS, [body.query, ...(aiIntent?.flavors ?? [])].join(" "), preferences, body.feedback, body.filters as FoodFilters | undefined, body.excludeIds, false, parsed).slice(0, 3);
    if (relaxedBudget.length && typeof parsed.budget === "number" && relaxedBudget.every(item => item.priceINR > parsed.budget!)) {
      recommendations = relaxedBudget;
      limitation = [limitation, `Nothing in the curated catalog fits your budget. These alternatives exceed your ₹${parsed.budget} estimate; they are shown transparently so you can decide whether to adjust it.`].filter(Boolean).join(" ");
    } else {
      limitation = [limitation, "No curated dish currently matches all of those dietary, ingredient, allergy and filter constraints. Try widening a non-allergy preference; declared exclusions are never relaxed."].filter(Boolean).join(" ");
    }
  }
  const enoughContext = Boolean(parsed.diet || parsed.cuisine || parsed.budget || parsed.spicy || parsed.ingredients?.length || body.query.trim().length > 18);
  const aiFollowUp = aiIntent?.followUpQuestion?.trim();
  return {
    mode: aiIntent ? "live-ai" as const : "demo" as const,
    intent: aiIntent?.intent ?? body.query.slice(0, 160),
    detectedPreferences: parsed,
    appliedConstraints,
    recommendations,
    limitation,
    followUpQuestion: aiFollowUp || (!enoughContext ? "Would you like something quick, a full meal, or a recipe you can make at home?" : null),
    dataSources: ["CRAVE IT curated starter catalog", "Prices and preparation times are illustrative estimates, not live merchant data"],
  };
}

router.get("/config", (_req, res) => res.json({ aiAvailable: aiConfigured(), restaurantProviderAvailable: false, catalogMode: "curated" }));
router.post("/recommendations", async (req, res) => {
  const parsed = recommendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the request and try again.", details: parsed.error.flatten() });
  const ai = await extractWithAI(parsed.data.query, parsed.data.history);
  return res.json(buildResult(parsed.data, ai));
});
router.post("/chat", async (req, res) => {
  const chatSchema = recommendSchema.extend({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(500) })).min(1).max(12) }).strict();
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please enter a short food request." });
  const messages = parsed.data.messages;
  const query = [...messages].reverse().find(m => m.role === "user")?.content ?? parsed.data.query;
  const history = messages.slice(0, -1);
  const ai = await extractWithAI(query, history);
  const result = buildResult({ ...parsed.data, query, history }, ai);
  const grounded = await generateGroundedReply({ query, history, appliedConstraints: result.appliedConstraints, limitation: result.limitation, recommendations: result.recommendations });
  const available = new Map(result.recommendations.map(item => [item.id, item]));
  const selected = grounded?.selectedIds.length ? grounded.selectedIds.map(id => available.get(id)!).filter(Boolean) : result.recommendations.slice(0, 3);
  const details = selected.map(item => `${item.name} — ${item.matchReason} Estimated about ₹${item.priceINR} and ${item.prepMinutes} minutes; both are estimates.`).join(" ");
  const acknowledgment = grounded?.acknowledgment ?? (result.recommendations.length ? "Here are a few ideas from our curated collection." : "I couldn't find a match in our current curated collection.");
  const followUpQuestion = grounded ? grounded.followUpQuestion : result.followUpQuestion;
  const reply = [acknowledgment, details, result.limitation, followUpQuestion].filter(Boolean).join(" ");
  return res.json({ ...result, mode: grounded ? "live-ai" : "demo", followUpQuestion, reply });
});

const recipeSchema = z.object({
  ingredients: z.array(z.string().min(1).max(60)).min(1).max(20),
  servings: z.number().int().min(1).max(12).default(2),
  action: z.enum(["use", "alternatives", "spicier", "budget"]).optional(),
  excludeIds: z.array(z.string().max(100)).max(12).optional(),
  preferences: prefsSchema.optional(),
}).strict();
router.post("/recipes", async (req, res) => {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter at least one ingredient (up to 20)." });
  const preferences = { ...DEFAULT_PREFERENCES, ...(parsed.data.preferences ?? {}) } as UserPreferences;
  return res.json(searchRecipes({
    ingredients: parsed.data.ingredients,
    servings: parsed.data.servings,
    action: parsed.data.action ?? "use",
    excludeIds: parsed.data.excludeIds,
    preferences,
  }));
});

export default router;
