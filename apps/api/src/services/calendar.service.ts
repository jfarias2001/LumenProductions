/**
 * CalendarService — calendário editorial (PRD-005 / SPEC-005).
 * Orquestra a geração por IA (ai.service.generateCalendar), distribui as datas
 * dentro do período e persiste o calendário + itens. Cada item pode virar um
 * card em IDEIAS_BRUTAS (idempotente) sem alterar o pipeline de 18 estágios.
 */
import type { GenerateCalendarInput, AICalendarItem } from '@content-engine/shared';
import { Stage, ContentType, StaticFormat, CreativeFormat } from '@content-engine/shared';
import { prisma } from '../lib/prisma.js';
import { emitBoard } from '../lib/emitter.js';
import { getAIProvider } from '../lib/ai/provider.js';
import {
  generateCalendar as aiGenerateCalendar,
  autoProduceCard,
  advanceWhilePossible,
} from './ai.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PlannedItem extends AICalendarItem {
  position: number;
  scheduledFor: Date;
}

/**
 * Distribui os itens uniformemente ao longo do período [startDate, endDate],
 * preservando a ordem (narrativa) decidida pela IA. (PRD-008)
 */
function planDates(items: AICalendarItem[], startDate: Date, endDate: Date): PlannedItem[] {
  const total = items.length;
  const spanDays = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS));
  return items.map((item, i) => {
    const offset = total <= 1 ? 0 : Math.round((i * spanDays) / (total - 1));
    return {
      ...item,
      position: i,
      scheduledFor: new Date(startDate.getTime() + offset * DAY_MS),
    };
  });
}

/** Os 4 "tipos" de peça que o usuário pede no gerador. */
type Kind = 'adVideo' | 'video' | 'post' | 'carrossel';
const KIND_ORDER: Kind[] = ['adVideo', 'video', 'post', 'carrossel'];

/** Classifica um item devolvido pela IA em um dos 4 tipos. */
function kindOf(i: AICalendarItem): Kind {
  if (i.isAd) return 'adVideo';
  if (i.contentType === ContentType.ESTATICO) {
    return i.staticFormat === StaticFormat.CARROSSEL ? 'carrossel' : 'post';
  }
  return 'video';
}

/** Aplica o tipo escolhido ao item (ajusta isAd/contentType/staticFormat/format). */
function applyKind(i: AICalendarItem, kind: Kind): void {
  switch (kind) {
    case 'adVideo':
      // Anúncio é SEMPRE apresentador falando à câmera (PESSOA_FALANDO).
      i.isAd = true; i.contentType = ContentType.VIDEO; i.staticFormat = undefined; i.format = CreativeFormat.PESSOA_FALANDO;
      break;
    case 'video':
      i.isAd = false; i.contentType = ContentType.VIDEO; i.staticFormat = undefined;
      break;
    case 'post':
      i.isAd = false; i.contentType = ContentType.ESTATICO; i.staticFormat = StaticFormat.IMAGEM_UNICA;
      break;
    case 'carrossel':
      i.isAd = false; i.contentType = ContentType.ESTATICO; i.staticFormat = StaticFormat.CARROSSEL;
      break;
  }
}

/**
 * A IA nem sempre obedece à quantidade exata por tipo. Esta reconciliação garante
 * DETERMINISTICAMENTE a composição pedida (vídeos de anúncio + vídeos orgânicos +
 * posts + carrosséis), re-rotulando os itens devolvidos sem inventar conteúdo e
 * preservando a ordem (narrativa). Mantém o tipo que a IA escolheu sempre que ainda
 * há vaga; os excedentes são realocados aos tipos faltantes; itens além do total
 * pedido são descartados.
 */
function reconcileComposition(items: AICalendarItem[], input: GenerateCalendarInput): AICalendarItem[] {
  const remaining: Record<Kind, number> = {
    adVideo: input.adVideoCount,
    video: input.videoCount,
    post: input.postCount,
    carrossel: input.carrosselCount,
  };
  const decided: (Kind | null)[] = items.map(() => null);

  // Passo 1: mantém o tipo que a IA escolheu, se ainda houver vaga.
  items.forEach((it, idx) => {
    const k = kindOf(it);
    if (remaining[k] > 0) {
      remaining[k]--;
      decided[idx] = k;
    }
  });
  // Passo 2: realoca os itens restantes aos tipos que ainda faltam (ordem fixa).
  items.forEach((_, idx) => {
    if (decided[idx]) return;
    const k = KIND_ORDER.find((kk) => remaining[kk] > 0);
    if (k) {
      remaining[k]--;
      decided[idx] = k;
    }
  });

  // Reconstrói preservando a ordem; descarta itens além do total pedido (decided null).
  const out: AICalendarItem[] = [];
  items.forEach((it, idx) => {
    const k = decided[idx];
    if (!k) return;
    const copy = { ...it };
    applyKind(copy, k);
    out.push(copy);
  });
  return out;
}

export async function generateAndSave(input: GenerateCalendarInput, userId?: string) {
  const out = await aiGenerateCalendar(input, userId);
  const items = reconcileComposition(out.items, input);
  const startDate = new Date(`${input.startDate}T09:00:00`);
  const endDate = new Date(`${input.endDate}T09:00:00`);
  const planned = planDates(items, startDate, endDate);

  const calendar = await prisma.editorialCalendar.create({
    data: {
      title: input.title,
      objective: input.objective,
      theme: out.theme || null,
      startDate,
      endDate,
      videoCount: input.videoCount,
      postCount: input.postCount,
      carrosselCount: input.carrosselCount,
      adVideoCount: input.adVideoCount,
      createdById: userId ?? null,
      items: {
        create: planned.map((p) => ({
          position: p.position,
          scheduledFor: p.scheduledFor,
          title: p.title.slice(0, 290),
          pillar: p.pillar ?? null,
          contentType: p.contentType ?? ContentType.VIDEO,
          staticFormat: p.staticFormat ?? null,
          isAd: p.isAd ?? false,
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
      isAd: item.isAd,
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

/** Marca/desmarca um item do calendário como anúncio (Meta Ads). (PRD-009) */
export async function setItemAd(calendarId: string, itemId: string, isAd: boolean) {
  const item = await prisma.editorialCalendarItem.findFirst({ where: { id: itemId, calendarId } });
  if (!item) {
    throw Object.assign(new Error('Item do calendário não encontrado.'), { code: 'NOT_FOUND' });
  }
  const updated = await prisma.editorialCalendarItem.update({ where: { id: item.id }, data: { isAd } });
  // Se já virou card, propaga a marcação para o card também.
  if (item.cardId) {
    await prisma.card.update({ where: { id: item.cardId }, data: { isAd } });
    emitBoard('card.updated', { id: item.cardId, isAd });
  }
  return updated;
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
          isAd: item.isAd,
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
