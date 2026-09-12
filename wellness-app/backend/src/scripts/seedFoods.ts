// Seeds a starter set of common foods as global entries (userId: null), so
// every account gets a usable food search from day one instead of an empty
// database. Values are typical USDA-ballpark macros per common serving —
// close enough for day-to-day tracking; users can always add their own
// custom foods for anything more precise (a specific brand, a recipe, etc).
// Sodium is in mg, everything else in grams. Safe to re-run: skips any
// food that already exists by name among the global (userId: null) set.
import { prisma } from "../db/prisma";

interface SeedFood {
  name: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

const FOODS: SeedFood[] = [
  // Proteins
  { name: "Chicken Breast, cooked", servingSize: "4 oz", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74 },
  { name: "Chicken Thigh, cooked, skinless", servingSize: "4 oz", calories: 209, protein: 26, carbs: 0, fat: 10.9, fiber: 0, sodium: 88 },
  { name: "Ground Beef 85/15, cooked", servingSize: "4 oz", calories: 287, protein: 24, carbs: 0, fat: 21, fiber: 0, sodium: 75 },
  { name: "Ground Turkey 93/7, cooked", servingSize: "4 oz", calories: 176, protein: 24, carbs: 0, fat: 8, fiber: 0, sodium: 88 },
  { name: "Salmon, cooked", servingSize: "4 oz", calories: 233, protein: 25, carbs: 0, fat: 14, fiber: 0, sodium: 63 },
  { name: "Tilapia, cooked", servingSize: "4 oz", calories: 145, protein: 30, carbs: 0, fat: 2.5, fiber: 0, sodium: 65 },
  { name: "Shrimp, cooked", servingSize: "4 oz", calories: 120, protein: 26, carbs: 0.5, fat: 1.3, fiber: 0, sodium: 250 },
  { name: "Tuna, canned in water", servingSize: "4 oz", calories: 120, protein: 26, carbs: 0, fat: 1, fiber: 0, sodium: 300 },
  { name: "Egg, whole, large", servingSize: "1 egg", calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0, sodium: 71 },
  { name: "Egg Whites", servingSize: "1/2 cup", calories: 63, protein: 13, carbs: 0.9, fat: 0.2, fiber: 0, sodium: 200 },
  { name: "Pork Chop, cooked", servingSize: "4 oz", calories: 214, protein: 27, carbs: 0, fat: 11, fiber: 0, sodium: 62 },
  { name: "Bacon", servingSize: "2 slices", calories: 86, protein: 6, carbs: 0.2, fat: 6.6, fiber: 0, sodium: 370 },
  { name: "Tofu, firm", servingSize: "4 oz", calories: 88, protein: 10, carbs: 2, fat: 5, fiber: 1, sodium: 9 },
  { name: "Black Beans, cooked", servingSize: "1/2 cup", calories: 114, protein: 7.6, carbs: 20, fat: 0.5, fiber: 7.5, sodium: 1 },
  { name: "Chickpeas, cooked", servingSize: "1/2 cup", calories: 134, protein: 7.3, carbs: 22, fat: 2.1, fiber: 6.2, sodium: 6 },
  { name: "Lentils, cooked", servingSize: "1/2 cup", calories: 115, protein: 9, carbs: 20, fat: 0.4, fiber: 8, sodium: 2 },

  // Dairy
  { name: "Milk, 2%", servingSize: "1 cup", calories: 122, protein: 8, carbs: 12, fat: 4.8, fiber: 0, sodium: 100 },
  { name: "Milk, Skim", servingSize: "1 cup", calories: 83, protein: 8.3, carbs: 12, fat: 0.2, fiber: 0, sodium: 103 },
  { name: "Greek Yogurt, plain nonfat", servingSize: "1 cup", calories: 133, protein: 23, carbs: 9, fat: 0.4, fiber: 0, sodium: 82 },
  { name: "Greek Yogurt, plain 2%", servingSize: "1 cup", calories: 150, protein: 20, carbs: 8, fat: 4, fiber: 0, sodium: 80 },
  { name: "Cottage Cheese, low-fat 2%", servingSize: "1 cup", calories: 163, protein: 28, carbs: 6, fat: 4.3, fiber: 0, sodium: 700 },
  { name: "Cheddar Cheese", servingSize: "1 oz", calories: 113, protein: 7, carbs: 0.4, fat: 9.3, fiber: 0, sodium: 174 },
  { name: "Mozzarella, part-skim", servingSize: "1 oz", calories: 72, protein: 6.9, carbs: 0.8, fat: 4.5, fiber: 0, sodium: 175 },
  { name: "Butter", servingSize: "1 tbsp", calories: 102, protein: 0.1, carbs: 0, fat: 11.5, fiber: 0, sodium: 91 },
  { name: "Cream Cheese", servingSize: "2 tbsp", calories: 100, protein: 1.7, carbs: 1.6, fat: 10, fiber: 0, sodium: 90 },

  // Grains & starches
  { name: "White Rice, cooked", servingSize: "1 cup", calories: 205, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6, sodium: 2 },
  { name: "Brown Rice, cooked", servingSize: "1 cup", calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sodium: 10 },
  { name: "Quinoa, cooked", servingSize: "1 cup", calories: 222, protein: 8.1, carbs: 39, fat: 3.6, fiber: 5.2, sodium: 13 },
  { name: "Oatmeal, cooked (plain)", servingSize: "1 cup", calories: 166, protein: 5.9, carbs: 28, fat: 3.6, fiber: 4, sodium: 9 },
  { name: "Whole Wheat Bread", servingSize: "1 slice", calories: 69, protein: 3.6, carbs: 12, fat: 1.1, fiber: 1.9, sodium: 132 },
  { name: "White Bread", servingSize: "1 slice", calories: 66, protein: 2, carbs: 12.7, fat: 0.8, fiber: 0.6, sodium: 130 },
  { name: "Whole Wheat Pasta, cooked", servingSize: "1 cup", calories: 174, protein: 7.5, carbs: 37, fat: 0.8, fiber: 6.3, sodium: 4 },
  { name: "White Pasta, cooked", servingSize: "1 cup", calories: 220, protein: 8.1, carbs: 43, fat: 1.3, fiber: 2.5, sodium: 1 },
  { name: "Sweet Potato, baked", servingSize: "1 medium", calories: 103, protein: 2.3, carbs: 24, fat: 0.2, fiber: 3.8, sodium: 41 },
  { name: "Russet Potato, baked", servingSize: "1 medium", calories: 168, protein: 4.5, carbs: 37, fat: 0.2, fiber: 3.8, sodium: 24 },
  { name: "Tortilla, flour", servingSize: "1 medium", calories: 146, protein: 4, carbs: 24, fat: 3.5, fiber: 1.4, sodium: 364 },
  { name: "Tortilla, corn", servingSize: "1 small", calories: 52, protein: 1.4, carbs: 10.7, fat: 0.7, fiber: 1.5, sodium: 11 },
  { name: "Bagel, plain", servingSize: "1 medium", calories: 245, protein: 9.6, carbs: 48, fat: 1.5, fiber: 2, sodium: 430 },

  // Fruits
  { name: "Banana", servingSize: "1 medium", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sodium: 1 },
  { name: "Apple", servingSize: "1 medium", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sodium: 2 },
  { name: "Orange", servingSize: "1 medium", calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sodium: 0 },
  { name: "Strawberries", servingSize: "1 cup", calories: 49, protein: 1, carbs: 12, fat: 0.5, fiber: 3, sodium: 2 },
  { name: "Blueberries", servingSize: "1 cup", calories: 84, protein: 1.1, carbs: 21, fat: 0.5, fiber: 3.6, sodium: 1 },
  { name: "Grapes", servingSize: "1 cup", calories: 104, protein: 1.1, carbs: 27, fat: 0.2, fiber: 1.4, sodium: 3 },
  { name: "Avocado", servingSize: "1/2 medium", calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, sodium: 7 },

  // Vegetables
  { name: "Broccoli, cooked", servingSize: "1 cup", calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, sodium: 64 },
  { name: "Spinach, raw", servingSize: "2 cups", calories: 14, protein: 1.7, carbs: 2.2, fat: 0.2, fiber: 1.3, sodium: 47 },
  { name: "Green Beans, cooked", servingSize: "1 cup", calories: 44, protein: 2.4, carbs: 9.9, fat: 0.4, fiber: 4, sodium: 1 },
  { name: "Carrots, raw", servingSize: "1 cup chopped", calories: 52, protein: 1.2, carbs: 12, fat: 0.3, fiber: 3.6, sodium: 88 },
  { name: "Bell Pepper", servingSize: "1 medium", calories: 24, protein: 1, carbs: 5.5, fat: 0.2, fiber: 1.7, sodium: 3 },
  { name: "Tomato", servingSize: "1 medium", calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5, sodium: 6 },
  { name: "Cucumber", servingSize: "1 cup sliced", calories: 16, protein: 0.7, carbs: 3.8, fat: 0.1, fiber: 0.5, sodium: 2 },
  { name: "Mixed Salad Greens", servingSize: "2 cups", calories: 15, protein: 1.2, carbs: 2.6, fat: 0.2, fiber: 1.4, sodium: 20 },

  // Fats & nuts
  { name: "Olive Oil", servingSize: "1 tbsp", calories: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0, sodium: 0 },
  { name: "Peanut Butter", servingSize: "2 tbsp", calories: 188, protein: 8, carbs: 6.9, fat: 16, fiber: 1.9, sodium: 147 },
  { name: "Almonds", servingSize: "1 oz (~23 nuts)", calories: 164, protein: 6, carbs: 6.1, fat: 14.2, fiber: 3.5, sodium: 0 },
  { name: "Walnuts", servingSize: "1 oz", calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5, fiber: 1.9, sodium: 1 },
  { name: "Chia Seeds", servingSize: "1 tbsp", calories: 58, protein: 2, carbs: 5, fat: 3.7, fiber: 4.1, sodium: 0 },

  // Prepared / common meals
  { name: "Whey Protein Shake (water)", servingSize: "1 scoop", calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, sodium: 130 },
  { name: "Hard-Boiled Egg", servingSize: "1 large", calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, sodium: 62 },
  { name: "Grilled Chicken Salad (no dressing)", servingSize: "1 bowl", calories: 285, protein: 38, carbs: 8, fat: 10, fiber: 3, sodium: 320 },
  { name: "Turkey Sandwich", servingSize: "1 sandwich", calories: 320, protein: 28, carbs: 35, fat: 7, fiber: 4, sodium: 900 },
  { name: "Cheeseburger, plain (fast food)", servingSize: "1 sandwich", calories: 300, protein: 15, carbs: 33, fat: 12, fiber: 1, sodium: 680 },
  { name: "Cheese Pizza", servingSize: "1 slice, large", calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2.5, sodium: 640 },
  { name: "French Fries (fast food)", servingSize: "1 medium serving", calories: 365, protein: 4, carbs: 48, fat: 17, fiber: 4.4, sodium: 246 },
  { name: "Chicken, Rice & Broccoli Bowl", servingSize: "1 plate", calories: 420, protein: 40, carbs: 45, fat: 8, fiber: 4, sodium: 300 },

  // Beverages
  { name: "Black Coffee", servingSize: "1 cup", calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sodium: 5 },
  { name: "Coffee with Milk & Sugar", servingSize: "1 cup", calories: 40, protein: 1, carbs: 6, fat: 1.2, fiber: 0, sodium: 12 },
  { name: "Orange Juice", servingSize: "1 cup", calories: 112, protein: 1.7, carbs: 26, fat: 0.5, fiber: 0.5, sodium: 2 },
  { name: "Diet Soda", servingSize: "12 oz can", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 40 },
  { name: "Regular Soda", servingSize: "12 oz can", calories: 140, protein: 0, carbs: 39, fat: 0, fiber: 0, sodium: 45 },
  { name: "Beer, regular", servingSize: "12 oz", calories: 153, protein: 1.6, carbs: 13, fat: 0, fiber: 0, sodium: 14 },
  { name: "Wine, red", servingSize: "5 oz", calories: 125, protein: 0.1, carbs: 3.8, fat: 0, fiber: 0, sodium: 6 },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const food of FOODS) {
    const existing = await prisma.food.findFirst({ where: { userId: null, name: food.name } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.food.create({ data: { ...food, userId: null, isCustom: false, isFavorite: false } });
    created += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${created} foods (${skipped} already present, skipped).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
