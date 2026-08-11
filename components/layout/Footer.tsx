import Link from "next/link";
import { LogoMark } from "./Logo";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/recipes", label: "All recipes" },
      { href: "/recipes?sort=popularity", label: "Most cooked" },
      { href: "/recipes?sort=newest", label: "Recently added" },
      { href: "/recipes?time=45", label: "Under 45 minutes" },
      { href: "/recipes?diet=Vegetarian", label: "Vegetarian" },
    ],
  },
  {
    title: "Cuisines",
    links: [
      { href: "/cuisines/west-african", label: "West African" },
      { href: "/cuisines/japanese", label: "Japanese" },
      { href: "/cuisines/mexican", label: "Mexican" },
      { href: "/cuisines/levantine", label: "Levantine" },
      { href: "/cuisines", label: "All cuisines" },
    ],
  },
  {
    title: "Your kitchen",
    links: [
      { href: "/favorites", label: "Favorites" },
      { href: "/shopping-list", label: "Shopping list" },
      { href: "/meal-planner", label: "Meal planner" },
      { href: "/countries", label: "Browse by country" },
    ],
  },
];

const SOCIAL = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "YouTube", href: "https://youtube.com" },
  { label: "Pinterest", href: "https://pinterest.com" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-cream-deep print-hide">
      <div className="u-shell py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 text-forest">
              <LogoMark />
              <span className="font-display text-[1.375rem] leading-none text-ink">WorldPlates</span>
            </div>
            <p className="mt-4 text-[0.9375rem] text-muted">
              Recipes from the places they come from, written so you can actually cook them —
              with the city, the technique and the reason it is made that way.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIAL.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="u-data rounded-full bg-paper px-3.5 py-2 text-muted ring-1 ring-line transition-colors hover:text-forest"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="u-data text-forest">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-[0.9375rem] text-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-line pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="inline-flex items-center gap-2">
              <span className="u-data text-muted">Language</span>
              <select
                defaultValue="en-US"
                className="h-9 rounded-full bg-paper px-3 text-sm text-ink ring-1 ring-line"
                aria-label="Language"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="pt">Português</option>
              </select>
            </label>

            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {["Privacy policy", "Terms", "Accessibility"].map((label) => (
                <li key={label}>
                  <Link
                    href="/"
                    className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-faint">© {new Date().getFullYear()} WorldPlates</p>
        </div>

        <p className="mt-6 text-xs text-faint">
          Dish photography from Wikimedia Commons, credited on each recipe. Recipes are written
          for this demo and are not from a licensed recipe database.
        </p>
      </div>
    </footer>
  );
}
