import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requirePermission } from '../plugins/auth.js';
import { Stage, STAGE_ORDER, PILLAR_GROUP_MAP, MIX_TARGETS } from '@content-engine/shared';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  const guard = { preHandler: [requirePermission('viewBoard')] };

  // GET /analytics/process — volume, lead time, % aprovação, gargalos
  fastify.get('/analytics/process', guard, async (_req, reply) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [weeklyCards, validations, stageHistories] = await Promise.all([
      prisma.card.count({ where: { createdAt: { gte: weekAgo }, archivedAt: null } }),
      prisma.validation.findMany({ select: { verdict: true } }),
      prisma.cardStageHistory.findMany({ where: { exitedAt: { not: null } }, select: { stage: true, enteredAt: true, exitedAt: true } }),
    ]);

    const totalValidated = validations.length;
    const seguirRoteiro = validations.filter((v) => v.verdict === 'SEGUIR_ROTEIRO').length;
    const approvalRate = totalValidated > 0 ? (seguirRoteiro / totalValidated) * 100 : 0;

    // Average time per stage (ms → hours)
    const stageTimeMap: Record<string, number[]> = {};
    for (const h of stageHistories) {
      const ms = new Date(h.exitedAt!).getTime() - new Date(h.enteredAt).getTime();
      if (!stageTimeMap[h.stage]) stageTimeMap[h.stage] = [];
      stageTimeMap[h.stage]!.push(ms);
    }
    const avgTimePerStage = Object.entries(stageTimeMap).map(([stage, times]) => ({
      stage,
      avgHours: Math.round((times.reduce((a, b) => a + b, 0) / times.length / 3600000) * 10) / 10,
    }));

    return reply.send({ weeklyCards, approvalRate: Math.round(approvalRate), avgTimePerStage });
  });

  // GET /analytics/results — métricas agregadas por contentClass/pilar
  fastify.get('/analytics/results', guard, async (_req, reply) => {
    const cards = await prisma.card.findMany({
      where: { stage: { in: [Stage.ANALISE, Stage.ESCALAR_RECICLAR, Stage.ARQUIVADO] }, contentClass: { not: null } },
      include: { metricSnapshots: { orderBy: { measuredAt: 'desc' }, take: 1 } },
    });

    const byClass: Record<string, { count: number; avgRetention: number }> = {};
    for (const card of cards) {
      const cls = card.contentClass!;
      if (!byClass[cls]) byClass[cls] = { count: 0, avgRetention: 0 };
      byClass[cls]!.count++;
      const snap = card.metricSnapshots[0];
      if (snap?.retentionPct != null) byClass[cls]!.avgRetention += snap.retentionPct;
    }
    for (const cls of Object.keys(byClass)) {
      const entry = byClass[cls]!;
      if (entry.count > 0) entry.avgRetention = Math.round((entry.avgRetention / entry.count) * 10) / 10;
    }

    return reply.send({ byClass });
  });

  // GET /analytics/mix — mix de pilares vs. alvo
  fastify.get('/analytics/mix', guard, async (_req, reply) => {
    const cards = await prisma.card.findMany({
      where: { pillar: { not: null }, archivedAt: null, stage: { notIn: [Stage.SINAIS_MERCADO, Stage.IDEIAS_BRUTAS] } },
      select: { pillar: true },
    });

    const total = cards.length;
    const groupCounts: Record<string, number> = { DOR_CONSCIENCIA: 0, SOLUCAO_MECANISMO: 0, PROVA_BASTIDOR_PRODUTO: 0 };
    for (const card of cards) {
      if (!card.pillar) continue;
      const group = PILLAR_GROUP_MAP[card.pillar];
      if (group) groupCounts[group] = (groupCounts[group] ?? 0) + 1;
    }

    const mix = Object.entries(groupCounts).map(([group, count]) => ({
      group,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      target: group === 'DOR_CONSCIENCIA' ? MIX_TARGETS.DOR_CONSCIENCIA : group === 'SOLUCAO_MECANISMO' ? MIX_TARGETS.SOLUCAO_MECANISMO : MIX_TARGETS.PROVA_BASTIDOR_PRODUTO,
    }));

    return reply.send({ total, mix });
  });

  // GET /analytics/weekly — ritmo semanal e metas
  fastify.get('/analytics/weekly', guard, async (_req, reply) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const settings = await prisma.appSetting.findUnique({ where: { id: 'singleton' } });
    const cards = await prisma.card.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { stage: true, pillar: true, createdAt: true },
    });

    const stageCount: Record<string, number> = {};
    for (const c of cards) {
      stageCount[c.stage] = (stageCount[c.stage] ?? 0) + 1;
    }

    return reply.send({
      weeklyTargets: settings?.weeklyTargets ?? {},
      cardsByStage: STAGE_ORDER.map((s) => ({ stage: s, count: stageCount[s] ?? 0 })),
    });
  });

  // GET/PUT /settings
  fastify.get('/settings', guard, async (_req, reply) => {
    return reply.send(await prisma.appSetting.findUnique({ where: { id: 'singleton' } }));
  });

  fastify.put('/settings', { preHandler: [requirePermission('manageUsersConfig')] }, async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const setting = await prisma.appSetting.update({ where: { id: 'singleton' }, data });
    return reply.send(setting);
  });

  // GET/PUT /checklist-templates/:stage
  fastify.get('/checklist-templates/:stage', guard, async (request, reply) => {
    const { stage } = request.params as { stage: Stage };
    const template = await prisma.checklistTemplate.findUnique({ where: { stage }, include: { items: { orderBy: { order: 'asc' } } } });
    return reply.send(template ?? { stage, items: [] });
  });

  fastify.put('/checklist-templates/:stage', { preHandler: [requirePermission('manageUsersConfig')] }, async (request, reply) => {
    const { stage } = request.params as { stage: Stage };
    const { items } = request.body as { items: Array<{ label: string; order: number }> };

    await prisma.checklistTemplate.upsert({
      where: { stage },
      update: {
        items: {
          deleteMany: {},
          create: items.map((i) => ({ label: i.label, order: i.order })),
        },
      },
      create: {
        stage,
        items: { create: items.map((i) => ({ label: i.label, order: i.order })) },
      },
    });

    return reply.send(await prisma.checklistTemplate.findUnique({ where: { stage }, include: { items: true } }));
  });
}
