/**
 * Search vocabulary for the public menu.
 *
 * A guest doesn't know how the menu is categorised. Someone hungry at midday
 * types "lunch"; someone avoiding meat types "no meat"; someone after a
 * coffee types "hot drink". None of those necessarily appear in an item's
 * name, description, category or tags — so plain substring matching fails
 * exactly when a casual visitor needs it most.
 *
 * This maps the words people actually type onto the words the menu uses.
 * Kept as data rather than a search library: a café menu is tens of items,
 * and a hand-tuned list beats a generic ranking algorithm at this size.
 */

/** A typed term matches an item if the item contains ANY of these. */
export const SYNONYMS: Record<string, string[]> = {
  // --- meals / time of day ---
  lunch: ["lunch", "sandwich", "soup", "salad", "savoury", "savory", "meal", "main"],
  dinner: ["lunch", "sandwich", "soup", "main", "meal"],
  breakfast: ["breakfast", "morning", "egg", "shakshuka", "bun", "pastry", "croissant", "babka"],
  brunch: ["breakfast", "lunch", "egg", "shakshuka"],
  supper: ["lunch", "soup", "sandwich", "main"],
  meal: ["lunch", "breakfast", "sandwich", "soup", "main"],
  food: ["lunch", "breakfast", "pastry", "cake", "sandwich"],

  // --- drinks ---
  drink: ["coffee", "latte", "espresso", "cappuccino", "americano", "tea", "juice", "cooler", "milk"],
  drinks: ["coffee", "latte", "espresso", "cappuccino", "americano", "tea", "juice", "cooler", "milk"],
  "hot drink": ["coffee", "latte", "espresso", "cappuccino", "americano", "tea", "chai"],
  "cold drink": ["iced", "cooler", "juice", "cold", "smoothie", "milk"],
  beverage: ["coffee", "tea", "juice", "cooler", "drink", "milk"],
  caffeine: ["coffee", "espresso", "latte", "americano", "cappuccino"],
  coffee: ["coffee", "latte", "espresso", "cappuccino", "americano", "flat white", "macchiato"],
  tea: ["tea", "chai", "matcha", "infusion"],
  juice: ["juice", "cooler", "citrus", "orange", "smoothie"],
  smoothie: ["smoothie", "juice", "milk", "shake"],
  iced: ["iced", "cold", "cooler", "ice"],

  // --- sweet ---
  sweet: ["cake", "tart", "pastry", "chocolate", "dessert", "babka", "bun", "basque", "sugar"],
  dessert: ["cake", "tart", "pastry", "chocolate", "basque", "babka"],
  pudding: ["cake", "tart", "dessert", "basque"],
  cake: ["cake", "basque", "tart", "celebration", "babka"],
  pastry: ["pastry", "croissant", "tart", "bun", "babka", "pain"],
  bakery: ["pastry", "croissant", "bun", "bread", "sourdough", "babka"],
  bread: ["bread", "sourdough", "bun", "toast"],
  chocolate: ["chocolate", "babka", "pain au chocolat", "cocoa"],

  // --- dietary ---
  vegetarian: ["vegetarian", "veggie", "meat free"],
  veggie: ["vegetarian", "veggie"],
  vegan: ["vegan", "plant"],
  "no meat": ["vegetarian", "vegan"],
  meatless: ["vegetarian", "vegan"],
  plant: ["vegan", "plant"],
  "gluten free": ["gluten-free", "gluten free", "gf"],
  gf: ["gluten-free", "gluten free"],
  celiac: ["gluten-free", "gluten free"],
  coeliac: ["gluten-free", "gluten free"],
  dairy: ["milk", "cheese", "latte", "cream"],
  nut: ["pistachio", "almond", "nut", "hazelnut"],
  nuts: ["pistachio", "almond", "nut", "hazelnut"],

  // --- how people describe what they want ---
  popular: ["bestseller", "best seller", "favourite", "favorite"],
  best: ["bestseller", "best seller"],
  bestseller: ["bestseller", "best seller"],
  recommend: ["bestseller", "best seller", "special"],
  recommendation: ["bestseller", "best seller", "special"],
  favourite: ["bestseller", "best seller"],
  favorite: ["bestseller", "best seller"],
  new: ["new"],
  special: ["special", "limited", "seasonal", "chef"],
  seasonal: ["seasonal", "limited"],
  available: ["available"],
  snack: ["pastry", "bun", "croissant", "tart", "bite"],
  quick: ["pastry", "bun", "croissant", "coffee"],
  share: ["cake", "celebration", "platter"],
  party: ["celebration", "cake", "order"],
  birthday: ["celebration", "cake"],
  order: ["to order", "celebration", "order"],
};

/**
 * Chips shown under an empty search box.
 * A casual visitor rarely knows what to type — these give them a way in.
 */
export const SUGGESTED_SEARCHES = [
  "Breakfast",
  "Lunch",
  "Hot drink",
  "Something sweet",
  "Vegetarian",
  "Bestsellers",
] as const;

/**
 * Filler words people type that carry no meaning here.
 *
 * Matching is AND across terms, so a single unmatched word zeroes the whole
 * query — "something sweet" found nothing because no item contains
 * "something". Dropping these makes natural phrasing work.
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "some", "something", "anything", "any", "of", "for", "with",
  "and", "or", "to", "in", "on", "me", "my", "i", "want", "need", "looking",
  "would", "like", "get", "have", "is", "are", "do", "does", "you", "your",
  "please", "nice", "good", "really", "very", "bit", "little",
  // question / listing words
  "what", "whats", "which", "who", "how", "about", "there", "here", "got",
  "can", "could", "else", "option", "options", "choice", "choices", "thing",
  "things", "stuff", "kind", "sort", "type", "types", "available", "serve",
  "sell", "make", "made", "order",
]);

/** Lowercase, strip accents, collapse whitespace. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Crude singular/plural folding so "pastries" finds "pastry" and
 * "cakes" finds "cake". Cheaper and more predictable than a real stemmer.
 */
function variants(term: string): string[] {
  const out = new Set([term]);
  if (term.endsWith("ies") && term.length > 4) out.add(`${term.slice(0, -3)}y`);
  if (term.endsWith("es") && term.length > 3) out.add(term.slice(0, -2));
  if (term.endsWith("s") && term.length > 3) out.add(term.slice(0, -1));
  else out.add(`${term}s`);
  return [...out];
}

/**
 * Expands a typed query into the terms that must be satisfied.
 *
 * Returns a list of groups. An item matches when EVERY group has at least
 * one of its alternatives present — so "vegetarian lunch" still narrows,
 * while each word individually searches broadly.
 */
export function expandQuery(query: string): string[][] {
  const q = normalise(query);
  if (!q) return [];

  const groups: string[][] = [];
  let remaining = q;

  // Multi-word phrases first ("hot drink" must not be split into two terms).
  const phrases = Object.keys(SYNONYMS)
    .filter((k) => k.includes(" "))
    .sort((a, b) => b.length - a.length);

  for (const phrase of phrases) {
    if (remaining.includes(phrase)) {
      groups.push(SYNONYMS[phrase]!.map(normalise));
      remaining = remaining.replace(phrase, " ");
    }
  }

  for (const word of remaining.split(" ").filter(Boolean)) {
    if (STOP_WORDS.has(word)) continue;
    const alternatives = new Set<string>();
    for (const v of variants(word)) {
      alternatives.add(v);
      for (const syn of SYNONYMS[v] ?? []) alternatives.add(normalise(syn));
    }
    groups.push([...alternatives]);
  }

  return groups;
}

/** True when every group is satisfied by the haystack. */
export function matches(haystack: string, groups: string[][]): boolean {
  return groups.every((alts) => alts.some((a) => haystack.includes(a)));
}
