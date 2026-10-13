import { Link } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
export default function NotFound() { return <div className="page-wrap"><section className="empty-state" style={{ margin: "80px auto", maxWidth: 620 }}><Search size={25} /><div className="eyebrow" style={{ justifyContent: "center" }}>Wrong turn, right appetite</div><h3>We couldn’t find that page.</h3><p>It may have moved. Your next meal is still right where we left it.</p><Link className="secondary-button" href="/"><ArrowLeft size={14} /> Back to CRAVE IT</Link></section></div>; }
