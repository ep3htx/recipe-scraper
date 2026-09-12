-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "description" TEXT,
ADD COLUMN     "muscle_group" TEXT;

-- AlterTable
ALTER TABLE "workout_sessions" ADD COLUMN     "program_day_id" TEXT;

-- CreateTable
CREATE TABLE "workout_programs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_weeks" INTEGER NOT NULL,
    "days_per_week" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'beginner',
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_program_days" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "day_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "workout_program_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_program_exercises" (
    "id" TEXT NOT NULL,
    "program_day_id" TEXT NOT NULL,
    "exercise_id" TEXT,
    "exercise_name" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "duration_seconds" INTEGER,
    "rest_seconds" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "workout_program_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_week" INTEGER NOT NULL DEFAULT 1,
    "current_day" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "program_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_program_days_program_id_week_number_day_number_idx" ON "workout_program_days"("program_id", "week_number", "day_number");

-- CreateIndex
CREATE INDEX "workout_program_exercises_program_day_id_idx" ON "workout_program_exercises"("program_day_id");

-- CreateIndex
CREATE INDEX "program_enrollments_user_id_active_idx" ON "program_enrollments"("user_id", "active");

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "workout_program_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_programs" ADD CONSTRAINT "workout_programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_days" ADD CONSTRAINT "workout_program_days_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "workout_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_exercises" ADD CONSTRAINT "workout_program_exercises_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "workout_program_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_exercises" ADD CONSTRAINT "workout_program_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "workout_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
