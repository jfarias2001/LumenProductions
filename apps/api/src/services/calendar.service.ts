/**
 * CalendarService — calendário editorial (PRD-005 / SPEC-005).
 * Orquestra a geração por IA (ai.service.generateCalendar), distribui as datas
 * dentro do período e persiste o calendário + itens. Cada item pode virar um
 * card em IDEIAS_BRUTAS (idempotente) sem alterar o pipeline de 18 estágios.
 */
import type { GenerateCalendarInput, AICalendarItem } from '@content-engine/shared';
import { Stage } from '@content-engine/shared';
import { prisma } from '../lib/prisma.js';
import { emitBoard } from '../lib/emitter.js';
import { getAIProvider } from '../lib/ai/provider.js';
import {
  generateCalendar as aiGenerateCalendar,
  autoProduceCard,
  advanceWhilePossible,
} from './ai.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Distribui N posts uniformemente ao longo dos 7 dias de uma semana (0-based). */
function dayOffsetsForWeek(postsInWeek: number): number[] {
  if (postsInWeek <= 1) return [0];
  const offsets: number[] = [];
  for (let i = 0; i < postsInWeek; i++) {
    offsets.push(Math.round((i * 6) / (postsInWeek - 1))); // 0..6
  }
  return offsets;
}

interface PlannedItem extends AICalendarItem {
  position: number;
  scheduledFor: Date;
}

/** Calcula posição e data de cada item a partir da semana informada pela IA. */
function planDates(items: AICalendarItem[], startDate: Date, weeks: number): PlannedItem[] {
  // Agrupa por semana (clampada ao intervalo válido), preservando a ordem de chegada.
  const byWeek = new Map<number, AICalendarItem[]>();
  for (const item of items) {
    const w = Math.min(Math.max(item.week || 1, 1), weeks);
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w)!.push(item);
  }

  const planned: PlannedItem[] = [];
  let position = 0;
  for (const w of [...byWeek.keys()].sort((a, b) => a - b)) {
    const weekItems = byWeek.get(w)!;
    const offsets = dayOffsetsForWeek(weekItems.length);
    const weekStartMs = startDate.getTime() + (w - 1) * 7 * DAY_MS;
    weekItems.forEach((item, idx) => {
      planned.push({
        ...item,
        position: position++,
        scheduledFor: new Date(weekStartMs + (offsets[idx] ?? 0) * DAY_MS),
      });
    });
  }
  return planned;
}

export async function generateAndSave(input: GenerateCalendarInput, userId?: string) {
  const out = await aiGenerateCalendar(input, userId);
  const startDate = new Date(`${input.startDate}T09:00:00`);
  const planned = planDates(out.items, startDate, input.weeks);

  const calendar = await prisma.editorialCalendar.create({
    data: {
      title: input.title,
      objective: input.objective,
      theme: out.theme || null,
      startDate,
      weeks: input.weeks,
      postsPerWeek: input.postsPerWeek,
      createdById: userId ?? null,
      items: {
        create: planned.map((p) => ({
          position: p.position,
          scheduledFor: p.scheduledFor,
          title: p.title.slice(0, 290),
          pillar: p.pillar ?? null,
          contentType: p.contentType ?? input.contentTypes[0],
          staticFormat: p.staticFormat ?? null,
          format: p.format ?? null,
          persona: p.persona ?? null,
          pain: p.pain ?? null,
          promise: p.promise ?? null,
          connection: p.connection ?? null,
        })),
      },
    },
    include: { items: { orderBy: { position: 'asc' } } },
  });

  return calendar;
}

export async function list() {
  return prisma.editorialCalendar.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
}

export async function getById(id: string) {
  return prisma.editorialCalendar.findUnique({
    where: { id },
    include: { items: { orderBy: { position: 'asc' } } },
  });
}

export async function remove(id: string) {
  await prisma.editorialCalendar.delete({ where: { id } });
}

/** Envia um item para o pipeline: cria card em IDEIAS_BRUTAS. Idempotente. */
export async function sendItemToPipeline(calendarId: string, itemId: string, userId?: string) {
  const item = await prisma.editorialCalendarItem.findFirst({
    where: { id: itemId, calendarId },
    include: { card: true },
  });
  if (!item) {
    throw Object.assign(new Error('Item do calendário não encontrado.'), { code: 'NOT_FOUND' });
  }
  if (item.cardId && item.card) {
    return { card: item.card, created: false };
  }

  const card = await prisma.card.create({
    data: {
      title: item.title.slice(0, 290),
      stage: Stage.IDEIAS_BRUTAS,
      contentType: item.contentType,
      staticFormat: item.staticFormat ?? null,
      pillar: item.pillar ?? null,
      persona: item.persona ?? null,
      pain: item.pain ?? null,
      promise: item.promise ?? null,
    },
  });
  await prisma.cardStageHistory.create({ data: { cardId: card.id, stage: card.stage, byUserId: userId ?? null } });
  await prisma.editorialCalendarItem.update({ where: { id: item.id }, data: { cardId: card.id } });
  emitBoard('card.created', card);

  return { card, created: true };
}

export interface AutoProduceResult {
  produced: number;
  skipped: number;
  failed: number;
  errors: Array<{ itemId: string; title: string; message: string }>;
}

/**
 * Auto-produção em lote (PRD-007): para cada item SEM card, cria o card, gera o pacote
 * criativo completo (autoProduceCard) e avança o card o máximo que os gates permitirem.
 * Idempotente — itens com card são pulados. Falha em um item não derruba os demais.
 */
export async function autoProduceCalendar(calendarId: string, userId?: string): Promise<AutoProduceResult> {
  // Falha cedo e clara se a IA não estiver configurada (a rota traduz para 503).
  getAIProvider();

  const calendar = await prisma.editorialCalendar.findUnique({
    where: { id: calendarId },
    include: { items: { orderBy: { position: 'asc' } } },
  });
  if (!calendar) {
    throw Object.assign(new Error('Calendário não encontrado.'), { code: 'NOT_FOUND' });
  }

  const result: AutoProduceResult = { produced: 0, skipped: 0, failed: 0, errors: [] };

  for (const item of calendar.items) {
    if (item.cardId) {
      result.skipped++;
      continue;
    }
    try {
      const card = await prisma.card.create({
        data: {
          title: item.title.slice(0, 290),
          stage: Stage.IDEIAS_BRUTAS,
          contentType: item.contentType,
          staticFormat: item.staticFormat ?? null,
          pillar: item.pillar ?? null,
          persona: item.persona ?? null,
          pain: item.pain ?? null,
          promise: item.promise ?? null,
        },
      });
      await prisma.cardStageHistory.create({ data: { cardId: card.id, stage: card.stage, byUserId: userId ?? null } });
      await prisma.editorialCalendarItem.update({ where: { id: item.id }, data: { cardId: card.id } });

      await autoProduceCard(card.id, userId);
      await advanceWhilePossible(card.id, userId);

      emitBoard('card.created', card);
      result.produced++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        itemId: item.id,
        title: item.title,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
