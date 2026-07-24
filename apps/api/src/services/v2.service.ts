/**
 * BOARD V2 (PRD-017) — persistência dos cards do funil e resolução do prompt
 * personalizado (que SOMA à Regra de Ouro na geração).
 */
import { prisma } from '../lib/prisma.js';
import type { PromptChoiceInput, V2CreateCardInput, V2UpdateCardInput } from '@content-engine/shared';

/**
 * Monta o texto do prompt personalizado a partir da escolha: busca o CustomPrompt
 * salvo (se `customPromptId`) e/ou concatena o texto inline. Vazio → undefined
 * (só Regra de Ouro).
 */
export async function resolveExtraPrompt(choice: PromptChoiceInput): Promise<string | undefined> {
  const parts: string[] = [];
  if (choice.customPromptId) {
    const saved = await prisma.customPrompt.findUnique({ where: { id: choice.customPromptId } });
    if (saved?.body?.trim()) parts.push(saved.body.trim());
  }
  if (choice.customPromptText?.trim()) parts.push(choice.customPromptText.trim());
  const joined = parts.join('\n\n').trim();
  return joined ? joined : undefined;
}

export function listV2Cards() {
  return prisma.v2Card.findMany({ orderBy: { updatedAt: 'desc' } });
}

export function createV2Card(data: V2CreateCardInput, userId?: string) {
  return prisma.v2Card.create({
    data: {
      idea: data.idea,
      title: data.title,
      focus: data.focus ?? '',
      copy: data.copy ?? '',
      ctas: data.ctas ?? [],
      customPromptId: data.customPromptId ?? null,
      createdById: userId ?? null,
    },
  });
}

export function updateV2Card(id: string, data: V2UpdateCardInput) {
  return prisma.v2Card.update({ where: { id }, data });
}

export function deleteV2Card(id: string) {
  return prisma.v2Card.delete({ where: { id } });
}
