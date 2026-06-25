/**
 * Rotas da Base de conhecimento da empresa + Calendário editorial (PRD-005 / SPEC-005).
 * Geração usa IA: sem OPENAI_API_KEY → 503; falha de IA → 502. Envio ao pipeline
 * cria card em IDEIAS_BRUTAS (idempotente) sem alterar os gates do PipelineService.
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import { requirePermission } from '../plugins/auth.js';
import { AINotConfiguredError } from '../lib/ai/provider.js';
import { CompanyProfileSchema, GenerateCalendarInputSchema } from '@content-engine/shared';
import * as companyService from '../services/company.service.js';
import * as calendarService from '../services/calendar.service.js';

function aiError(reply: FastifyReply, err: unknown) {
  if (err instanceof AINotConfiguredError) {
    return reply.status(503).send({ error: { code: err.code, message: err.message } });
  }
  const message = err instanceof Error ? err.message : 'Falha na chamada de IA.';
  const code = (err as { code?: string })?.code ?? 'AI_FAILED';
  return reply.status(502).send({ error: { code, message } });
}

export default async function calendarRoutes(fastify: FastifyInstance) {
  // ── Base de conhecimento da empresa ──────────────────────────────────────────
  fastify.get('/company-profile', { preHandler: [requirePermission('viewBoard')] }, async () => {
    return companyService.getCompanyProfile();
  });

  fastify.put('/company-profile', { preHandler: [requirePermission('manageCompany')] }, async (request) => {
    const input = CompanyProfileSchema.parse(request.body);
    return companyService.updateCompanyProfile(input);
  });

  // ── Calendários editoriais ───────────────────────────────────────────────────
  fastify.get('/calendars', { preHandler: [requirePermission('viewBoard')] }, async () => {
    return calendarService.list();
  });

  fastify.get('/calendars/:id', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const calendar = await calendarService.getById(id);
    if (!calendar) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Calendário não encontrado.' } });
    return calendar;
  });

  fastify.post('/calendars/generate', { preHandler: [requirePermission('useAI')] }, async (request, reply) => {
    const input = GenerateCalendarInputSchema.parse(request.body);
    try {
      return await calendarService.generateAndSave(input, request.actor.sub);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  fastify.post(
    '/calendars/:id/items/:itemId/send-to-pipeline',
    { preHandler: [requirePermission('createCard')] },
    async (request, reply) => {
      const { id, itemId } = request.params as { id: string; itemId: string };
      try {
        return await calendarService.sendItemToPipeline(id, itemId, request.actor.sub);
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === 'NOT_FOUND') {
          return reply.status(404).send({ error: { code, message: (err as Error).message } });
        }
        throw err;
      }
    },
  );

  fastify.delete('/calendars/:id', { preHandler: [requirePermission('manageCompany')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await calendarService.remove(id);
    return reply.status(204).send();
  });
}
