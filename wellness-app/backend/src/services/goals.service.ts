import { prisma } from "../db/prisma";

export async function getActiveGoal(userId: string) {
  return prisma.goal.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function setGoal(userId: string, data: Record<string, unknown>) {
  await prisma.goal.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
  return prisma.goal.create({ data: { ...data, userId, isActive: true } as never });
}
