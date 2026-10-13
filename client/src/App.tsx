import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import CraveShell from "./components/CraveShell";
import { FoodProvider } from "./contexts/FoodContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Chat from "./pages/Chat";
import Recipes from "./pages/Recipes";
import Restaurants from "./pages/Restaurants";
import Favourites from "./pages/Favourites";
import Profile from "./pages/Profile";
import InfoPages from "./pages/InfoPages";
import SignIn from "./pages/SignIn";
import DishDetail from "./pages/DishDetail";

function Router() {
  return <FoodProvider><CraveShell><Switch>
    <Route path="/" component={Home} />
    <Route path="/discover" component={Discover} />
    <Route path="/chat" component={Chat} />
    <Route path="/recipes" component={Recipes} />
    <Route path="/restaurants" component={Restaurants} />
    <Route path="/favourites" component={Favourites} />
    <Route path="/profile" component={Profile} />
    <Route path="/about" component={InfoPages} />
    <Route path="/privacy" component={InfoPages} />
    <Route path="/sign-in" component={SignIn} />
    <Route path="/sign-up" component={SignIn} />
    <Route path="/dish/:id" component={DishDetail} />
    <Route component={NotFound} />
  </Switch></CraveShell></FoodProvider>;
}
export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><Toaster richColors position="top-center" /><Router /></ThemeProvider></ErrorBoundary>;
}
