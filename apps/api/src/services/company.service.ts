/**
 * CompanyService — base de conhecimento estruturada da empresa (PRD-005 / SPEC-005).
 * Singleton (`id = 'singleton'`). O conteúdo embasa todas as gerações de IA via
 * `buildCompanyContext`, sempre tratado como DADO (anti prompt-injection).
 */
import type { CompanyPersona, CompanyProfileInput } from '@content-engine/shared';
import { CompanyProfileSchema } from '@content-engine/shared';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

const SINGLETON = 'singleton';

/** Perfil vazio padronizado — usado quando ainda não há registro. */
function emptyProfile(): CompanyProfileInput {
  return CompanyProfileSchema.parse({});
}

export async function getCompanyProfile(): Promise<CompanyProfileInput> {
  const row = await prisma.companyProfile.findUnique({ where: { id: SINGLETON } });
  if (!row) return emptyProfile();
  return CompanyProfileSchema.parse({
    companyName: row.companyName,
    about: row.about,
    offerings: row.offerings,
    personas: row.personas,
    mainPains: row.mainPains,
    toneOfVoice: row.toneOfVoice,
    differentiators: row.differentiators,
    proofCases: row.proofCases,
    dos: row.dos,
    donts: row.donts,
    keywords: row.keywords,
    links: row.links,
  });
}

export async function updateCompanyProfile(input: CompanyProfileInput): Promise<CompanyProfileInput> {
  const data = {
    companyName: input.companyName,
    about: input.about,
    offerings: input.offerings,
    personas: input.personas as unknown as Prisma.InputJsonValue,
    mainPains: input.mainPains,
    toneOfVoice: input.toneOfVoice,
    differentiators: input.differentiators,
    proofCases: input.proofCases,
    dos: input.dos,
    donts: input.donts,
    keywords: input.keywords,
    links: input.links,
  };
  await prisma.companyProfile.upsert({
    where: { id: SINGLETON },
    update: data,
    create: { id: SINGLETON, ...data },
  });
  return getCompanyProfile();
}

/** Monta um bloco de texto compacto com os campos preenchidos. '' se vazio. */
export async function buildCompanyContext(): Promise<string> {
  const p = await getCompanyProfile();
  const lines: string[] = [];
  const push = (label: string, value?: string) => {
    if (value && value.trim()) lines.push(`${label}: ${value.trim()}`);
  };
  const pushList = (label: string, value: string[]) => {
    const items = value.map((v) => v.trim()).filter(Boolean);
    if (items.length) lines.push(`${label}: ${items.join('; ')}`);
  };

  push('Empresa', p.companyName);
  push('Quem é / posicionamento', p.about);
  push('Ofertas/produtos', p.offerings);
  push('Dores principais do público', p.mainPains);
  push('Tom de voz', p.toneOfVoice);
  push('Diferenciais', p.differentiators);
  push('Provas/casos', p.proofCases);
  pushList("Do's", p.dos);
  pushList("Don'ts", p.donts);
  pushList('Palavras-chave/temas', p.keywords);

  const personas = (p.personas as CompanyPersona[])
    .filter((x) => x.name?.trim() || x.description?.trim() || x.pains?.trim())
    .map((x) => `- ${x.name || 'Persona'}: ${x.description}${x.pains ? ` | dores: ${x.pains}` : ''}`);
  if (personas.length) lines.push(`Personas:\n${personas.join('\n')}`);

  return lines.join('\n');
}
