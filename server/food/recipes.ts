import { CURATED_RECIPES, type RecipeRecord, type UserPreferences } from "../../shared/food";
import { allergyTerms } from "./constraints";
import { hardCompatible } from "./ranking";

export type RecipeAction = "use" | "alternatives" | "spicier" | "budget";
export interface RecipeSearchInput {
  ingredients: string[];
  servings: number;
  action: RecipeAction;
  excludeIds?: string[];
  preferences: UserPreferences;
}
export type IngredientDetail = RecipeRecord["ingredientsWithAmounts"][number] & { have: boolean };
export type MatchedRecipe = Omit<RecipeRecord, "ingredientsWithAmounts"> & {
  ingredientsWithAmounts: IngredientDetail[];
  haveIngredients: string[];
  missingIngredients: string[];
  overlap: number;
  nutritionStatus: string;
  action: RecipeAction;
};
export interface RecipeSearchResult { recipes: MatchedRecipe[]; note: string; }

const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function searchRecipes(input: RecipeSearchInput): RecipeSearchResult {
  const owned = [...new Set(input.ingredients.map(clean).filter(Boolean))];
  const blockedTerms = allergyTerms([...(input.preferences.allergies ?? []), ...(input.preferences.excludedIngredients ?? [])]);
  const isBlocked = (name: string) => blockedTerms.some(term => clean(term).includes(clean(name)) || clean(name).includes(clean(term)));
  const matches = CURATED_RECIPES
    .filter(recipe => !input.excludeIds?.includes(recipe.id) && hardCompatible(recipe, input.preferences))
    .map(recipe => {
      const have = (name: string) => owned.some(term => clean(name).includes(term) || term.includes(clean(name)));
      const overlap = recipe.ingredientsWithAmounts.reduce((count, item) => count + (have(item.name) ? 1 : 0), 0);
      const missing = recipe.ingredientsWithAmounts.reduce((count, item) => count + (have(item.name) ? 0 : 1), 0);
      return { recipe, overlap, missing };
    })
    .filter(item => item.overlap > 0)
    .sort((a, b) => input.action === "budget"
      ? a.missing - b.missing || a.recipe.ingredientsWithAmounts.length - b.recipe.ingredientsWithAmounts.length || b.overlap - a.overlap
      : b.overlap - a.overlap || a.missing - b.missing)
    .slice(0, 5);

  let blockedSpicyChange = false;
  const recipes: MatchedRecipe[] = matches.map(({ recipe, overlap }) => {
    const scale = input.servings / recipe.servings;
    const sourceIngredients = recipe.ingredientsWithAmounts.map(item => ({ ...item, amount: Math.round(item.amount * scale * 100) / 100 }));
    let steps = [...recipe.steps];
    if (input.action === "spicier") {
      if (isBlocked("green chilli") || isBlocked("chilli")) {
        blockedSpicyChange = true;
      } else if (recipe.id === "tomato-egg-rice-recipe") {
        const chilli = sourceIngredients.find(item => /chilli|chili/i.test(item.name));
        if (chilli) chilli.amount = Math.round((chilli.amount + scale) * 100) / 100;
        steps = [...steps, "For a hotter version, increase the green chilli by one per original two servings and cook it with the onion; taste as you go."];
      } else if (recipe.id === "sambar-rice-recipe") {
        if (isBlocked("sambar powder")) blockedSpicyChange = true;
        else {
          const powder = sourceIngredients.find(item => /sambar powder/i.test(item.name));
          if (powder) powder.amount = Math.round((powder.amount + 0.5 * scale) * 100) / 100;
          steps = [...steps, "For a hotter version, stir in an extra half tablespoon of sambar powder per original two servings. Spice strength varies; add gradually."];
        }
      } else if (recipe.id === "lemon-rice-recipe") {
        sourceIngredients.push({ name: "green chilli (optional for extra heat)", amount: Math.round(scale * 100) / 100, unit: "piece" });
        steps = [...steps, "For extra heat, add one thinly sliced green chilli per original two servings to the tempering; taste gradually."];
      }
    }

    const scaledIngredients: IngredientDetail[] = sourceIngredients.map(item => ({ ...item, amount: Math.round(item.amount * 100) / 100, have: owned.some(term => clean(item.name).includes(term) || term.includes(clean(item.name))) }));
    const missingIngredients = scaledIngredients.filter(item => !item.have).map(item => item.name);
    const substitutions = input.action === "alternatives" ? [...recipe.substitutions] : input.action === "budget" ? [...recipe.substitutions, "Budget mode prioritizes recipes needing fewer ingredients you do not already have; CRAVE IT has no verified ingredient-price feed."] : recipe.substitutions;
    return {
      ...recipe,
      servings: input.servings,
      ingredientsWithAmounts: scaledIngredients,
      steps,
      substitutions,
      haveIngredients: input.ingredients,
      missingIngredients,
      overlap,
      nutritionStatus: "Not calculated — no verified nutrition source connected",
      action: input.action,
    };
  });

  let note: string;
  if (!recipes.length) {
    note = input.action === "alternatives" && input.excludeIds?.length
      ? "No other curated recipe matches those ingredients and saved dietary/allergy/exclusion rules. Your excluded recipe and hard restrictions stayed in place."
      : "No curated recipe matched those ingredients together with your saved diet, allergy and ingredient exclusions. Try other pantry items or widen only non-allergy preferences; no recipe was invented or guessed.";
  } else if (input.action === "budget") {
    note = "Budget mode prioritizes recipes with fewer missing ingredients first to reduce extra shopping. No verified ingredient-price source is connected, so actual savings are not calculated.";
  } else if (input.action === "alternatives") {
    note = "Alternative mode excluded the recipe you had open and ranked the remaining curated matches by the ingredients you have.";
  } else if (input.action === "spicier" && blockedSpicyChange) {
    note = "Your allergy or ingredient-exclusion settings prevent a safe extra-spice change to these recipes; no excluded ingredient was added.";
  } else if (input.action === "spicier") {
    note = "The curated recipe steps or spice quantities were adjusted for more heat. Adjust to taste; chili strength varies.";
  } else {
    note = "Recipe instructions and amounts are curated starting points; prep and cooking times are estimates. Check ingredients and cross-contact risks carefully; allergen-free status is not guaranteed.";
  }
  return { recipes, note };
}
