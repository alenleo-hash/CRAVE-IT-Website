import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../../shared/food";
import { searchRecipes } from "./recipes";

describe("CRAVE IT ingredient-recipe actions", () => {
  const pantry = ["rice", "eggs", "tomatoes", "onions"];

  it("matches owned ingredients, scales servings and keeps remaining items visible", () => {
    const result = searchRecipes({ ingredients: pantry, servings: 4, action: "use", preferences: DEFAULT_PREFERENCES });
    expect(result.recipes.length).toBeGreaterThan(0);
    const eggRice = result.recipes.find(recipe => recipe.id === "tomato-egg-rice-recipe")!;
    expect(eggRice.servings).toBe(4);
    expect(eggRice.ingredientsWithAmounts.find(item => item.name === "eggs")?.amount).toBe(4);
    expect(eggRice.missingIngredients).toContain("oil");
  });

  it("actually adds recipe-specific spice steps and quantities", () => {
    const base = searchRecipes({ ingredients: pantry, servings: 2, action: "use", preferences: DEFAULT_PREFERENCES });
    const hotter = searchRecipes({ ingredients: pantry, servings: 2, action: "spicier", preferences: DEFAULT_PREFERENCES });
    const baseEggRice = base.recipes.find(recipe => recipe.id === "tomato-egg-rice-recipe")!;
    const hotEggRice = hotter.recipes.find(recipe => recipe.id === "tomato-egg-rice-recipe")!;
    expect(hotEggRice.ingredientsWithAmounts.find(item => /green chilli/i.test(item.name))?.amount).toBeGreaterThan(baseEggRice.ingredientsWithAmounts.find(item => /green chilli/i.test(item.name))!.amount);
    expect(hotEggRice.steps.some(step => /h otter|hotter|increase the green chilli/i.test(step))).toBe(true);
    expect(hotter.note).toMatch(/adjusted for more heat/i);
  });

  it("does not introduce an excluded chilli in a spicy transformation", () => {
    const preferences = { ...DEFAULT_PREFERENCES, excludedIngredients: ["green chilli"] };
    const result = searchRecipes({ ingredients: ["rice", "lemon", "peanuts", "mustard seeds", "curry leaves"], servings: 2, action: "spicier", preferences });
    expect(result.recipes.some(recipe => recipe.id === "lemon-rice-recipe")).toBe(true);
    expect(result.recipes.every(recipe => recipe.ingredientsWithAmounts.every(item => !/green chilli/i.test(item.name)))).toBe(true);
    expect(result.note).toMatch(/prevent a safe extra-spice change/i);
  });

  it("Find Alternatives excludes the recipe the user has open", () => {
    const result = searchRecipes({ ingredients: pantry, servings: 2, action: "alternatives", excludeIds: ["tomato-egg-rice-recipe"], preferences: DEFAULT_PREFERENCES });
    expect(result.recipes.length).toBeGreaterThan(0);
    expect(result.recipes.some(recipe => recipe.id === "tomato-egg-rice-recipe")).toBe(false);
    expect(result.recipes.every(recipe => recipe.overlap > 0)).toBe(true);
  });

  it("ranks fewer-missing-item options first in budget mode without claiming live savings", () => {
    const result = searchRecipes({ ingredients: pantry, servings: 2, action: "budget", preferences: DEFAULT_PREFERENCES });
    expect(result.recipes.length).toBeGreaterThan(1);
    const missingCounts = result.recipes.map(recipe => recipe.missingIngredients.length);
    expect(missingCounts).toEqual([...missingCounts].sort((a, b) => a - b));
    expect(result.note).toMatch(/no verified ingredient-price source/i);
  });

  it("keeps known peanut-allergen records out before displaying a recipe", () => {
    const preferences = { ...DEFAULT_PREFERENCES, allergies: ["peanut"] };
    const result = searchRecipes({ ingredients: ["rice", "lemon", "peanuts", "mustard seeds", "curry leaves"], servings: 2, action: "use", preferences });
    expect(result.recipes.some(recipe => recipe.id === "lemon-rice-recipe")).toBe(false);
  });
});
