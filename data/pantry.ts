import type { Aisle } from "@/lib/types";

/**
 * The vocabulary behind "what can I cook".
 *
 * Recipe ingredients are written the way a cook would write them — "Long-grain
 * parboiled rice", "Fresh ginger", "Tinned plum tomatoes" — so matching a
 * kitchen against them needs a canonical list in between. Each entry names one
 * thing a kitchen either has or does not, and says which recipe lines it
 * covers.
 *
 * `except` is the important half. Substring matching is what makes "rice"
 * cover every kind of rice, and it is also what makes "rice" cover flat rice
 * noodles, "butter" cover butter beans, "olive" cover olive oil and "lemon"
 * cover lemongrass. Every veto here stands for a wrong answer this would
 * otherwise give. `npm run check:pantry` prints what each entry matches, which
 * is how they were found.
 */
export interface MatchRule {
  /** Matched anywhere in the ingredient name, lowercased. */
  match?: string[];
  /** Matched against the whole name — for words too common to match loosely. */
  exact?: string[];
  /** Vetoes a match. Checked before anything else. */
  except?: string[];
}

export interface PantryItem extends MatchRule {
  id: string;
  label: string;
  aisle: Aisle;
}

/**
 * Assumed to be in every kitchen, so they are never counted as missing.
 * Saying "you need salt" is noise, and a list that says it about every recipe
 * is worse than no list. The page states this rather than leaving it implied.
 */
export const ASSUMED: MatchRule[] = [
  // "Salt cod" and "Salted pork belly" are not salt.
  { match: ["salt"], except: ["salt cod", "salted pork"] },
  { match: ["black pepper", "white pepper", "peppercorn"] },
  { match: ["water"] },
  { match: ["sugar"] },
  // Only the anonymous frying oils. Olive and sesame oil are things you either
  // have or go out for, so they stay selectable below.
  { match: ["vegetable oil", "neutral oil", "groundnut oil"], exact: ["oil"] },
];

export const PANTRY: PantryItem[] = [
  /* ---------------------------------------------------------- Produce */
  { id: "onion", label: "Onions", aisle: "Produce", match: ["onion"], except: ["spring onion", "onion powder"] },
  { id: "spring-onion", label: "Spring onions", aisle: "Produce", match: ["spring onion", "chives"] },
  { id: "shallot", label: "Shallots", aisle: "Produce", match: ["shallot"] },
  { id: "garlic", label: "Garlic", aisle: "Produce", match: ["garlic"], except: ["garlic powder"] },
  { id: "ginger", label: "Ginger", aisle: "Produce", match: ["ginger"], except: ["ground ginger"] },
  { id: "tomato", label: "Tomatoes", aisle: "Produce", match: ["tomato"] },
  { id: "potato", label: "Potatoes", aisle: "Produce", match: ["potato"], except: ["sweet potato"] },
  { id: "sweet-potato", label: "Sweet potato", aisle: "Produce", match: ["sweet potato", "kūmara", "kumara"] },
  { id: "carrot", label: "Carrots", aisle: "Produce", match: ["carrot"] },
  { id: "bell-pepper", label: "Bell peppers", aisle: "Produce", match: ["bell pepper", "red pepper", "green pepper", "red and green pepper"] },
  { id: "chilli", label: "Fresh chillies", aisle: "Produce", match: ["chilli", "chillies", "scotch bonnet", "bird's eye"], except: ["chilli powder"] },
  { id: "spinach", label: "Spinach & greens", aisle: "Produce", match: ["spinach", "collard greens"] },
  { id: "cabbage", label: "Cabbage", aisle: "Produce", match: ["cabbage"] },
  { id: "lettuce", label: "Lettuce", aisle: "Produce", match: ["lettuce"] },
  { id: "cucumber", label: "Cucumber", aisle: "Produce", match: ["cucumber"] },
  { id: "celery", label: "Celery", aisle: "Produce", match: ["celery"] },
  { id: "aubergine", label: "Aubergine", aisle: "Produce", match: ["aubergine"] },
  { id: "courgette", label: "Courgette", aisle: "Produce", match: ["courgette"] },
  { id: "mushroom", label: "Mushrooms", aisle: "Produce", match: ["mushroom", "shiitake"] },
  { id: "pumpkin", label: "Pumpkin", aisle: "Produce", match: ["pumpkin"] },
  { id: "avocado", label: "Avocado", aisle: "Produce", match: ["avocado"] },
  { id: "beansprouts", label: "Beansprouts", aisle: "Produce", match: ["beansprout"] },
  // Lemongrass is not lemon, and a preserved lemon is not one you have.
  { id: "lemon", label: "Lemons", aisle: "Produce", match: ["lemon"], except: ["lemongrass", "preserved lemon"] },
  { id: "lime", label: "Limes", aisle: "Produce", match: ["lime"], except: ["kaffir lime"] },
  { id: "orange", label: "Oranges", aisle: "Produce", match: ["orange"] },
  { id: "pineapple", label: "Pineapple", aisle: "Produce", match: ["pineapple"] },

  /* ----------------------------------------------------- Meat & fish */
  { id: "chicken", label: "Chicken", aisle: "Meat & fish", match: ["chicken"], except: ["chicken stock"] },
  { id: "beef", label: "Beef", aisle: "Meat & fish", match: ["beef"], except: ["beef stock", "beef or chicken stock"] },
  { id: "pork", label: "Pork", aisle: "Meat & fish", match: ["pork"] },
  { id: "lamb", label: "Lamb", aisle: "Meat & fish", match: ["lamb"] },
  { id: "sausage", label: "Sausage", aisle: "Meat & fish", match: ["sausage", "andouille", "linguiça"] },
  // Fish sauce is a condiment, not a fish.
  { id: "fish", label: "Fish", aisle: "Meat & fish", match: ["fish", "cod", "mackerel", "sea bass"], except: ["fish sauce", "crayfish"] },

  /* --------------------------------------------------- Dairy & eggs */
  { id: "egg", label: "Eggs", aisle: "Dairy & eggs", match: ["egg"], except: ["reggiano"] },
  // Butter beans are a pulse.
  { id: "butter", label: "Butter", aisle: "Dairy & eggs", match: ["butter"], except: ["butter beans", "peanut butter"] },
  { id: "milk", label: "Milk", aisle: "Dairy & eggs", match: ["milk"], except: ["coconut milk"] },
  { id: "cream", label: "Cream", aisle: "Dairy & eggs", match: ["cream"], except: ["ice cream", "cream cheese"] },
  { id: "cheese", label: "Cheese", aisle: "Dairy & eggs", match: ["cheese", "feta", "mozzarella", "parmigiano", "kefalotyri", "sulguni", "twaróg", "curds"] },
  { id: "yoghurt", label: "Yoghurt", aisle: "Dairy & eggs", match: ["yoghurt", "yogurt"] },

  /* ---------------------------------------------------------- Pantry */
  // Rice noodles and rice vinegar are not rice.
  { id: "rice", label: "Rice", aisle: "Pantry", match: ["rice"], except: ["rice noodle", "rice vinegar"] },
  { id: "noodles", label: "Noodles", aisle: "Pantry", match: ["noodle"] },
  { id: "flour", label: "Flour", aisle: "Pantry", match: ["flour"], except: ["cornflour", "floury"] },
  { id: "stock", label: "Stock", aisle: "Pantry", match: ["stock"] },
  { id: "coconut-milk", label: "Coconut milk", aisle: "Pantry", match: ["coconut milk"] },
  { id: "chickpeas", label: "Chickpeas", aisle: "Pantry", match: ["chickpea"] },
  { id: "beans", label: "Beans", aisle: "Pantry", match: ["bean"], except: ["beansprout", "locust bean", "green beans", "vanilla"] },
  { id: "soy-sauce", label: "Soy sauce", aisle: "Pantry", match: ["soy sauce"] },
  { id: "vinegar", label: "Vinegar", aisle: "Pantry", match: ["vinegar"] },
  // Olive oil is not olives.
  { id: "olive-oil", label: "Olive oil", aisle: "Pantry", match: ["olive oil"] },
  { id: "olives", label: "Olives", aisle: "Pantry", match: ["olive"], except: ["olive oil"] },
  { id: "sesame-oil", label: "Sesame oil", aisle: "Pantry", match: ["sesame oil"] },
  { id: "peanuts", label: "Peanuts", aisle: "Pantry", match: ["peanut"] },
  { id: "nuts", label: "Other nuts", aisle: "Pantry", match: ["walnut", "almond", "cashew", "pine nut"] },
  { id: "tahini", label: "Tahini", aisle: "Pantry", match: ["tahini"] },
  { id: "honey", label: "Honey", aisle: "Pantry", match: ["honey"] },
  { id: "coconut", label: "Coconut", aisle: "Pantry", match: ["coconut"], except: ["coconut milk", "coconut oil"] },
  { id: "wine", label: "Wine", aisle: "Pantry", match: ["wine"], except: ["wine vinegar"] },
  { id: "cornflour", label: "Cornflour", aisle: "Pantry", match: ["cornflour"] },
  { id: "fish-sauce", label: "Fish sauce", aisle: "Pantry", match: ["fish sauce"] },
  { id: "mayonnaise", label: "Mayonnaise", aisle: "Pantry", match: ["mayonnaise"] },
  { id: "vanilla", label: "Vanilla", aisle: "Pantry", match: ["vanilla"] },
  { id: "cocoa", label: "Cocoa", aisle: "Pantry", match: ["cocoa"] },
  { id: "bread", label: "Bread", aisle: "Bakery", match: ["bread", "baguette"] },

  /* ---------------------------------------------------------- Spices */
  { id: "cumin", label: "Cumin", aisle: "Spices", match: ["cumin"] },
  { id: "paprika", label: "Paprika", aisle: "Spices", match: ["paprika"] },
  { id: "cayenne", label: "Chilli powder", aisle: "Spices", match: ["cayenne", "chilli powder"] },
  { id: "cinnamon", label: "Cinnamon", aisle: "Spices", match: ["cinnamon"] },
  { id: "turmeric", label: "Turmeric", aisle: "Spices", match: ["turmeric"] },
  { id: "curry-powder", label: "Curry powder", aisle: "Spices", match: ["curry powder", "garam masala"] },
  { id: "bay", label: "Bay leaves", aisle: "Spices", match: ["bay lea"] },
  { id: "coriander", label: "Coriander", aisle: "Spices", match: ["coriander"] },
  { id: "parsley", label: "Parsley", aisle: "Spices", match: ["parsley"] },
  { id: "thyme", label: "Thyme", aisle: "Spices", match: ["thyme"] },
  { id: "basil", label: "Basil", aisle: "Spices", match: ["basil"] },
  { id: "rosemary", label: "Rosemary", aisle: "Spices", match: ["rosemary"] },
  { id: "nutmeg", label: "Nutmeg", aisle: "Spices", match: ["nutmeg"] },
  { id: "oregano", label: "Oregano", aisle: "Spices", match: ["oregano"] },
  { id: "cloves", label: "Cloves", aisle: "Spices", match: ["clove"] },
  { id: "allspice", label: "Allspice", aisle: "Spices", match: ["allspice"] },
  { id: "sesame-seeds", label: "Sesame seeds", aisle: "Spices", match: ["sesame seed"] },
];

export const pantryById = new Map(PANTRY.map((item) => [item.id, item]));
