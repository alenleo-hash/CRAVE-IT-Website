import { Bookmark, Heart } from "lucide-react";
import { Link } from "wouter";
import { CURATED_FOODS, CURATED_RECIPES } from "@shared/food";
import { useFood } from "@/contexts/FoodContext";
import FoodCard from "@/components/FoodCard";
export default function Favourites() {
  const { favourites } = useFood();
  const saved = [...CURATED_FOODS, ...CURATED_RECIPES].filter(item => favourites.includes(item.id));
  return <div className="page-wrap"><header className="page-banner"><div><div className="eyebrow">Keep the good ones close</div><h1 className="page-title">Your saved <em>table.</em></h1><p className="page-intro">Your favourites are saved in this browser as a guest, or linked to your account when you sign in.</p></div><span className="status-chip"><Bookmark size={13} />{saved.length} saved</span></header>
    {saved.length ? <div className="result-grid">{saved.map(item => <FoodCard key={item.id} item={item} />)}</div> : <div className="empty-state"><Heart size={24} /><h3>Save a dish for later.</h3><p>When a card makes you think “that’s the one,” tap the bookmark. We’ll keep it right here.</p><Link className="secondary-button" href="/discover">Find a dish</Link></div>}</div>;
}
