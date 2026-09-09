// Best-effort keyword categorization so an AI- or user-generated ingredient
// list lands in a sensible grocery category without needing a full food
// taxonomy. Falls back to "other" when nothing matches.

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: [
    "lettuce", "spinach", "kale", "broccoli", "pepper", "onion", "garlic", "tomato",
    "cucumber", "carrot", "potato", "apple", "banana", "berry", "berries", "avocado",
    "lemon", "lime", "herb", "cilantro", "parsley", "basil", "mushroom", "zucchini",
  ],
  meat: ["chicken", "beef", "turkey", "pork", "steak", "bacon", "sausage", "ground", "fish", "salmon", "shrimp", "tilapia", "tuna"],
  dairy: ["milk", "cheese", "yogurt", "butter", "cream", "cottage cheese"],
  frozen: ["frozen"],
  grains: ["rice", "quinoa", "oats", "oatmeal", "pasta", "bread", "tortilla", "cereal", "flour"],
  canned: ["canned", "can of", "beans (canned)", "diced tomatoes"],
  spices: ["salt", "pepper (spice)", "cumin", "paprika", "oregano", "cinnamon", "spice", "seasoning"],
  beverages: ["water", "juice", "soda", "coffee", "tea"],
  pantry: ["oil", "vinegar", "sauce", "honey", "peanut butter", "nuts", "seeds", "beans", "lentils", "broth", "stock", "sugar"],
};

export function categorize(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "other";
}
