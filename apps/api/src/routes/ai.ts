/**
 * AI routes — stubbed endpoints that return 503 when no provider configured.
 * Full implementation in Fase 2 (SPEC-001 §15).
 * Estructura presente para o frontend já poder integrar.
 */
import type { FastifyInstance } from 'fastify';
import { requirePermission } from '../plugins/auth.js';
import { prisma } from '../lib/prisma.js';

const AI_STUB = { error: { code: 'AI_NOT_CONFIGURED', message: 'Camada de IA será implementada na Fase 2. Preencha manualmente.' } };

export default async function aiRoutes(fastify: FastifyInstance) {
  const guard = { preHandler: [requirePermission('useAI')] };

  fastify.post('/ai/prospect', guard, async (_req, reply) => reply.status(503).send(AI_STUB));
  fastify.post('/ai/structure', guard, async (_req, reply) => reply.status(503).send(AI_STUB));
  fastify.post('/ai/validate', guard, async (_req, reply) => reply.status(503).send(AI_STUB));
  fastify.post('/ai/angles', guard, async (_req, reply) => reply.status(503).send(AI_STUB));
  fastify.post('/ai/copy', guard, async (_req, reply) => reply.status(503).send(AI_STUB));
  fastify.post('/ai/recycle', guard, async (_req, reply) => reply.status(503).send(AI_STUB));

  fastify.get('/ai/jobs/:id', guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.aIJob.findUnique({ where: { id } });
    if (!job) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Job não encontrado.' } });
    return reply.send(job);
  });
}
