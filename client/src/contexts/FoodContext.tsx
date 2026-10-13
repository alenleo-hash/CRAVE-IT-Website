import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { DEFAULT_PREFERENCES, type FoodFilters, type FoodKind, type FoodFeedback, type RecommendationResult, type RecipeRecord, type UserPreferences } from "@shared/food";

export type RecipeResult = Omit<RecipeRecord, "ingredientsWithAmounts"> & {
  ingredientsWithAmounts: (RecipeRecord["ingredientsWithAmounts"][number] & { have: boolean })[];
  haveIngredients: string[];
  missingIngredients: string[];
  overlap: number;
  nutritionStatus: string;
};
type FoodContextValue = {
  preferences: UserPreferences; savePreferences: (value: UserPreferences) => Promise<void>; clearFoodData: () => Promise<void>;
  favourites: string[]; toggleFavourite: (itemId: string, kind?: FoodKind) => Promise<void>;
  feedback: FoodFeedback[]; sendFeedback: (itemId: string, type: FoodFeedback["type"]) => Promise<void>;
  results: RecommendationResult | null; loading: boolean; error: string | null; lastQuery: string; lastFilters: FoodFilters;
  recommend: (query: string, filters?: FoodFilters, excludeIds?: string[], preferenceOverride?: UserPreferences) => Promise<RecommendationResult | null>;
  chat: (messages: { role: "user" | "assistant"; content: string }[]) => Promise<{ reply: string; result: RecommendationResult } | null>;
  requestRecipes: (ingredients: string[], servings: number, action?: "use" | "alternatives" | "spicier" | "budget", excludeIds?: string[]) => Promise<{ recipes: RecipeResult[]; note: string } | null>;
  aiAvailable: boolean; restaurantProviderAvailable: boolean; authUser: { name?: string | null; email?: string | null } | null;
};
const FoodContext = createContext<FoodContextValue | null>(null);
const read = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const store = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private browsing or storage limit */ } };
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.");
  return data as T;
}
export function FoodProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(() => read("craveit.preferences.v1", DEFAULT_PREFERENCES));
  const [favourites, setFavourites] = useState<string[]>(() => read("craveit.favourites.v1", []));
  const [feedback, setFeedback] = useState<FoodFeedback[]>(() => read("craveit.feedback.v1", []));
  const [results, setResults] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null); const [lastQuery, setLastQuery] = useState(""); const [lastFilters, setLastFilters] = useState<FoodFilters>({});
  const [aiAvailable, setAiAvailable] = useState(false); const [restaurantProviderAvailable, setRestaurantProviderAvailable] = useState(false);
  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: auth.isAuthenticated, retry: false });
  const favoritesQuery = trpc.favorites.list.useQuery(undefined, { enabled: auth.isAuthenticated, retry: false });
  const feedbackQuery = trpc.feedback.list.useQuery(undefined, { enabled: auth.isAuthenticated, retry: false });
  const profileSave = trpc.profile.save.useMutation(); const favoriteSave = trpc.favorites.save.useMutation(); const favoriteRemove = trpc.favorites.remove.useMutation(); const feedbackAdd = trpc.feedback.add.useMutation(); const clearAccountData = trpc.account.clearFoodData.useMutation();
  useEffect(() => { fetch("/api/food/config").then(r => r.json()).then(data => { setAiAvailable(Boolean(data.aiAvailable)); setRestaurantProviderAvailable(Boolean(data.restaurantProviderAvailable)); }).catch(() => { setAiAvailable(false); setRestaurantProviderAvailable(false); }); }, []);
  useEffect(() => { if (auth.isAuthenticated && profileQuery.isSuccess && profileQuery.data) setPreferences({ ...DEFAULT_PREFERENCES, ...profileQuery.data }); }, [auth.isAuthenticated, profileQuery.data, profileQuery.isSuccess]);
  useEffect(() => { if (auth.isAuthenticated && favoritesQuery.isSuccess) setFavourites(favoritesQuery.data.map(item => item.itemId)); }, [auth.isAuthenticated, favoritesQuery.data, favoritesQuery.isSuccess]);
  useEffect(() => { if (auth.isAuthenticated && feedbackQuery.isSuccess) setFeedback(feedbackQuery.data.map(item => ({ itemId: item.itemId, type: item.type }))); }, [auth.isAuthenticated, feedbackQuery.data, feedbackQuery.isSuccess]);
  useEffect(() => { if (!auth.isAuthenticated) store("craveit.preferences.v1", preferences); }, [preferences, auth.isAuthenticated]);
  useEffect(() => { if (!auth.isAuthenticated) store("craveit.favourites.v1", favourites); }, [favourites, auth.isAuthenticated]);
  useEffect(() => { if (!auth.isAuthenticated) store("craveit.feedback.v1", feedback); }, [feedback, auth.isAuthenticated]);
  const savePreferences = useCallback(async (value: UserPreferences) => { setPreferences(value); setLastFilters({}); if (auth.isAuthenticated) { try { await profileSave.mutateAsync(value); toast.success("Your taste profile is saved to your account."); } catch { toast.error("Could not save your account profile. Please retry."); } } else toast.success("Your taste profile is saved on this device."); }, [auth.isAuthenticated, profileSave]);
  const clearFoodData = useCallback(async () => {
    if (auth.isAuthenticated) { try { await clearAccountData.mutateAsync(); } catch { toast.error("Your account data could not be deleted. Please retry."); return; } }
    for (const key of ["craveit.preferences.v1", "craveit.favourites.v1", "craveit.feedback.v1", "craveit.chat.v1"]) { try { localStorage.removeItem(key); } catch {} }
    setPreferences(DEFAULT_PREFERENCES); setFavourites([]); setFeedback([]);
    if (auth.isAuthenticated) await Promise.all([profileQuery.refetch(), favoritesQuery.refetch(), feedbackQuery.refetch()]);
    toast.success("Your saved food data has been deleted.");
  }, [auth.isAuthenticated, clearAccountData, profileQuery, favoritesQuery, feedbackQuery]);
  const toggleFavourite = useCallback(async (itemId: string, kind: FoodKind = "dish") => {
    const wasSaved = favourites.includes(itemId); setFavourites(current => wasSaved ? current.filter(id => id !== itemId) : [...current, itemId]);
    if (auth.isAuthenticated) { try { if (wasSaved) await favoriteRemove.mutateAsync({ itemId, kind }); else await favoriteSave.mutateAsync({ itemId, kind }); await favoritesQuery.refetch(); } catch { setFavourites(current => wasSaved ? [...current, itemId] : current.filter(id => id !== itemId)); toast.error("Could not update your saved items. Please retry."); } }
    else toast.success(wasSaved ? "Removed from your saved dishes." : "Saved on this device.");
  }, [favourites, auth.isAuthenticated, favoriteRemove, favoriteSave, favoritesQuery]);
  const sendFeedback = useCallback(async (itemId: string, type: FoodFeedback["type"]) => {
    setFeedback(current => [...current.filter(item => item.itemId !== itemId), { itemId, type }].slice(-100));
    if (auth.isAuthenticated) { try { await feedbackAdd.mutateAsync({ itemId, type }); } catch { toast.error("We couldn't save this feedback to your account."); } }
    toast.success(({ love: "We'll remember you loved this.", not_for_me: "Got it — we'll show fewer like this.", too_expensive: "Noted. We'll keep the budget in mind.", too_spicy: "Noted. We'll ease off the heat.", similar: "Got it — we'll look for similar flavours next time." })[type]);
  }, [auth.isAuthenticated, feedbackAdd]);
  const recommend = useCallback(async (query: string, filters?: FoodFilters, excludeIds: string[] = [], preferenceOverride?: UserPreferences) => {
    setLoading(true); setError(null); setLastQuery(query); setLastFilters(filters ?? {});
    try { const data = await post<RecommendationResult>("/api/food/recommendations", { query: query || "surprise me with a delicious meal", preferences: preferenceOverride ?? preferences, filters, feedback, excludeIds }); setResults(data); return data; }
    catch (cause) { const message = cause instanceof Error ? cause.message : "We couldn't load recommendations."; setError(message); toast.error(message); return null; }
    finally { setLoading(false); }
  }, [preferences, feedback]);
  const chat = useCallback(async (messages: { role: "user" | "assistant"; content: string }[]) => {
    const query = [...messages].reverse().find(message => message.role === "user")?.content ?? ""; setLoading(true); setError(null); setLastQuery(query); setLastFilters({});
    try { const response = await post<RecommendationResult & { reply: string }>("/api/food/chat", { query, messages: messages.slice(-12), preferences, feedback }); const { reply, ...result } = response; setResults(result); return { reply, result }; }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Chat is unavailable right now."; setError(message); return null; }
    finally { setLoading(false); }
  }, [preferences, feedback]);
  const requestRecipes = useCallback(async (ingredients: string[], servings: number, action: "use" | "alternatives" | "spicier" | "budget" = "use", excludeIds: string[] = []) => {
    setLoading(true); setError(null);
    try { return await post<{ recipes: RecipeResult[]; note: string }>("/api/food/recipes", { ingredients, servings, action, excludeIds, preferences }); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Recipe search failed."; setError(message); toast.error(message); return null; }
    finally { setLoading(false); }
  }, [preferences]);
  const value = useMemo<FoodContextValue>(() => ({ preferences, savePreferences, clearFoodData, favourites, toggleFavourite, feedback, sendFeedback, results, loading, error, lastQuery, lastFilters, recommend, chat, requestRecipes, aiAvailable, restaurantProviderAvailable, authUser: auth.user ? { name: auth.user.name, email: auth.user.email } : null }), [preferences, savePreferences, clearFoodData, favourites, toggleFavourite, feedback, sendFeedback, results, loading, error, lastQuery, lastFilters, recommend, chat, requestRecipes, aiAvailable, restaurantProviderAvailable, auth.user]);
  return <FoodContext.Provider value={value}>{children}</FoodContext.Provider>;
}
export function useFood() { const value = useContext(FoodContext); if (!value) throw new Error("useFood must be used inside FoodProvider"); return value; }
