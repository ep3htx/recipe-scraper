// Seeds popular fast food / restaurant menu items as global entries (userId: null),
// same convention as seedFoods.ts, so meal logging can find real restaurant items
// instead of only generic "fast food" placeholders. Covers 8 chains common in the
// Houston area: Whataburger, Chick-fil-A, Chipotle, McDonald's, Raising Cane's,
// Panera Bread, Taco Bell, and Subway.
//
// Values are taken from each chain's official published nutrition information where
// available (linked per item in comments below); a handful fall back to well-sourced
// third-party nutrition compilations where the official source was unavailable or
// script-rendered -- those are noted inline. Treat as close-enough for day-to-day
// tracking, not lab-verified; menu formulations change over time.
//
// The stored `name` is prefixed with the brand (e.g. "Whataburger - Triple Meat
// Whataburger") unless the item name already starts with the brand, so search (which
// only matches on `name`, not `brand`) finds every item for a given chain. Safe to
// re-run: skips any food that already exists by name among the global (userId: null) set.
import { prisma } from "../db/prisma";

interface SeedFood {
  name: string;
  brand: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

const RAW_FOODS: SeedFood[] = [
  // Whataburger -- official nutrition PDF (wbimageserver.whataburger.com/Nutrition.pdf)
  { name: "Whataburger (#1 Original)", brand: "Whataburger", servingSize: "1 sandwich", calories: 590, protein: 29, carbs: 62, fat: 25, fiber: 4, sodium: 1220 },
  { name: "Whataburger Jr.", brand: "Whataburger", servingSize: "1 sandwich", calories: 310, protein: 14, carbs: 37, fat: 11, fiber: 2, sodium: 750 },
  { name: "Triple Meat Whataburger", brand: "Whataburger", servingSize: "1 sandwich", calories: 1070, protein: 65, carbs: 62, fat: 63, fiber: 4, sodium: 1720 },
  { name: "Bacon & Cheese Whataburger", brand: "Whataburger", servingSize: "1 sandwich", calories: 750, protein: 39, carbs: 62, fat: 37, fiber: 4, sodium: 1910 },
  { name: "Grilled Chicken Sandwich w/ Whatasauce", brand: "Whataburger", servingSize: "1 sandwich", calories: 430, protein: 32, carbs: 44, fat: 14, fiber: 4, sodium: 1030 },
  { name: "Honey BBQ Chicken Strip Sandwich", brand: "Whataburger", servingSize: "1 sandwich", calories: 890, protein: 38, carbs: 87, fat: 42, fiber: 3, sodium: 2430 },
  { name: "Chicken Fajita Taco", brand: "Whataburger", servingSize: "1 taco", calories: 340, protein: 29, carbs: 31, fat: 11, fiber: 3, sodium: 1200 },
  { name: "French Fries", brand: "Whataburger", servingSize: "1 medium order", calories: 400, protein: 4, carbs: 51, fat: 21, fiber: 4, sodium: 260 },
  { name: "Dr Pepper", brand: "Whataburger", servingSize: "1 medium", calories: 380, protein: 0, carbs: 104, fat: 0, fiber: 0, sodium: 40 },
  { name: "Chocolate Shake", brand: "Whataburger", servingSize: "1 small", calories: 440, protein: 10, carbs: 80, fat: 11, fiber: 0, sodium: 390 },

  // Chick-fil-A -- official chick-fil-a.com nutrition pages
  { name: "Chick-fil-A Chicken Sandwich", brand: "Chick-fil-A", servingSize: "1 sandwich (183g)", calories: 420, protein: 29, carbs: 41, fat: 18, fiber: 1, sodium: 1460 },
  { name: "Spicy Chicken Sandwich", brand: "Chick-fil-A", servingSize: "1 sandwich (188g)", calories: 450, protein: 28, carbs: 45, fat: 19, fiber: 1, sodium: 1730 },
  { name: "Grilled Chicken Sandwich", brand: "Chick-fil-A", servingSize: "1 sandwich (206g)", calories: 390, protein: 28, carbs: 45, fat: 11, fiber: 3, sodium: 765 },
  { name: "Chick-fil-A Nuggets", brand: "Chick-fil-A", servingSize: "8 count (113g)", calories: 250, protein: 27, carbs: 11, fat: 11, fiber: 0, sodium: 1210 },
  { name: "Grilled Nuggets", brand: "Chick-fil-A", servingSize: "8 count (95g)", calories: 130, protein: 25, carbs: 1, fat: 3, fiber: 0, sodium: 440 },
  { name: "Waffle Potato Fries", brand: "Chick-fil-A", servingSize: "1 medium (125g)", calories: 420, protein: 5, carbs: 45, fat: 24, fiber: 5, sodium: 240 },
  { name: "Cobb Salad (with grilled chicken)", brand: "Chick-fil-A", servingSize: "1 salad (411g)", calories: 830, protein: 41, carbs: 31, fat: 60, fiber: 5, sodium: 2180 },
  { name: "Mac & Cheese", brand: "Chick-fil-A", servingSize: "1 medium side", calories: 450, protein: 20, carbs: 28, fat: 29, fiber: 3, sodium: 1190 },
  { name: "Chick-fil-A Sauce", brand: "Chick-fil-A", servingSize: "1 dipping container (1 oz)", calories: 140, protein: 0, carbs: 6, fat: 13 },
  { name: "Diet Lemonade", brand: "Chick-fil-A", servingSize: "1 medium (612g)", calories: 60, protein: 0, carbs: 15, fat: 0, fiber: 0, sodium: 10 },

  // Chipotle -- official nutrition PDF; bowl/burrito rows are sums of published component values
  { name: "Chicken (protein)", brand: "Chipotle", servingSize: "4 oz", calories: 180, protein: 32, carbs: 0, fat: 7, fiber: 0, sodium: 310 },
  { name: "Steak (protein)", brand: "Chipotle", servingSize: "4 oz", calories: 150, protein: 21, carbs: 1, fat: 6, fiber: 1, sodium: 330 },
  { name: "Barbacoa (protein)", brand: "Chipotle", servingSize: "4 oz", calories: 170, protein: 24, carbs: 2, fat: 7, fiber: 1, sodium: 530 },
  { name: "Sofritas (protein)", brand: "Chipotle", servingSize: "4 oz", calories: 150, protein: 8, carbs: 9, fat: 10, fiber: 3, sodium: 560 },
  { name: "Cilantro-Lime White Rice", brand: "Chipotle", servingSize: "4 oz", calories: 210, protein: 4, carbs: 40, fat: 4, fiber: 1, sodium: 350 },
  { name: "Black Beans", brand: "Chipotle", servingSize: "4 oz", calories: 130, protein: 8, carbs: 22, fat: 1.5, fiber: 7, sodium: 210 },
  { name: "Guacamole", brand: "Chipotle", servingSize: "4 oz side", calories: 230, protein: 2, carbs: 8, fat: 22, fiber: 6, sodium: 370 },
  { name: "Tortilla Chips", brand: "Chipotle", servingSize: "4 oz (regular bag)", calories: 540, protein: 7, carbs: 73, fat: 25, fiber: 7, sodium: 390 },
  { name: "Chicken Burrito Bowl (chicken, white rice, black beans, fresh tomato salsa, cheese)", brand: "Chipotle", servingSize: "1 bowl", calories: 655, protein: 50, carbs: 67, fat: 20.5, fiber: 9, sodium: 1610 },
  { name: "Steak Burrito (steak, brown rice, pinto beans, cheese, sour cream, flour tortilla)", brand: "Chipotle", servingSize: "1 burrito", calories: 1030, protein: 49, carbs: 111, fat: 39.5, fiber: 14, sodium: 1550 },

  // McDonald's -- mcdonalds.com's calculator is script-rendered; values via fastfoodnutrition.org (cross-checked against known public figures)
  { name: "Big Mac", brand: "McDonald's", servingSize: "1 sandwich", calories: 540, protein: 25, carbs: 46, fat: 28, fiber: 3, sodium: 950 },
  { name: "Quarter Pounder with Cheese", brand: "McDonald's", servingSize: "1 sandwich", calories: 540, protein: 31, carbs: 42, fat: 28, fiber: 3, sodium: 1120 },
  { name: "McDouble", brand: "McDonald's", servingSize: "1 sandwich", calories: 390, protein: 22, carbs: 33, fat: 18, fiber: 2, sodium: 850 },
  { name: "Chicken McNuggets", brand: "McDonald's", servingSize: "10 piece", calories: 440, protein: 24, carbs: 26, fat: 27, fiber: 2, sodium: 840 },
  { name: "French Fries (medium)", brand: "McDonald's", servingSize: "1 medium (117g)", calories: 340, protein: 4, carbs: 44, fat: 16, fiber: 4, sodium: 230 },
  { name: "French Fries (small)", brand: "McDonald's", servingSize: "1 small (71g)", calories: 230, protein: 3, carbs: 29, fat: 11, fiber: 3, sodium: 160 },
  { name: "Filet-O-Fish", brand: "McDonald's", servingSize: "1 sandwich", calories: 390, protein: 17, carbs: 38, fat: 19, fiber: 2, sodium: 560 },
  { name: "Egg McMuffin", brand: "McDonald's", servingSize: "1 sandwich (137g)", calories: 300, protein: 17, carbs: 30, fat: 12, fiber: 2, sodium: 760 },
  { name: "McChicken", brand: "McDonald's", servingSize: "1 sandwich", calories: 410, protein: 15, carbs: 39, fat: 22, fiber: 2, sodium: 590 },
  { name: "Coca-Cola Classic", brand: "McDonald's", servingSize: "1 medium (21 fl oz)", calories: 220, protein: 0, carbs: 59, fat: 0, fiber: 0, sodium: 55 },

  // Raising Cane's -- official PDF blocked by robots.txt; values via fastfoodnutrition.org
  { name: "3 Chicken Finger Combo", brand: "Raising Cane's", servingSize: "1 meal", calories: 1020, protein: 47, carbs: 81, fat: 56, fiber: 10, sodium: 1640 },
  { name: "Box Combo (4 fingers, fries, toast, coleslaw, sauce)", brand: "Raising Cane's", servingSize: "1 meal", calories: 1250, protein: 61, carbs: 97, fat: 68, fiber: 12, sodium: 2130 },
  { name: "Caniac Combo (6 fingers, fries, toast, coleslaw, sauce)", brand: "Raising Cane's", servingSize: "1 meal", calories: 1790, protein: 89, carbs: 124, fat: 104, fiber: 15, sodium: 3160 },
  { name: "Chicken Sandwich", brand: "Raising Cane's", servingSize: "1 sandwich", calories: 780, protein: 48, carbs: 66, fat: 39, fiber: 5, sodium: 1470 },
  { name: "Chicken Fingers", brand: "Raising Cane's", servingSize: "1 finger", calories: 130, protein: 13, carbs: 5, fat: 6, fiber: 1, sodium: 190 },
  { name: "Crinkle-Cut Fries", brand: "Raising Cane's", servingSize: "1 regular basket", calories: 390, protein: 5, carbs: 49, fat: 19, fiber: 7, sodium: 310 },
  { name: "Texas Toast", brand: "Raising Cane's", servingSize: "1 piece", calories: 140, protein: 4, carbs: 23, fat: 4, fiber: 1, sodium: 260 },
  { name: "Coleslaw", brand: "Raising Cane's", servingSize: "1 regular serving", calories: 100, protein: 1, carbs: 11, fat: 6, fiber: 1, sodium: 310 },
  { name: "Cane's Sauce", brand: "Raising Cane's", servingSize: "1 serving (1.5 oz)", calories: 190, protein: 0, carbs: 6, fat: 19, fiber: 0, sodium: 580 },

  // Panera Bread -- official current nutrition guide PDF
  { name: "Broccoli Cheddar Soup", brand: "Panera Bread", servingSize: "1 bowl (~1.5 cups)", calories: 420, protein: 12, carbs: 25, fat: 31, fiber: 1, sodium: 1520 },
  { name: "Bacon Turkey Bravo Sandwich", brand: "Panera Bread", servingSize: "1 whole sandwich", calories: 860, protein: 47, carbs: 80, fat: 39, fiber: 6, sodium: 2430 },
  { name: "Caesar Salad with Chicken", brand: "Panera Bread", servingSize: "1 whole salad", calories: 670, protein: 35, carbs: 27, fat: 47, fiber: 4, sodium: 2620 },
  { name: "Mediterranean Veggie Sandwich", brand: "Panera Bread", servingSize: "1 whole sandwich", calories: 520, protein: 18, carbs: 83, fat: 14, fiber: 8, sodium: 1260 },
  { name: "Green Goddess Cobb Salad with Chicken", brand: "Panera Bread", servingSize: "1 whole salad", calories: 580, protein: 40, carbs: 30, fat: 34, fiber: 7, sodium: 1980 },
  { name: "Cinnamon Crunch Bagel", brand: "Panera Bread", servingSize: "1 bagel", calories: 430, protein: 13, carbs: 78, fat: 7, fiber: 3, sodium: 460 },
  { name: "French Baguette", brand: "Panera Bread", servingSize: "1 slice (~3.5 in)", calories: 190, protein: 6, carbs: 41, fat: 0.5, fiber: 1, sodium: 410 },
  { name: "Fuji Apple Salad with Chicken", brand: "Panera Bread", servingSize: "1 whole salad", calories: 710, protein: 28, carbs: 49, fat: 44, fiber: 5, sodium: 1770 },
  { name: "Homestyle Chicken Noodle Soup", brand: "Panera Bread", servingSize: "1 bowl", calories: 180, protein: 14, carbs: 21, fat: 4.5, fiber: 0, sodium: 1570 },
  { name: "Broccoli Cheddar Mac & Cheese", brand: "Panera Bread", servingSize: "1 bowl (~2 cups)", calories: 980, protein: 32, carbs: 68, fat: 64, fiber: 0, sodium: 2300 },

  // Taco Bell -- tacobell.com is script-rendered; values via fastfoodnutrition.org
  { name: "Crunchy Taco", brand: "Taco Bell", servingSize: "1 taco", calories: 170, protein: 8, carbs: 13, fat: 9, fiber: 3, sodium: 310 },
  { name: "Soft Taco - Beef", brand: "Taco Bell", servingSize: "1 taco", calories: 180, protein: 9, carbs: 17, fat: 9, sodium: 500 },
  { name: "Bean Burrito", brand: "Taco Bell", servingSize: "1 burrito", calories: 350, protein: 13, carbs: 54, fat: 9, fiber: 11, sodium: 1000 },
  { name: "Cheesy Gordita Crunch", brand: "Taco Bell", servingSize: "1 gordita", calories: 500, protein: 20, carbs: 41, fat: 28, fiber: 5, sodium: 850 },
  { name: "Crunchwrap Supreme", brand: "Taco Bell", servingSize: "1 crunchwrap", calories: 530, protein: 16, carbs: 71, fat: 21, sodium: 1200 },
  { name: "Chalupa Supreme - Beef", brand: "Taco Bell", servingSize: "1 chalupa", calories: 350, protein: 13, carbs: 33, fat: 18, sodium: 560 },
  { name: "Nacho Cheese Doritos Locos Taco", brand: "Taco Bell", servingSize: "1 taco", calories: 170, protein: 8, carbs: 13, fat: 9, fiber: 3, sodium: 360 },
  { name: "Beefy 5-Layer Burrito", brand: "Taco Bell", servingSize: "1 burrito", calories: 490, protein: 18, carbs: 63, fat: 18, sodium: 1250 },
  { name: "Nachos BellGrande - Beef", brand: "Taco Bell", servingSize: "1 basket", calories: 740, protein: 16, carbs: 82, fat: 38, sodium: 1050 },
  { name: "Mexican Pizza", brand: "Taco Bell", servingSize: "1 pizza", calories: 530, protein: 19, carbs: 48, fat: 29, fiber: 9, sodium: 860 },

  // Subway -- official PDF links robots-blocked; most values via healthsteward.com (older compilation), a few via fastfoodnutrition.org
  { name: "Turkey Breast", brand: "Subway", servingSize: "1 six-inch sub", calories: 280, protein: 18, carbs: 46, fat: 4.5, fiber: 4, sodium: 1010 },
  { name: "Italian B.M.T.", brand: "Subway", servingSize: "1 six-inch sub", calories: 450, protein: 23, carbs: 47, fat: 21, fiber: 4, sodium: 1790 },
  { name: "Subway Club", brand: "Subway", servingSize: "1 six-inch sub (254g)", calories: 460, protein: 29, carbs: 41, fat: 20, sodium: 1200 },
  { name: "Tuna", brand: "Subway", servingSize: "1 six-inch sub", calories: 430, protein: 20, carbs: 46, fat: 19, fiber: 4, sodium: 1070 },
  { name: "Meatball Marinara", brand: "Subway", servingSize: "1 six-inch sub", calories: 500, protein: 23, carbs: 52, fat: 22, fiber: 5, sodium: 1180 },
  { name: "Cold Cut Combo", brand: "Subway", servingSize: "1 six-inch sub", calories: 410, protein: 21, carbs: 46, fat: 17, fiber: 4, sodium: 1570 },
  { name: "Veggie Delite", brand: "Subway", servingSize: "1 six-inch sub", calories: 230, protein: 9, carbs: 44, fat: 3, fiber: 4, sodium: 510 },
  { name: "Rotisserie-Style Chicken", brand: "Subway", servingSize: "1 six-inch sub (233g)", calories: 300, protein: 23, carbs: 39, fat: 6, sodium: 710 },
  { name: "Steak & Cheese", brand: "Subway", servingSize: "1 six-inch sub", calories: 360, protein: 24, carbs: 47, fat: 10, fiber: 5, sodium: 1090 },
  { name: "Black Forest Ham", brand: "Subway", servingSize: "1 six-inch sub (219g)", calories: 270, protein: 18, carbs: 41, fat: 4, sodium: 810 },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const food of RAW_FOODS) {
    const name = food.name.toLowerCase().startsWith(food.brand.toLowerCase())
      ? food.name
      : `${food.brand} - ${food.name}`;

    const existing = await prisma.food.findFirst({ where: { userId: null, name } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.food.create({
      data: {
        name,
        brand: food.brand,
        servingSize: food.servingSize,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber ?? null,
        sodium: food.sodium ?? null,
        userId: null,
        isCustom: false,
        isFavorite: false,
      },
    });
    created += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${created} restaurant foods (${skipped} already present, skipped).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
