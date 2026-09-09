import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./db/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Wellness backend listening on :${env.PORT} (${env.NODE_ENV}, AI_PROVIDER=${env.AI_PROVIDER})`);
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
