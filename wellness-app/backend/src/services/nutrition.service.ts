import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";

export interface MealItemInput {
  foodId?: string;
  recipeId?: string;
  description?: string;
  quantity: number;
  // Required when neither foodId nor recipeId is given (fully custom item).
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

export interface ComputedMealItem {
  foodId?: string;
  recipeId?: string;
  description?: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

// Resolves each meal item to a concrete macro snapshot. For a linked
// Food/Recipe, pulls its per-serving values and scales by quantity. For a
// fully custom / AI-generated item, the client-supplied calories/protein/
// carbs/fat/fiber/sodium are likewise treated as PER-SERVING values (to
// match the shared "Quantity / servings" field in the Add Meal UI) and
// scaled by quantity here -- they are NOT already-totaled amounts.
export async function resolveMealItems(userId: string, items: MealItemInput[]): Promise<ComputedMealItem[]> {
  const resolved: ComputedMealItem[] = [];
  for (const item of items) {
    if (item.foodId) {
      const food = await prisma.food.findFirst({ where: { id: item.foodId, OR: [{ userId }, { userId: null }] } });
      if (!food) throw AppError.notFound(`Food ${item.foodId} not found`);
      resolved.push({
        foodId: food.id,
        description: food.name,
        quantity: item.quantity,
        calories: food.calories * item.quantity,
        protein: food.protein * item.quantity,
        carbs: food.carbs * item.quantity,
        fat: food.fat * item.quantity,
        fiber: food.fiber ? food.fiber * item.quantity : undefined,
        sodium: food.sodium ? food.sodium * item.quantity : undefined,
      });
    } else if (item.recipeId) {
      const recipe = await prisma.recipe.findFirst({ where: { id: item.recipeId, userId } });
      if (!recipe) throw AppError.notFound(`Recipe ${item.recipeId} not found`);
      resolved.push({
        recipeId: recipe.id,
        description: recipe.name,
        quantity: item.quantity,
        calories: (recipe.caloriesPerServing ?? 0) * item.quantity,
        protein: (recipe.proteinPerServing ?? 0) * item.quantity,
        carbs: (recipe.carbsPerServing ?? 0) * item.quantity,
        fat: (recipe.fatPerServing ?? 0) * item.quantity,
        fiber: recipe.fiberPerServing ? recipe.fiberPerServing * item.quantity : undefined,
        sodium: recipe.sodiumPerServing ? recipe.sodiumPerServing * item.quantity : undefined,
      });
    } else {
      if (item.calories == null || item.protein == null || item.carbs == null || item.fat == null) {
        throw AppError.badRequest("Custom meal items require calories, protein, carbs, and fat");
      }
      resolved.push({
        description: item.description,
        quantity: item.quantity,
        calories: item.calories * item.quantity,
        protein: item.protein * item.quantity,
        carbs: item.carbs * item.quantity,
        fat: item.fat * item.quantity,
        fiber: item.fiber ? item.fiber * item.quantity : undefined,
        sodium: item.sodium ? item.sodium * item.quantity : undefined,
      });
    }
  }
  return resolved;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

export function sumNutrition(items: { calories: number; protein: number; carbs: number; fat: number; fiber: number | null; sodium: number | null }[]): NutritionTotals {
  return items.reduce<NutritionTotals>(
    (totals, item) => ({
      calories: totals.calories + item.calories,
      protein: totals.protein + item.protein,
      carbs: totals.carbs + item.carbs,
      fat: totals.fat + item.fat,
      fiber: totals.fiber + (item.fiber ?? 0),
      sodium: totals.sodium + (item.sodium ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
  );
}
