import { PrismaClient, Stage, Role } from '@prisma/client';
import argon2 from 'argon2';
import {
  GOLDEN_RULE_PROMPT,
  MIX_TARGETS,
  PILLAR_GROUP_MAP,
  WEEKLY_TARGETS,
  RETENTION_QUESTIONS,
} from '@content-engine/shared';

const prisma = new PrismaClient();

async function main() {
  // AppSetting singleton
  await prisma.appSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
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
      goldenRulePrompt: GOLDEN_RULE_PROMPT,
    },
  });

  // Admin user
  const adminHash = await argon2.hash('Admin@123456');
  await prisma.user.upsert({
    where: { email: 'admin@lumendigital.com.br' },
    update: {},
    create: {
      name: 'Admin Lumen',
      email: 'admin@lumendigital.com.br',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  // Demo users
  const demoUsers = [
    { name: 'Gestor Demo', email: 'gestor@lumendigital.com.br', role: Role.GESTOR },
    { name: 'Estrategista Demo', email: 'estrategista@lumendigital.com.br', role: Role.ESTRATEGISTA },
    { name: 'Roteirista Demo', email: 'roteirista@lumendigital.com.br', role: Role.ROTEIRISTA },
    { name: 'Editor Demo', email: 'editor@lumendigital.com.br', role: Role.EDITOR },
    { name: 'Revisor Demo', email: 'revisor@lumendigital.com.br', role: Role.REVISOR_RETENCAO },
  ];
  const demoHash = await argon2.hash('Demo@123456');
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: demoHash },
    });
  }

  // Checklist templates (SPEC-001 §20.1)
  const templates: { stage: Stage; items: string[] }[] = [
    {
      stage: Stage.PRONTO_PARA_GRAVAR,
      items: [
        'Roteiro aprovado',
        'Abertura (hook) definida',
        'Textos de tela preparados',
        'CTA definido',
        'Local de gravação confirmado',
        'Responsável pela gravação confirmado',
        'Referências visuais separadas',
        'Duração prevista validada (30–45s)',
      ],
    },
    {
      stage: Stage.EM_EDICAO,
      items: [
        'Cortes secos (sem silêncio)',
        'Legenda dinâmica adicionada',
        'Palavras-chave destacadas na tela',
        'Mudança visual a cada 2–3 segundos',
        'Sem introdução lenta',
        'Compreensível sem áudio',
      ],
    },
    {
      stage: Stage.EM_DISTRIBUICAO,
      items: [
        'Responder comentários das primeiras 24h',
        'Fixar comentário estratégico',
        'Enviar para leads mornos via direct',
        'Repostar em stories',
        'Usar como argumento comercial no CRM',
      ],
    },
  ];

  for (const t of templates) {
    const existing = await prisma.checklistTemplate.findUnique({ where: { stage: t.stage } });
    if (!existing) {
      await prisma.checklistTemplate.create({
        data: {
          stage: t.stage,
          items: {
            create: t.items.map((label, order) => ({ label, order })),
          },
        },
      });
    }
  }

  console.log('✅  Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
