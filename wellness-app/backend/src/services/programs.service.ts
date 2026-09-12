import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";

export async function getActiveEnrollment(userId: string) {
  return prisma.programEnrollment.findFirst({
    where: { userId, active: true },
    include: { program: true },
    orderBy: { startedAt: "desc" },
  });
}

// The specific WorkoutProgramDay (with its exercises) the user should do
// right now, based on where their active enrollment says they are.
export async function getTodaysProgramDay(userId: string) {
  const enrollment = await getActiveEnrollment(userId);
  if (!enrollment) return null;
  const day = await prisma.workoutProgramDay.findFirst({
    where: { programId: enrollment.programId, weekNumber: enrollment.currentWeek, dayNumber: enrollment.currentDay },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  return { enrollment, day };
}

export async function enrollInProgram(userId: string, programId: string) {
  const program = await prisma.workoutProgram.findFirst({ where: { id: programId, OR: [{ userId }, { userId: null }] } });
  if (!program) throw AppError.notFound("Program not found");

  return prisma.$transaction(async (tx) => {
    await tx.programEnrollment.updateMany({ where: { userId, active: true }, data: { active: false, completedAt: new Date() } });
    return tx.programEnrollment.create({ data: { userId, programId, currentWeek: 1, currentDay: 1 } });
  });
}

export async function stopActiveEnrollment(userId: string) {
  await prisma.programEnrollment.updateMany({ where: { userId, active: true }, data: { active: false, completedAt: new Date() } });
}

// Logs a WorkoutSession for the enrollment's current day, then advances the
// enrollment to the next day (rolling into the next week, or completing the
// program once past its last week).
export async function completeTodaysWorkout(
  userId: string,
  overrides: { durationMinutes?: number; caloriesBurned?: number; notes?: string }
) {
  const state = await getTodaysProgramDay(userId);
  if (!state || !state.day) throw AppError.badRequest("No active program day to complete", "NO_ACTIVE_PROGRAM");
  const { enrollment, day } = state;

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      type: "strength",
      startedAt: new Date(),
      generatedBy: "user",
      programDayId: day.id,
      durationMinutes: overrides.durationMinutes,
      caloriesBurned: overrides.caloriesBurned,
      notes: overrides.notes ?? day.title,
      sets: {
        create: day.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets,
          reps: ex.reps,
          order: ex.order,
        })),
      },
    },
    include: { sets: true },
  });

  let nextDay = enrollment.currentDay + 1;
  let nextWeek = enrollment.currentWeek;
  const program = await prisma.workoutProgram.findUniqueOrThrow({ where: { id: enrollment.programId } });
  if (nextDay > program.daysPerWeek) {
    nextDay = 1;
    nextWeek += 1;
  }

  if (nextWeek > program.durationWeeks) {
    await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: { active: false, completedAt: new Date() },
    });
    return { session, programComplete: true, enrollment: null };
  }

  const updated = await prisma.programEnrollment.update({
    where: { id: enrollment.id },
    data: { currentWeek: nextWeek, currentDay: nextDay },
  });
  return { session, programComplete: false, enrollment: updated };
}
