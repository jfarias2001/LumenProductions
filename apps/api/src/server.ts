import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Server as IOServer } from 'socket.io';
import { config } from './config.js';
import { setIO } from './lib/emitter.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import cardRoutes from './routes/cards.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import conversationRoutes from './routes/conversations.js';
import { prisma } from './lib/prisma.js';

const fastify = Fastify({ logger: { level: config.nodeEnv === 'production' ? 'info' : 'debug' } });

// ── Socket.io (shares Fastify's underlying HTTP server) ───────────────────────
const io = new IOServer(fastify.server, {
  cors: { origin: config.corsOrigin, credentials: true },
});
setIO(io);

io.of('/board').on('connection', (socket) => {
  socket.join('board');
  fastify.log.info({ socketId: socket.id }, 'Board client connected');
  socket.on('disconnect', () => {
    fastify.log.info({ socketId: socket.id }, 'Board client disconnected');
  });
});

// ── Plugins ───────────────────────────────────────────────────────────────────
await fastify.register(cookie, { secret: config.jwtAccessSecret });
await fastify.register(cors, { origin: config.corsOrigin, credentials: true });
await fastify.register(helmet, { contentSecurityPolicy: false });
await fastify.register(rateLimit, { max: 200, timeWindow: '1 minute' });
await fastify.register(authPlugin);

// ── Routes (prefixed /api/v1) ──────────────────────────────────────────────
await fastify.register(authRoutes, { prefix: '/api/v1' });
await fastify.register(userRoutes, { prefix: '/api/v1' });
await fastify.register(cardRoutes, { prefix: '/api/v1' });
await fastify.register(analyticsRoutes, { prefix: '/api/v1' });
await fastify.register(aiRoutes, { prefix: '/api/v1' });
await fastify.register(conversationRoutes, { prefix: '/api/v1' });

// ── Health ────────────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  await fastify.listen({ port: config.port, host: config.host });
  fastify.log.info(`API listening on ${config.host}:${config.port}`);
} catch (err) {
  fastify.log.error(err);
  await prisma.$disconnect();
  process.exit(1);
}
