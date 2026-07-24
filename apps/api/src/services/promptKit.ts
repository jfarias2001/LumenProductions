/**
 * Prompt Kit (PRD-017) — fonte única dos prompts editáveis: Regra de Ouro + os 3
 * guias (voz da marca, estrutura criativa, hooks). Lê do `AppSetting` singleton e cai
 * na constante do `shared` quando o campo está vazio — assim, sem edição, o comportamento
 * é idêntico ao anterior (guias hardcoded).
 */
import {
  GOLDEN_RULE_PROMPT,
  BRAND_VOICE_GUIDE,
  CREATIVE_STRUCTURE_GUIDE,
  HOOKS_GUIDE,
} from '@content-engine/shared';
import { prisma } from '../lib/prisma.js';

export interface PromptKit {
  golden: string;
  brandVoice: string;
  creativeStructure: string;
  hooks: string;
}

/** Valor do banco se preenchido, senão o padrão do código. */
function pick(value: string | null | undefined, fallback: string): string {
  return value && value.trim() ? value : fallback;
}

/** Kit efetivo (banco com fallback nas constantes). */
export async function getPromptKit(): Promise<PromptKit> {
  const s = await prisma.appSetting.findUnique({ where: { id: 'singleton' } });
  return {
    golden: pick(s?.goldenRulePrompt, GOLDEN_RULE_PROMPT),
    brandVoice: pick(s?.brandVoiceGuide, BRAND_VOICE_GUIDE),
    creativeStructure: pick(s?.creativeStructureGuide, CREATIVE_STRUCTURE_GUIDE),
    hooks: pick(s?.hooksGuide, HOOKS_GUIDE),
  };
}

/**
 * Para a aba Prompts: valores efetivos + flag `isDefault` (usando o padrão do código)
 * de cada campo, para a UI mostrar "usando padrão".
 */
export async function getPromptSettings() {
  const s = await prisma.appSetting.findUnique({ where: { id: 'singleton' } });
  const field = (value: string | null | undefined, fallback: string) => ({
    value: pick(value, fallback),
    isDefault: !(value && value.trim()),
  });
  return {
    goldenRulePrompt: field(s?.goldenRulePrompt, GOLDEN_RULE_PROMPT),
    brandVoiceGuide: field(s?.brandVoiceGuide, BRAND_VOICE_GUIDE),
    creativeStructureGuide: field(s?.creativeStructureGuide, CREATIVE_STRUCTURE_GUIDE),
    hooksGuide: field(s?.hooksGuide, HOOKS_GUIDE),
  };
}

/** Atualiza os campos de prompt do singleton (só os enviados). Campo vazio → volta ao padrão. */
export async function updatePromptSettings(data: {
  goldenRulePrompt?: string;
  brandVoiceGuide?: string;
  creativeStructureGuide?: string;
  hooksGuide?: string;
}) {
  await prisma.appSetting.update({ where: { id: 'singleton' }, data });
  return getPromptSettings();
}
