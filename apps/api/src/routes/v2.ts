/**
 * Rotas do BOARD V2 (PRD-017): funil de criação com IA (ideias → título → foco → copy),
 * copy rápida (aba Teste) e CRUD dos cards V2. Sem OPENAI_API_KEY → 503; falha de IA → 502.
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import { requirePermission } from '../plugins/auth.js';
import { getAIProvider, AINotConfiguredError } from '../lib/ai/provider.js';
import * as aiService from '../services/ai.service.js';
import * as v2Service from '../services/v2.service.js';
import {
  V2IdeasInputSchema,
  V2TitlesInputSchema,
  V2FocusInputSchema,
  V2CopyInputSchema,
  QuickCopyInputSchema,
  V2CreateCardSchema,
  V2UpdateCardSchema,
} from '@content-engine/shared';

function aiError(reply: FastifyReply, err: unknown) {
  if (err instanceof AINotConfiguredError) {
    return reply.status(503).send({ error: { code: err.code, message: err.message } });
  }
  const message = err instanceof Error ? err.message : 'Falha na chamada de IA.';
  const code = (err as { code?: string })?.code ?? 'AI_FAILED';
  return reply.status(502).send({ error: { code, message } });
}

export default async function v2Routes(fastify: FastifyInstance) {
  const ai = { preHandler: [requirePermission('useAI')] };
  const view = { preHandler: [requirePermission('viewBoard')] };
  const write = { preHandler: [requirePermission('createCard')] };

  // ── Funil: passo 1 — ideias ─────────────────────────────────────────────────
  fastify.post('/v2/ideas', ai, async (request, reply) => {
    const { context, ...choice } = V2IdeasInputSchema.parse(request.body);
    try {
      const extra = await v2Service.resolveExtraPrompt(choice);
      return reply.send(await aiService.v2SuggestIdeas(context, extra, request.actor.sub));
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── Funil: passo 2 — títulos ────────────────────────────────────────────────
  fastify.post('/v2/titles', ai, async (request, reply) => {
    const { idea, ...choice } = V2TitlesInputSchema.parse(request.body);
    try {
      const extra = await v2Service.resolveExtraPrompt(choice);
      return reply.send(await aiService.v2SuggestTitles(idea, extra, request.actor.sub));
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── Funil: passo 3 — foco ───────────────────────────────────────────────────
  fastify.post('/v2/focus', ai, async (request, reply) => {
    const { idea, title, ...choice } = V2FocusInputSchema.parse(request.body);
    try {
      const extra = await v2Service.resolveExtraPrompt(choice);
      return reply.send(await aiService.v2SuggestFocus(idea, title, extra, request.actor.sub));
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── Funil: passo 4 — copy ───────────────────────────────────────────────────
  fastify.post('/v2/copy', ai, async (request, reply) => {
    const { idea, title, focus, ...choice } = V2CopyInputSchema.parse(request.body);
    try {
      const extra = await v2Service.resolveExtraPrompt(choice);
      return reply.send(await aiService.v2ProduceCopy(idea, title, focus, extra, request.actor.sub));
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── Copy rápida (aba Teste) ─────────────────────────────────────────────────
  fastify.post('/v2/quick-copy', ai, async (request, reply) => {
    const { prompt, ...choice } = QuickCopyInputSchema.parse(request.body);
    if (!getAIProvider().enabled) {
      return reply.status(503).send({ error: { code: 'AI_NOT_CONFIGURED', message: 'Camada de IA não configurada.' } });
    }
    try {
      const extra = await v2Service.resolveExtraPrompt(choice);
      return reply.send(await aiService.quickCopy(prompt, extra, request.actor.sub));
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── Cards do BOARD V2 ───────────────────────────────────────────────────────
  fastify.get('/v2/cards', view, async (_request, reply) => {
    return reply.send(await v2Service.listV2Cards());
  });

  fastify.post('/v2/cards', write, async (request, reply) => {
    const body = V2CreateCardSchema.parse(request.body);
    const card = await v2Service.createV2Card(body, request.actor.sub);
    return reply.status(201).send(card);
  });

  fastify.patch('/v2/cards/:id', view, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = V2UpdateCardSchema.parse(request.body);
    return reply.send(await v2Service.updateV2Card(id, body));
  });

  fastify.delete('/v2/cards/:id', write, async (request, reply) => {
    const { id } = request.params as { id: string };
    await v2Service.deleteV2Card(id);
    return reply.status(204).send();
  });
}
