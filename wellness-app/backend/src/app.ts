import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { apiLimiter } from "./middleware/rateLimit";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import goalsRoutes from "./routes/goals.routes";
import weightRoutes from "./routes/weight.routes";
import measurementsRoutes from "./routes/measurements.routes";
import vitalsRoutes from "./routes/vitals.routes";
import foodsRoutes from "./routes/foods.routes";
import recipesRoutes from "./routes/recipes.routes";
import mealsRoutes from "./routes/meals.routes";
import mealPlansRoutes from "./routes/mealPlans.routes";
import groceryRoutes from "./routes/grocery.routes";
import pantryRoutes from "./routes/pantry.routes";
import exerciseRoutes from "./routes/exercise.routes";
import habitsRoutes from "./routes/habits.routes";
import waterRoutes from "./routes/water.routes";
import sleepRoutes from "./routes/sleep.routes";
import stepsRoutes from "./routes/steps.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import progressRoutes from "./routes/progress.routes";
import exportRoutes from "./routes/export.routes";
import preferencesRoutes from "./routes/preferences.routes";
import aiRoutes from "./routes/ai.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // behind Nginx
  app.use(helmet());
  app.use(
    cors({
      origin: env.PUBLIC_ORIGIN ?? true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use("/api", apiLimiter);

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/goals", goalsRoutes);
  app.use("/api/weight", weightRoutes);
  app.use("/api/measurements", measurementsRoutes);
  app.use("/api/vitals", vitalsRoutes);
  app.use("/api/foods", foodsRoutes);
  app.use("/api/recipes", recipesRoutes);
  app.use("/api/meals", mealsRoutes);
  app.use("/api/meal-plans", mealPlansRoutes);
  app.use("/api/grocery-lists", groceryRoutes);
  app.use("/api/pantry", pantryRoutes);
  app.use("/api/exercise", exerciseRoutes);
  app.use("/api/habits", habitsRoutes);
  app.use("/api/water", waterRoutes);
  app.use("/api/sleep", sleepRoutes);
  app.use("/api/steps", stepsRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/export", exportRoutes);
  app.use("/api/preferences", preferencesRoutes);
  app.use("/api/ai", aiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
