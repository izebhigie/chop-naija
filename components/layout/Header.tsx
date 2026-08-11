"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Menu, X, Heart, UserRound } from "lucide-react";
import { Logo } from "./Logo";
import { SearchBar } from "@/components/search/SearchBar";
import { useAppStore } from "@/hooks/useAppStore";
import { cx } from "@/lib/format";

const NAV = [
  { href: "/recipes", label: "Discover" },
  { href: "/cuisines", label: "Cuisines" },
  { href: "/countries", label: "Countries" },
  { href: "/meal-planner", label: "Meal planner" },
];

export function Header() {
  const pathname = usePathname();
  const { favorites, hydrated } = useAppStore();

  // Both panels remember the route they were opened on, so navigating
  // anywhere closes them without an effect that resets state after render.
  const [menuRoute, setMenuRoute] = useState<string | null>(null);
  const [searchRoute, setSearchRoute] = useState<string | null>(null);
  const menuOpen = menuRoute === pathname;
  const searchOpen = searchRoute === pathname;

  const setMenuOpen = (open: boolean) => setMenuRoute(open ? pathname : null);
  const setSearchOpen = (open: boolean) => setSearchRoute(open ? pathname : null);

  const [scrolled, setScrolled] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the drawer and returns focus to the control that opened it.
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (menuOpen) {
        setMenuRoute(null);
        menuButtonRef.current?.focus();
      }
      if (searchOpen) setSearchRoute(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, searchOpen]);

  // Keep tabbing inside the mobile drawer while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    drawer.addEventListener("keydown", onKeyDown);
    return () => drawer.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const savedCount = hydrated ? favorites.length : 0;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cx(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled || menuOpen ? "bg-paper/95 shadow-[0_1px_0_var(--color-line-soft)] backdrop-blur-md" : "bg-cream",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:text-cream"
      >
        Skip to content
      </a>

      <div className="u-shell flex h-18 items-center gap-3 sm:gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cx(
                "rounded-full px-3.5 py-2 text-[0.9375rem] font-medium transition-colors",
                isActive(item.href)
                  ? "bg-forest-wash text-forest"
                  : "text-muted hover:bg-cream-deep hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-expanded={searchOpen}
            aria-label="Search recipes"
            className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-cream-deep hover:text-ink"
          >
            <Search aria-hidden="true" className="size-[1.15rem]" />
          </button>

          <Link
            href="/favorites"
            aria-label={savedCount ? `Favorites, ${savedCount} saved` : "Favorites"}
            className={cx(
              "relative grid size-10 place-items-center rounded-full transition-colors hover:bg-cream-deep",
              isActive("/favorites") ? "text-tomato" : "text-muted hover:text-ink",
            )}
          >
            <Heart aria-hidden="true" className="size-[1.15rem]" />
            {savedCount > 0 ? (
              <span className="u-data-sm absolute -right-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-tomato px-1 py-0.5 text-cream">
                {savedCount}
              </span>
            ) : null}
          </Link>

          <Link
            href="/recipes"
            className="ml-1.5 hidden h-10 items-center rounded-full bg-forest px-5 text-[0.9375rem] font-semibold text-cream transition-colors hover:bg-forest-mid sm:inline-flex"
          >
            Explore recipes
          </Link>

          <button
            type="button"
            className="ml-1 hidden size-10 place-items-center rounded-full ring-1 ring-line text-muted transition-colors hover:bg-cream-deep hover:text-ink lg:grid"
            aria-label="Sign in"
          >
            <UserRound aria-hidden="true" className="size-[1.15rem]" />
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-cream-deep lg:hidden"
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="border-t border-line-soft bg-paper/95 py-4 backdrop-blur-md">
          <div className="u-shell">
            <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
          </div>
        </div>
      ) : null}

      {menuOpen ? (
        <div
          ref={drawerRef}
          id="mobile-menu"
          className="border-t border-line-soft bg-paper lg:hidden"
        >
          <nav aria-label="Mobile" className="u-shell flex flex-col py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cx(
                  "border-b border-line-soft py-3.5 text-lg",
                  isActive(item.href) ? "text-forest" : "text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/favorites" className="border-b border-line-soft py-3.5 text-lg text-ink">
              Favorites{savedCount ? ` (${savedCount})` : ""}
            </Link>
            <Link href="/shopping-list" className="border-b border-line-soft py-3.5 text-lg text-ink">
              Shopping list
            </Link>

            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/recipes"
                className="inline-flex h-12 items-center justify-center rounded-full bg-forest font-semibold text-cream"
              >
                Explore recipes
              </Link>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full font-semibold text-ink ring-1 ring-line"
              >
                <UserRound aria-hidden="true" className="size-4" />
                Sign in
              </button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
