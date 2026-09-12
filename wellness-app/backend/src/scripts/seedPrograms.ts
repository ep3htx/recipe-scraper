// Seeds a handful of starter multi-week workout programs as global entries
// (userId: null, same pattern as seeded foods), built from the exercise
// library — run seedExercises.ts first. Idempotent — skips any program that
// already exists by name.
import { prisma } from "../db/prisma";

interface ProgramExerciseInput {
  exerciseName: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
}

interface ProgramDayInput {
  weekNumber: number;
  dayNumber: number;
  title: string;
  notes?: string;
  exercises: ProgramExerciseInput[];
}

interface ProgramInput {
  name: string;
  description: string;
  durationWeeks: number;
  daysPerWeek: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string[];
  days: ProgramDayInput[];
}

function ex(exerciseName: string, opts: Omit<ProgramExerciseInput, "exerciseName">): ProgramExerciseInput {
  return { exerciseName, ...opts };
}

const PROGRAMS: ProgramInput[] = [
  {
    name: "4-Week Bodyweight Foundations",
    description: "A no-equipment, full-body strength foundation you can do anywhere — 3 days a week, building volume and difficulty over 4 weeks.",
    durationWeeks: 4,
    daysPerWeek: 3,
    difficulty: "beginner",
    equipment: ["bodyweight"],
    days: [
      // Week 1
      { weekNumber: 1, dayNumber: 1, title: "Full Body A", exercises: [ex("Bodyweight Squat", { sets: 3, reps: 12 }), ex("Push-Up", { sets: 3, reps: 8 }), ex("Plank", { sets: 3, durationSeconds: 20 }), ex("Glute Bridge", { sets: 3, reps: 12 }), ex("Superman", { sets: 3, reps: 12 })] },
      { weekNumber: 1, dayNumber: 2, title: "Full Body B", exercises: [ex("Reverse Lunge", { sets: 3, reps: 10 }), ex("Incline Push-Up", { sets: 3, reps: 10 }), ex("Mountain Climbers", { sets: 3, reps: 20 }), ex("Wall Sit", { sets: 3, durationSeconds: 20 }), ex("Bird Dog", { sets: 3, reps: 10 })] },
      { weekNumber: 1, dayNumber: 3, title: "Full Body C", exercises: [ex("Jump Squat", { sets: 3, reps: 10 }), ex("Diamond Push-Up", { sets: 3, reps: 6 }), ex("Side Plank", { sets: 3, durationSeconds: 20 }), ex("Step-Up", { sets: 3, reps: 10 }), ex("Bicycle Crunch", { sets: 3, reps: 20 })] },
      // Week 2
      { weekNumber: 2, dayNumber: 1, title: "Full Body A", exercises: [ex("Bodyweight Squat", { sets: 3, reps: 15 }), ex("Push-Up", { sets: 3, reps: 10 }), ex("Plank", { sets: 3, durationSeconds: 30 }), ex("Glute Bridge", { sets: 3, reps: 15 }), ex("Superman", { sets: 3, reps: 15 })] },
      { weekNumber: 2, dayNumber: 2, title: "Full Body B", exercises: [ex("Reverse Lunge", { sets: 3, reps: 12 }), ex("Incline Push-Up", { sets: 3, reps: 12 }), ex("Mountain Climbers", { sets: 3, reps: 25 }), ex("Wall Sit", { sets: 3, durationSeconds: 30 }), ex("Bird Dog", { sets: 3, reps: 12 })] },
      { weekNumber: 2, dayNumber: 3, title: "Full Body C", exercises: [ex("Jump Squat", { sets: 3, reps: 12 }), ex("Diamond Push-Up", { sets: 3, reps: 8 }), ex("Side Plank", { sets: 3, durationSeconds: 30 }), ex("Step-Up", { sets: 3, reps: 12 }), ex("Bicycle Crunch", { sets: 3, reps: 25 })] },
      // Week 3
      { weekNumber: 3, dayNumber: 1, title: "Full Body A", exercises: [ex("Bodyweight Squat", { sets: 4, reps: 15 }), ex("Push-Up", { sets: 4, reps: 10 }), ex("Plank", { sets: 3, durationSeconds: 40 }), ex("Glute Bridge", { sets: 4, reps: 15 }), ex("Superman", { sets: 4, reps: 15 })] },
      { weekNumber: 3, dayNumber: 2, title: "Full Body B", exercises: [ex("Bulgarian Split Squat", { sets: 3, reps: 10 }), ex("Push-Up", { sets: 4, reps: 10 }), ex("Mountain Climbers", { sets: 4, reps: 25 }), ex("Wall Sit", { sets: 3, durationSeconds: 40 }), ex("Bird Dog", { sets: 3, reps: 15 })] },
      { weekNumber: 3, dayNumber: 3, title: "Full Body C", exercises: [ex("Jump Squat", { sets: 4, reps: 12 }), ex("Diamond Push-Up", { sets: 4, reps: 8 }), ex("Side Plank", { sets: 4, durationSeconds: 30 }), ex("Step-Up", { sets: 4, reps: 12 }), ex("Bicycle Crunch", { sets: 4, reps: 25 })] },
      // Week 4
      { weekNumber: 4, dayNumber: 1, title: "Full Body A", exercises: [ex("Bodyweight Squat", { sets: 4, reps: 20 }), ex("Push-Up", { sets: 4, reps: 12 }), ex("Plank", { sets: 4, durationSeconds: 40 }), ex("Glute Bridge", { sets: 4, reps: 20 }), ex("Superman", { sets: 4, reps: 20 })] },
      { weekNumber: 4, dayNumber: 2, title: "Full Body B", exercises: [ex("Bulgarian Split Squat", { sets: 4, reps: 10 }), ex("Push-Up", { sets: 4, reps: 12 }), ex("Mountain Climbers", { sets: 4, reps: 30 }), ex("Wall Sit", { sets: 4, durationSeconds: 40 }), ex("Bird Dog", { sets: 4, reps: 15 })] },
      { weekNumber: 4, dayNumber: 3, title: "Full Body C", exercises: [ex("Burpee", { sets: 4, reps: 10 }), ex("Diamond Push-Up", { sets: 4, reps: 10 }), ex("Side Plank", { sets: 4, durationSeconds: 40 }), ex("Step-Up", { sets: 4, reps: 15 }), ex("Bicycle Crunch", { sets: 4, reps: 30 })] },
    ],
  },
  {
    name: "3-Week Kettlebell Conditioning",
    description: "Two kettlebell sessions a week combining strength and conditioning — needs one kettlebell you can swing comfortably.",
    durationWeeks: 3,
    daysPerWeek: 2,
    difficulty: "intermediate",
    equipment: ["kettlebell"],
    days: [
      { weekNumber: 1, dayNumber: 1, title: "Kettlebell A", exercises: [ex("Kettlebell Goblet Squat", { sets: 3, reps: 12 }), ex("Kettlebell Swing", { sets: 4, reps: 15 }), ex("Kettlebell Row", { sets: 3, reps: 10 }), ex("Kettlebell Deadlift", { sets: 3, reps: 10 })] },
      { weekNumber: 1, dayNumber: 2, title: "Kettlebell B", exercises: [ex("Kettlebell Clean", { sets: 3, reps: 8 }), ex("Kettlebell Overhead Press", { sets: 3, reps: 8 }), ex("Kettlebell Swing", { sets: 4, reps: 15 }), ex("Kettlebell Turkish Get-Up", { sets: 3, reps: 3 })] },
      { weekNumber: 2, dayNumber: 1, title: "Kettlebell A", exercises: [ex("Kettlebell Goblet Squat", { sets: 4, reps: 12 }), ex("Kettlebell Swing", { sets: 4, reps: 18 }), ex("Kettlebell Row", { sets: 4, reps: 10 }), ex("Kettlebell Deadlift", { sets: 4, reps: 10 })] },
      { weekNumber: 2, dayNumber: 2, title: "Kettlebell B", exercises: [ex("Kettlebell Clean", { sets: 4, reps: 8 }), ex("Kettlebell Overhead Press", { sets: 4, reps: 8 }), ex("Kettlebell Swing", { sets: 4, reps: 18 }), ex("Kettlebell Turkish Get-Up", { sets: 3, reps: 4 })] },
      { weekNumber: 3, dayNumber: 1, title: "Kettlebell A", exercises: [ex("Kettlebell Goblet Squat", { sets: 4, reps: 15 }), ex("Kettlebell Swing", { sets: 5, reps: 15 }), ex("Kettlebell Row", { sets: 4, reps: 12 }), ex("Kettlebell Deadlift", { sets: 4, reps: 12 })] },
      { weekNumber: 3, dayNumber: 2, title: "Kettlebell B", exercises: [ex("Kettlebell Snatch", { sets: 3, reps: 6 }), ex("Kettlebell Overhead Press", { sets: 4, reps: 10 }), ex("Kettlebell Swing", { sets: 5, reps: 15 }), ex("Kettlebell Turkish Get-Up", { sets: 3, reps: 4 })] },
    ],
  },
  {
    name: "2-Week Resistance Band Starter",
    description: "A gentle introduction to training with a single resistance band — low impact, easy on the joints, great for home or travel.",
    durationWeeks: 2,
    daysPerWeek: 2,
    difficulty: "beginner",
    equipment: ["resistance_bands"],
    days: [
      { weekNumber: 1, dayNumber: 1, title: "Band A", exercises: [ex("Band Squat", { sets: 3, reps: 15 }), ex("Band Chest Press", { sets: 3, reps: 12 }), ex("Band Row", { sets: 3, reps: 12 }), ex("Band Pull-Apart", { sets: 3, reps: 15 })] },
      { weekNumber: 1, dayNumber: 2, title: "Band B", exercises: [ex("Band Deadlift", { sets: 3, reps: 12 }), ex("Band Bicep Curl", { sets: 3, reps: 12 }), ex("Band Lateral Walk", { sets: 3, reps: 10 }), ex("Band Row", { sets: 3, reps: 12 })] },
      { weekNumber: 2, dayNumber: 1, title: "Band A", exercises: [ex("Band Squat", { sets: 3, reps: 18 }), ex("Band Chest Press", { sets: 3, reps: 15 }), ex("Band Row", { sets: 3, reps: 15 }), ex("Band Pull-Apart", { sets: 3, reps: 18 })] },
      { weekNumber: 2, dayNumber: 2, title: "Band B", exercises: [ex("Band Deadlift", { sets: 3, reps: 15 }), ex("Band Bicep Curl", { sets: 3, reps: 15 }), ex("Band Lateral Walk", { sets: 3, reps: 12 }), ex("Band Row", { sets: 3, reps: 15 })] },
    ],
  },
];

async function main() {
  const exerciseIds = new Map<string, string>();
  const allExercises = await prisma.exercise.findMany({ select: { id: true, name: true } });
  for (const e of allExercises) exerciseIds.set(e.name, e.id);

  let createdPrograms = 0;
  let skippedPrograms = 0;

  for (const program of PROGRAMS) {
    const existing = await prisma.workoutProgram.findFirst({ where: { userId: null, name: program.name } });
    if (existing) {
      skippedPrograms += 1;
      continue;
    }

    await prisma.workoutProgram.create({
      data: {
        userId: null,
        name: program.name,
        description: program.description,
        durationWeeks: program.durationWeeks,
        daysPerWeek: program.daysPerWeek,
        difficulty: program.difficulty,
        equipment: program.equipment,
        days: {
          create: program.days.map((day) => ({
            weekNumber: day.weekNumber,
            dayNumber: day.dayNumber,
            title: day.title,
            notes: day.notes,
            exercises: {
              create: day.exercises.map((exercise, i) => ({
                exerciseId: exerciseIds.get(exercise.exerciseName),
                exerciseName: exercise.exerciseName,
                sets: exercise.sets,
                reps: exercise.reps,
                durationSeconds: exercise.durationSeconds,
                restSeconds: exercise.restSeconds,
                order: i,
              })),
            },
          })),
        },
      },
    });
    createdPrograms += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${createdPrograms} programs (${skippedPrograms} already present, skipped).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
