import { Bookmark, Clock3, DollarSign, Flame, Heart, ArrowRight, RefreshCw, ThumbsDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { FoodItem, RankedFood, FoodKind } from "@shared/food";
import { useFood } from "@/contexts/FoodContext";

export default function FoodCard({ item, similar = true }: { item: FoodItem | RankedFood; similar?: boolean }) {
  const { favourites, toggleFavourite, recommend, lastQuery, lastFilters, sendFeedback } = useFood();
  const [, navigate] = useLocation();
  const saved = favourites.includes(item.id);
  const kind: FoodKind = item.kind;
  const difficulty = item.prepMinutes <= 20 ? "Easy" : item.prepMinutes <= 35 ? "Moderate" : "Involved";
  const onSimilar = async () => {
    await sendFeedback(item.id, "similar");
    const next = await recommend(`${lastQuery || item.cuisine + " food"}, something similar to ${item.name}`, lastFilters, [item.id]);
    if (next) navigate("/discover");
  };
  const onRegenerate = async () => {
    const next = await recommend(lastQuery || `${item.cuisine} food`, lastFilters, [item.id]);
    if (next) navigate("/discover");
  };

  return <article className="food-card">
    <div className="food-image-wrap">
      <img src={item.image} alt={item.name} loading="lazy" />
      <button type="button" className={`save-icon${saved ? " is-saved" : ""}`} aria-label={saved ? `Remove ${item.name} from favourites` : `Save ${item.name} to favourites`} aria-pressed={saved} onClick={() => void toggleFavourite(item.id, kind)}>
        <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
      </button>
    </div>
    <div className="food-content">
      <div className="food-meta"><span>{item.cuisine}</span><span className="food-tag sage">{item.diet.replace("_", " ")}</span></div>
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <div className="card-match-reason">{"matchReason" in item ? item.matchReason : `A curated ${item.cuisine} pick, selected for its ${item.tags[0] ?? "distinctive"} flavour.`}</div>
      <div className="food-stats"><span><Clock3 size={13} />~{item.prepMinutes} min</span><span><Flame size={13} />{["mild", "medium", "hot"][item.spice - 1]}</span><span>{difficulty} · est.</span></div>
      <div className="food-tag-row">{item.tags.slice(0, 1).map(tag => <span className="food-tag sage" key={tag}>{tag}</span>)}<span className="food-tag ember">curated · estimates</span><span className="food-tag">nutrition not verified</span></div>
      <div className="food-actions">
        <span className="food-price">₹{item.priceINR} <small>est.</small></span>
        <div className="food-card-actions">
          <button type="button" className="icon-action" onClick={() => void sendFeedback(item.id, "love")} aria-label={`I love ${item.name}`} title="Love it"><Heart size={14} /></button>
          <button type="button" className="icon-action" onClick={() => void sendFeedback(item.id, "not_for_me")} aria-label={`Not for me: ${item.name}`} title="Not for me"><ThumbsDown size={14} /></button>
          <button type="button" className="icon-action" onClick={() => void sendFeedback(item.id, "too_expensive")} aria-label={`Too expensive: ${item.name}`} title="Too expensive"><DollarSign size={14} /></button>
          <button type="button" className="icon-action" onClick={() => void sendFeedback(item.id, "too_spicy")} aria-label={`Too spicy: ${item.name}`} title="Too spicy"><Flame size={14} /></button>
          <button type="button" className="icon-action" onClick={() => void onRegenerate()} aria-label={`Show another result instead of ${item.name}`} title="Try another"><RefreshCw size={14} /></button>
          {similar && <button type="button" className="icon-action" onClick={() => void onSimilar()} aria-label={`Find something similar to ${item.name}`} title="Find similar"><ArrowRight size={14} /></button>}
        </div>
      </div>
      <Link className="card-more" href={`/dish/${item.id}`}>Why this fits · View details →</Link>
    </div>
  </article>;
}
