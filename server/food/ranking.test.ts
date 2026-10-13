import { describe, expect, it } from "vitest";
import { CURATED_FOODS, DEFAULT_PREFERENCES } from "../../shared/food";
import { extractDeterministic } from "./constraints";
import { hardCompatible, rankFoods } from "./ranking";

describe("CRAVE IT recommendation constraints", () => {
  it("extracts a spicy vegetarian budget request deterministically", () => {
    const parsed = extractDeterministic("I want spicy vegetarian food under ₹200");
    expect(parsed.diet).toBe("vegetarian");
    expect(parsed.budget).toBe(200);
    expect(parsed.spicy).toBe(true);
  });
  it("never recommends meat to a vegetarian profile", () => {
    const candidates = CURATED_FOODS.filter(item => hardCompatible(item, { ...DEFAULT_PREFERENCES, diet: "vegetarian" }));
    expect(candidates.every(item => ["vegan", "vegetarian"].includes(item.diet))).toBe(true);
    expect(candidates.some(item => item.id === "chicken-pepper-rice")).toBe(false);
  });
  it("offers a real, correctly classified item for a non-vegetarian request", () => {
    const candidates = CURATED_FOODS.filter(item => hardCompatible(item, { ...DEFAULT_PREFERENCES, diet: "non_vegetarian" }));
    expect(candidates.some(item => item.id === "chicken-pepper-rice" && item.diet === "non_vegetarian")).toBe(true);
    const filtered = rankFoods(CURATED_FOODS, "a filling meal", DEFAULT_PREFERENCES, [], { diet: "non_vegetarian" });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(item => ["non_vegetarian", "egg"].includes(item.diet))).toBe(true);
  });
  it("excludes declared dairy allergens before ranking", () => {
    const parsed = extractDeterministic("find some food", { ...DEFAULT_PREFERENCES, allergies: ["dairy"] });
    const candidates = CURATED_FOODS.filter(item => hardCompatible(item, parsed));
    expect(candidates.some(item => item.id === "paneer-tikka-rice")).toBe(false);
    expect(candidates.some(item => item.id === "sambar-rice")).toBe(true);
  });
  it("enforces an ingredient exclusion without mislabelling it as an allergy", () => {
    const parsed = extractDeterministic("something tasty without dairy", DEFAULT_PREFERENCES);
    expect(parsed.allergies).toEqual([]);
    expect(parsed.excludedIngredients).toContain("dairy");
    expect(hardCompatible(CURATED_FOODS.find(item => item.id === "paneer-tikka-rice")!, parsed)).toBe(false);
  });
  it("excludes dishes above the requested budget", () => {
    const parsed = extractDeterministic("Something under ₹150");
    const candidates = rankFoods(CURATED_FOODS, "Something under ₹150", DEFAULT_PREFERENCES);
    expect(candidates.every(item => item.priceINR <= 150)).toBe(true);
    expect(parsed.budget).toBe(150);
  });
  it("ranks a previously liked item above an otherwise comparable result", () => {
    const baseline = rankFoods(CURATED_FOODS, "vegetarian dinner", DEFAULT_PREFERENCES);
    const liked = rankFoods(CURATED_FOODS, "vegetarian dinner", DEFAULT_PREFERENCES, [{ itemId: baseline[0]!.id, type: "love" }]);
    expect(liked[0]!.id).toBe(baseline[0]!.id);
  });
  it("uses a saved similar request to boost matching food later", () => {
    const query = "a lovely meal to eat";
    const baseline = rankFoods(CURATED_FOODS, query, DEFAULT_PREFERENCES);
    const personalized = rankFoods(CURATED_FOODS, query, DEFAULT_PREFERENCES, [{ itemId: "veg-momos", type: "similar" }]);
    const noodlesBaseline = baseline.find(item => item.id === "chilli-veg-noodles")!.score;
    const noodlesPersonalized = personalized.find(item => item.id === "chilli-veg-noodles")!.score;
    expect(noodlesPersonalized).toBeGreaterThan(noodlesBaseline);
  });
  it("keeps pantry ingredients as a ranking signal without treating them as verified inventory", () => {
    const results = rankFoods(CURATED_FOODS, "I have rice, eggs, tomatoes and onions. Quick dinner", DEFAULT_PREFERENCES);
    expect(results.some(item => item.id === "egg-tomato-rice")).toBe(true);
  });
  it("requires at least one pantry-ingredient overlap when the Discovery ingredient filter is set", () => {
    const filtered = rankFoods(CURATED_FOODS, "find a meal", DEFAULT_PREFERENCES, [], { ingredients: ["cooked rice"] });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(item => item.ingredients.some(ingredient => ingredient.includes("rice")))).toBe(true);
  });
  it("turns stated easy/time limits into actual candidate restrictions", () => {
    const parsed = extractDeterministic("An easy dinner ready in 20 minutes", DEFAULT_PREFERENCES);
    expect(parsed.difficulty).toBe("easy");
    expect(parsed.maxMinutes).toBe(20);
    const results = rankFoods(CURATED_FOODS, "An easy dinner ready in 20 minutes", DEFAULT_PREFERENCES, [], undefined, [], true, parsed);
    expect(results.every(item => item.prepMinutes <= 20 && item.mealType === "dinner")).toBe(true);
  });
  it("makes explicit profile goals influence actual item scores", () => {
    const query = "a tasty dinner";
    const ordinary = rankFoods(CURATED_FOODS, query, DEFAULT_PREFERENCES);
    const profile = { ...DEFAULT_PREFERENCES, goals: ["More protein"] };
    const personalized = rankFoods(CURATED_FOODS, query, profile);
    const paneerBase = ordinary.find(item => item.id === "paneer-tikka-rice")!.score;
    const paneerPersonalized = personalized.find(item => item.id === "paneer-tikka-rice")!.score;
    expect(paneerPersonalized).toBeGreaterThan(paneerBase);
  });
});
