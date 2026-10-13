import { Link, useLocation } from "wouter";
import { ArrowUpRight, Bookmark, Compass, CookingPot, Flame, MapPin, Menu, MessageCircle, UserRound, X } from "lucide-react";
import { useState } from "react";
import { startLogin } from "@/const";
import { useFood } from "@/contexts/FoodContext";

const links = [
  { href: "/discover", label: "Discover", Icon: Compass },
  { href: "/chat", label: "AI Food Chat", Icon: MessageCircle },
  { href: "/recipes", label: "Recipes", Icon: CookingPot },
  { href: "/restaurants", label: "Restaurants", Icon: MapPin },
  { href: "/favourites", label: "Favourites", Icon: Bookmark },
];
export function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark${small ? " brand-mark-small" : ""}`} aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M20 3.5 23.1 16.5 36.5 20l-13.4 3.5L20 36.5l-3.1-13L3.5 20l13.4-3.5L20 3.5Z" fill="currentColor"/><circle cx="20" cy="20" r="4.1" fill="#201c19"/></svg></span>;
}
export default function CraveShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { favourites, aiAvailable, authUser } = useFood();
  return <div className="app-shell">
    <div className="top-note"><span className="live-dot" /> {aiAvailable ? "Your food guide is ready" : "Curated food guide · Demo mode"}<span className="top-note-sep">/</span> No sign-up needed</div>
    <header className="site-header">
      <Link href="/" className="brand" onClick={() => setMenuOpen(false)}><BrandMark /><span className="brand-word">CRAVE <i>IT.</i></span></Link>
      <nav className={`main-nav${menuOpen ? " nav-open" : ""}`} aria-label="Main navigation">
        {links.map(({ href, label, Icon }) => <Link key={href} href={href} className={`nav-link${location === href ? " active" : ""}`} onClick={() => setMenuOpen(false)}><Icon size={15} strokeWidth={1.7} /><span>{label}</span>{label === "Favourites" && favourites.length > 0 && <span className="nav-count">{favourites.length}</span>}</Link>)}
      </nav>
      <div className="header-actions">
        <Link href="/profile" className="profile-button"><UserRound size={16} /><span>{authUser?.name?.split(" ")[0] || "My taste"}</span></Link>
        {authUser ? <span className="signed-in-mark" title={authUser.email ?? "Signed in"}>●</span> : <button className="sign-in-button" onClick={() => startLogin()} type="button">Sign in <ArrowUpRight size={14} /></button>}
      </div>
      <button className="mobile-menu-toggle" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
    </header>
    <main>{children}</main>
    <footer className="site-footer"><Link href="/" className="footer-brand"><BrandMark small /> CRAVE IT</Link><span className="footer-note">Good food is personal. We’re here for your kind of good.</span><div className="footer-links"><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/profile">Taste profile</Link></div><span className="footer-credit">© 2026 CRAVE IT · Curated estimates, made with care.</span></footer>
  </div>;
}
