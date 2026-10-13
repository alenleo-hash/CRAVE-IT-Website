import { useState } from "react";
import { Bookmark, ChefHat, Clock3, Minus, Plus, Sparkles } from "lucide-react";
import { CURATED_RECIPES } from "@shared/food";
import { useFood, type RecipeResult } from "@/contexts/FoodContext";

type RecipeAction = "use" | "alternatives" | "spicier" | "budget";
const imageFor = (id: string) => CURATED_RECIPES.find(recipe => recipe.id === id)?.image;
const difficultyFor = (minutes: number) => minutes <= 25 ? "Easy" : minutes <= 40 ? "Moderate" : "Involved";

export default function Recipes() {
  const { requestRecipes, toggleFavourite, favourites, loading, error } = useFood();
  const [text, setText] = useState("eggs, rice, tomatoes, onions");
  const [servings, setServings] = useState(2);
  const [recipes, setRecipes] = useState<RecipeResult[]>([]);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const ingredients = text.split(/,|\n/).map(value => value.trim()).filter(Boolean).slice(0, 20);

  const find = async (action: RecipeAction = "use") => {
    if (!ingredients.length) return;
    const openId = open ?? recipes[0]?.id;
    const excludeIds = action === "alternatives" && openId ? [openId] : [];
    const result = await requestRecipes(ingredients, servings, action, excludeIds);
    if (result) {
      setRecipes(result.recipes);
      setNote(result.note);
      setOpen(result.recipes[0]?.id ?? null);
    }
  };

  const changeServings = async (next: number) => {
    const safe = Math.max(1, Math.min(12, next));
    setServings(safe);
    if (ingredients.length && recipes.length) {
      const result = await requestRecipes(ingredients, safe);
      if (result) { setRecipes(result.recipes); setNote(result.note); }
    }
  };

  return <div className="page-wrap">
    <header className="page-banner">
      <div><div className="eyebrow">Cook what’s already there</div><h1 className="page-title">A little pantry <em>magic.</em></h1><p className="page-intro">Share the ingredients on hand. We’ll find a grounded recipe, scale the quantities and mark what you still need.</p></div>
      <span className="status-chip"><ChefHat size={14} />Curated recipes · no nutrition API</span>
    </header>
    <div className="recipe-layout">
      <aside className="recipe-input-panel">
        <h3>What have you got?</h3><p>Separate each ingredient with a comma. Add the basics too, if you like.</p>
        <label className="field-label" htmlFor="pantry-input">Ingredients</label>
        <textarea className="field-textarea" id="pantry-input" value={text} onChange={event => setText(event.target.value)} placeholder="eggs, rice, tomatoes, onions" rows={5} maxLength={500} />
        <div className="ingredient-chip-row">{ingredients.map(item => <span className="ingredient-chip" key={item}>{item}</span>)}</div>
        <div className="serving-control"><span>Serves</span><button type="button" onClick={() => void changeServings(servings - 1)} aria-label="Fewer servings"><Minus size={13} /></button><b>{servings}</b><button type="button" onClick={() => void changeServings(servings + 1)} aria-label="More servings"><Plus size={13} /></button></div>
        <button className="primary-button" style={{ width: "100%", marginTop: 16 }} disabled={!ingredients.length || loading} onClick={() => void find()}>{loading ? "Looking through recipes…" : "Use My Ingredients"}<Sparkles size={14} /></button>
        <div className="recipe-tools">
          <button className="secondary-button" type="button" disabled={!ingredients.length || !recipes.length || loading} onClick={() => void find("alternatives")}>Find Alternatives</button>
          <button className="secondary-button" type="button" disabled={!ingredients.length || loading} onClick={() => void find("spicier")}>Make It Spicier</button>
          <button className="secondary-button" type="button" disabled={!ingredients.length || loading} onClick={() => void find("budget")}>Make It Budget-Friendly</button>
        </div>
        <p className="field-hint">Suggestions come from curated recipes. Ingredient-price data is not connected. Check labels and cross-contact risks; allergen-free status is not guaranteed.</p>
      </aside>
      <section>
        <div className="result-heading"><span>{loading ? "Finding recipes…" : `${recipes.length} recipes using your ingredients`}</span><span><Clock3 size={12} style={{ verticalAlign: "-2px" }} /> Prep and cooking times are estimates</span></div>
        {error && <div className="recommendation-note" role="alert">{error}</div>}
        {recipes.length ? <div className="recipe-list">{recipes.map(recipe => {
          const total = recipe.prepMinutes + recipe.cookMinutes;
          return <article className="recipe-card" key={recipe.id}>
            <div className="recipe-card-top">
              <img src={recipe.image ?? imageFor(recipe.id)} alt={recipe.name} loading="lazy" />
              <div className="recipe-card-info">
                <div className="food-meta"><span>{recipe.cuisine} · {recipe.diet.replace("_", " ")}</span><button type="button" className={`icon-action${favourites.includes(recipe.id) ? " is-saved" : ""}`} onClick={() => void toggleFavourite(recipe.id, "recipe")} aria-label={favourites.includes(recipe.id) ? "Remove saved recipe" : "Save recipe"} aria-pressed={favourites.includes(recipe.id)}><Bookmark size={14} fill={favourites.includes(recipe.id) ? "currentColor" : "none"} /></button></div>
                <h3>{recipe.name}</h3><p>{recipe.description}</p>
                <div className="food-stats"><span>{total} min total</span><span>{difficultyFor(total)} · estimate</span><button className="text-button" type="button" onClick={() => setOpen(open === recipe.id ? null : recipe.id)} aria-expanded={open === recipe.id}>{open === recipe.id ? "Hide recipe" : "See recipe"}</button></div>
              </div>
            </div>
            {open === recipe.id && <div className="recipe-detail-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h4>Ingredients</h4><div className="serving-control"><span>Serves</span><button type="button" onClick={() => void changeServings(servings - 1)} aria-label="Reduce recipe servings"><Minus size={12} /></button><b>{servings}</b><button type="button" onClick={() => void changeServings(servings + 1)} aria-label="Increase recipe servings"><Plus size={12} /></button></div></div>
              <p className="field-hint">Prep about {recipe.prepMinutes} min · cook about {recipe.cookMinutes} min · both are curated estimates.</p>
              <ul>{recipe.ingredientsWithAmounts.map((item, index) => <li className="ingredient-state" key={`${item.name}-${index}`}><span className={item.have ? "have" : "need"}>{item.have ? "On hand" : "Still need"}</span> · {item.amount} {item.unit} {item.name}</li>)}</ul>
              <h4>Make it</h4><ol>{recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
              <h4>Equipment & swaps</h4><p className="muted" style={{ fontSize: 11 }}>{recipe.equipment.join(" · ")}</p><ul>{recipe.substitutions.map((item, index) => <li key={index}>{item}</li>)}</ul>
              <h4>Known allergen tags</h4><p className="field-hint">{recipe.allergens.length ? recipe.allergens.join(", ") : "None listed in this curated record."} This does not verify cross-contact or guarantee allergen absence.</p>
              <p className="field-hint">Nutrition: {recipe.nutritionStatus}. Check packaged ingredients and cross-contact risks; allergy-free status is not guaranteed.</p>
            </div>}
          </article>;
        })}</div> : <div className="empty-state"><ChefHat size={25} /><h3>{loading ? "Finding something tasty…" : note ? "Nothing from the curated recipe set matched." : "Let’s make something."}</h3><p>{note || "Try the example ingredients already filled in, then choose Use My Ingredients."}</p><button className="secondary-button" onClick={() => void find()} disabled={loading || !ingredients.length}>Find a recipe</button></div>}
        {note && recipes.length > 0 && <p className="field-hint" role="status">{note}</p>}
      </section>
    </div>
  </div>;
}
