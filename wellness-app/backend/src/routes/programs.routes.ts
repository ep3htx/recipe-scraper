import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { getActiveEnrollment, getTodaysProgramDay, enrollInProgram, stopActiveEnrollment, completeTodaysWorkout } from "../services/programs.service";

const router = Router();
router.use(requireAuth);

const programExerciseSchema = z.object({
  exerciseId: z.string().uuid().optional(),
  exerciseName: z.string().min(1).max(150),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  restSeconds: z.number().int().min(0).optional(),
  order: z.number().int().min(0).default(0),
});

const programDaySchema = z.object({
  weekNumber: z.number().int().min(1),
  dayNumber: z.number().int().min(1).max(7),
  title: z.string().min(1).max(150),
  notes: z.string().max(2000).optional(),
  exercises: z.array(programExerciseSchema).default([]),
});

const programSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  daysPerWeek: z.number().int().min(1).max(7),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  equipment: z.array(z.string()).default([]),
  days: z.array(programDaySchema).default([]),
});

// ---- Enrollment (must come before /:id so "enrollment" isn't read as an id) ----

router.get(
  "/enrollment/active",
  asyncHandler(async (req: Request, res: Response) => {
    const state = await getTodaysProgramDay(req.userId!);
    if (!state) return res.json(null);
    res.json(state);
  })
);

router.post(
  "/enrollment/complete",
  validateBody(z.object({ durationMinutes: z.number().int().positive().optional(), caloriesBurned: z.number().int().min(0).optional(), notes: z.string().max(2000).optional() })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await completeTodaysWorkout(req.userId!, req.body);
    res.json(result);
  })
);

router.delete(
  "/enrollment/active",
  asyncHandler(async (req: Request, res: Response) => {
    await stopActiveEnrollment(req.userId!);
    res.status(204).end();
  })
);

// ---- Programs ----

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const difficulty = typeof req.query.difficulty === "string" ? req.query.difficulty : undefined;
    const programs = await prisma.workoutProgram.findMany({
      where: {
        OR: [{ userId: req.userId! }, { userId: null }],
        ...(difficulty ? { difficulty } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { days: true } } },
    });
    const activeEnrollment = await getActiveEnrollment(req.userId!);
    res.json({ programs, activeProgramId: activeEnrollment?.programId ?? null });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const program = await prisma.workoutProgram.findFirst({
      where: { id: req.params.id, OR: [{ userId: req.userId! }, { userId: null }] },
      include: { days: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }] } },
    });
    if (!program) throw AppError.notFound("Program not found");
    res.json(program);
  })
);

router.post(
  "/",
  validateBody(programSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { days, ...programData } = req.body;
    const program = await prisma.workoutProgram.create({
      data: {
        ...programData,
        userId: req.userId!,
        days: {
          create: days.map((day: z.infer<typeof programDaySchema>) => ({
            weekNumber: day.weekNumber,
            dayNumber: day.dayNumber,
            title: day.title,
            notes: day.notes,
            exercises: { create: day.exercises },
          })),
        },
      },
      include: { days: { include: { exercises: true } } },
    });
    res.status(201).json(program);
  })
);

router.put(
  "/:id",
  validateBody(programSchema.partial().extend({ days: z.array(programDaySchema).optional() })),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.workoutProgram.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Program not found, or it's a built-in program you don't own");
    const { days, ...programData } = req.body;

    if (days) {
      await prisma.workoutProgramDay.deleteMany({ where: { programId: existing.id } });
      await prisma.workoutProgram.update({
        where: { id: existing.id },
        data: {
          ...programData,
          days: {
            create: days.map((day: z.infer<typeof programDaySchema>) => ({
              weekNumber: day.weekNumber,
              dayNumber: day.dayNumber,
              title: day.title,
              notes: day.notes,
              exercises: { create: day.exercises },
            })),
          },
        },
      });
    } else if (Object.keys(programData).length > 0) {
      await prisma.workoutProgram.update({ where: { id: existing.id }, data: programData });
    }

    const program = await prisma.workoutProgram.findUnique({
      where: { id: existing.id },
      include: { days: { include: { exercises: true }, orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }] } },
    });
    res.json(program);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.workoutProgram.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw AppError.notFound("Program not found, or it's a built-in program you don't own");
    await prisma.workoutProgram.delete({ where: { id: existing.id } });
    res.status(204).end();
  })
);

router.post(
  "/:id/enroll",
  asyncHandler(async (req: Request, res: Response) => {
    const enrollment = await enrollInProgram(req.userId!, req.params.id);
    res.status(201).json(enrollment);
  })
);

export default router;
