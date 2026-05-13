import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, User, PlusCircle, Repeat2, LogOut, Menu, X, Search, Bookmark } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedItems } from "@/contexts/SavedItemsContext";
import { Button } from "@/components/ui/button";
import AIAssistButton from "@/components/AIAssistButton";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/create-request", label: "New Request", icon: PlusCircle },
  { to: "/matches", label: "Matches", icon: Repeat2 },
  { to: "/saved", label: "Saved", icon: Bookmark },
];

const mobileNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Search", icon: Search },
  { to: "/matches", label: "Matches", icon: Repeat2 },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/profile", label: "Profile", icon: User },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { savedCount } = useSavedItems();
  const location = useLocation();
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  useEffect(() => {
    setMobileActionsOpen(false);
  }, [location.pathname]);

  const isActiveRoute = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md relative">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Repeat2 className="h-6 w-6 text-primary" />
            <span className="font-heading text-lg font-bold text-foreground">SkillBridge</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => {
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
            <ThemeToggle />
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={signOut} className="ml-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground"
            onClick={() => setMobileActionsOpen((open) => !open)}
            aria-label="Open mobile actions"
            aria-expanded={mobileActionsOpen}
            aria-controls="mobile-actions-menu"
          >
            {mobileActionsOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileActionsOpen && (
          <div
            id="mobile-actions-menu"
            className="md:hidden absolute right-4 top-full z-50 mt-2 w-64 rounded-2xl border bg-card/95 p-3 shadow-xl backdrop-blur-md animate-slide-up"
          >
            <div className="space-y-3">
              <div className="rounded-xl border bg-background/60 p-2">
                <ThemeToggle className="w-full justify-start text-muted-foreground" showText />
              </div>
              <div className="rounded-xl border bg-background/60 p-2">
                <NotificationBell />
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="container py-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-6">{children}</main>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-5 gap-1 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          {mobileNavItems.map((item) => {
            const active = isActiveRoute(item.to);
            const showSavedBadge = item.to === "/saved" && savedCount > 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <span className={cn("relative flex items-center justify-center transition-transform duration-200", active && "scale-105")}>
                  <item.icon className="h-5 w-5" />
                  {showSavedBadge && (
                    <span
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AIAssistButton />
    </div>
  );
}
