import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import {
  Building2,
  Contact,
  LogOut,
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

const BROKER_NAV = [
  { to: "/", label: "Matching", icon: Target },
  { to: "/investisseurs", label: "Investisseurs", icon: Users },
  { to: "/prospects", label: "Prospects", icon: Contact },
  { to: "/actifs", label: "Actifs", icon: Building2 },
  { to: "/envois", label: "Envois", icon: Send },
] as const;

const ADMIN_NAV = [{ to: "/parametres", label: "Paramètres", icon: Settings }] as const;

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
  const NAV = isStaff ? [...BROKER_NAV, ...(isBroker ? ADMIN_NAV : [])] : [...INVESTOR_NAV];

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (requireAdmin && !isBroker) navigate({ to: "/" });
    else if (requireBroker && !isStaff) navigate({ to: "/mon-profil" });
  }, [loading, session, isBroker, isStaff, requireBroker, requireAdmin, navigate]);

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
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
          <Link to={isStaff ? "/" : "/mon-profil"} className="flex items-baseline">
            <span className="font-display text-lg font-semibold tracking-tight text-accent">
              WALLSBROKERAGE
            </span>
          </Link>

          <nav className="flex items-center gap-1">
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
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-sidebar-foreground/60 sm:block">
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
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
