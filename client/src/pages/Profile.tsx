import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Trash2, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { DEFAULT_PREFERENCES, type Diet, type UserPreferences } from "@shared/food";
import { useFood } from "@/contexts/FoodContext";

const cuisineChoices = ["North Indian", "South Indian", "Indo-Chinese", "East Asian", "Mediterranean", "Himalayan"];
const goals = ["More protein", "Lighter meals", "Wholesome", "Comfort first"];
const choices = (values: string[], selected: string[], toggle: (value: string) => void) => values.map(value => <button type="button" key={value} className={`choice-button${selected.includes(value) ? " selected" : ""}`} onClick={() => toggle(value)} aria-pressed={selected.includes(value)}>{value}</button>);

export default function Profile() {
  const { preferences, savePreferences, clearFoodData, authUser, favourites, recommend } = useFood();
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  useEffect(() => setDraft(preferences), [preferences]);
  const toggle = (list: string[], value: string) => list.includes(value) ? list.filter(item => item !== value) : [...list, value];
  const save = async () => {
    await savePreferences(draft);
    setComplete(true);
    const result = await recommend("Find a meal that fits my taste profile", undefined, [], draft);
    if (result) navigate("/discover");
  };
  const deleteData = async () => {
    const confirmed = window.confirm(`Delete ${authUser ? "your account's CRAVE IT taste profile, saved items and feedback" : "this device's taste profile, saved items, feedback and chat history"}? This cannot be undone.`);
    if (!confirmed) return;
    await clearFoodData();
    setDraft(DEFAULT_PREFERENCES);
    setComplete(true);
  };
  const title = ["What feels right?", "Which kitchens call to you?", "How much heat and what budget?", "Anything we should leave out?", "What’s the mood today?"][step];

  return <div className="page-wrap">
    <header className="page-banner"><div><div className="eyebrow">Make it more you</div><h1 className="page-title">Your taste, <em>your call.</em></h1><p className="page-intro">Your preferences shape the ranking. Add only what you want to share. No health conditions are inferred.</p></div><span className="status-chip"><UserRound size={13} />{authUser ? `Signed in as ${authUser.name || "CRAVE IT member"}` : "Guest profile · this device"}</span></header>
    <div className="profile-layout"><section className="quiz-card"><div className="eyebrow">Craving quiz · step {step + 1} of 5</div><div className="quiz-progress"><span style={{ width: `${(step + 1) * 20}%` }} /></div><h2 className="quiz-question">{title}</h2>
      {step === 0 && <><p className="muted" style={{ fontSize: 11 }}>What's your usual food preference? You can still change it for any search.</p><div className="choice-row">{(["any", "vegetarian", "vegan", "egg", "non_vegetarian"] as Diet[]).map(value => <button type="button" key={value} className={`choice-button${draft.diet === value ? " selected" : ""}`} onClick={() => setDraft({ ...draft, diet: value })} aria-pressed={draft.diet === value}>{value.replace("_", " ")}</button>)}</div></>}
      {step === 1 && <><p className="muted" style={{ fontSize: 11 }}>Pick every cuisine you tend to enjoy.</p><div className="choice-row">{choices(cuisineChoices, draft.cuisines, value => setDraft({ ...draft, cuisines: toggle(draft.cuisines, value) }))}</div></>}
      {step === 2 && <><label className="field-label" htmlFor="quiz-spice">Your comfortable spice level <span className="accent-text">{["mild", "medium", "hot"][draft.spice - 1]}</span></label><input id="quiz-spice" type="range" min="1" max="3" value={draft.spice} onChange={event => setDraft({ ...draft, spice: Number(event.target.value) })} style={{ width: "100%", accentColor: "var(--ember)" }} /><label className="field-label" htmlFor="quiz-budget" style={{ marginTop: 23 }}>Typical budget per meal <span className="accent-text">₹{draft.budget}</span></label><input id="quiz-budget" type="range" min="80" max="600" step="10" value={draft.budget} onChange={event => setDraft({ ...draft, budget: Number(event.target.value) })} style={{ width: "100%", accentColor: "var(--ember)" }} /></>}
      {step === 3 && <>
        <label className="field-label" htmlFor="quiz-allergy">Declared food allergies</label>
        <input className="field-control" id="quiz-allergy" value={draft.allergies.join(", ")} onChange={event => setDraft({ ...draft, allergies: event.target.value.split(",").map(value => value.trim()).filter(Boolean) })} placeholder="e.g. peanuts, dairy" />
        <p className="field-hint">Declared allergies are conservatively excluded from known curated ingredients. CRAVE IT cannot verify cross-contact or guarantee allergen absence.</p>
        <label className="field-label" htmlFor="quiz-exclusions" style={{ marginTop: 15 }}>Ingredients you prefer to avoid (not necessarily an allergy)</label>
        <input className="field-control" id="quiz-exclusions" value={draft.excludedIngredients.join(", ")} onChange={event => setDraft({ ...draft, excludedIngredients: event.target.value.split(",").map(value => value.trim()).filter(Boolean) })} placeholder="e.g. raw onion, olives" />
        <label className="field-label" htmlFor="quiz-time" style={{ marginTop: 16 }}>Typical preparation-time preference</label>
        <select className="field-select" id="quiz-time" value={draft.cookingMinutes} onChange={event => setDraft({ ...draft, cookingMinutes: Number(event.target.value) })}><option value={20}>About 20 minutes</option><option value={30}>About 30 minutes</option><option value={45}>Up to 45 minutes</option><option value={90}>I'm happy to take my time</option></select>
        <label className="field-label" htmlFor="quiz-difficulty" style={{ marginTop: 15 }}>Recipe difficulty</label>
        <select className="field-select" id="quiz-difficulty" value={draft.difficulty} onChange={event => setDraft({ ...draft, difficulty: event.target.value as UserPreferences["difficulty"] })}><option value="any">No preference</option><option value="easy">Easy / beginner</option><option value="medium">Moderate</option><option value="advanced">Advanced / involved</option></select>
        <label className="field-label" htmlFor="quiz-mode" style={{ marginTop: 15 }}>Cooking or takeaway?</label>
        <select className="field-select" id="quiz-mode" value={draft.mode} onChange={event => setDraft({ ...draft, mode: event.target.value as UserPreferences["mode"] })}><option value="either">Either</option><option value="cook">I like to cook</option><option value="takeaway">I usually order</option></select>
      </>}
      {step === 4 && <><p className="muted" style={{ fontSize: 11 }}>Optional meal preferences. These aren’t medical recommendations.</p><div className="choice-row">{choices(goals, draft.goals, value => setDraft({ ...draft, goals: toggle(draft.goals, value) }))}</div><p className="recommendation-note">Your profile shapes the ranking. Declared allergies and ingredient exclusions remain hard filters; neither guarantees allergen-free preparation.</p></>}
      <div className="quiz-controls"><button type="button" className="secondary-button" onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0}><ArrowLeft size={13} /> Back</button>{step < 4 ? <button type="button" className="primary-button" onClick={() => setStep(value => value + 1)}>Next <ArrowRight size={13} /></button> : <button type="button" className="primary-button" onClick={() => void save()}><Check size={13} /> Save my taste</button>}</div>
      {complete && <div className="recommendation-note" role="status">Your taste profile is saved and ready to shape recommendations.</div>}
    </section>
    <aside className="profile-card"><div className="eyebrow">Your saved notes</div><h2 className="serif" style={{ fontWeight: 500, fontSize: 31, margin: "12px 0" }}>A little more personal.</h2><p className="muted" style={{ fontSize: 11, lineHeight: 1.7 }}>This is the profile we’ll use when ranking your next meal.</p><div className="food-tag-row">{[draft.diet !== "any" ? draft.diet.replace("_", " ") : "Any diet", ...draft.cuisines, `${["Mild", "Medium", "Hot"][draft.spice - 1]} spice`, `₹${draft.budget} typical budget`, `${draft.difficulty} difficulty`, ...draft.allergies.map(value => `Allergy: ${value}`), ...draft.excludedIngredients.map(value => `Avoid: ${value}`)].map(item => <span className="food-tag" key={item}>{item}</span>)}</div><div className="stat-row"><div className="stat-card"><strong>{favourites.length}</strong><span>saved favourites</span></div><div className="stat-card"><strong>{authUser ? "Account" : "Guest"}</strong><span>storage scope</span></div></div><button type="button" className="secondary-button" onClick={() => { setDraft(preferences); setStep(0); setComplete(false); }}><RotateCcw size={13} /> Retake quiz / edit profile</button><hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "23px 0" }} /><button type="button" className="text-button" style={{ color: "#cd8667" }} onClick={() => void deleteData()}><Trash2 size={13} /> Delete saved taste data</button><p className="field-hint">This clears your saved CRAVE IT preferences, favourites and feedback for {authUser ? "your signed-in account" : "this device"}. For safety, account data is never loaded using a client-provided account ID.</p></aside></div>
  </div>;
}
