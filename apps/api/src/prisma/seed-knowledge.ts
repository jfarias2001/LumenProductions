/**
 * Seed de conhecimento (PRD-012 / SPEC-012). Roda no banco EXISTENTE para:
 *  1. Popular/refrescar o `CompanyProfile` singleton com o modelo white label da Lumen.
 *  2. Atualizar o `AppSetting.goldenRulePrompt` para a nova Regra de Ouro em uso.
 *
 * Idempotente — pode rodar quantas vezes quiser. É o que faz os roteiros deixarem
 * de ser genéricos, sem tocar em pipeline, gates ou schema.
 *
 *   pnpm --filter api db:seed:knowledge
 */
import { PrismaClient } from '@prisma/client';
import { GOLDEN_RULE_PROMPT, MIX_TARGETS, PILLAR_GROUP_MAP, WEEKLY_TARGETS } from '@content-engine/shared';
import { LUMEN_COMPANY_PROFILE as p } from './company-knowledge.js';

const prisma = new PrismaClient();

async function main() {
  // 1. Base de conhecimento da empresa (embasa todas as gerações via buildCompanyContext).
  const profileData = {
    companyName: p.companyName,
    about: p.about,
    offerings: p.offerings,
    personas: p.personas as object,
    mainPains: p.mainPains,
    toneOfVoice: p.toneOfVoice,
    differentiators: p.differentiators,
    proofCases: p.proofCases,
    dos: p.dos,
    donts: p.donts,
    keywords: p.keywords,
    links: p.links,
  };
  await prisma.companyProfile.upsert({
    where: { id: 'singleton' },
    update: profileData,
    create: { id: 'singleton', ...profileData },
  });
  console.log('✅  CompanyProfile atualizado (modelo white label / receita recorrente).');

  // 2. Regra de Ouro em uso vem do AppSetting.goldenRulePrompt — refresca para a nova.
  //    O create traz os defaults obrigatórios (caso o AppSetting ainda não exista).
  await prisma.appSetting.upsert({
    where: { id: 'singleton' },
    update: { goldenRulePrompt: GOLDEN_RULE_PROMPT },
    create: {
      id: 'singleton',
      goldenRulePrompt: GOLDEN_RULE_PROMPT,
      mixTargets: {
        dorConsciencia: MIX_TARGETS.DOR_CONSCIENCIA,
        solucaoMecanismo: MIX_TARGETS.SOLUCAO_MECANISMO,
        provaBastidorProduto: MIX_TARGETS.PROVA_BASTIDOR_PRODUTO,
      },
      pillarGroupMap: PILLAR_GROUP_MAP,
      weeklyTargets: {
        dor: WEEKLY_TARGETS.DOR,
        autoridade: WEEKLY_TARGETS.AUTORIDADE,
        produto: WEEKLY_TARGETS.PRODUTO,
        prova: WEEKLY_TARGETS.PROVA,
        trend: WEEKLY_TARGETS.TREND,
      },
    },
  });
  console.log('✅  AppSetting.goldenRulePrompt atualizado (Regra de Ouro white label).');

  console.log('✅  Seed de conhecimento concluído. Novas gerações já usam o modelo de negócio.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
