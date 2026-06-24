/**
 * Rotas do copiloto conversacional (PRD-003 / SPEC-003 §2.5).
 * - Conversa por fase (GET histórico, POST mensagem via SSE streaming).
 * - Consolidação da conversa nas entidades do card.
 * - Pacote final (assemble + markdown).
 * - CRUD de prompt templates.
 * Sem OPENAI_API_KEY → 503 (fallback). Falha de IA → 502 (card segue editável).
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import { requirePermission } from '../plugins/auth.js';
import { prisma } from '../lib/prisma.js';
import { emitBoard } from '../lib/emitter.js';
import { getAIProvider, AINotConfiguredError } from '../lib/ai/provider.js';
import * as conversationService from '../services/conversation.service.js';
import { consolidateStage, generateStage } from '../services/ai.service.js';
import { assemble, toMarkdown } from '../services/deliverable.service.js';
import {
  ConversationMessageInputSchema,
  GenerateStageInputSchema,
  CreatePromptTemplateSchema,
  UpdatePromptTemplateSchema,
  Stage,
  isConversationalStage,
} from '@content-engine/shared';

function aiError(reply: FastifyReply, err: unknown) {
  if (err instanceof AINotConfiguredError) {
    return reply.status(503).send({ error: { code: err.code, message: err.message } });
  }
  const message = err instanceof Error ? err.message : 'Falha na chamada de IA.';
  const code = (err as { code?: string })?.code ?? 'AI_FAILED';
  return reply.status(502).send({ error: { code, message } });
}

function parseStage(raw: string, reply: FastifyReply): Stage | null {
  if (!(raw in Stage)) {
    void reply.status(400).send({ error: { code: 'INVALID_STAGE', message: 'Estágio inválido.' } });
    return null;
  }
  return raw as Stage;
}

export default async function conversationRoutes(fastify: FastifyInstance) {
  const ai = { preHandler: [requirePermission('useAI')] };
  const view = { preHandler: [requirePermission('viewBoard')] };
  const promptWrite = { preHandler: [requirePermission('managePrompts')] };

  // ── Conversa da fase: histórico ─────────────────────────────────────────────
  fastify.get('/cards/:cardId/conversations/:stage', ai, async (request, reply) => {
    const { cardId, stage: rawStage } = request.params as { cardId: string; stage: string };
    const stage = parseStage(rawStage, reply);
    if (!stage) return;
    const conversation = await conversationService.getOrCreate(cardId, stage);
    return reply.send(conversation);
  });

  // ── Conversa da fase: nova mensagem (SSE streaming) ─────────────────────────
  fastify.post('/cards/:cardId/conversations/:stage/messages', ai, async (request, reply) => {
    const { cardId, stage: rawStage } = request.params as { cardId: string; stage: string };
    const stage = parseStage(rawStage, reply);
    if (!stage) return;
    const { content } = ConversationMessageInputSchema.parse(request.body);

    if (!getAIProvider().enabled) {
      return reply.status(503).send({ error: { code: 'AI_NOT_CONFIGURED', message: 'Camada de IA não configurada.' } });
    }

    // SSE: assume o controle do socket (Fastify não envia resposta própria)
    reply.hijack();
    // SSE: cabeçalhos e stream manual via reply.raw
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const { message } = await conversationService.sendMessage({
        cardId,
        stage,
        content,
        userId: request.actor.sub,
        onToken: (delta) => send('token', { delta }),
      });
      send('done', { message });
    } catch (err) {
      const code = err instanceof AINotConfiguredError ? err.code : (err as { code?: string })?.code ?? 'AI_FAILED';
      send('error', { code, message: err instanceof Error ? err.message : 'Falha na IA.' });
    } finally {
      reply.raw.end();
    }
  });

  // ── Consolidar conversa → entidades do card ─────────────────────────────────
  fastify.post('/cards/:cardId/conversations/:stage/consolidate', ai, async (request, reply) => {
    const { cardId, stage: rawStage } = request.params as { cardId: string; stage: string };
    const stage = parseStage(rawStage, reply);
    if (!stage) return;
    if (!isConversationalStage(stage)) {
      return reply.status(400).send({ error: { code: 'STAGE_NOT_CONSOLIDABLE', message: 'Esta fase não consolida.' } });
    }
    try {
      const result = await consolidateStage(cardId, stage, request.actor.sub);
      emitBoard('card.updated', { id: cardId });
      return reply.send(result);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── Gerar entregável da fase a partir de um contexto (PRD-004) ──────────────
  fastify.post('/cards/:cardId/conversations/:stage/generate', ai, async (request, reply) => {
    const { cardId, stage: rawStage } = request.params as { cardId: string; stage: string };
    const stage = parseStage(rawStage, reply);
    if (!stage) return;
    if (!isConversationalStage(stage)) {
      return reply.status(400).send({ error: { code: 'STAGE_NOT_CONSOLIDABLE', message: 'Esta fase não gera conteúdo.' } });
    }
    const { context } = GenerateStageInputSchema.parse(request.body);
    if (!getAIProvider().enabled) {
      return reply.status(503).send({ error: { code: 'AI_NOT_CONFIGURED', message: 'Camada de IA não configurada.' } });
    }
    try {
      const result = await generateStage(cardId, stage, request.actor.sub, context);
      emitBoard('card.updated', { id: cardId });
      return reply.send(result);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── Pacote final ────────────────────────────────────────────────────────────
  fastify.get('/cards/:cardId/deliverable', view, async (request, reply) => {
    const { cardId } = request.params as { cardId: string };
    const { format } = request.query as { format?: string };
    const deliverable = await assemble(cardId);
    if (format === 'md') {
      return reply.header('Content-Type', 'text/markdown; charset=utf-8').send(toMarkdown(deliverable));
    }
    return reply.send(deliverable);
  });

  // ── Prompt templates ─────────────────────────────────────────────────────────
  fastify.get('/prompt-templates', view, async (request, reply) => {
    const { stage } = request.query as { stage?: string };
    const where = stage && stage in Stage ? { stage: stage as Stage } : {};
    const templates = await prisma.promptTemplate.findMany({
      where,
      orderBy: [{ stage: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    return reply.send(templates);
  });

  fastify.post('/prompt-templates', promptWrite, async (request, reply) => {
    const data = CreatePromptTemplateSchema.parse(request.body);
    const template = await prisma.promptTemplate.create({ data });
    return reply.status(201).send(template);
  });

  fastify.patch('/prompt-templates/:id', promptWrite, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = UpdatePromptTemplateSchema.parse(request.body);
    const template = await prisma.promptTemplate.update({ where: { id }, data });
    return reply.send(template);
  });

  fastify.delete('/prompt-templates/:id', promptWrite, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.promptTemplate.delete({ where: { id } });
    return reply.status(204).send();
  });
}
