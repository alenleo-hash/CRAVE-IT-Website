import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { useFood } from "@/contexts/FoodContext";
import FoodCard from "@/components/FoodCard";

type Message = { role: "user" | "assistant"; content: string };
const initial: Message[] = [{ role: "assistant", content: "Tell me what sounds good. A craving, a budget, a few ingredients or a little mood — we’ll work with it." }];
function loadMessages(): Message[] { try { const raw = localStorage.getItem("craveit.chat.v1"); return raw ? JSON.parse(raw) as Message[] : initial; } catch { return initial; } }
const suggestions = ["Spicy vegetarian dinner under ₹200", "Comfort food for a rainy evening", "I have rice, eggs, tomato and onion"];
export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { chat, results, loading, error } = useFood();
  useEffect(() => { try { localStorage.setItem("craveit.chat.v1", JSON.stringify(messages.slice(-30))); } catch {} endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  const send = async (value = draft) => {
    const content = value.trim(); if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }]; setMessages(next); setDraft("");
    const response = await chat(next);
    if (response) setMessages(current => [...current, { role: "assistant", content: response.reply }]);
  };
  return <div className="page-wrap"><header className="page-banner"><div><div className="eyebrow">Talk it through</div><h1 className="page-title">A table for <em>two.</em></h1><p className="page-intro">Your food guide keeps the conversation in context. Say what you’re craving, and it will bring back real dishes from the curated menu.</p></div><span className="status-chip"><Sparkles size={13} />{results?.mode === "live-ai" ? "Live AI turn" : "Honest demo mode"}</span></header>
    <section className="chat-panel" aria-label="Food recommendation conversation"><div className="chat-messages" aria-live="polite">{messages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={`${index}-${message.role}`}><small>{message.role === "assistant" ? "CRAVE IT" : "YOU"}</small>{message.content}</div>)}{loading && <div className="chat-bubble assistant"><small>CRAVE IT · THINKING</small>Let me find a few good fits…</div>}<div ref={endRef} /></div>
      {messages.length === 1 && <div className="chat-suggestions">{suggestions.map(text => <button key={text} onClick={() => void send(text)}>{text}</button>)}</div>}
      {error && <div className="recommendation-note" role="alert">{error} Your message is still here; please try again.</div>}
      {results?.recommendations.length ? <div className="chat-recipes">{results.recommendations.slice(0, 4).map(item => <FoodCard key={item.id} item={item} similar={false} />)}</div> : null}
      <form className="chat-compose" onSubmit={event => { event.preventDefault(); void send(); }}><label className="sr-only" htmlFor="chat-draft">Your food question</label><textarea id="chat-draft" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="I’m in the mood for something…" maxLength={500} /><button type="submit" className="primary-button" disabled={!draft.trim() || loading} aria-label="Send message"><MessageCircle size={14} /> Send <ArrowRight size={14} /></button></form>
    </section><p className="field-hint">Conversation is saved in this browser. AI requests use only the food details you type; do not enter sensitive health information.</p></div>;
}
