import { api } from "./client";
import type {
  User,
  Goal,
  Dashboard,
  WeightEntry,
  BodyMeasurement,
  BloodPressureReading,
  VitalsReading,
  VitalRange,
  Food,
  Recipe,
  MealRecord,
  MealPlan,
  MealPlanItem,
  GroceryList,
  PantryItem,
  WorkoutSession,
  Exercise,
  WorkoutProgram,
  WorkoutProgramDay,
  ProgramEnrollment,
  Habit,
  WaterEntry,
  SleepEntry,
  UserPreference,
  AIConversation,
  AIInsight,
  ChartPoint,
  ApiToken,
} from "./types";

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) => api.post<{ accessToken: string; user: User }>("/auth/login", { email, password }),
  register: (email: string, password: string, name?: string) => api.post<{ accessToken: string; user: User }>("/auth/register", { email, password, name }),
  refresh: () => api.post<{ accessToken: string; user: User }>("/auth/refresh"),
  logout: () => api.post<void>("/auth/logout"),
  me: () => api.get<User>("/auth/me"),
};

export const usersApi = {
  updateProfile: (data: Partial<User>) => api.put<User>("/users/me", data),
  changePassword: (currentPassword: string, newPassword: string) => api.put<void>("/users/me/password", { currentPassword, newPassword }),
};

// ---- Personal API tokens (for iOS Shortcuts, scripts, etc.) ----
export const apiTokensApi = {
  list: () => api.get<ApiToken[]>("/tokens"),
  create: (name: string) => api.post<ApiToken & { token: string }>("/tokens", { name }),
  remove: (id: string) => api.delete<void>(`/tokens/${id}`),
};

// ---- Dashboard ----
export const dashboardApi = {
  get: () => api.get<Dashboard>("/dashboard"),
};

// ---- Goals ----
export const goalsApi = {
  get: () => api.get<Goal | null>("/goals"),
  set: (data: Partial<Goal>) => api.put<Goal>("/goals", data),
};

// ---- Weight ----
export const weightApi = {
  list: (query?: { from?: string; to?: string }) => api.get<WeightEntry[]>("/weight", query),
  summary: () => api.get<{ latest: number | null; trend7d: unknown; trend90d: unknown; goalProgress: unknown }>("/weight/summary"),
  create: (data: Partial<WeightEntry>) => api.post<WeightEntry>("/weight", data),
  update: (id: string, data: Partial<WeightEntry>) => api.put<WeightEntry>(`/weight/${id}`, data),
  remove: (id: string) => api.delete<void>(`/weight/${id}`),
};

// ---- Body measurements ----
export const measurementsApi = {
  list: (query?: { from?: string; to?: string }) => api.get<BodyMeasurement[]>("/measurements", query),
  create: (data: Partial<BodyMeasurement>) => api.post<BodyMeasurement>("/measurements", data),
  remove: (id: string) => api.delete<void>(`/measurements/${id}`),
};

// ---- Blood pressure & vitals ----
export const vitalsApi = {
  listBloodPressure: (query?: { from?: string; to?: string }) => api.get<BloodPressureReading[]>("/vitals/blood-pressure", query),
  createBloodPressure: (data: Partial<BloodPressureReading>) => api.post<BloodPressureReading>("/vitals/blood-pressure", data),
  removeBloodPressure: (id: string) => api.delete<void>(`/vitals/blood-pressure/${id}`),
  list: (query?: { from?: string; to?: string }) => api.get<VitalsReading[]>("/vitals", query),
  create: (data: Partial<VitalsReading>) => api.post<VitalsReading>("/vitals", data),
  remove: (id: string) => api.delete<void>(`/vitals/${id}`),
  getRanges: () => api.get<VitalRange | null>("/vitals/ranges"),
  setRanges: (data: Partial<VitalRange>) => api.put<VitalRange>("/vitals/ranges", data),
};

// ---- Foods & recipes ----
export const foodsApi = {
  search: (search?: string, favoritesOnly?: boolean) => api.get<Food[]>("/foods", { search, favorites: favoritesOnly }),
  create: (data: Partial<Food>) => api.post<Food>("/foods", data),
  toggleFavorite: (id: string, isFavorite: boolean) => api.put<Food>(`/foods/${id}/favorite`, { isFavorite }),
  remove: (id: string) => api.delete<void>(`/foods/${id}`),
};

export const recipesApi = {
  list: (search?: string, favoritesOnly?: boolean) => api.get<Recipe[]>("/recipes", { search, favorites: favoritesOnly }),
  get: (id: string) => api.get<Recipe>(`/recipes/${id}`),
  create: (data: Partial<Recipe>) => api.post<Recipe>("/recipes", data),
  update: (id: string, data: Partial<Recipe>) => api.put<Recipe>(`/recipes/${id}`, data),
  toggleFavorite: (id: string, isFavorite: boolean) => api.put<Recipe>(`/recipes/${id}/favorite`, { isFavorite }),
  remove: (id: string) => api.delete<void>(`/recipes/${id}`),
};

// ---- Meals ----
export const mealsApi = {
  list: (query?: { from?: string; to?: string }) => api.get<MealRecord[]>("/meals", query),
  today: () => api.get<{ meals: MealRecord[]; totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number } }>("/meals/today"),
  create: (data: { mealType: string; eatenAt?: string; notes?: string; items: unknown[] }) => api.post<MealRecord>("/meals", data),
  update: (id: string, data: Partial<{ mealType: string; eatenAt: string; notes: string; items: unknown[] }>) => api.put<MealRecord>(`/meals/${id}`, data),
  remove: (id: string) => api.delete<void>(`/meals/${id}`),
};

// ---- Meal plans & grocery ----
export const mealPlansApi = {
  list: () => api.get<MealPlan[]>("/meal-plans"),
  get: (id: string) => api.get<MealPlan>(`/meal-plans/${id}`),
  create: (data: Partial<MealPlan>) => api.post<MealPlan>("/meal-plans", data),
  remove: (id: string) => api.delete<void>(`/meal-plans/${id}`),
  toGroceryList: (id: string) => api.post<GroceryList>(`/meal-plans/${id}/grocery-list`),
  addItemFromFood: (planId: string, data: { foodId: string; dayOffset: number; mealType: string; quantity?: number }) =>
    api.post<MealPlanItem>(`/meal-plans/${planId}/items/from-food`, data),
  moveItem: (planId: string, itemId: string, data: { dayOffset?: number; mealType?: string }) =>
    api.put<MealPlanItem>(`/meal-plans/${planId}/items/${itemId}`, data),
  removeItem: (planId: string, itemId: string) => api.delete<void>(`/meal-plans/${planId}/items/${itemId}`),
};

export const groceryApi = {
  list: () => api.get<GroceryList[]>("/grocery-lists"),
  create: (name?: string) => api.post<GroceryList>("/grocery-lists", { name }),
  addItem: (listId: string, data: { name: string; quantity?: string; category?: string }) => api.post(`/grocery-lists/${listId}/items`, data),
  updateItem: (listId: string, itemId: string, data: Partial<{ purchased: boolean; quantity: string; category: string }>) =>
    api.put(`/grocery-lists/${listId}/items/${itemId}`, data),
  removeItem: (listId: string, itemId: string) => api.delete(`/grocery-lists/${listId}/items/${itemId}`),
  remove: (id: string) => api.delete<void>(`/grocery-lists/${id}`),
};

export const pantryApi = {
  list: () => api.get<PantryItem[]>("/pantry"),
  create: (data: { name: string; quantity?: string }) => api.post<PantryItem>("/pantry", data),
  remove: (id: string) => api.delete<void>(`/pantry/${id}`),
};

// ---- Exercise ----
export const exerciseApi = {
  categories: () => api.get<string[]>("/exercise/categories"),
  list: (query?: { from?: string; to?: string }) => api.get<WorkoutSession[]>("/exercise", query),
  create: (data: Partial<WorkoutSession>) => api.post<WorkoutSession>("/exercise", data),
  remove: (id: string) => api.delete<void>(`/exercise/${id}`),
};

// ---- Habits ----
export const habitsApi = {
  list: () => api.get<Habit[]>("/habits"),
  create: (data: { name: string; icon?: string; targetPerWeek?: number }) => api.post<Habit>("/habits", data),
  remove: (id: string) => api.delete<void>(`/habits/${id}`),
  toggle: (id: string, completed: boolean, date?: string) => api.put(`/habits/${id}/entries`, { completed, date }),
};

// ---- Water / sleep / steps ----
export const waterApi = {
  today: () => api.get<{ totalOz: number; entries: WaterEntry[] }>("/water/today"),
  create: (amountOz: number) => api.post<WaterEntry>("/water", { amountOz }),
  remove: (id: string) => api.delete<void>(`/water/${id}`),
};

export const sleepApi = {
  list: (query?: { from?: string; to?: string }) => api.get<SleepEntry[]>("/sleep", query),
  set: (date: string, hours: number, quality?: number) => api.put<SleepEntry>("/sleep", { date, hours, quality }),
};

export const stepsApi = {
  list: (query?: { from?: string; to?: string }) => api.get<{ date: string; steps: number }[]>("/steps", query),
  set: (date: string, steps: number) => api.put("/steps", { date, steps }),
};

// ---- Exercise library & workout programs ----
export const exerciseLibraryApi = {
  search: (query?: { search?: string; category?: string; muscleGroup?: string; bodyweightOnly?: boolean }) =>
    api.get<Exercise[]>("/exercise-library", query),
  muscleGroups: () => api.get<string[]>("/exercise-library/muscle-groups"),
};

export const programsApi = {
  list: (difficulty?: string) => api.get<{ programs: WorkoutProgram[]; activeProgramId: string | null }>("/programs", { difficulty }),
  get: (id: string) => api.get<WorkoutProgram>(`/programs/${id}`),
  create: (data: Partial<WorkoutProgram>) => api.post<WorkoutProgram>("/programs", data),
  remove: (id: string) => api.delete<void>(`/programs/${id}`),
  enroll: (id: string) => api.post<ProgramEnrollment>(`/programs/${id}/enroll`),
  activeEnrollment: () => api.get<{ enrollment: ProgramEnrollment; day: WorkoutProgramDay | null } | null>("/programs/enrollment/active"),
  completeToday: (data?: { durationMinutes?: number; caloriesBurned?: number; notes?: string }) =>
    api.post<{ session: WorkoutSession; programComplete: boolean; enrollment: ProgramEnrollment | null }>("/programs/enrollment/complete", data ?? {}),
  stopActive: () => api.delete<void>("/programs/enrollment/active"),
};

// ---- Progress / charts / export ----
export const progressApi = {
  chart: (metric: string, period: string) => api.get<{ metric: string; period: string; series: ChartPoint[] }>("/progress/charts", { metric, period }),
  weeklyReport: () => api.get<Record<string, unknown>>("/progress/weekly-report"),
};

export const exportApi = {
  jsonUrl: () => "/api/export/json",
  csvUrl: (dataset: string) => `/api/export/csv/${dataset}`,
  pdfUrl: () => "/api/export/pdf",
};

// ---- Preferences (AI Coach memory) ----
export const preferencesApi = {
  list: (category?: string) => api.get<UserPreference[]>("/preferences", { category }),
  set: (category: string, key: string, value: unknown) => api.put<UserPreference>("/preferences", { category, key, value }),
  remove: (id: string) => api.delete<void>(`/preferences/${id}`),
};

// ---- AI Coach ----
export const aiApi = {
  status: () => api.get<{ provider: string; model: string; enabled: boolean }>("/ai/status"),
  today: () => api.get<{ summary: string; recommendations: string[] }>("/ai/coach/today"),
  conversations: () => api.get<AIConversation[]>("/ai/conversations"),
  conversation: (id: string) => api.get<AIConversation & { messages: unknown[] }>(`/ai/conversations/${id}`),
  chat: (message: string, conversationId?: string) => api.post<{ conversationId: string; reply: string; disclaimer: string }>("/ai/chat", { message, conversationId }),
  insights: (type?: string) => api.get<AIInsight[]>("/ai/insights", { type }),
  generateWeekly: () => api.post<AIInsight>("/ai/insights/weekly"),
  generateMonthly: () => api.post<AIInsight>("/ai/insights/monthly"),
  generateMealPlan: (data: { days?: number; mealsPerDay?: number; snacksPerDay?: number; notes?: string; budget?: string; cookingMinutesMax?: number }) =>
    api.post<MealPlan>("/ai/meal-plan", data),
  substitute: (data: { title: string; calories?: number; protein?: number; carbs?: number; fat?: number }) =>
    api.post<{ alternatives: unknown[] }>("/ai/meal-substitutes", data),
  pantrySuggestions: (notes?: string) => api.post<{ suggestions: unknown[] }>("/ai/pantry-suggestions", { notes }),
  generateWorkout: (data: { equipment?: string[]; minutesAvailable?: number; focus?: string }) => api.post("/ai/workout", data),
};
