import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { emitBoard } from '../lib/emitter.js';
import { requirePermission, requireAuth } from '../plugins/auth.js';
import { pipelineService } from '../services/pipeline.service.js';
import { calculateValidation } from '../services/validation.service.js';
import { evaluateRetention } from '../services/retention.service.js';
import { Stage } from '@content-engine/shared';
import {
  CreateCardSchema,
  UpdateCardSchema,
  TransitionSchema,
  AssignSchema,
  ValidationSchema,
  CreateAngleSchema,
  UpdateAngleSchema,
  CreateHookSchema,
  UpdateHookSchema,
  ScriptSchema,
  CreativeDirectionSchema,
  CopyContentSchema,
  ScheduleSchema,
  RetentionReviewSchema,
  ChecklistBatchUpdateSchema,
  MetricSnapshotSchema,
  DerivedAssetSchema,
  CreateCommentSchema,
  BoardFiltersSchema,
} from '@content-engine/shared';

// Full card include for snapshots passed to PipelineService
const cardWithRelations = {
  validation: true,
  angles: true,
  hooks: true,
  script: true,
  creative: true,
  copy: true,
  schedule: true,
  retentionReview: true,
  checklistItems: true,
  metricSnapshots: { select: { id: true } },
  stageHistory: { orderBy: { enteredAt: 'desc' as const }, take: 1 },
};

export default async function cardRoutes(fastify: FastifyInstance) {
  // ── GET /board ────────────────────────────────────────────────────────────
  fastify.get('/board', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const filters = BoardFiltersSchema.parse(request.query);
    const where: Record<string, unknown> = { archivedAt: null };
    if (filters.assigneeId) where['assigneeId'] = filters.assigneeId;
    if (filters.pillar) where['pillar'] = filters.pillar;
    if (filters.awareness) where['awareness'] = filters.awareness;
    if (filters.contentClass) where['contentClass'] = filters.contentClass;
    if (filters.search) where['title'] = { contains: filters.search, mode: 'insensitive' };

    const cards = await prisma.card.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true } },
        validation: { select: { total: true, verdict: true } },
        _count: { select: { checklistItems: true, hooks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reply.send(cards);
  });

  // ── POST /cards ────────────────────────────────────────────────────────────
  fastify.post('/cards', { preHandler: [requirePermission('createCard')] }, async (request, reply) => {
    const body = CreateCardSchema.parse(request.body);
    const card = await prisma.card.create({
      data: body,
      include: { assignee: { select: { id: true, name: true, role: true } } },
    });
    // Open first stage history entry
    await prisma.cardStageHistory.create({ data: { cardId: card.id, stage: card.stage, byUserId: request.actor.sub } });
    await prisma.activityLog.create({ data: { cardId: card.id, actorId: request.actor.sub, action: 'card.created', payload: { stage: card.stage } } });
    emitBoard('card.created', card);
    return reply.status(201).send(card);
  });

  // ── GET /cards/:id ─────────────────────────────────────────────────────────
  fastify.get('/cards/:id', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true } },
        validation: true,
        angles: true,
        hooks: true,
        script: true,
        creative: true,
        copy: true,
        schedule: true,
        retentionReview: true,
        checklistItems: true,
        metricSnapshots: { orderBy: { measuredAt: 'desc' } },
        derivedAssets: true,
        stageHistory: { orderBy: { enteredAt: 'asc' } },
        comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        aiJobs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!card) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Card não encontrado.' } });
    return reply.send(card);
  });

  // ── PATCH /cards/:id ───────────────────────────────────────────────────────
  fastify.patch('/cards/:id', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateCardSchema.parse(request.body);
    const card = await prisma.card.update({ where: { id }, data: body });
    await prisma.activityLog.create({ data: { cardId: id, actorId: request.actor.sub, action: 'card.updated', payload: body as unknown as Prisma.InputJsonValue } });
    emitBoard('card.updated', card);
    return reply.send(card);
  });

  // ── POST /cards/:id/transition ─────────────────────────────────────────────
  fastify.post('/cards/:id/transition', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { to } = TransitionSchema.parse(request.body);

    const card = await prisma.card.findUnique({ where: { id }, include: cardWithRelations });
    if (!card) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Card não encontrado.' } });

    // PUBLICADO requer role com schedulePublish
    if (to === Stage.PUBLICADO) {
      const result = requirePermission('schedulePublish');
      await result(request, reply);
      if (reply.sent) return;
    }

    const check = pipelineService.canTransition(card as Parameters<typeof pipelineService.canTransition>[0], to);
    if (!check.allowed) {
      return reply.status(422).send({ error: { code: check.code ?? 'TRANSITION_BLOCKED', message: check.message } });
    }

    // Close current stage history, open new
    await prisma.cardStageHistory.updateMany({ where: { cardId: id, exitedAt: null }, data: { exitedAt: new Date() } });
    const updated = await prisma.card.update({ where: { id }, data: { stage: to } });
    await prisma.cardStageHistory.create({ data: { cardId: id, stage: to, byUserId: request.actor.sub } });
    await prisma.activityLog.create({ data: { cardId: id, actorId: request.actor.sub, action: 'card.transition', payload: { from: card.stage, to } } });

    // Auto-return on retention failure
    if (card.retentionReview && !card.retentionReview.passed && to === Stage.EM_EDICAO) {
      // already handled by gate; just log
    }

    emitBoard('card.moved', { id, from: card.stage, to });
    return reply.send(updated);
  });

  // ── POST /cards/:id/assign ─────────────────────────────────────────────────
  fastify.post('/cards/:id/assign', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { assigneeId } = AssignSchema.parse(request.body);
    const card = await prisma.card.update({ where: { id }, data: { assigneeId } });
    emitBoard('card.updated', card);
    return reply.send(card);
  });

  // ── POST /cards/:id/archive ────────────────────────────────────────────────
  fastify.post('/cards/:id/archive', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await prisma.card.update({ where: { id }, data: { stage: Stage.ARQUIVADO, archivedAt: new Date() } });
    await prisma.activityLog.create({ data: { cardId: id, actorId: request.actor.sub, action: 'card.archived' } });
    emitBoard('card.archived', { id });
    return reply.send(card);
  });

  // ── GET /cards/:id/history ─────────────────────────────────────────────────
  fastify.get('/cards/:id/history', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const history = await prisma.cardStageHistory.findMany({ where: { cardId: id }, orderBy: { enteredAt: 'asc' } });
    return reply.send(history);
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  fastify.put('/cards/:id/validation', { preHandler: [requirePermission('confirmValidation')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ValidationSchema.parse(request.body);
    const { total, verdict } = calculateValidation(body);
    const validation = await prisma.validation.upsert({
      where: { cardId: id },
      update: { ...body, total, verdict },
      create: { cardId: id, ...body, total, verdict },
    });
    await prisma.activityLog.create({ data: { cardId: id, actorId: request.actor.sub, action: 'validation.scored', payload: { total, verdict } } });
    emitBoard('card.updated', { id, validation });
    return reply.send(validation);
  });

  // ── Angles ─────────────────────────────────────────────────────────────────
  fastify.get('/cards/:id/angles', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await prisma.angle.findMany({ where: { cardId: id } }));
  });

  fastify.post('/cards/:id/angles', { preHandler: [requirePermission('editStrategy')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CreateAngleSchema.parse(request.body);
    const angle = await prisma.angle.create({ data: { cardId: id, ...body } });
    emitBoard('card.updated', { id });
    return reply.status(201).send(angle);
  });

  fastify.patch('/cards/:id/angles/:angleId', { preHandler: [requirePermission('editStrategy')] }, async (request, reply) => {
    const { angleId } = request.params as { id: string; angleId: string };
    const body = UpdateAngleSchema.parse(request.body);
    return reply.send(await prisma.angle.update({ where: { id: angleId }, data: body }));
  });

  fastify.delete('/cards/:id/angles/:angleId', { preHandler: [requirePermission('editStrategy')] }, async (request, reply) => {
    const { angleId } = request.params as { id: string; angleId: string };
    await prisma.angle.delete({ where: { id: angleId } });
    return reply.status(204).send();
  });

  // ── Hooks ──────────────────────────────────────────────────────────────────
  fastify.get('/cards/:id/hooks', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await prisma.hook.findMany({ where: { cardId: id } }));
  });

  fastify.post('/cards/:id/hooks', { preHandler: [requirePermission('editStrategy')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CreateHookSchema.parse(request.body);
    return reply.status(201).send(await prisma.hook.create({ data: { cardId: id, ...body } }));
  });

  fastify.patch('/cards/:id/hooks/:hookId', { preHandler: [requirePermission('editStrategy')] }, async (request, reply) => {
    const { hookId } = request.params as { id: string; hookId: string };
    const body = UpdateHookSchema.parse(request.body);
    return reply.send(await prisma.hook.update({ where: { id: hookId }, data: body }));
  });

  fastify.delete('/cards/:id/hooks/:hookId', { preHandler: [requirePermission('editStrategy')] }, async (request, reply) => {
    const { hookId } = request.params as { id: string; hookId: string };
    await prisma.hook.delete({ where: { id: hookId } });
    return reply.status(204).send();
  });

  // ── Script ─────────────────────────────────────────────────────────────────
  fastify.put('/cards/:id/script', { preHandler: [requirePermission('editStrategy')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ScriptSchema.parse(request.body);
    const script = await prisma.script.upsert({
      where: { cardId: id },
      update: body,
      create: { cardId: id, ...body },
    });
    emitBoard('card.updated', { id });
    return reply.send(script);
  });

  // ── Creative Direction ──────────────────────────────────────────────────────
  fastify.put('/cards/:id/creative', { preHandler: [requirePermission('editCreative')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CreativeDirectionSchema.parse(request.body);
    const creative = await prisma.creativeDirection.upsert({
      where: { cardId: id },
      update: body,
      create: { cardId: id, ...body },
    });
    return reply.send(creative);
  });

  // ── Copy ───────────────────────────────────────────────────────────────────
  fastify.put('/cards/:id/copy', { preHandler: [requirePermission('editStrategy')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CopyContentSchema.parse(request.body);
    const copy = await prisma.copyContent.upsert({
      where: { cardId: id },
      update: body,
      create: { cardId: id, ...body },
    });
    return reply.send(copy);
  });

  // ── Schedule ───────────────────────────────────────────────────────────────
  fastify.put('/cards/:id/schedule', { preHandler: [requirePermission('schedulePublish')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ScheduleSchema.parse(request.body);
    const schedule = await prisma.schedule.upsert({
      where: { cardId: id },
      update: { ...body, scheduledFor: new Date(body.scheduledFor) },
      create: { cardId: id, ...body, scheduledFor: new Date(body.scheduledFor) },
    });
    return reply.send(schedule);
  });

  // ── Retention Review ───────────────────────────────────────────────────────
  fastify.put('/cards/:id/retention-review', { preHandler: [requirePermission('approveRetention')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = RetentionReviewSchema.parse(request.body);
    const { badCount, passed } = evaluateRetention(body.answers);

    const review = await prisma.retentionReview.upsert({
      where: { cardId: id },
      update: { answers: body.answers, badCount, passed, reviewerId: body.reviewerId, notes: body.notes },
      create: { cardId: id, answers: body.answers, badCount, passed, reviewerId: body.reviewerId, notes: body.notes },
    });

    // Auto-return to EM_EDICAO when gate fails
    if (!passed) {
      const card = await prisma.card.findUnique({ where: { id }, include: cardWithRelations });
      if (card && card.stage === Stage.REVISAO_RETENCAO) {
        await prisma.cardStageHistory.updateMany({ where: { cardId: id, exitedAt: null }, data: { exitedAt: new Date() } });
        await prisma.card.update({ where: { id }, data: { stage: Stage.EM_EDICAO } });
        await prisma.cardStageHistory.create({ data: { cardId: id, stage: Stage.EM_EDICAO, byUserId: request.actor.sub } });
        await prisma.activityLog.create({ data: { cardId: id, actorId: request.actor.sub, action: 'retention.failed', payload: { badCount } } });
        emitBoard('card.moved', { id, from: Stage.REVISAO_RETENCAO, to: Stage.EM_EDICAO, reason: 'retention_failed' });
      }
    }

    return reply.send(review);
  });

  // ── Checklist ──────────────────────────────────────────────────────────────
  fastify.get('/cards/:id/checklist', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await prisma.card.findUnique({ where: { id }, select: { stage: true } });
    if (!card) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Card não encontrado.' } });

    // Ensure checklist items exist for current stage (instantiate from template if needed)
    const existing = await prisma.cardChecklistItem.findMany({ where: { cardId: id, stage: card.stage } });
    if (existing.length === 0) {
      const template = await prisma.checklistTemplate.findUnique({
        where: { stage: card.stage },
        include: { items: { orderBy: { order: 'asc' } } },
      });
      if (template?.items.length) {
        await prisma.cardChecklistItem.createMany({
          data: template.items.map((item) => ({ cardId: id, stage: card.stage, label: item.label })),
        });
        return reply.send(await prisma.cardChecklistItem.findMany({ where: { cardId: id, stage: card.stage } }));
      }
    }
    return reply.send(existing);
  });

  fastify.patch('/cards/:id/checklist', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { items } = ChecklistBatchUpdateSchema.parse(request.body);
    const now = new Date();
    await Promise.all(
      items.map((item) =>
        prisma.cardChecklistItem.update({
          where: { id: item.id },
          data: { checked: item.checked, checkedById: item.checkedById, checkedAt: item.checked ? now : null },
        }),
      ),
    );
    return reply.send(await prisma.cardChecklistItem.findMany({ where: { cardId: id } }));
  });

  // ── Metrics ────────────────────────────────────────────────────────────────
  fastify.get('/cards/:id/metrics', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await prisma.cardMetricSnapshot.findMany({ where: { cardId: id }, orderBy: { measuredAt: 'desc' } }));
  });

  fastify.post('/cards/:id/metrics', { preHandler: [requirePermission('enterMetrics')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = MetricSnapshotSchema.parse(request.body);
    const snapshot = await prisma.cardMetricSnapshot.create({
      data: { cardId: id, ...body, measuredAt: body.measuredAt ? new Date(body.measuredAt) : new Date() },
    });
    return reply.status(201).send(snapshot);
  });

  // ── Derived Assets ─────────────────────────────────────────────────────────
  fastify.get('/cards/:id/derived-assets', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await prisma.derivedAsset.findMany({ where: { cardId: id } }));
  });

  fastify.post('/cards/:id/derived-assets', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = DerivedAssetSchema.parse(request.body);
    return reply.status(201).send(await prisma.derivedAsset.create({ data: { cardId: id, ...body } }));
  });

  // ── Spawn derived card ──────────────────────────────────────────────────────
  fastify.post('/cards/:id/spawn', { preHandler: [requirePermission('createCard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CreateCardSchema.parse(request.body);
    const card = await prisma.card.create({ data: { ...body, parentCardId: id } });
    await prisma.cardStageHistory.create({ data: { cardId: card.id, stage: card.stage, byUserId: request.actor.sub } });
    emitBoard('card.created', card);
    return reply.status(201).send(card);
  });

  // ── Comments ───────────────────────────────────────────────────────────────
  fastify.get('/cards/:id/comments', { preHandler: [requirePermission('viewBoard')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(
      await prisma.comment.findMany({
        where: { cardId: id },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    );
  });

  fastify.post('/cards/:id/comments', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const { body } = CreateCommentSchema.parse(request.body);
    const comment = await prisma.comment.create({
      data: { cardId: id, authorId: request.actor.sub, body },
      include: { author: { select: { id: true, name: true } } },
    });
    return reply.status(201).send(comment);
  });
}
