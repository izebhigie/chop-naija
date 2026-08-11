import { recipes } from "@/data/recipes";
import { countries } from "@/data/countries";
import { categories } from "@/data/categories";
import { recipeService } from "@/services/recipeService";
import { totalMinutes } from "@/lib/filters";
import { toCardList } from "@/lib/cards";
import { Hero } from "@/components/home/Hero";
import {
  QuickDiscovery,
  RegionMosaic,
  TrendingRecipes,
  FeaturedCuisine,
  HowItWorks,
  Community,
  Newsletter,
} from "@/components/home/sections";

/** Counts shown on the category cards, derived from the catalogue itself. */
function categoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const category of categories) {
    counts[category.slug] = recipes.filter((recipe) => {
      if (category.slug === "vegetarian") {
        return recipe.diets.includes("Vegetarian") || recipe.diets.includes("Vegan");
      }
      if (category.slug === "quick-easy") return totalMinutes(recipe) <= 45;
      return recipe.categories.includes(category.slug);
    }).length;
  }
  return counts;
}

export default async function HomePage() {
  const [regions, regionCounts] = await Promise.all([
    recipeService.listRegions(),
    recipeService.getRegionCounts(),
  ]);

  const trending = toCardList(
    [...recipes].sort((a, b) => b.cooksThisMonth - a.cooksThisMonth).slice(0, 6),
  );

  const featuredDishes = recipes.filter((recipe) => recipe.cuisineSlug === "west-african");

  return (
    <>
      <Hero recipeCount={recipes.length} countryCount={countries.length} />
      <QuickDiscovery counts={categoryCounts()} />
      <RegionMosaic regions={regions} counts={regionCounts} />
      <TrendingRecipes recipes={trending} />
      <FeaturedCuisine
        cuisineSlug="west-african"
        dishes={featuredDishes}
        imageRecipeSlug="suya"
      />
      <HowItWorks />
      <Community />
      <Newsletter />
    </>
  );
}
