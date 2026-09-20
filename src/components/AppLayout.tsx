import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Building2,
  Contact,
  LogOut,
  Mail,
  Menu,
  Send,
  Settings,
  Target,
  UserCircle,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const BROKER_NAV = [
  { to: "/", label: "Matching", icon: Target },
  { to: "/investisseurs", label: "Investisseurs", icon: Users },
  { to: "/prospects", label: "Prospects", icon: Contact },
  { to: "/actifs", label: "Actifs", icon: Building2 },
  { to: "/envois", label: "Envois", icon: Send },
] as const;

const ADMIN_NAV = [
  { to: "/contacts-detectes", label: "Contacts détectés", icon: Mail },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

const INVESTOR_NAV = [{ to: "/mon-profil", label: "Mon profil", icon: UserCircle }] as const;

export function AppLayout({
  children,
  requireBroker = false,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireBroker?: boolean;
  requireAdmin?: boolean;
}) {
  const { session, loading, isBroker, isStaff } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const NAV = isStaff ? [...BROKER_NAV, ...(isBroker ? ADMIN_NAV : [])] : [...INVESTOR_NAV];

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (requireAdmin && !isBroker) navigate({ to: "/" });
    else if (requireBroker && !isStaff) navigate({ to: "/mon-profil" });
  }, [loading, session, isBroker, isStaff, requireBroker, requireAdmin, navigate]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading || !session || (requireBroker && !isStaff) || (requireAdmin && !isBroker)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-5">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[min(20rem,88vw)] flex-col bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle className="font-display text-lg font-semibold tracking-tight text-accent">
                  WALLSBROKERAGE
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
                {NAV.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60",
                      )}
                    >
                      <item.icon className="size-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-sidebar-border p-3">
                <p className="mb-2 truncate px-3 text-xs text-sidebar-foreground/60">{session.user.email}</p>
                <Button
                  variant="ghost"
                  className="min-h-12 w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/auth" });
                  }}
                >
                  <LogOut className="size-5" /> Se déconnecter
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Link to={isStaff ? "/" : "/mon-profil"} className="flex min-w-0 items-baseline">
            <span className="truncate font-display text-base font-semibold tracking-tight text-accent sm:text-lg">
              WALLSBROKERAGE
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-sidebar-foreground/60 lg:block">
              {session.user.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Se déconnecter"
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-10">{children}</main>
    </div>
  );
}
