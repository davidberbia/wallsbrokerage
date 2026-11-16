import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  BookUser,
  Crosshair,
  Handshake,
  Building2,
  Contact,
  FolderKanban,
  Landmark,
  Link2,
  LogOut,
  Mail,
  Menu,
  Presentation,
  FileSignature,
  Scale,
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
import { useNavCounts } from "@/hooks/useNavCounts";
import { AssistantBar } from "@/components/AssistantBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const CONTACT_ITEMS = [
  { to: "/investisseurs", label: "Acquéreurs", icon: Users, admin: false },
  { to: "/prospects", label: "Prospects", icon: Contact, admin: false },
  { to: "/brokers", label: "Brokers", icon: Handshake, admin: true },
  { to: "/notaires", label: "Notaires", icon: Landmark, admin: true },
  { to: "/contacts", label: "Divers", icon: BookUser, admin: true },
  { to: "/a-qualifier", label: "À qualifier", icon: Mail, admin: true },
] as const;

const NAV_ITEMS = [
  { to: "/dossiers", label: "Suivi des affaires", icon: FolderKanban, admin: false },
  { to: "/actifs", label: "Actifs", icon: Building2, admin: false },
  { to: "/presentation", label: "Teasers", icon: Presentation, admin: false },
  { to: "/mandats", label: "Mandats", icon: FileSignature, admin: false },
  { to: "/matching", label: "Matching", icon: Target, admin: false },
  { to: "/envois", label: "Envois", icon: Send, admin: false },
  { to: "/cibles", label: "À relancer", icon: Crosshair, admin: false },
  { to: "/investisseurs", label: "Contacts", icon: BookUser, admin: false },
  { to: "/partager", label: "Extractions", icon: Link2, admin: false },
  { to: "/comparables", label: "Comparables", icon: Scale, admin: false },
  { to: "/agents-co", label: "Agents Co", icon: Users, admin: true },
  { to: "/parametres", label: "Paramètres", icon: Settings, admin: true },
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
  const { session, loading, isBroker, isStaff, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const contactTabs = CONTACT_ITEMS.filter((item) => item.admin || isBroker);
  const isContactsPage = CONTACT_ITEMS.some((item) => item.to === pathname);
  const isActiveNav = (to: string) =>
    to === "/investisseurs" && isStaff ? isContactsPage : pathname === to;
  const counts = useNavCounts(!!session && isStaff).data;
  const badge = (to: string) => {
    const n = counts?.[to];
    return n == null ? null : (
      <span className="ml-auto rounded-sm border border-border px-1.5 font-mono text-[10px] leading-4 text-sidebar-foreground/70">
        {n.toLocaleString("fr-FR")}
      </span>
    );
  };
  const NAV = isStaff
    ? NAV_ITEMS.filter((item) => (item.admin || isBroker) && (item.to !== "/agents-co" || isSuperAdmin)).map((item) =>
        item.label === "Contacts" ? { ...item, to: contactTabs[0]?.to ?? "/investisseurs" } : item,
      )
    : [...INVESTOR_NAV];

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (requireAdmin && !isBroker) navigate({ to: "/" });
    else if (requireBroker && !isStaff) navigate({ to: "/mon-profil" });
  }, [loading, session, isBroker, isStaff, requireBroker, requireAdmin, navigate]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isContactsPage) return;
    document.querySelector('[data-contact-active="true"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [pathname, isContactsPage, loading]);

  if (loading || !session || (requireBroker && !isStaff) || (requireAdmin && !isBroker)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background min-[500px]:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground min-[500px]:flex">
        <Link to={isStaff ? "/" : "/mon-profil"} className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4">
          <img src="/icon-192.png" alt="" className="mr-2 size-7 rounded-md" />
          <span className="truncate font-display text-base font-semibold tracking-tight text-accent">WALLSBROKERAGE</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Menu principal">
          {NAV.map((item) => {
            const active = item.label === "Contacts" ? isContactsPage : isActiveNav(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.label !== "Contacts" && badge(item.to)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <p className="mb-1 truncate px-3 text-xs text-sidebar-foreground/60">{session.user.email}</p>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" /> Se déconnecter
          </Button>
        </div>
      </aside>
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar text-sidebar-foreground min-[500px]:hidden">
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
                  const active = item.label === "Contacts" ? isContactsPage : isActiveNav(item.to);
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
                      {item.label !== "Contacts" && badge(item.to)}
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
            <img src="/icon-192.png" alt="" className="mr-2 size-7 self-center rounded-md" />
            <span className="truncate font-display text-base font-semibold tracking-tight text-accent sm:text-lg">
              WALLSBROKERAGE
            </span>
          </Link>

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
      {isStaff && <AssistantBar userId={session.user.id} />}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-10">
        {isStaff && isContactsPage && (
          <section className="mb-6 min-w-0" aria-label="Contacts">
            <h1 className="mb-3 font-display text-2xl font-semibold">Contacts</h1>
            <nav aria-label="Annuaires de contacts" className="flex max-w-full gap-1 overflow-x-auto border-b border-border">
              {contactTabs.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={pathname === item.to ? "page" : undefined}
                  data-contact-active={pathname === item.to ? "true" : undefined}
                  className={cn(
                    "flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors",
                    pathname === item.to
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                  {badge(item.to)}
                </Link>
              ))}
            </nav>
          </section>
        )}
        {children}
      </main>
    </div>
  );
}
