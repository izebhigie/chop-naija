import Link from "next/link";
import { Clock, Star } from "lucide-react";
import { recipeBySlug } from "@/data/recipes";
import { countryBySlug } from "@/data/countries";
import { FoodImage } from "@/components/ui/FoodImage";
import { SearchBar } from "@/components/search/SearchBar";
import { Flag } from "@/components/ui/Flag";
import { formatCoordinates } from "@/lib/format";
import { formatDuration } from "@/lib/units";
import { totalMinutes } from "@/lib/filters";

const HERO_SLUG = "jollof-rice";

/**
 * The page opens on one plate, named and located. The floating chip carries
 * the dish's coordinates rather than a marketing statistic, because where a
 * dish is from is the thing this product is actually about.
 */
export function Hero({ recipeCount, countryCount }: { recipeCount: number; countryCount: number }) {
  const recipe = recipeBySlug.get(HERO_SLUG);
  if (!recipe) return null;

  const country = countryBySlug.get(recipe.countrySlug);
  const minutes = totalMinutes(recipe);

  return (
    <section className="u-shell pb-16 pt-10 lg:pb-24 lg:pt-16">
      {/* min-w-0 on both columns: grid items default to min-width:auto, so
          without it the widest line of text sets a floor the column will not
          go below and the page scrolls sideways on small phones. */}
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div className="min-w-0">
          <p
            className="u-hero-in u-data text-forest"
            style={{ animationDelay: "60ms" }}
          >
            Flavors from every corner of the world
          </p>

          <h1
            className="u-hero-in mt-5 text-[length:var(--text-display-xl)]"
            style={{ animationDelay: "140ms" }}
          >
            Discover the world,
            {/* The break is a typographic choice for wide screens; on a phone
                it would strand "world," on a line of its own. */}
            <br className="hidden sm:block" /> one dish at a time.
          </h1>

          <p
            className="u-hero-in mt-6 max-w-lg text-[1.0625rem] leading-relaxed text-muted"
            style={{ animationDelay: "220ms" }}
          >
            Recipes as they are cooked where they come from — the local name, the city, the
            technique that makes the difference. Scale the ingredients to your table and cook
            from the steps.
          </p>

          <div className="u-hero-in mt-8 max-w-xl" style={{ animationDelay: "300ms" }}>
            <SearchBar size="lg" />
          </div>

          <div
            className="u-hero-in mt-6 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "380ms" }}
          >
            <Link
              href="/recipes"
              className="inline-flex h-12 items-center rounded-full bg-forest px-7 font-semibold text-cream transition-colors hover:bg-forest-mid"
            >
              Explore recipes
            </Link>
            <Link
              href="/countries"
              className="inline-flex h-12 items-center rounded-full bg-paper px-7 font-semibold text-ink ring-1 ring-line transition-colors hover:bg-cream-deep"
            >
              Browse by country
            </Link>
          </div>

          <p className="u-hero-in u-data mt-6 text-muted" style={{ animationDelay: "440ms" }}>
            {recipeCount} recipes / {countryCount} countries / 8 regions
          </p>
        </div>

        <div className="relative min-w-0">
          <div className="u-wipe">
            <FoodImage
              image={recipe.image}
              alt={recipe.imageAlt}
              sizes="(min-width: 1024px) 620px, 92vw"
              ratio="5 / 4"
              priority
              quality={90}
              className="rounded-[var(--radius-media)] shadow-[var(--shadow-lift)]"
            />
          </div>

          {/* Origin chip — the dish, where it is from, and where that is. */}
          <div
            className="u-hero-in absolute bottom-4 left-3 max-w-[calc(100%-1.5rem)] rounded-2xl bg-paper/95 p-4 shadow-[var(--shadow-chip)] backdrop-blur-sm sm:bottom-6 sm:left-6"
            style={{ animationDelay: "700ms" }}
          >
            <p className="font-display text-lg leading-tight text-ink">{recipe.name}</p>
            <p className="u-script mt-0.5 text-sm text-muted">{recipe.localName}</p>
            <div className="u-data mt-2 flex items-center gap-2 border-t border-line pt-2 text-forest">
              <Flag iso2={country?.iso2 ?? "ng"} title={country?.name ?? "Nigeria"} />
              <span>{recipe.origin.city}</span>
              <span className="text-line" aria-hidden="true">
                /
              </span>
              <span className="text-muted tabular-nums">
                {formatCoordinates(recipe.origin.lat, recipe.origin.lon)}
              </span>
            </div>
          </div>

          <div
            className="u-hero-in absolute right-3 top-4 flex flex-col items-end gap-2 sm:right-4 sm:top-6"
            style={{ animationDelay: "820ms" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-paper/95 px-3.5 py-2 shadow-[var(--shadow-chip)] backdrop-blur-sm">
              <Star aria-hidden="true" className="size-3.5 fill-saffron text-saffron" />
              <span className="u-data text-ink">
                {recipe.rating.toFixed(1)} / {recipe.reviewCount.toLocaleString("en-GB")}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-paper/95 px-3.5 py-2 shadow-[var(--shadow-chip)] backdrop-blur-sm">
              <Clock aria-hidden="true" className="size-3.5 text-forest" />
              <span className="u-data text-ink">{formatDuration(minutes)}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
