/**
 * Snapshots do card — pilha de pontos de restauração para DESFAZER a geração da IA
 * (PRD-016 / SPEC-016). Antes de cada escrita da IA capturamos a subárvore criativa
 * do card; `restoreLatest` faz o pop do topo e devolve o card ao estado anterior.
 *
 * Só serializamos o que a geração pode sobrescrever — campos escalares do card +
 * Validation / Angle[] / Hook[] / Script / CreativeDirection / CopyContent /
 * DerivedAsset[]. Etapas humanas (agendamento, retenção, métricas, checklist) ficam
 * de fora porque a IA não as altera.
 */
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

/** Relações lidas para montar o snapshot. */
const SNAPSHOT_INCLUDE = {
  validation: true,
  angles: true,
  hooks: true,
  script: true,
  creative: true,
  copy: true,
  derivedAssets: true,
} as const;

/** Máximo de snapshots retidos por card (poda os mais antigos). */
const MAX_SNAPSHOTS = 20;

type CardSubtree = Prisma.CardGetPayload<{ include: typeof SNAPSHOT_INCLUDE }>;

/** Json nullable → `DbNull` quando ausente (Prisma exige o sentinel, não `null` cru). */
function jsonOrNull(v: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return v == null ? Prisma.DbNull : (v as Prisma.InputJsonValue);
}

/** Serializa só os campos necessários (sem id/cardId/timestamps — a restauração recria). */
function serialize(card: CardSubtree): Prisma.InputJsonValue {
  return {
    card: {
      title: card.title,
      persona: card.persona,
      pain: card.pain,
      promise: card.promise,
      pillar: card.pillar,
      awareness: card.awareness,
      screenTexts: card.screenTexts,
      isAd: card.isAd,
      adPlan: card.adPlan ?? null,
    },
    validation: card.validation
      ? {
          dorQuente: card.validation.dorQuente,
          clareza: card.validation.clareza,
          contraste: card.validation.contraste,
          especificidadeAgencia: card.validation.especificidadeAgencia,
          potencialComentarios: card.validation.potencialComentarios,
          potencialComercial: card.validation.potencialComercial,
          total: card.validation.total,
          verdict: card.validation.verdict,
          aiSuggested: card.validation.aiSuggested,
          aiJustifications: card.validation.aiJustifications ?? null,
          reviewedById: card.validation.reviewedById,
          reviewedAt: card.validation.reviewedAt ? card.validation.reviewedAt.toISOString() : null,
        }
      : null,
    angles: card.angles.map((a) => ({ type: a.type, text: a.text, selected: a.selected, aiGenerated: a.aiGenerated })),
    hooks: card.hooks.map((h) => ({ text: h.text, status: h.status, aiGenerated: h.aiGenerated })),
    script: card.script
      ? {
          dor: card.script.dor,
          quebra: card.script.quebra,
          mecanismo: card.script.mecanismo,
          beneficio: card.script.beneficio,
          cta: card.script.cta,
          durationSec: card.script.durationSec,
          strongPhrases: card.script.strongPhrases,
          approved: card.script.approved,
          aiGenerated: card.script.aiGenerated,
        }
      : null,
    creative: card.creative
      ? {
          format: card.creative.format,
          visualNotes: card.creative.visualNotes,
          referenceUrls: card.creative.referenceUrls,
          editingInsights: card.creative.editingInsights,
          graphicElements: card.creative.graphicElements ?? null,
          palette: card.creative.palette,
          productionPlan: card.creative.productionPlan ?? null,
          aiGenerated: card.creative.aiGenerated,
        }
      : null,
    copy: card.copy
      ? { caption: card.copy.caption, ctaVariations: card.copy.ctaVariations, aiGenerated: card.copy.aiGenerated }
      : null,
    derivedAssets: card.derivedAssets.map((d) => ({
      type: d.type,
      content: d.content,
      externalUrl: d.externalUrl,
      aiGenerated: d.aiGenerated,
    })),
  } as unknown as Prisma.InputJsonValue;
}

/**
 * Captura um snapshot do card e o empilha. Poda os mais antigos além de MAX_SNAPSHOTS.
 * Retorna a linha criada, ou `null` se o card não existe.
 */
export async function captureSnapshot(cardId: string, label: string, userId?: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: SNAPSHOT_INCLUDE });
  if (!card) return null;

  const snap = await prisma.cardSnapshot.create({
    data: { cardId, label, stage: card.stage, data: serialize(card), createdById: userId ?? null },
  });

  const stale = await prisma.cardSnapshot.findMany({
    where: { cardId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_SNAPSHOTS,
    select: { id: true },
  });
  if (stale.length) {
    await prisma.cardSnapshot.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }
  return snap;
}

/**
 * Captura um snapshot, executa `fn` e, se `fn` lançar, apaga o snapshot recém-criado
 * (a geração falhou → nada mudou → não deixa ponto de restauração "fantasma").
 */
export async function withSnapshot<T>(
  cardId: string,
  label: string,
  userId: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const snap = await captureSnapshot(cardId, label, userId);
  try {
    return await fn();
  } catch (err) {
    if (snap) await prisma.cardSnapshot.delete({ where: { id: snap.id } }).catch(() => undefined);
    throw err;
  }
}

/** Lista resumida da pilha (mais recente primeiro) — usada pela UI. */
export async function listSnapshots(cardId: string) {
  return prisma.cardSnapshot.findMany({
    where: { cardId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, label: true, stage: true, createdAt: true },
  });
}

interface RestoreResult {
  cardId: string;
  remaining: number;
}

/**
 * Restaura o topo da pilha (desfazer a última geração) e faz o pop. Transacional:
 * repõe os campos escalares do card e recria/remove as entidades criativas para
 * bater exatamente com o snapshot. Lança `NO_SNAPSHOT` se a pilha estiver vazia.
 */
export async function restoreLatest(cardId: string): Promise<RestoreResult> {
  const snap = await prisma.cardSnapshot.findFirst({ where: { cardId }, orderBy: { createdAt: 'desc' } });
  if (!snap) {
    throw Object.assign(new Error('Nada para desfazer neste card.'), { code: 'NO_SNAPSHOT' });
  }
  const d = snap.data as Record<string, any>;
  const c = d.card ?? {};

  await prisma.$transaction(async (tx) => {
    // 1. Campos escalares do card.
    await tx.card.update({
      where: { id: cardId },
      data: {
        title: c.title,
        persona: c.persona ?? null,
        pain: c.pain ?? null,
        promise: c.promise ?? null,
        pillar: c.pillar ?? null,
        awareness: c.awareness ?? null,
        screenTexts: Array.isArray(c.screenTexts) ? c.screenTexts : [],
        isAd: Boolean(c.isAd),
        adPlan: jsonOrNull(c.adPlan),
      },
    });

    // 2. Entidades 1:1 — upsert se presente, senão remove.
    if (d.validation) {
      const v = d.validation;
      const vData = {
        dorQuente: v.dorQuente,
        clareza: v.clareza,
        contraste: v.contraste,
        especificidadeAgencia: v.especificidadeAgencia,
        potencialComentarios: v.potencialComentarios,
        potencialComercial: v.potencialComercial,
        total: v.total,
        verdict: v.verdict,
        aiSuggested: v.aiSuggested,
        aiJustifications: jsonOrNull(v.aiJustifications),
        reviewedById: v.reviewedById ?? null,
        reviewedAt: v.reviewedAt ? new Date(v.reviewedAt) : null,
      };
      await tx.validation.upsert({ where: { cardId }, update: vData, create: { cardId, ...vData } });
    } else {
      await tx.validation.deleteMany({ where: { cardId } });
    }

    if (d.script) {
      const s = d.script;
      const sData = {
        dor: s.dor,
        quebra: s.quebra,
        mecanismo: s.mecanismo,
        beneficio: s.beneficio,
        cta: s.cta,
        durationSec: s.durationSec,
        strongPhrases: Array.isArray(s.strongPhrases) ? s.strongPhrases : [],
        approved: Boolean(s.approved),
        aiGenerated: Boolean(s.aiGenerated),
      };
      await tx.script.upsert({ where: { cardId }, update: sData, create: { cardId, ...sData } });
    } else {
      await tx.script.deleteMany({ where: { cardId } });
    }

    if (d.creative) {
      const cr = d.creative;
      const crData = {
        format: cr.format,
        visualNotes: cr.visualNotes ?? null,
        referenceUrls: Array.isArray(cr.referenceUrls) ? cr.referenceUrls : [],
        editingInsights: Array.isArray(cr.editingInsights) ? cr.editingInsights : [],
        graphicElements: jsonOrNull(cr.graphicElements),
        palette: cr.palette ?? null,
        productionPlan: jsonOrNull(cr.productionPlan),
        aiGenerated: Boolean(cr.aiGenerated),
      };
      await tx.creativeDirection.upsert({ where: { cardId }, update: crData, create: { cardId, ...crData } });
    } else {
      await tx.creativeDirection.deleteMany({ where: { cardId } });
    }

    if (d.copy) {
      const cp = d.copy;
      const cpData = {
        caption: cp.caption,
        ctaVariations: Array.isArray(cp.ctaVariations) ? cp.ctaVariations : [],
        aiGenerated: Boolean(cp.aiGenerated),
      };
      await tx.copyContent.upsert({ where: { cardId }, update: cpData, create: { cardId, ...cpData } });
    } else {
      await tx.copyContent.deleteMany({ where: { cardId } });
    }

    // 3. Coleções — substitui integralmente.
    await tx.angle.deleteMany({ where: { cardId } });
    if (Array.isArray(d.angles) && d.angles.length) {
      await tx.angle.createMany({
        data: d.angles.map((a: any) => ({ cardId, type: a.type, text: a.text, selected: Boolean(a.selected), aiGenerated: Boolean(a.aiGenerated) })),
      });
    }

    await tx.hook.deleteMany({ where: { cardId } });
    if (Array.isArray(d.hooks) && d.hooks.length) {
      await tx.hook.createMany({
        data: d.hooks.map((h: any) => ({ cardId, text: h.text, status: h.status, aiGenerated: Boolean(h.aiGenerated) })),
      });
    }

    await tx.derivedAsset.deleteMany({ where: { cardId } });
    if (Array.isArray(d.derivedAssets) && d.derivedAssets.length) {
      await tx.derivedAsset.createMany({
        data: d.derivedAssets.map((x: any) => ({ cardId, type: x.type, content: x.content ?? null, externalUrl: x.externalUrl ?? null, aiGenerated: Boolean(x.aiGenerated) })),
      });
    }

    // 4. Pop do topo da pilha.
    await tx.cardSnapshot.delete({ where: { id: snap.id } });
  });

  const remaining = await prisma.cardSnapshot.count({ where: { cardId } });
  return { cardId, remaining };
}
