import { useState } from "react";
import { ArrowDownRight, ArrowRight, CircleHelp, Compass, Flame, Leaf, Sparkles, Timer, UtensilsCrossed } from "lucide-react";
import { Link, useLocation } from "wouter";
import { CURATED_FOODS, FOOD_IMAGES } from "@shared/food";
import { useFood } from "@/contexts/FoodContext";
import FoodCard from "@/components/FoodCard";

const examples = ["Something spicy and crispy under ₹200.", "A high-protein vegetarian dinner.", "Comfort food for a rainy evening.", "What can I cook with eggs, rice, and onions?", "Find a good meal near me."];
const categories = [
  { title: "Quick bites", detail: "Ready before you know it", Icon: Timer },
  { title: "Healthy choices", detail: "Feel-good ingredients", Icon: Leaf },
  { title: "Comfort food", detail: "A little warmth, served", Icon: Flame },
  { title: "Explore cuisines", detail: "Follow a new flavour", Icon: Compass },
];
export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [, navigate] = useLocation();
  const { recommend, loading, results, aiAvailable } = useFood();
  const find = async (value = prompt) => { const next = value.trim() || "surprise me with a delicious meal"; setPrompt(next); await recommend(next); navigate("/discover"); };
  return <>
    <section className="page-wrap hero-section">
      <div className="hero-copy"><div className="eyebrow">A more personal plate</div><h1 className="hero-title serif">Your next favourite meal <em>starts here.</em></h1><p className="hero-subtitle">Tell us what you're craving. We'll find the flavours, dishes, and meals that fit you perfectly.</p>
        <form className="search-box" onSubmit={event => { event.preventDefault(); void find(); }}><label className="sr-only" htmlFor="home-craving">What are you craving today?</label><textarea id="home-craving" placeholder="What are you craving today?" value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void find(); } }} /><div className="search-controls"><span className="search-hint"><Sparkles size={12} style={{ display: "inline", verticalAlign: "-2px" }} /> Tell us the mood, budget or ingredients</span><button className="primary-button" disabled={loading} type="submit">{loading ? "Finding…" : "Find My Craving"} <ArrowRight size={15} /></button></div></form>
        <div className="example-prompts" aria-label="Example cravings">{examples.map(example => <button key={example} className="example-prompt" onClick={() => void find(example)}>{example}</button>)}</div>
        <div className="trust-note"><CircleHelp size={13} /> {aiAvailable ? "Live AI is available · hard dietary constraints stay enforced." : "Curated demo mode · recommendations work without an AI account."}</div>
      </div>
      <div className="hero-visual"><img src={FOOD_IMAGES.hero} alt="A warmly spiced paneer and basmati rice bowl with fresh herbs" fetchPriority="high" /><div className="floating-card"><small>ON THE MENU</small><span className="stars">✦ ✦ ✦</span><b>Made for your mood</b></div><div className="hero-floating-note"><div className="hero-caption"><span>Today's little inspiration</span><strong>Tandoori paneer, with a twist</strong></div><div className="hero-round-mark"><UtensilsCrossed size={16} /></div></div></div>
    </section>
    <section className="page-wrap section-block" id="explore"><div className="section-heading"><div><div className="eyebrow">A good place to begin</div><h2>Pick your kind of craving</h2><p>Choose a feeling. We'll take it from there.</p></div><Link className="text-button" href="/discover">Explore all dishes <ArrowRight size={14} /></Link></div>
      <div className="category-shelf">{categories.map(({ title, detail, Icon }) => <button key={title} className="category-tile" onClick={() => { void recommend(title === "Explore cuisines" ? "Explore a new cuisine" : title, { category: title }); navigate("/discover"); }}><Icon size={18} /><div><strong>{title}</strong><span>{detail}</span></div></button>)}</div>
    </section>
    <section className="page-wrap section-block"><div className="section-heading"><div><div className="eyebrow">From the CRAVE IT kitchen</div><h2>Good things, on repeat</h2><p>Curated starting points. Not restaurant listings.</p></div><Link className="text-button" href="/discover">See what's cooking <ArrowRight size={14} /></Link></div><div className="quick-row">{(results?.recommendations.length ? results.recommendations : CURATED_FOODS.slice(0, 6)).slice(0, 6).map(item => <FoodCard key={item.id} item={item} />)}</div></section>
    <section className="page-wrap section-block"><div className="quote-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}><div><div className="eyebrow">Your kitchen, your rules</div><p style={{ margin: "12px 0 0" }}>Got a few ingredients and a little inspiration? Tell our recipe helper what’s in your kitchen.</p></div><Link className="secondary-button" href="/recipes">Cook with what you have <ArrowDownRight size={14} /></Link></div></section>
  </>;
}
