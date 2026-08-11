import type { Cuisine } from "@/lib/types";

export const cuisines: Cuisine[] = [
  {
    slug: "west-african",
    name: "West African",
    region: "africa",
    countrySlugs: ["nigeria"],
    blurb:
      "West African cooking starts with a fried base of pepper, onion and tomato, and gets its depth from smoke and dried seafood rather than stock. Rice, yam and cassava do the carrying. The region argues cheerfully and permanently about who cooks jollof best.",
    staples: ["Scotch bonnet", "Palm oil", "Long-grain rice", "Smoked crayfish", "Yam", "Egusi"],
    methods: ["Frying a pepper base", "One-pot simmering", "Grilling over wood"],
    relatedSlugs: ["ethiopian", "moroccan", "jamaican"],
  },
  {
    slug: "ethiopian",
    name: "Ethiopian",
    region: "africa",
    countrySlugs: ["ethiopia"],
    blurb:
      "Ethiopian cooking is spice-led and communal. Berbere gives color and heat, niter kibbeh gives perfume, and injera provides both the plate and the means of eating. Onions are cooked dry, without fat, for a long time before anything else joins them.",
    staples: ["Berbere", "Niter kibbeh", "Teff", "Red lentils", "Cardamom"],
    methods: ["Dry onion sweating", "Fermenting", "Slow stewing"],
    relatedSlugs: ["west-african", "levantine", "persian"],
  },
  {
    slug: "south-african",
    name: "South African",
    region: "africa",
    countrySlugs: ["south-africa"],
    blurb:
      "South African cooking holds Cape Malay, Dutch, Indian and indigenous traditions in the same pot. Sweet and savory are not kept apart — dried fruit and curry spice belong in a meat dish here.",
    staples: ["Dried apricots", "Curry powder", "Chutney", "Maize meal", "Lamb"],
    methods: ["Baking", "Braaiing", "Slow stewing"],
    relatedSlugs: ["moroccan", "north-indian", "west-african"],
  },
  {
    slug: "moroccan",
    name: "Moroccan",
    region: "africa",
    countrySlugs: ["morocco"],
    blurb:
      "Moroccan cooking is warm rather than hot. The tagine's cone returns steam to the pot so meat braises in almost no liquid, and preserved lemon and olives keep the sweetness of dried fruit in check.",
    staples: ["Preserved lemon", "Ras el hanout", "Saffron", "Dried apricots", "Couscous"],
    methods: ["Tagine steaming", "Slow braising", "Charcoal grilling"],
    relatedSlugs: ["levantine", "persian", "spanish"],
  },
  {
    slug: "japanese",
    name: "Japanese",
    region: "asia",
    countrySlugs: ["japan"],
    blurb:
      "Japanese cooking is exacting about a short list of ingredients. Dashi runs underneath most savory dishes, and the intention is usually to make one ingredient taste more like itself.",
    staples: ["Kombu", "Bonito flakes", "Soy sauce", "Mirin", "Miso"],
    methods: ["Simmering", "Charcoal grilling", "Steaming", "Raw preparation"],
    relatedSlugs: ["korean", "vietnamese", "filipino"],
  },
  {
    slug: "korean",
    name: "Korean",
    region: "asia",
    countrySlugs: ["south-korea"],
    blurb:
      "Korean meals arrive together rather than in courses, and fermentation supplies the backbone. Gochujang, doenjang and kimchi take months to make and seconds to transform a bowl.",
    staples: ["Gochujang", "Gochugaru", "Sesame oil", "Doenjang", "Napa cabbage"],
    methods: ["Fermenting", "Tabletop grilling", "Blanching", "Stir-frying"],
    relatedSlugs: ["japanese", "vietnamese", "north-indian"],
  },
  {
    slug: "vietnamese",
    name: "Vietnamese",
    region: "asia",
    countrySlugs: ["vietnam"],
    blurb:
      "Vietnamese cooking balances fish sauce, lime, sugar and chilli, then hands the last adjustment to the person eating. Broths are clarified rather than thickened, so they stay light after a night on the stove.",
    staples: ["Fish sauce", "Rice noodles", "Thai basil", "Star anise", "Lime"],
    methods: ["Clear-broth simmering", "Charring aromatics", "Grilling", "Pickling"],
    relatedSlugs: ["thai", "filipino", "japanese"],
  },
  {
    slug: "north-indian",
    name: "North Indian",
    region: "asia",
    countrySlugs: ["india"],
    blurb:
      "North Indian cooking builds in stages: whole spices bloomed in fat, aromatics cooked well past the usual stopping point, then tomato reduced until the oil separates and tells you the base is ready.",
    staples: ["Ghee", "Garam masala", "Kasuri methi", "Ginger", "Cream"],
    methods: ["Tempering spices", "Tandoor roasting", "Slow reduction"],
    relatedSlugs: ["persian", "thai", "south-african"],
  },
  {
    slug: "thai",
    name: "Thai",
    region: "asia",
    countrySlugs: ["thailand"],
    blurb:
      "Thai cooking balances hot, sour, salty and sweet, and adjusts at the end rather than the beginning. Curry pastes are pounded, not blended — bruising the aromatics releases oils a blade leaves behind.",
    staples: ["Coconut milk", "Galangal", "Kaffir lime", "Palm sugar", "Fish sauce"],
    methods: ["Pounding pastes", "Cracking coconut cream", "Stir-frying"],
    relatedSlugs: ["vietnamese", "filipino", "north-indian"],
  },
  {
    slug: "filipino",
    name: "Filipino",
    region: "asia",
    countrySlugs: ["philippines"],
    blurb:
      "Filipino cooking is comfortable with sourness. Vinegar and citrus sit at the center of savory dishes, and Spanish, Chinese and Malay influences coexist without much concern for which is which.",
    staples: ["Cane vinegar", "Soy sauce", "Bay leaf", "Black peppercorns", "Garlic"],
    methods: ["Braising in vinegar", "Grilling", "Frying"],
    relatedSlugs: ["vietnamese", "japanese", "cuban"],
  },
  {
    slug: "italian",
    name: "Italian",
    region: "europe",
    countrySlugs: ["italy"],
    blurb:
      "Italian cooking is regional first and short on ingredients by design. The technique carries the dish — how the rice is stirred, how the pasta water is used, when the pan is left alone.",
    staples: ["Carnaroli rice", "Parmigiano Reggiano", "Olive oil", "Saffron", "White wine"],
    methods: ["Mantecatura", "Slow toasting", "Braising"],
    relatedSlugs: ["spanish", "french", "greek"],
  },
  {
    slug: "french",
    name: "French",
    region: "europe",
    countrySlugs: ["france"],
    blurb:
      "French cooking wrote down the technique — the sauces, the cuts, the order of operations. Its desserts are exercises in temperature control, where a few degrees separate silk from scrambled egg.",
    staples: ["Butter", "Double cream", "Vanilla pods", "Egg yolks", "Shallots"],
    methods: ["Bain-marie baking", "Emulsifying", "Caramelizing"],
    relatedSlugs: ["italian", "quebecois", "greek"],
  },
  {
    slug: "greek",
    name: "Greek",
    region: "europe",
    countrySlugs: ["greece"],
    blurb:
      "Greek cooking is generous with olive oil, oregano and lemon. Baked dishes suit a table where people arrive across an hour and eat when they sit down.",
    staples: ["Olive oil", "Oregano", "Feta", "Aubergine", "Cinnamon"],
    methods: ["Baking", "Layering", "Grilling"],
    relatedSlugs: ["levantine", "italian", "moroccan"],
  },
  {
    slug: "polish",
    name: "Polish",
    region: "europe",
    countrySlugs: ["poland"],
    blurb:
      "Polish cooking is cold-weather food — soured cream, dill, cabbage, potato and rye. Dumplings are made in quantity and usually by more than one pair of hands.",
    staples: ["Soured cream", "Dill", "Twaróg", "Potatoes", "Caramelized onion"],
    methods: ["Boiling", "Pan-frying", "Hand-shaping dough"],
    relatedSlugs: ["georgian", "french", "quebecois"],
  },
  {
    slug: "georgian",
    name: "Georgian",
    region: "europe",
    countrySlugs: ["georgia"],
    blurb:
      "Georgian food sits where Europe meets Asia and tastes like it — walnuts, pomegranate and blue fenugreek beside cheese breads and clay-pot stews. Hospitality here is formal enough to have an office: the toastmaster.",
    staples: ["Sulguni", "Walnuts", "Blue fenugreek", "Coriander", "Pomegranate"],
    methods: ["Clay-oven baking", "Stewing", "Grinding nut pastes"],
    relatedSlugs: ["persian", "levantine", "polish"],
  },
  {
    slug: "spanish",
    name: "Spanish",
    region: "europe",
    countrySlugs: ["spain"],
    blurb:
      "Spanish cooking is built on sofrito, saffron and good olive oil, and on eating late. Its signature dishes are cooked in wide shallow pans over fire, so heat reaches the whole surface at once.",
    staples: ["Bomba rice", "Saffron", "Smoked paprika", "Olive oil", "Sweet peppers"],
    methods: ["Open-fire pan cooking", "Building a sofrito", "Toasting rice"],
    relatedSlugs: ["italian", "cuban", "mexican"],
  },
  {
    slug: "mexican",
    name: "Mexican",
    region: "north-america",
    countrySlugs: ["mexico"],
    blurb:
      "Mexican cooking rests on maize and chillies, and on the many ways of drawing flavor from both. Dried chillies are toasted and rehydrated, which is why the sauces taste of fruit and smoke rather than heat alone.",
    staples: ["Nixtamalised maize", "Guajillo chillies", "Achiote", "Lime", "White onion"],
    methods: ["Spit-roasting", "Toasting chillies", "Griddling on a comal"],
    relatedSlugs: ["venezuelan", "peruvian", "cuban"],
  },
  {
    slug: "creole",
    name: "Louisiana Creole",
    region: "north-america",
    countrySlugs: ["united-states"],
    blurb:
      "Creole cooking is West African, French and Spanish technique meeting Gulf ingredients. The roux is cooked darker here than anywhere else, and the trinity of onion, celery and green pepper replaces the French mirepoix.",
    staples: ["Andouille", "Celery", "Green pepper", "Filé powder", "Cayenne"],
    methods: ["Cooking a dark roux", "Slow simmering", "Smoking"],
    relatedSlugs: ["jamaican", "west-african", "cuban"],
  },
  {
    slug: "quebecois",
    name: "Québécois",
    region: "north-america",
    countrySlugs: ["canada"],
    blurb:
      "Québécois cooking is French technique adapted to long winters and very good local dairy. Unfussy, generous, and at its best late at night.",
    staples: ["Cheese curds", "Beef stock", "Potatoes", "Maple syrup"],
    methods: ["Deep-frying", "Pan gravy", "Roasting"],
    relatedSlugs: ["french", "polish", "creole"],
  },
  {
    slug: "brazilian",
    name: "Brazilian",
    region: "south-america",
    countrySlugs: ["brazil"],
    blurb:
      "Brazilian cooking is Portuguese, West African and indigenous at once. Black beans, cassava and orange recur everywhere, and the biggest dishes are built for a table that will stay at it all afternoon.",
    staples: ["Black beans", "Cassava flour", "Orange", "Smoked pork", "Collard greens"],
    methods: ["Long simmering", "Toasting farofa", "Grilling"],
    relatedSlugs: ["venezuelan", "peruvian", "west-african"],
  },
  {
    slug: "peruvian",
    name: "Peruvian",
    region: "south-america",
    countrySlugs: ["peru"],
    blurb:
      "Peruvian cooking draws on the Pacific, the Andes and generations of Japanese and Chinese migration. Acid works as a cooking method here — lime firms raw fish in minutes.",
    staples: ["Limes", "Ají amarillo", "Red onion", "Sweet potato", "Choclo"],
    methods: ["Curing in citrus", "Grilling", "Stewing"],
    relatedSlugs: ["mexican", "brazilian", "japanese"],
  },
  {
    slug: "venezuelan",
    name: "Venezuelan",
    region: "south-america",
    countrySlugs: ["venezuela"],
    blurb:
      "Venezuelan cooking runs on maize. Arepas are eaten at any hour, split and filled with whatever is around — and the fillings have names, and followings.",
    staples: ["Maize flour", "Avocado", "Queso blanco", "Black beans", "Plantain"],
    methods: ["Griddling", "Shredding slow-cooked meat", "Frying"],
    relatedSlugs: ["mexican", "cuban", "brazilian"],
  },
  {
    slug: "levantine",
    name: "Levantine",
    region: "middle-east",
    countrySlugs: ["lebanon", "israel"],
    blurb:
      "Levantine cooking sets out many small dishes rather than one large one. Lemon, olive oil, garlic and tahini are constants, and a kitchen's reputation can rest on how smooth its hummus is.",
    staples: ["Chickpeas", "Tahini", "Bulgur", "Lemon", "Pine nuts", "Sumac"],
    methods: ["Grinding and emulsifying", "Baking", "Charring peppers"],
    relatedSlugs: ["persian", "greek", "moroccan"],
  },
  {
    slug: "persian",
    name: "Persian",
    region: "middle-east",
    countrySlugs: ["iran"],
    blurb:
      "Persian cooking is patient and sweet-sour. Fruit belongs in meat dishes, saffron is used sparingly, and the prize at the end of the rice pot is the crisp golden crust at the bottom.",
    staples: ["Saffron", "Pomegranate molasses", "Walnuts", "Dried limes", "Barberries"],
    methods: ["Slow stewing", "Steaming rice for tahdig", "Grinding nuts"],
    relatedSlugs: ["levantine", "georgian", "north-indian"],
  },
  {
    slug: "jamaican",
    name: "Jamaican",
    region: "caribbean",
    countrySlugs: ["jamaica"],
    blurb:
      "Jamaican cooking is defined by pimento and scotch bonnet, and by pimento wood smoke where it can be had. The heat is real, but it sits behind the aromatics rather than in front of them.",
    staples: ["Pimento", "Scotch bonnet", "Thyme", "Spring onion", "Ackee"],
    methods: ["Overnight marinating", "Smoking", "Grilling"],
    relatedSlugs: ["cuban", "creole", "west-african"],
  },
  {
    slug: "cuban",
    name: "Cuban",
    region: "caribbean",
    countrySlugs: ["cuba"],
    blurb:
      "Cuban cooking is Spanish in its bones with Caribbean and African seasoning. Sofrito, cumin and bay run through nearly everything, and the meat is done when a fork can pull it apart.",
    staples: ["Cumin", "Bay leaf", "Green olives", "Bell peppers", "Black beans"],
    methods: ["Slow braising", "Shredding", "Building a sofrito"],
    relatedSlugs: ["spanish", "jamaican", "venezuelan"],
  },
  {
    slug: "new-zealand",
    name: "New Zealand",
    region: "oceania",
    countrySlugs: ["new-zealand"],
    blurb:
      "New Zealand cooking rests on dairy, lamb and stone fruit, alongside Māori techniques that predate all of it — above all the hāngī, where food steams underground on fire-heated stones.",
    staples: ["Kūmara", "Lamb", "Cream", "Passionfruit", "Manuka honey"],
    methods: ["Earth-oven steaming", "Whipping and baking", "Roasting"],
    relatedSlugs: ["australian", "french", "south-african"],
  },
  {
    slug: "australian",
    name: "Australian",
    region: "oceania",
    countrySlugs: ["australia"],
    blurb:
      "Australian home baking has a strong tea-table tradition, and its best-known sweets were built to travel — sturdy enough for a tin, sweet enough for a crowd.",
    staples: ["Desiccated coconut", "Cocoa", "Butter", "Golden syrup", "Sponge"],
    methods: ["Baking", "Dipping and coating"],
    relatedSlugs: ["new-zealand", "french", "south-african"],
  },
];

export const cuisineBySlug = new Map(cuisines.map((c) => [c.slug, c]));
