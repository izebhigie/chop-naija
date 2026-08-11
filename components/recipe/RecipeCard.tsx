import Link from "next/link";
import { Clock, ChefHat } from "lucide-react";
import type { RecipeCardData } from "@/lib/cards";
import { formatDurationShort, formatDuration } from "@/lib/units";
import { FoodImage } from "@/components/ui/FoodImage";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { OriginLine } from "@/components/ui/OriginLine";
import { Rating, Tag } from "@/components/ui/primitives";

const GRID_SIZES =
  "(min-width: 1280px) 384px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw";
const LIST_SIZES = "(min-width: 768px) 260px, 92vw";

export function RecipeCard({
  card,
  view = "grid",
  priority = false,
}: {
  card: RecipeCardData;
  view?: "grid" | "list";
  priority?: boolean;
}) {
  const origin = { city: card.city, lat: card.lat, lon: card.lon };

  const meta = (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <Rating rating={card.rating} reviewCount={card.reviewCount} size="sm" />
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Clock aria-hidden="true" className="size-3.5" />
        <span className="tabular-nums">{formatDurationShort(card.minutes)}</span>
        <span className="sr-only">{formatDuration(card.minutes)} in total</span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <ChefHat aria-hidden="true" className="size-3.5" />
        {card.difficulty}
      </span>
    </div>
  );

  if (view === "list") {
    return (
      <article className="group relative flex flex-col gap-5 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line-soft transition-shadow duration-300 hover:shadow-[var(--shadow-soft)] sm:flex-row">
        <div className="relative sm:w-[260px] sm:shrink-0">
          <FoodImage
            image={card.image}
            alt={card.imageAlt}
            sizes={LIST_SIZES}
            ratio="4 / 3"
            className="rounded-[16px]"
          />
          <FavoriteButton slug={card.slug} name={card.name} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-[1.375rem] leading-tight">
            <Link href={`/recipes/${card.slug}`} className="after:absolute after:inset-0">
              {card.name}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-[0.9375rem] text-muted">{card.description}</p>
          {meta}
          <OriginLine
            className="mt-4"
            size="sm"
            origin={origin}
            countryName={card.countryName}
            iso2={card.iso2}
            localName={card.localName}
            cuisineName={card.cuisineName}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-paper ring-1 ring-line-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="relative">
        <FoodImage
          image={card.image}
          alt={card.imageAlt}
          sizes={GRID_SIZES}
          ratio="4 / 3"
          priority={priority}
        />
        <FavoriteButton slug={card.slug} name={card.name} />
        {card.trending ? (
          <span className="u-data-sm absolute left-3 top-3 rounded-full bg-tomato px-2.5 py-1 text-cream">
            Trending
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[1.375rem] leading-tight">
          <Link href={`/recipes/${card.slug}`} className="after:absolute after:inset-0">
            {card.name}
          </Link>
        </h3>

        {card.diets.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.diets.slice(0, 2).map((diet) => (
              <Tag key={diet} tone="forest">
                {diet}
              </Tag>
            ))}
          </div>
        ) : null}

        {meta}

        <OriginLine
          className="mt-auto pt-4"
          size="sm"
          origin={origin}
          countryName={card.countryName}
          iso2={card.iso2}
          localName={card.localName}
          cuisineName={card.cuisineName}
        />

        <span
          aria-hidden="true"
          className="u-data mt-4 text-forest transition-colors group-hover:text-forest-mid"
        >
          View recipe →
        </span>
      </div>
    </article>
  );
}
