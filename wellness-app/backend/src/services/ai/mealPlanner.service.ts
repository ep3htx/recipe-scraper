import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { chatWithSafety, isAIEnabled } from "./AIService";
import { getActiveGoal } from "../goals.service";
import type { ChatMessage } from "./types";

interface PlanRequest {
  days?: number;
  mealsPerDay?: number;
  snacksPerDay?: number;
  cookingMinutesMax?: number;
  budget?: "low" | "medium" | "high";
  notes?: string;
}

interface GeneratedMeal {
  dayOffset: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  ingredients?: { name: string; quantity?: string }[];
  instructions?: string[];
}

async function buildUserProfileForMealGen(userId: string) {
  const [goal, prefs, pantry, lastPlan] = await Promise.all([
    getActiveGoal(userId),
    prisma.userPreference.findMany({
      where: { userId, category: { in: ["favorite_foods", "disliked_foods", "dietary_restrictions", "cooking_prefs"] } },
    }),
    prisma.pantryItem.findMany({ where: { userId } }),
    prisma.mealPlan.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, include: { items: true } }),
  ]);

  const byCategory = (cat: string) => prefs.filter((p) => p.category === cat).map((p) => p.key);

  return {
    calorieTarget: goal?.calorieTarget,
    proteinTarget: goal?.proteinTarget,
    carbTarget: goal?.carbTarget,
    fatTarget: goal?.fatTarget,
    fiberTarget: goal?.fiberTarget,
    sodiumTarget: goal?.sodiumTarget,
    favoriteFoods: byCategory("favorite_foods"),
    dislikedFoods: byCategory("disliked_foods"),
    dietaryRestrictions: byCategory("dietary_restrictions"),
    cookingPreferences: byCategory("cooking_prefs"),
    pantryItems: pantry.map((p) => p.name),
    previousMealTitles: lastPlan?.items.map((i) => i.title) ?? [],
  };
}

export async function generateMealPlan(userId: string, req: PlanRequest) {
  if (!(await isAIEnabled())) {
    throw AppError.badRequest(
      "AI meal planning requires an AI provider. Set AI_PROVIDER=openai or AI_PROVIDER=ollama, or build a plan manually.",
      "AI_DISABLED"
    );
  }

  const days = req.days ?? 7;
  const mealsPerDay = req.mealsPerDay ?? 3;
  const snacksPerDay = req.snacksPerDay ?? 1;
  const profile = await buildUserProfileForMealGen(userId);

  const prompt: ChatMessage[] = [
    {
      role: "user",
      content: [
        `Create a ${days}-day meal plan with ${mealsPerDay} meals and ${snacksPerDay} snack(s) per day.`,
        `Nutrition targets per day: ${JSON.stringify({
          calories: profile.calorieTarget,
          protein: profile.proteinTarget,
          carbs: profile.carbTarget,
          fat: profile.fatTarget,
          fiber: profile.fiberTarget,
          sodium: profile.sodiumTarget,
        })}`,
        `Dietary restrictions (must respect): ${JSON.stringify(profile.dietaryRestrictions)}`,
        `Disliked foods (avoid): ${JSON.stringify(profile.dislikedFoods)}`,
        `Favorite foods (prefer when sensible): ${JSON.stringify(profile.favoriteFoods)}`,
        `Cooking preferences: ${JSON.stringify(profile.cookingPreferences)}`,
        req.cookingMinutesMax ? `Keep prep+cook time under about ${req.cookingMinutesMax} minutes per meal.` : "",
        req.budget ? `Target a ${req.budget} grocery budget.` : "",
        profile.pantryItems.length ? `Ingredients already on hand (use where it makes sense): ${JSON.stringify(profile.pantryItems)}` : "",
        profile.previousMealTitles.length ? `Avoid repeating these recent meals: ${JSON.stringify(profile.previousMealTitles.slice(0, 20))}` : "",
        req.notes ? `Additional notes from the user: ${req.notes}` : "",
        "Return ONLY JSON with this exact shape (no markdown, no extra text):",
        `{"days": [{"dayOffset": 0, "meals": [{"mealType": "breakfast", "title": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sodium": number, "ingredients": [{"name": string, "quantity": string}], "instructions": [string]}]}]}`,
        "dayOffset ranges 0 to " + (days - 1) + ". mealType is one of breakfast, lunch, dinner, snack.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const systemPrompt =
    "You are an AI meal-planning assistant inside a personal wellness app. Generate realistic, achievable home-cook meals that fit the user's targets and preferences. Respond with strict JSON only.";

  const raw = await chatWithSafety(systemPrompt, prompt, { jsonMode: true, temperature: 0.6, maxTokens: 3000 });
  const parsed = parsePlanResponse(raw, days);

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + (days - 1) * 86_400_000);

  const plan = await prisma.mealPlan.create({
    data: {
      userId,
      name: `AI Meal Plan — ${startDate.toLocaleDateString()}`,
      startDate,
      endDate,
      generatedBy: "ai",
      items: { create: parsed },
    },
    include: { items: true },
  });
  return plan;
}

function parsePlanResponse(raw: string, days: number): GeneratedMeal[] {
  let data: { days?: { dayOffset: number; meals: GeneratedMeal[] }[] };
  try {
    data = JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw AppError.badRequest("The AI returned a response that couldn't be parsed as a meal plan. Try again.", "AI_PARSE_ERROR");
  }
  const meals: GeneratedMeal[] = [];
  for (const day of data.days ?? []) {
    if (day.dayOffset < 0 || day.dayOffset >= days) continue;
    for (const meal of day.meals ?? []) {
      meals.push({ ...meal, dayOffset: day.dayOffset });
    }
  }
  if (meals.length === 0) throw AppError.badRequest("The AI did not return any meals. Try again.", "AI_PARSE_ERROR");
  return meals;
}

// ---------------------------------------------------------------------------
// Meal substitutions — 3 nutritionally-similar alternatives to one meal.
// ---------------------------------------------------------------------------

export interface SubstituteRequest {
  title: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export async function suggestSubstitutes(userId: string, req: SubstituteRequest) {
  if (!(await isAIEnabled())) {
    throw AppError.badRequest("AI meal substitutions require an AI provider.", "AI_DISABLED");
  }
  const profile = await buildUserProfileForMealGen(userId);
  const prompt: ChatMessage[] = [
    {
      role: "user",
      content: [
        `Suggest 3 alternative meals with similar nutritional characteristics to replace: "${req.title}".`,
        req.calories ? `Target roughly: ${req.calories} kcal, ${req.protein ?? "?"}g protein, ${req.carbs ?? "?"}g carbs, ${req.fat ?? "?"}g fat.` : "",
        `Dietary restrictions (must respect): ${JSON.stringify(profile.dietaryRestrictions)}`,
        `Disliked foods (avoid): ${JSON.stringify(profile.dislikedFoods)}`,
        'Return ONLY JSON: {"alternatives": [{"title": string, "calories": number, "protein": number, "carbs": number, "fat": number, "ingredients": [{"name": string, "quantity": string}], "instructions": [string]}]} with exactly 3 alternatives.',
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  const raw = await chatWithSafety(
    "You suggest meal substitutions with similar nutrition inside a personal wellness app. Respond with strict JSON only.",
    prompt,
    { jsonMode: true, temperature: 0.6 }
  );
  try {
    const parsed = JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ""));
    return parsed.alternatives ?? [];
  } catch {
    throw AppError.badRequest("Couldn't parse substitution suggestions. Try again.", "AI_PARSE_ERROR");
  }
}

// ---------------------------------------------------------------------------
// Pantry assistant — "what can I make tonight?"
// ---------------------------------------------------------------------------

export async function suggestFromPantry(userId: string, extraNotes?: string) {
  if (!(await isAIEnabled())) {
    throw AppError.badRequest("The pantry assistant requires an AI provider.", "AI_DISABLED");
  }
  const [pantry, profile] = await Promise.all([prisma.pantryItem.findMany({ where: { userId } }), buildUserProfileForMealGen(userId)]);
  if (pantry.length === 0) {
    throw AppError.badRequest("Add some items to your pantry first so the assistant has something to work with.", "PANTRY_EMPTY");
  }
  const prompt: ChatMessage[] = [
    {
      role: "user",
      content: [
        `Ingredients on hand: ${JSON.stringify(pantry.map((p) => p.name))}`,
        `Dietary restrictions: ${JSON.stringify(profile.dietaryRestrictions)}`,
        `Disliked foods: ${JSON.stringify(profile.dislikedFoods)}`,
        extraNotes ? `Notes: ${extraNotes}` : "",
        "Suggest up to 3 meals I can make primarily from what's on hand (a few common pantry staples like oil/salt are OK to assume).",
        'Return ONLY JSON: {"suggestions": [{"title": string, "usesFromPantry": [string], "additionalNeeded": [string], "instructions": [string], "calories": number, "protein": number}]}',
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  const raw = await chatWithSafety(
    "You are a pantry-based meal assistant inside a personal wellness app. Respond with strict JSON only.",
    prompt,
    { jsonMode: true, temperature: 0.6 }
  );
  try {
    const parsed = JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ""));
    return parsed.suggestions ?? [];
  } catch {
    throw AppError.badRequest("Couldn't parse pantry suggestions. Try again.", "AI_PARSE_ERROR");
  }
}
