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

// Values from each brand's official nutrition facts panel (dry/uncooked serving,
// as prepared with water -- no milk/sugar added), Sept 2026.
const RAW_FOODS: SeedFood[] = [
  { name: "Original 2 1/2 Minute Cream of Wheat", brand: "Cream of Wheat", servingSize: "3 tbsp dry (33g)", calories: 120, protein: 3.0, carbs: 25.0, fat: 0.0, fiber: 1.0, sodium: 100 },
  { name: "Instant Cream of Wheat, Original", brand: "Cream of Wheat", servingSize: "1 packet (28g)", calories: 100, protein: 3.0, carbs: 20.0, fat: 0.0, fiber: 1.0, sodium: 170 },
  { name: "Whole Grain 2 1/2 Minute Cream of Wheat", brand: "Cream of Wheat", servingSize: "3 tbsp dry (33g)", calories: 110, protein: 4.0, carbs: 24.0, fat: 0.0, fiber: 3.0, sodium: 95 },
  { name: "Original Hot Wheat Cereal", brand: "Malt-O-Meal", servingSize: "3 tbsp dry (35g)", calories: 130, protein: 4.0, carbs: 27.0, fat: 0.0, fiber: 1.0, sodium: 0 },
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
  console.log(`Seeded ${created} hot cereal foods (${skipped} already present, skipped).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
