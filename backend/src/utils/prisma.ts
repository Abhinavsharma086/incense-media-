import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma =
  global.__prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'minimal',
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Proactive DB connection verification & auto-reconnect ping
const ensureConnection = async () => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch (err: any) {
    console.warn('[Prisma] Database connection dropped or idle, reconnecting...', err?.message);
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      console.log('[Prisma] Successfully reconnected to MySQL.');
    } catch (reconnectErr) {
      console.error('[Prisma] Failed to reconnect to MySQL:', reconnectErr);
    }
  }
};

// Periodic keep-alive ping every 60 seconds to prevent MySQL wait_timeout disconnect
setInterval(ensureConnection, 60000).unref();

export default prisma;

