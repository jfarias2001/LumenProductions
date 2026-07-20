/**
 * AI routes (SPEC-001 §9.3 / SPEC-002 §1.4).
 * Copiloto com revisão humana obrigatória: toda saída entra como rascunho/sugestão.
 * Sem OPENAI_API_KEY → 503 (fallback manual). Falha de IA → 502 (card segue editável).
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import { requirePermission } from '../plugins/auth.js';
import { prisma } from '../lib/prisma.js';
import { emitBoard } from '../lib/emitter.js';
import { getAIProvider, AINotConfiguredError } from '../lib/ai/provider.js';
import * as aiService from '../services/ai.service.js';
import { withSnapshot } from '../services/snapshot.service.js';
import {
  AIProspectInputSchema,
  AIStructureInputSchema,
  AIValidateInputSchema,
  AIAnglesInputSchema,
  AICopyInputSchema,
  AIRecycleInputSchema,
  AIDirectionInputSchema,
  AIAdCreativeInputSchema,
  Stage,
} from '@content-engine/shared';

function aiError(reply: FastifyReply, err: unknown) {
  if (err instanceof AINotConfiguredError) {
    return reply.status(503).send({ error: { code: err.code, message: err.message } });
  }
  const message = err instanceof Error ? err.message : 'Falha na chamada de IA.';
  const code = (err as { code?: string })?.code ?? 'AI_FAILED';
  return reply.status(502).send({ error: { code, message } });
}

export default async function aiRoutes(fastify: FastifyInstance) {
  const guard = { preHandler: [requirePermission('useAI')] };

  // ── Status: a UI usa para decidir mostrar ou não os botões de IA ────────────
  fastify.get('/ai/status', guard, async () => ({ enabled: getAIProvider().enabled }));

  // ── 1. Prospecção → cria cards em IDEIAS_BRUTAS ─────────────────────────────
  fastify.post('/ai/prospect', guard, async (request, reply) => {
    const { signalIds } = AIProspectInputSchema.parse(request.body);
    try {
      const out = await aiService.prospect(signalIds, request.actor.sub);
      const created = [];
      for (const idea of out.ideas) {
        const card = await prisma.card.create({
          data: {
            title: idea.hook.slice(0, 290),
            stage: Stage.IDEIAS_BRUTAS,
            pillar: idea.pillar ?? null,
            persona: idea.persona,
            pain: idea.dorPrincipal,
            promise: idea.objetivo,
          },
        });
        await prisma.cardStageHistory.create({ data: { cardId: card.id, stage: card.stage, byUserId: request.actor.sub } });
        emitBoard('card.created', card);
        created.push(card);
      }
      return reply.send({ ideas: out.ideas, temasRecorrentes: out.temasRecorrentes, createdCardIds: created.map((c) => c.id) });
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── 2. Estruturação → aplica no card (se cardId) ────────────────────────────
  fastify.post('/ai/structure', guard, async (request, reply) => {
    const { rawText, cardId } = AIStructureInputSchema.parse(request.body);
    try {
      // Sem card (só sugere) → sem snapshot; com card (grava por cima) → ponto de restauração.
      if (!cardId) {
        return reply.send(await aiService.structure(rawText, undefined, request.actor.sub));
      }
      const out = await withSnapshot(cardId, 'Estruturar ideia', request.actor.sub, async () => {
        const o = await aiService.structure(rawText, cardId, request.actor.sub);
        const card = await prisma.card.update({
          where: { id: cardId },
          data: {
            title: o.title,
            persona: o.persona ?? null,
            pain: o.pain ?? null,
            promise: o.promise ?? null,
            pillar: o.pillar ?? null,
            awareness: o.awareness ?? null,
          },
        });
        emitBoard('card.updated', card);
        return o;
      });
      return reply.send(out);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── 3. Validação assistida com auto-correção → atinge a nota mínima e libera o gate ─
  fastify.post('/ai/validate', guard, async (request, reply) => {
    const { cardId } = AIValidateInputSchema.parse(request.body);
    try {
      const { validation } = await withSnapshot(cardId, 'Validar (auto-correção)', request.actor.sub, () =>
        aiService.validateAndAutoCorrect(cardId, request.actor.sub),
      );
      emitBoard('card.updated', { id: cardId, validation });
      return reply.send(validation);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── 4. Ângulos & hooks → rascunhos ──────────────────────────────────────────
  fastify.post('/ai/angles', guard, async (request, reply) => {
    const { cardId } = AIAnglesInputSchema.parse(request.body);
    try {
      const result = await withSnapshot(cardId, 'Gerar ângulos & hooks', request.actor.sub, async () => {
        const out = await aiService.angles(cardId, request.actor.sub);
        await prisma.angle.createMany({ data: out.angles.map((a) => ({ cardId, type: a.type, text: a.text, aiGenerated: true })) });
        await prisma.hook.createMany({ data: out.hooks.map((h) => ({ cardId, text: h, aiGenerated: true })) });
        emitBoard('card.updated', { id: cardId });
        const [angles, hooks] = await Promise.all([
          prisma.angle.findMany({ where: { cardId } }),
          prisma.hook.findMany({ where: { cardId } }),
        ]);
        return { angles, hooks };
      });
      return reply.send(result);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── 5. Copy / roteiro → rascunho ────────────────────────────────────────────
  fastify.post('/ai/copy', guard, async (request, reply) => {
    const { cardId } = AICopyInputSchema.parse(request.body);
    try {
      const result = await withSnapshot(cardId, 'Gerar roteiro + copy', request.actor.sub, async () => {
        const out = await aiService.copy(cardId, request.actor.sub);
        const script = await prisma.script.upsert({
          where: { cardId },
          update: { ...out.script, aiGenerated: true },
          create: { cardId, ...out.script, aiGenerated: true },
        });
        const copyContent = await prisma.copyContent.upsert({
          where: { cardId },
          update: { caption: out.caption, ctaVariations: out.ctaVariations, aiGenerated: true },
          create: { cardId, caption: out.caption, ctaVariations: out.ctaVariations, aiGenerated: true },
        });
        if (out.screenTexts.length) {
          await prisma.card.update({ where: { id: cardId }, data: { screenTexts: out.screenTexts } });
        }
        emitBoard('card.updated', { id: cardId });
        return { script, copy: copyContent, screenTexts: out.screenTexts };
      });
      return reply.send(result);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── 5b. Direção criativa → rascunho rico (adapta-se ao tipo de conteúdo) ─────
  fastify.post('/ai/direction', guard, async (request, reply) => {
    const { cardId } = AIDirectionInputSchema.parse(request.body);
    try {
      const creative = await withSnapshot(cardId, 'Gerar direção criativa', request.actor.sub, async () => {
        const out = await aiService.direction(cardId, request.actor.sub);
        const persisted = await aiService.persistDirection(cardId, out);
        emitBoard('card.updated', { id: cardId });
        return persisted;
      });
      return reply.send(creative);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── 5c. Criativo de anúncio (Meta Ads) → substitui o criativo orgânico ──────
  fastify.post('/ai/ad-creative', guard, async (request, reply) => {
    const { cardId } = AIAdCreativeInputSchema.parse(request.body);
    try {
      const persisted = await withSnapshot(cardId, 'Gerar criativo de anúncio', request.actor.sub, async () => {
        const out = await aiService.adCreative(cardId, request.actor.sub);
        const p = await aiService.persistAdCreative(cardId, out);
        emitBoard('card.updated', { id: cardId });
        return p;
      });
      return reply.send(persisted);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── 6. Reciclagem → ativos derivados ────────────────────────────────────────
  fastify.post('/ai/recycle', guard, async (request, reply) => {
    const { cardId } = AIRecycleInputSchema.parse(request.body);
    try {
      const assets = await withSnapshot(cardId, 'Gerar ativos derivados', request.actor.sub, async () => {
        const out = await aiService.recycle(cardId, request.actor.sub);
        await prisma.derivedAsset.createMany({
          data: out.derivedAssets.map((d) => ({ cardId, type: d.type, content: d.content, aiGenerated: true })),
        });
        emitBoard('card.updated', { id: cardId });
        return prisma.derivedAsset.findMany({ where: { cardId } });
      });
      return reply.send(assets);
    } catch (err) {
      return aiError(reply, err);
    }
  });

  // ── Consulta de job ─────────────────────────────────────────────────────────
  fastify.get('/ai/jobs/:id', guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.aIJob.findUnique({ where: { id } });
    if (!job) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Job não encontrado.' } });
    return reply.send(job);
  });
}
