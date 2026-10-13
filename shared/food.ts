export type Diet = "any" | "vegetarian" | "vegan" | "egg" | "non_vegetarian";
export type Difficulty = "any" | "easy" | "medium" | "advanced";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodKind = "dish" | "recipe";

export interface FoodItem {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  diet: Exclude<Diet, "any">;
  priceINR: number;
  /** A total-time estimate for dish listings; recipes also have a prep/cook breakdown. */
  prepMinutes: number;
  spice: 1 | 2 | 3;
  mealType: MealType;
  ingredients: string[];
  allergens: string[];
  tags: string[];
  image: string;
  kind: FoodKind;
  source: "curated";
}

export interface UserPreferences {
  diet: Diet;
  cuisines: string[];
  spice: number;
  budget: number;
  allergies: string[];
  excludedIngredients: string[];
  cookingMinutes: number;
  difficulty: Difficulty;
  goals: string[];
  mode: "cook" | "takeaway" | "either";
}

export interface FoodFilters {
  cuisine?: string;
  diet?: Diet;
  maxBudget?: number;
  maxMinutes?: number;
  difficulty?: Difficulty;
  spice?: number;
  mealType?: MealType | "any";
  ingredients?: string[];
  category?: string;
}

export type FeedbackType = "love" | "not_for_me" | "too_expensive" | "too_spicy" | "similar";
export interface FoodFeedback { itemId: string; type: FeedbackType; }

export interface RankedFood extends FoodItem {
  score: number;
  matchReason: string;
}

export interface RecommendationResult {
  mode: "live-ai" | "demo";
  intent: string;
  detectedPreferences: Partial<UserPreferences>;
  appliedConstraints: string[];
  recommendations: RankedFood[];
  limitation: string | null;
  followUpQuestion: string | null;
  dataSources: string[];
}

export interface RecipeRecord extends FoodItem {
  kind: "recipe";
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredientsWithAmounts: { name: string; amount: number; unit: string }[];
  steps: string[];
  equipment: string[];
  substitutions: string[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  diet: "any",
  cuisines: [],
  spice: 2,
  budget: 250,
  allergies: [],
  excludedIngredients: [],
  cookingMinutes: 45,
  difficulty: "any",
  goals: [],
  mode: "either",
};

export const FOOD_IMAGES = {
  hero: "/manus-storage/async-images/upykz020LXnCCDEDqBJcvw/image-1.webp",
  paneer: "/manus-storage/async-images/upykz020LXnCCDEDqBJcvw/image-2.webp",
  dosa: "/manus-storage/async-images/upykz020LXnCCDEDqBJcvw/image-3.webp",
  noodles: "/manus-storage/async-images/upykz020LXnCCDEDqBJcvw/image-4.webp",
  eggRice: "/manus-storage/async-images/upykz020LXnCCDEDqBJcvw/image-5.webp",
  chana: "/manus-storage/async-images/zRJd17D1l22RZZE0IeBk6R/image-1.webp",
  sambar: "/manus-storage/async-images/zRJd17D1l22RZZE0IeBk6R/image-2.webp",
  biryani: "/manus-storage/async-images/zRJd17D1l22RZZE0IeBk6R/image-3.webp",
  tofu: "/manus-storage/async-images/zRJd17D1l22RZZE0IeBk6R/image-4.webp",
  shakshuka: "/manus-storage/async-images/zRJd17D1l22RZZE0IeBk6R/image-5.webp",
  falafel: "/manus-storage/async-images/soc0E79svoXzrzT0NFMOR1/image-1.webp",
  momos: "/manus-storage/async-images/soc0E79svoXzrzT0NFMOR1/image-2.webp",
  lemonRice: "/manus-storage/async-images/a4kNhpoIqWfbdldxbNn5Br/image-1.webp",
  chickenPepperRice: "/manus-storage/async-images/3GfRcd4RtmN3EOI1Vc0mEn/image-1.webp",
} as const;

export const CURATED_FOODS: FoodItem[] = [
  { id: "paneer-tikka-rice", name: "Tandoori Paneer Rice Bowl", cuisine: "North Indian", description: "Smoky paneer, fragrant basmati and charred peppers with a bright squeeze of lime.", diet: "vegetarian", priceINR: 185, prepMinutes: 25, spice: 2, mealType: "dinner", ingredients: ["paneer", "rice", "capsicum", "yogurt", "lime", "spices"], allergens: ["dairy"], tags: ["protein", "comfort", "tandoori", "quick"], image: FOOD_IMAGES.paneer, kind: "dish", source: "curated" },
  { id: "masala-dosa", name: "Crisp Masala Dosa", cuisine: "South Indian", description: "A golden, crisp dosa filled with warmly spiced potato, served with chutney and sambar.", diet: "vegan", priceINR: 140, prepMinutes: 30, spice: 2, mealType: "breakfast", ingredients: ["rice", "urad dal", "potato", "onion", "curry leaves", "chilli"], allergens: [], tags: ["comfort", "crispy", "classic", "budget"], image: FOOD_IMAGES.dosa, kind: "dish", source: "curated" },
  { id: "chilli-veg-noodles", name: "Chilli-Garlic Veg Noodles", cuisine: "Indo-Chinese", description: "Wok-tossed noodles with crunchy vegetables, garlic and a lively chilli finish.", diet: "vegan", priceINR: 175, prepMinutes: 20, spice: 3, mealType: "dinner", ingredients: ["noodles", "cabbage", "carrot", "capsicum", "garlic", "chilli"], allergens: ["gluten", "soy"], tags: ["spicy", "crispy", "quick", "takeaway"], image: FOOD_IMAGES.noodles, kind: "dish", source: "curated" },
  { id: "egg-tomato-rice", name: "Tomato & Egg Fried Rice", cuisine: "Indo-Chinese", description: "A quick, savoury rice bowl with soft egg, sweet tomato, onion and green chilli.", diet: "egg", priceINR: 155, prepMinutes: 18, spice: 2, mealType: "dinner", ingredients: ["rice", "egg", "tomato", "onion", "green chilli"], allergens: ["egg"], tags: ["quick", "pantry", "comfort", "protein"], image: FOOD_IMAGES.eggRice, kind: "recipe", source: "curated" },
  { id: "chana-masala", name: "Chana Masala & Rice", cuisine: "North Indian", description: "Slow-simmered chickpeas in a tangy tomato masala with fluffy rice.", diet: "vegan", priceINR: 165, prepMinutes: 35, spice: 2, mealType: "lunch", ingredients: ["chickpeas", "tomato", "onion", "rice", "ginger", "garam masala"], allergens: [], tags: ["protein", "comfort", "budget", "filling"], image: FOOD_IMAGES.chana, kind: "recipe", source: "curated" },
  { id: "sambar-rice", name: "Homestyle Sambar Rice", cuisine: "South Indian", description: "Comforting lentil rice with tamarind, seasonal vegetables and toasted curry leaves.", diet: "vegan", priceINR: 120, prepMinutes: 35, spice: 1, mealType: "lunch", ingredients: ["rice", "toor dal", "tomato", "carrot", "tamarind", "curry leaves"], allergens: [], tags: ["comfort", "mild", "budget", "wholesome"], image: FOOD_IMAGES.sambar, kind: "recipe", source: "curated" },
  { id: "lemon-rice", name: "South Indian Lemon Rice", cuisine: "South Indian", description: "Bright, nutty rice with fresh lemon, curry leaves and a gentle chilli warmth.", diet: "vegan", priceINR: 95, prepMinutes: 15, spice: 1, mealType: "lunch", ingredients: ["rice", "lemon", "peanuts", "mustard seeds", "curry leaves"], allergens: ["peanut"], tags: ["quick", "pantry", "budget", "light"], image: FOOD_IMAGES.lemonRice, kind: "recipe", source: "curated" },
  { id: "veg-biryani", name: "Vegetable Dum Biryani", cuisine: "North Indian", description: "Layered basmati, warming whole spices and tender vegetables finished with herbs.", diet: "vegetarian", priceINR: 195, prepMinutes: 45, spice: 2, mealType: "dinner", ingredients: ["rice", "vegetables", "yogurt", "mint", "whole spices"], allergens: ["dairy"], tags: ["comfort", "aromatic", "celebration"], image: FOOD_IMAGES.biryani, kind: "recipe", source: "curated" },
  { id: "tofu-stirfry", name: "Ginger Tofu Stir-fry", cuisine: "East Asian", description: "Crisp-edged tofu and greens in a gingery soy glaze, ready for rice or noodles.", diet: "vegan", priceINR: 210, prepMinutes: 22, spice: 2, mealType: "dinner", ingredients: ["tofu", "broccoli", "soy sauce", "ginger", "rice"], allergens: ["soy"], tags: ["protein", "quick", "balanced"], image: FOOD_IMAGES.tofu, kind: "dish", source: "curated" },
  { id: "shakshuka", name: "Tomato & Pepper Shakshuka", cuisine: "Mediterranean", description: "Eggs gently set in a smoky tomato and pepper sauce, with warm bread on the side.", diet: "egg", priceINR: 220, prepMinutes: 25, spice: 1, mealType: "breakfast", ingredients: ["egg", "tomato", "capsicum", "onion", "paprika", "bread"], allergens: ["egg", "gluten"], tags: ["comfort", "protein", "one-pan"], image: FOOD_IMAGES.shakshuka, kind: "recipe", source: "curated" },
  { id: "falafel-bowl", name: "Herby Falafel Bowl", cuisine: "Mediterranean", description: "Herb-rich chickpea falafel with cucumber, grains and a lemony tahini drizzle.", diet: "vegan", priceINR: 240, prepMinutes: 35, spice: 1, mealType: "lunch", ingredients: ["chickpeas", "parsley", "cucumber", "tahini", "rice"], allergens: ["sesame"], tags: ["protein", "fresh", "balanced"], image: FOOD_IMAGES.falafel, kind: "dish", source: "curated" },
  { id: "veg-momos", name: "Chilli Garlic Veg Momos", cuisine: "Himalayan", description: "Steamed vegetable dumplings with a punchy house-style chilli dip.", diet: "vegan", priceINR: 130, prepMinutes: 25, spice: 3, mealType: "snack", ingredients: ["flour", "cabbage", "carrot", "garlic", "chilli"], allergens: ["gluten"], tags: ["spicy", "snack", "crispy"], image: FOOD_IMAGES.momos, kind: "dish", source: "curated" },
  { id: "chicken-pepper-rice", name: "South Indian Chicken Pepper Rice", cuisine: "South Indian", description: "Tender chicken with black pepper, curry leaves, onion and a squeeze of lime over fragrant rice.", diet: "non_vegetarian", priceINR: 195, prepMinutes: 30, spice: 3, mealType: "dinner", ingredients: ["chicken", "rice", "black pepper", "onion", "curry leaves", "lime", "green chilli"], allergens: [], tags: ["spicy", "protein", "pepper", "comfort"], image: FOOD_IMAGES.chickenPepperRice, kind: "dish", source: "curated" },
];

export const CURATED_RECIPES: RecipeRecord[] = [
  { ...CURATED_FOODS[3]!, id: "tomato-egg-rice-recipe", kind: "recipe", servings: 2, prepMinutes: 8, cookMinutes: 12, ingredientsWithAmounts: [{ name: "cooked rice", amount: 2, unit: "cups" }, { name: "eggs", amount: 2, unit: "large" }, { name: "tomato", amount: 1, unit: "medium" }, { name: "onion", amount: 0.5, unit: "medium" }, { name: "green chilli", amount: 1, unit: "piece" }, { name: "oil", amount: 1, unit: "tbsp" }], steps: ["Whisk the eggs with a pinch of salt. Dice the tomato and onion; slice the chilli.", "Heat oil in a wide pan. Scramble the eggs softly, then transfer them to a plate.", "Cook the onion and chilli until fragrant. Add tomato and cook until it softens.", "Add rice and toss until hot. Fold the eggs back in, taste, and season. Serve immediately."], equipment: ["Wide pan", "Spatula", "Knife", "Cutting board"], substitutions: ["Use leftover cooked rice; freshly cooked rice should be cooled and dried first.", "Skip the chilli for a milder bowl."] },
  { ...CURATED_FOODS[5]!, id: "sambar-rice-recipe", kind: "recipe", servings: 2, prepMinutes: 12, cookMinutes: 25, ingredientsWithAmounts: [{ name: "rice", amount: 1, unit: "cup" }, { name: "toor dal", amount: 0.5, unit: "cup" }, { name: "tomato", amount: 1, unit: "medium" }, { name: "carrot", amount: 1, unit: "small" }, { name: "sambar powder", amount: 1, unit: "tbsp" }, { name: "tamarind", amount: 1, unit: "tsp" }], steps: ["Rinse the rice and dal. Pressure cook them with water until soft.", "Simmer chopped tomato and carrot with sambar powder and tamarind until tender.", "Stir in the cooked rice and dal with enough hot water for a soft, spoonable texture.", "Taste, adjust salt, and finish with curry-leaf tempering if available."], equipment: ["Saucepan or pressure cooker", "Spoon", "Knife"], substitutions: ["Use another quick-cooking seasonal vegetable in place of carrot."] },
  { ...CURATED_FOODS[6]!, id: "lemon-rice-recipe", kind: "recipe", servings: 2, prepMinutes: 8, cookMinutes: 7, ingredientsWithAmounts: [{ name: "cooked rice", amount: 2, unit: "cups" }, { name: "lemon", amount: 1, unit: "piece" }, { name: "peanuts", amount: 2, unit: "tbsp" }, { name: "mustard seeds", amount: 0.5, unit: "tsp" }, { name: "curry leaves", amount: 6, unit: "leaves" }], steps: ["Separate the cooked rice grains and set aside to cool slightly.", "Warm a little oil in a pan. Add mustard seeds and peanuts; cook until fragrant.", "Add curry leaves and a pinch of turmeric, then stir through the rice.", "Turn off the heat, squeeze in lemon juice, taste and adjust seasoning."], equipment: ["Pan", "Spoon", "Citrus juicer"], substitutions: ["Omit peanuts for a nut-free version; use a clean pan and verify packaged ingredients."] },
];
