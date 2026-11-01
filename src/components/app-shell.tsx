import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, Menu, Plus, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SkipLink } from "@/components/skip-link";
import { AccountControls } from "@/components/account-controls";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { useEvents } from "@/state/events-context";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_LABELS } from "@/lib/types";

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-lg px-1 py-1">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="size-4" aria-hidden />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Eventora AI</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { events } = useEvents();
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/create", label: "Create event", icon: Plus },
  ] as const;

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          aria-current={pathname.startsWith(link.to) ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(link.to)
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <link.icon className="size-4" aria-hidden />
          {link.label}
        </Link>
      ))}

      <p className="mt-5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your events
      </p>
      {events.length === 0 && (
        <p className="px-3 py-1 text-sm text-muted-foreground">No events yet.</p>
      )}
      {events.map((event) => (
        <Link
          key={event.id}
          to="/events/$eventId"
          params={{ eventId: event.id }}
          aria-current={pathname === `/events/${event.id}` ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname === `/events/${event.id}`
              ? "bg-accent text-accent-foreground"
              : "text-foreground hover:bg-accent/60",
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{event.brief.name}</span>
          {event.isSample && (
            <span className="ml-auto shrink-0 rounded-full bg-lavender px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lavender-foreground">
              Sample
            </span>
          )}
        </Link>
      ))}
      <span className="sr-only">{events.length > 0 ? `${events.length} events planned` : ""}</span>
      <span className="px-3 pt-1 text-xs text-muted-foreground">
        {events
          .slice(0, 3)
          .map((e) => EVENT_TYPE_LABELS[e.brief.type])
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(" · ")}
      </span>
    </nav>
  );
}

/** App chrome: sidebar on desktop, drawer on mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { storageWarning, mode } = useEvents();

  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
        <BrandMark />
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open navigation menu">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Choose the dashboard, create an event or open an existing event.
            </SheetDescription>
            <div className="pt-2">
              <BrandMark />
              <div className="mt-4">
                <NavLinks onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-6 lg:flex">
          <BrandMark />
          <div className="mt-8 flex-1 overflow-y-auto">
            <NavLinks />
          </div>
          <p className="mt-4 px-3 text-xs leading-relaxed text-muted-foreground">
            {mode === "account"
              ? "Private workspace — save edits to your account."
              : "Template demo — plans are saved in this browser only."}
          </p>
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <AccountControls />
            {storageWarning && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {storageWarning}
              </p>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
