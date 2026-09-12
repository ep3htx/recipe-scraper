export interface User {
  id: string;
  email: string;
  name?: string | null;
  heightInches?: number | null;
  unitSystem?: "imperial" | "metric";
  theme?: "light" | "dark" | "system";
}

export interface Goal {
  id: string;
  startingWeight?: number | null;
  goalWeight?: number | null;
  targetDate?: string | null;
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  carbTarget?: number | null;
  fatTarget?: number | null;
  fiberTarget?: number | null;
  sodiumTarget?: number | null;
  waterTargetOz?: number | null;
  stepsTarget?: number | null;
  workoutsPerWeek?: number | null;
  exerciseMinutesTarget?: number | null;
}

export interface TrendSummary {
  latest: number | null;
  average: number | null;
  changeAbsolute: number | null;
  changePct: number | null;
  slopePerDay: number | null;
  isPlateau: boolean;
}

export interface Dashboard {
  greeting: string;
  weight: {
    current: number | null;
    starting: number | null;
    goal: number | null;
    bmi: number | null;
    poundsLost: number | null;
    poundsRemaining: number | null;
    progressPct: number | null;
    trend7d: TrendSummary;
  };
  bodyMeasurement: { waist?: number | null; chest?: number | null; hips?: number | null; recordedAt?: string } | null;
  bloodPressure: { systolic: number; diastolic: number; pulse?: number | null; recordedAt: string } | null;
  vitals: { restingHeartRate?: number | null; bloodOxygen?: number | null; recordedAt?: string } | null;
  steps: { today: number; target: number | null };
  nutrition: {
    totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number };
    targets: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; sodium: number | null };
    meals: MealRecord[];
  };
  water: { totalOz: number; targetOz: number | null };
  sleep: { hours: number; quality?: number | null } | null;
  workouts: WorkoutSession[];
  habits: { id: string; name: string; icon?: string | null; completed: boolean; streak: number }[];
  priorities: { label: string; done: boolean }[];
}

export interface WeightEntry {
  id: string;
  weight: number;
  bodyFatPct?: number | null;
  recordedAt: string;
  notes?: string | null;
}

export interface BodyMeasurement {
  id: string;
  waist?: number | null;
  chest?: number | null;
  hips?: number | null;
  neck?: number | null;
  arm?: number | null;
  thigh?: number | null;
  recordedAt: string;
  notes?: string | null;
}

export interface BloodPressureReading {
  id: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  recordedAt: string;
  notes?: string | null;
  flags?: { field: string; outOfRange: boolean }[];
}

export interface VitalsReading {
  id: string;
  restingHeartRate?: number | null;
  bloodOxygen?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  recordedAt: string;
  notes?: string | null;
}

export interface VitalRange {
  systolicMin?: number | null;
  systolicMax?: number | null;
  diastolicMin?: number | null;
  diastolicMax?: number | null;
  pulseMin?: number | null;
  pulseMax?: number | null;
  restingHRMin?: number | null;
  restingHRMax?: number | null;
  spo2Min?: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  respiratoryRateMin?: number | null;
  respiratoryRateMax?: number | null;
}

export interface Food {
  id: string;
  name: string;
  brand?: string | null;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sodium?: number | null;
  isFavorite: boolean;
  isCustom: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string | null;
  servings: number;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  ingredients: { name: string; quantity?: string; unit?: string }[];
  instructions: string[];
  caloriesPerServing?: number | null;
  proteinPerServing?: number | null;
  carbsPerServing?: number | null;
  fatPerServing?: number | null;
  fiberPerServing?: number | null;
  sodiumPerServing?: number | null;
  tags: string[];
  isFavorite: boolean;
}

export interface MealItem {
  id?: string;
  foodId?: string;
  recipeId?: string;
  description?: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sodium?: number | null;
}

export interface MealRecord {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  eatenAt: string;
  notes?: string | null;
  items: MealItem[];
}

export interface MealPlanItem {
  id: string;
  dayOffset: number;
  mealType: string;
  title: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sodium?: number | null;
  ingredients?: { name: string; quantity?: string }[] | null;
  instructions?: string[] | null;
}

export interface MealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  generatedBy: string;
  items: MealPlanItem[];
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity?: string | null;
  category: string;
  purchased: boolean;
}

export interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
}

export interface PantryItem {
  id: string;
  name: string;
  quantity?: string | null;
}

export interface WorkoutSet {
  id?: string;
  exerciseName: string;
  sets?: number | null;
  reps?: number | null;
  resistance?: string | null;
}

export interface WorkoutSession {
  id: string;
  type: string;
  startedAt: string;
  durationMinutes?: number | null;
  distanceMiles?: number | null;
  caloriesBurned?: number | null;
  notes?: string | null;
  sets: WorkoutSet[];
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment?: string | null;
  muscleGroup?: string | null;
  description?: string | null;
}

export interface WorkoutProgramExercise {
  id: string;
  exerciseId?: string | null;
  exerciseName: string;
  sets?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
  restSeconds?: number | null;
  order: number;
}

export interface WorkoutProgramDay {
  id: string;
  programId: string;
  weekNumber: number;
  dayNumber: number;
  title: string;
  notes?: string | null;
  exercises: WorkoutProgramExercise[];
}

export interface WorkoutProgram {
  id: string;
  userId?: string | null;
  name: string;
  description?: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string[];
  days?: WorkoutProgramDay[];
  _count?: { days: number };
}

export interface ProgramEnrollment {
  id: string;
  userId: string;
  programId: string;
  startedAt: string;
  currentWeek: number;
  currentDay: number;
  active: boolean;
  completedAt?: string | null;
  program?: WorkoutProgram;
}

export interface Habit {
  id: string;
  name: string;
  icon?: string | null;
  isBuiltIn: boolean;
  targetPerWeek: number;
  streak: number;
  weeklyRate: number;
  monthlyRate: number;
}

export interface WaterEntry {
  id: string;
  amountOz: number;
  recordedAt: string;
}

export interface SleepEntry {
  id: string;
  date: string;
  hours: number;
  quality?: number | null;
  notes?: string | null;
}

export interface UserPreference {
  id: string;
  category: string;
  key: string;
  value: unknown;
  source: string;
}

export interface AIConversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  type: "daily" | "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  content: { summary: string; wins: string[]; improvements: string[]; focus: string };
}

export interface ApiToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface ChartPoint {
  date: string;
  value?: number;
  systolic?: number;
  diastolic?: number;
}
